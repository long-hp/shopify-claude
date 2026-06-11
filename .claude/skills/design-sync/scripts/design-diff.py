#!/usr/bin/env python3
"""
Design-diff engine — compares the design/ repo's current HEAD against the last
synced baseline (recorded in .agent-state/DESIGN-SYNC.md) and reports what changed,
bucketed by design unit and classified by severity.

This script does ONLY the deterministic part: read versions + SHAs, run git diff,
bucket changed files into design units (section / component / tokens / page / …),
classify each as Added / Modified / Removed / Renamed, and emit a PROGRESS "mention"
hint per unit. It deliberately does NOT decide whether a unit is "already ported" —
design names rarely match src names 1:1, so the design-sync skill resolves true port
state with judgment (PROGRESS "Files touched" + grep). See SKILL.md.

Usage:
  python .claude/skills/design-sync/scripts/design-diff.py            # markdown report, baseline from ledger
  python .claude/skills/design-sync/scripts/design-diff.py --since de93636   # override baseline ref
  python .claude/skills/design-sync/scripts/design-diff.py --json     # structured JSON for the agent to reason over
  python .claude/skills/design-sync/scripts/design-diff.py --design path/to/design

Exit codes:
  0  success, report emitted (may be "up to date")
  1  project / design repo not found or unreadable
  3  no baseline recorded and none supplied → skill must bootstrap the ledger first
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


# ──────────────────────────────────────────────────────────────────────────────
# Locate project + design repo
# ──────────────────────────────────────────────────────────────────────────────
def _find_project_root() -> Path:
    p = Path(__file__).resolve()
    for parent in (p, *p.parents):
        if (parent / "package.json").exists() and (parent / "src").is_dir():
            return parent
    print("error: project root not found (looking for package.json + src/)", file=sys.stderr)
    sys.exit(1)


def _git(design: Path, *args: str) -> str:
    """Run a git command inside the design repo, return stripped stdout ('' on failure)."""
    try:
        out = subprocess.run(
            ["git", "-C", str(design), *args],
            capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def _read_version(design: Path) -> str:
    pkg = design / "package.json"
    if not pkg.exists():
        return "?"
    try:
        return json.loads(pkg.read_text()).get("version", "?")
    except (json.JSONDecodeError, OSError):
        return "?"


# ──────────────────────────────────────────────────────────────────────────────
# Baseline ledger
# ──────────────────────────────────────────────────────────────────────────────
def _read_ledger_baseline(state_dir: Path) -> dict | None:
    """Parse the TOP data row of .agent-state/DESIGN-SYNC.md → {version, commit, date}.
    Returns None if the ledger is absent or has no data rows yet."""
    ledger = state_dir / "DESIGN-SYNC.md"
    if not ledger.exists():
        return None
    for line in ledger.read_text().splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 3:
            continue
        head = cells[0].lower()
        if head in ("date", "") or set(cells[0]) <= {"-", ":", " "}:
            continue  # header or separator row
        # First real data row = current baseline.
        commit = cells[2].strip("`").strip()
        if commit:
            return {"date": cells[0], "version": cells[1].strip("`"), "commit": commit}
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Bucketing — map a changed design file path → (bucket, unit, severity)
# ──────────────────────────────────────────────────────────────────────────────
# Severity tiers (most → least urgent for re-port work):
#   foundation  🔴  tokens / global styles / design-system → ripples to EVERY ported section
#   unit        🟠  a section or component → re-port if already ported, else backlog
#   page        🟡  page template / blueprint → guides porting, informational
#   infra       ⚫  build config, lockfiles, scripts → usually ignorable
SEV_FOUNDATION = "foundation"
SEV_UNIT = "unit"
SEV_PAGE = "page"
SEV_INFRA = "infra"

SEV_ICON = {SEV_FOUNDATION: "🔴", SEV_UNIT: "🟠", SEV_PAGE: "🟡", SEV_INFRA: "⚫"}
SEV_ORDER = [SEV_FOUNDATION, SEV_UNIT, SEV_PAGE, SEV_INFRA]


def _bucket(path: str) -> tuple[str, str, str]:
    """Return (bucket_label, unit_key, severity) for a design-relative file path."""
    parts = path.split("/")

    # Sections & components: src/sections/<name>/... , src/components/<name>/...
    if len(parts) >= 3 and parts[0] == "src" and parts[1] in ("sections", "components"):
        kind = "section" if parts[1] == "sections" else "component"
        return (kind, parts[2], SEV_UNIT)

    # Global styles / tokens — the foundation Step 0 maps into theme settings.
    if path.startswith("src/styles/"):
        return ("tokens", "src/styles", SEV_FOUNDATION)
    if path in ("src/head.html", "font-config.json", "design-system.md", "brand.md"):
        return ("foundation", path, SEV_FOUNDATION)

    # Page templates & assembled HTML — drive which sections appear where.
    if path.startswith("src/pages/") or path.startswith("src/html/"):
        return ("page", parts[-1], SEV_PAGE)
    if re.match(r"blueprint.*\.md$", path):
        return ("blueprint", path, SEV_PAGE)

    # Behaviour scripts — medium, but treat as unit-adjacent foundation note.
    if path.startswith("src/scripts/"):
        return ("scripts", parts[-1], SEV_PAGE)

    # Everything else: build config, lockfiles, vite, signatures at root, etc.
    return ("infra", path, SEV_INFRA)


# Git status letter → human label. Renames/copies come through as "R100" / "C75".
def _status_label(code: str) -> str:
    c = code[0]
    return {"A": "added", "M": "modified", "D": "removed", "R": "renamed", "C": "copied"}.get(c, code)


# Per-unit status precedence when several files in one unit change differently.
_STATUS_RANK = {"added": 0, "renamed": 1, "removed": 2, "modified": 3, "copied": 4}


def main() -> int:
    ap = argparse.ArgumentParser(description="Design-diff engine for the design-sync skill.")
    ap.add_argument("--design", default=None, help="path to design repo (default: <root>/design)")
    ap.add_argument("--since", default=None, help="baseline git ref to diff from (overrides the ledger)")
    ap.add_argument("--json", action="store_true", help="emit structured JSON instead of markdown")
    args = ap.parse_args()

    root = _find_project_root()
    design = Path(args.design).resolve() if args.design else root / "design"
    state_dir = root / ".agent-state"

    if not (design / ".git").exists():
        print(f"error: {design} is not a git repository (design/ should be a cloned repo)", file=sys.stderr)
        return 1

    cur_version = _read_version(design)
    cur_sha = _git(design, "rev-parse", "HEAD")
    cur_short = _git(design, "rev-parse", "--short", "HEAD")

    # Resolve baseline.
    ledger = _read_ledger_baseline(state_dir)
    if args.since:
        baseline_ref = args.since
        base_version = ledger["version"] if ledger else "?"
        base_source = "--since flag"
    elif ledger:
        baseline_ref = ledger["commit"]
        base_version = ledger["version"]
        base_source = "ledger"
    else:
        # No baseline anywhere → the skill must bootstrap the ledger.
        print("NO_BASELINE", file=sys.stderr)
        print(
            "No baseline recorded in .agent-state/DESIGN-SYNC.md and no --since given.\n"
            f"Design is currently version {cur_version} at commit {cur_short}.\n"
            "The design-sync skill must establish a baseline first (see SKILL.md → Bootstrap).",
            file=sys.stderr,
        )
        return 3

    # Validate baseline ref exists in the design repo.
    if not _git(design, "cat-file", "-e", f"{baseline_ref}^{{commit}}") and \
       subprocess.run(["git", "-C", str(design), "cat-file", "-e", f"{baseline_ref}^{{commit}}"],
                      capture_output=True).returncode != 0:
        print(f"error: baseline ref '{baseline_ref}' not found in {design}. "
              f"Try `git -C design fetch` or pass a valid --since.", file=sys.stderr)
        return 1

    base_short = _git(design, "rev-parse", "--short", baseline_ref) or baseline_ref

    # Already in sync?
    if _git(design, "rev-parse", baseline_ref) == cur_sha:
        result = {
            "up_to_date": True,
            "version": {"baseline": base_version, "current": cur_version},
            "commit": {"baseline": base_short, "current": cur_short},
            "commits": [], "units": [],
        }
        _emit(result, args.json)
        return 0

    # Commit log baseline..HEAD
    log = _git(design, "log", "--oneline", "--no-decorate", f"{baseline_ref}..HEAD")
    commits = [l for l in log.splitlines() if l.strip()]

    # File-level changes with rename detection.
    raw = _git(design, "diff", "--name-status", "--find-renames", f"{baseline_ref}..HEAD")

    # Aggregate per unit.
    units: dict[tuple[str, str], dict] = {}
    for line in raw.splitlines():
        if not line.strip():
            continue
        fields = line.split("\t")
        status = _status_label(fields[0])
        # Renamed/copied lines carry old<TAB>new; use the new path for bucketing.
        path = fields[-1]
        bucket, unit_key, sev = _bucket(path)
        key = (bucket, unit_key)
        u = units.setdefault(key, {
            "bucket": bucket, "unit": unit_key, "severity": sev,
            "files": [], "statuses": set(),
        })
        u["files"].append({"status": status, "path": path})
        u["statuses"].add(status)

    # Resolve a single representative status per unit + PROGRESS mention hints.
    progress_text = ""
    progress_md = state_dir / "PROGRESS.md"
    if progress_md.exists():
        progress_text = progress_md.read_text().lower()

    unit_list = []
    for (bucket, unit_key), u in units.items():
        status = sorted(u["statuses"], key=lambda s: _STATUS_RANK.get(s, 9))[0]
        # Mention hint: only meaningful for named section/component units.
        hint = None
        if bucket in ("section", "component"):
            hint = progress_text.count(unit_key.lower())
        unit_list.append({
            "bucket": bucket,
            "unit": unit_key,
            "severity": u["severity"],
            "status": status,
            "file_count": len(u["files"]),
            "files": u["files"],
            "progress_mentions": hint,
        })

    # Sort: severity tier, then status (new/removed before modified), then name.
    unit_list.sort(key=lambda x: (
        SEV_ORDER.index(x["severity"]),
        _STATUS_RANK.get(x["status"], 9),
        x["unit"],
    ))

    result = {
        "up_to_date": False,
        "version": {"baseline": base_version, "current": cur_version},
        "version_bumped": base_version != cur_version,
        "commit": {"baseline": base_short, "current": cur_short},
        "baseline_source": base_source,
        "commit_count": len(commits),
        "commits": commits,
        "units": unit_list,
    }
    _emit(result, args.json)
    return 0


# ──────────────────────────────────────────────────────────────────────────────
# Output
# ──────────────────────────────────────────────────────────────────────────────
def _emit(result: dict, as_json: bool) -> None:
    if as_json:
        # Drop the set-typed field already resolved; everything else is JSON-safe.
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    v = result["version"]
    c = result["commit"]
    if result.get("up_to_date"):
        print(f"✅ Design is up to date — version {v['current']} @ {c['current']} matches the synced baseline.")
        print("Nothing to re-port. (If you just pulled and expected changes, run `git -C design fetch && git -C design log`.)")
        return

    bump = " ⬆️ version bumped" if result.get("version_bumped") else " (version unchanged)"
    print(f"# Design sync report\n")
    print(f"**Version:** {v['baseline']} → {v['current']}{bump}")
    print(f"**Commits:** {c['baseline']} → {c['current']}  ·  {result['commit_count']} new commit(s) "
          f"(baseline from {result['baseline_source']})\n")

    if result["commits"]:
        print("## New design commits\n")
        for line in result["commits"]:
            print(f"- {line}")
        print()

    # Group units by severity tier.
    by_sev: dict[str, list] = {}
    for u in result["units"]:
        by_sev.setdefault(u["severity"], []).append(u)

    headings = {
        SEV_FOUNDATION: "🔴 Foundation / tokens — ripples to EVERY ported section (re-check Step 0 first)",
        SEV_UNIT:       "🟠 Sections & components — re-port if already ported, else add to backlog",
        SEV_PAGE:       "🟡 Pages / blueprints — informational, guides which sections go where",
        SEV_INFRA:      "⚫ Infra / build — usually ignorable",
    }
    for sev in SEV_ORDER:
        items = by_sev.get(sev)
        if not items:
            continue
        print(f"## {headings[sev]}\n")
        if sev in (SEV_UNIT,):
            print("| Unit | Kind | Change | Files | PROGRESS mentions |")
            print("| --- | --- | --- | :---: | :---: |")
            for u in items:
                hint = u["progress_mentions"]
                hint_s = "—" if hint is None else (f"{hint} ⟵ likely ported" if hint else "0 ⟵ new?")
                print(f"| `{u['unit']}` | {u['bucket']} | {u['status']} | {u['file_count']} | {hint_s} |")
        else:
            print("| Item | Change | Files |")
            print("| --- | --- | :---: |")
            for u in items:
                print(f"| `{u['unit']}` | {u['status']} | {u['file_count']} |")
        print()

    print("---")
    print("> Next: the design-sync skill resolves which 🟠 units are *already ported* "
          "(PROGRESS \"Files touched\" + grep src/), builds the impact table, and proposes re-port batches. "
          "PROGRESS-mention counts above are a HINT, not proof.")


if __name__ == "__main__":
    sys.exit(main())
