#!/usr/bin/env python3
"""
Inventory scanner — walks design/ + src/ to compute design→src coverage and writes
.agent-state/INVENTORY.md.

Triggered by the planner skill when:
  - Starting a session and the prior INVENTORY.md is stale (>3 sessions old)
  - After completing a batch of section ports
  - During gap analysis

Usage:
  python .claude/skills/planner/scripts/scan-inventory.py
  python .claude/skills/planner/scripts/scan-inventory.py --design path/to/design
  python .claude/skills/planner/scripts/scan-inventory.py --summary       # stdout instead of writing file

Exit codes:
  0  success
  1  source folders missing / unreadable
"""
import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def _find_project_root() -> Path:
    p = Path(__file__).resolve()
    for parent in (p, *p.parents):
        if (parent / "package.json").exists() and (parent / "src").is_dir():
            return parent
    raise FileNotFoundError("project root not found (looking for package.json + src/)")


ROOT = _find_project_root()
SRC_SECTIONS = ROOT / "src/sections"
SRC_SNIPPETS = ROOT / "src/snippets"
STATE_DIR    = ROOT / ".agent-state"
INVENTORY_MD = STATE_DIR / "INVENTORY.md"


def _list_dirs(p: Path) -> list[Path]:
    if not p.exists():
        return []
    return sorted([d for d in p.iterdir() if d.is_dir()])


def _src_section_row(section_dir: Path) -> dict:
    """Inspect a src/sections/<name>/ folder."""
    name = section_dir.name
    files = {f.name for f in section_dir.iterdir() if f.is_file()}
    return {
        "name": name,
        "liquid":   f"{name}.liquid"          in files,
        "schema":   "schema.js"               in files,
        "scss":     f"{name}.global.scss"     in files,
        "preset":   any(f.startswith("preset-") and f.endswith(".js") for f in files),
    }


def _design_sections(design_root: Path) -> list[str]:
    sec = design_root / "src/sections"
    if not sec.exists():
        return []
    return sorted(d.name for d in sec.iterdir() if d.is_dir())


def _design_pages(design_root: Path) -> list[str]:
    pages = design_root / "src/pages"
    if not pages.exists():
        return []
    return sorted(p.name for p in pages.iterdir() if p.is_file() and p.suffix == ".html")


def _design_components(design_root: Path) -> list[str]:
    comps = design_root / "src/components"
    if not comps.exists():
        return []
    return sorted(d.name for d in comps.iterdir() if d.is_dir())


def _git_recent_paths() -> set[str]:
    """Recently modified file paths from `git status --porcelain` (relative to ROOT)."""
    try:
        out = subprocess.check_output(
            ["git", "-C", str(ROOT), "status", "--porcelain"],
            text=True, stderr=subprocess.DEVNULL,
        )
    except Exception:
        return set()
    paths = set()
    for line in out.splitlines():
        # porcelain v1 lines look like ` M path` or `?? path`
        if len(line) > 3:
            paths.add(line[3:].strip())
    return paths


def render_inventory(design_root: Path) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    # ─── src/sections ─────────────────────────────────────────────────────────
    src_sec_rows = [_src_section_row(d) for d in _list_dirs(SRC_SECTIONS)]

    src_sec_md = ["| Section | `.liquid` | `schema.js` | `*.global.scss` | preset-*.js |",
                  "| --- | :---: | :---: | :---: | :---: |"]
    for r in src_sec_rows:
        src_sec_md.append(
            f"| {r['name']} | {'✓' if r['liquid'] else '—'} | "
            f"{'✓' if r['schema'] else '—'} | {'✓' if r['scss'] else '—'} | "
            f"{'✓' if r['preset'] else '—'} |"
        )

    # ─── src/snippets — light enumeration ─────────────────────────────────────
    src_snippet_dirs = _list_dirs(SRC_SNIPPETS)
    src_snippet_count = len(src_snippet_dirs)

    # Identify recently-touched snippets via git
    recent = _git_recent_paths()
    recently_touched_snippets = sorted({
        p.split("/", 2)[1] for p in recent
        if p.startswith("src/snippets/") and len(p.split("/")) >= 3
    })

    # ─── design enumeration ───────────────────────────────────────────────────
    design_pages_list   = _design_pages(design_root)
    design_sec_list     = _design_sections(design_root)
    design_comps_list   = _design_components(design_root)

    # ─── design → src mapping (name-match) ────────────────────────────────────
    src_sec_names = {r["name"] for r in src_sec_rows}
    mapping_md = ["| Design section | Same-named src section | Coverage |",
                  "| --- | --- | :---: |"]
    matched = unmatched = 0
    for ds in design_sec_list:
        if ds in src_sec_names:
            mapping_md.append(f"| {ds} | {ds} | ✅ matched |")
            matched += 1
        else:
            mapping_md.append(f"| {ds} | _none — possible reuse?_ | ⚪ gap |")
            unmatched += 1

    coverage_pct = (matched * 100 / len(design_sec_list)) if design_sec_list else 0

    # ─── assemble ─────────────────────────────────────────────────────────────
    lines = []
    lines.append("# Inventory snapshot")
    lines.append("")
    lines.append(f"> Generated by: `python .claude/skills/planner/scripts/scan-inventory.py`")
    lines.append(f"> Last scan: {now}")
    lines.append(f"> Active design source: `{design_root.relative_to(ROOT)}`")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Design pages: **{len(design_pages_list)}** · sections: **{len(design_sec_list)}** · components: **{len(design_comps_list)}**")
    lines.append(f"- src/sections: **{len(src_sec_rows)}** · src/snippets: **{src_snippet_count}**")
    lines.append(f"- Design→src section coverage: **{matched} / {len(design_sec_list)}** ({coverage_pct:.0f}%)")
    if recently_touched_snippets:
        lines.append(f"- Recently touched snippets (per git status): {', '.join(recently_touched_snippets[:10])}{' …' if len(recently_touched_snippets) > 10 else ''}")
    lines.append("")

    lines.append("## src/sections/")
    lines.append("")
    lines.extend(src_sec_md)
    lines.append("")

    lines.append("## design/")
    lines.append("")
    lines.append(f"**Pages** ({len(design_pages_list)}): " + (", ".join(design_pages_list) or "_none_"))
    lines.append("")
    lines.append(f"**Sections** ({len(design_sec_list)}): " + (", ".join(design_sec_list) or "_none_"))
    lines.append("")
    lines.append(f"**Components** ({len(design_comps_list)}): " + (", ".join(design_comps_list) or "_none_"))
    lines.append("")

    lines.append("## Design → src mapping")
    lines.append("")
    lines.append("Name-match only. `⚪ gap` may still be covered by a generically-named src section (verify manually).")
    lines.append("")
    lines.extend(mapping_md)
    lines.append("")

    if recently_touched_snippets:
        lines.append("## Recently touched snippets")
        lines.append("")
        lines.append("From `git status --porcelain` (uncommitted or staged changes):")
        lines.append("")
        for s in recently_touched_snippets:
            lines.append(f"- `src/snippets/{s}/`")
        lines.append("")

    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--design", default="design", help="Path to design folder (default: design)")
    ap.add_argument("--summary", action="store_true", help="Print summary to stdout instead of writing INVENTORY.md")
    args = ap.parse_args()

    design_root = (ROOT / args.design).resolve()
    if not design_root.exists():
        print(f"✗ design folder not found: {design_root}", file=sys.stderr)
        sys.exit(1)
    if not SRC_SECTIONS.exists():
        print(f"✗ src/sections/ not found: {SRC_SECTIONS}", file=sys.stderr)
        sys.exit(1)

    md = render_inventory(design_root)

    if args.summary:
        # Print just the Summary block
        in_summary = False
        for line in md.splitlines():
            if line.startswith("## Summary"):
                in_summary = True
                continue
            if in_summary and line.startswith("## "):
                break
            if in_summary:
                print(line)
    else:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        INVENTORY_MD.write_text(md)
        print(f"✓ wrote {INVENTORY_MD.relative_to(ROOT)} ({len(md.splitlines())} lines)")


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as e:
        print(f"✗ {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)
