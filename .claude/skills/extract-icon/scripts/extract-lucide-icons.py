#!/usr/bin/env python3
"""Refresh src/snippets/icons/icon-*.liquid with current Lucide SVG content.

Workflow:
  1. Scan design/ for unique data-lucide="X" names.
  2. For each name, resolve project snippet via --alias CLI flags or direct match.
  3. Fetch the SVG from unpkg lucide-static, transform outer attrs to the project template,
     rewrite the snippet's <svg>...</svg> block in place.

Usage:
  python .claude/skills/extract-icon/scripts/extract-lucide-icons.py
  python .claude/skills/extract-icon/scripts/extract-lucide-icons.py --dry-run
  python .claude/skills/extract-icon/scripts/extract-lucide-icons.py --name chevron-down
  python .claude/skills/extract-icon/scripts/extract-lucide-icons.py --design-dir design/

The icon.liquid dispatcher is NEVER touched. See SKILL.md for the alias-map convention.
"""

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DESIGN_DIR = PROJECT_ROOT / "design"
ICONS_DIR = PROJECT_ROOT / "src" / "snippets" / "icons"
LUCIDE_CDN = "https://unpkg.com/lucide-static@latest/icons/{}.svg"

# Filter template interpolation values (not real lucide names).
PLACEHOLDER_RE = re.compile(r"^(\$|icon-name$|\{)")
DATA_LUCIDE_RE = re.compile(r'data-lucide="([^"]+)"')


def scan_design(design_dir: Path) -> set[str]:
    """Walk design HTML + Markdown files and collect unique data-lucide values.

    Blueprints under design/ are authored as .md and embed sample markup including
    data-lucide references — those count as design intent and must be discovered.
    """
    found: set[str] = set()
    for pattern in ("*.html", "*.md"):
        for path in design_dir.rglob(pattern):
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for match in DATA_LUCIDE_RE.finditer(text):
                name = match.group(1).strip()
                if not name or PLACEHOLDER_RE.match(name):
                    continue
                found.add(name)
    return found


def parse_aliases(alias_args: list[str] | None) -> dict[str, str]:
    """Parse `--alias <lucide-name>=<snippet-suffix>` repeatable CLI flag.

    The agent invoking this script is expected to propose aliases by reading
    the design's lucide names and matching them against existing project
    snippets (semantic equivalence — e.g., lucide `x` matches project `close`,
    lucide `menu` matches `hamburger`). No static map file is needed.
    """
    result: dict[str, str] = {}
    if not alias_args:
        return result
    for raw in alias_args:
        if "=" not in raw:
            print(f"⚠ ignoring malformed --alias '{raw}' (expected lucide-name=snippet-suffix)", file=sys.stderr)
            continue
        lucide_name, _, suffix = raw.partition("=")
        lucide_name = lucide_name.strip()
        suffix = suffix.strip()
        if not lucide_name or not suffix:
            print(f"⚠ ignoring empty --alias '{raw}'", file=sys.stderr)
            continue
        result[lucide_name] = suffix
    return result


def resolve_snippet_suffix(lucide_name: str, alias: dict[str, str]) -> str:
    """Map lucide name → project snippet suffix (the part after `icon-`)."""
    return alias.get(lucide_name, lucide_name)


def fetch_lucide_svg(lucide_name: str, timeout: float = 10.0) -> str | None:
    """Fetch raw SVG from Lucide CDN. Returns None on 404."""
    url = LUCIDE_CDN.format(lucide_name)
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        print(f"⚠ HTTP {err.code} fetching {url}", file=sys.stderr)
        return None
    except urllib.error.URLError as err:
        print(f"⚠ Network error fetching {url}: {err}", file=sys.stderr)
        return None


def transform_svg(raw_svg: str) -> str | None:
    """Transform a Lucide SVG into the project template format.

    Outer attrs: drop height, template width/stroke/fill/class.
    Inner content (path/circle/etc.): preserved verbatim.
    Returns None if the raw SVG can't be parsed into <svg>...</svg>.
    """
    raw = raw_svg.strip()
    # Use re.search (not re.match) — lucide ships a `<!-- @license -->` comment before the svg tag.
    match = re.search(r"(<svg)([^>]*?)>(.*?)(</svg>)", raw, re.DOTALL)
    if not match:
        return None

    open_tag, attrs, inner, close_tag = match.groups()

    # Drop height (project convention is width-only; viewBox preserves aspect).
    # Eat any preceding whitespace+newline so the multi-line format closes up cleanly.
    attrs = re.sub(r'\s*\bheight\s*=\s*"[^"]*"', "", attrs)
    # width → templated. Preserve preceding whitespace via capture so multi-line layout stays intact.
    # Lookbehind (?<![\w-]) skips matches inside `stroke-width="..."`.
    attrs = re.sub(r'(?<![\w-])(\s*)width\s*=\s*"[^"]*"', r"\1width='{{ size }}'", attrs)
    # stroke="currentColor" / fill="currentColor" → templated. Preserve preceding whitespace.
    # Word boundary on stroke= avoids matching inside stroke-width="…" (already safe since `=` doesn't follow `stroke` there).
    attrs = re.sub(r'(\s*)stroke\s*=\s*"currentColor"', r"\1stroke='{{ color }}'", attrs)
    attrs = re.sub(r'(\s*)fill\s*=\s*"currentColor"', r"\1fill='{{ color }}'", attrs)
    # Replace any existing class= with the project template (lucide ships `class="lucide lucide-X"`).
    if re.search(r"\bclass\s*=", attrs):
        attrs = re.sub(r'(\s*)class\s*=\s*"[^"]*"', r'\1class="{{ class }}"', attrs)
    else:
        # Insert on its own line to match the multi-line style most snippets use.
        attrs = attrs + '\n  class="{{ class }}"'

    return f"{open_tag}{attrs}>{inner}{close_tag}"


def replace_svg_block(snippet_path: Path, new_svg: str) -> bool:
    """Replace the first <svg>...</svg> block in the snippet file.

    Returns True if the file was modified, False if no svg block was found
    or the content already matches.
    """
    content = snippet_path.read_text(encoding="utf-8")
    match = re.search(r"<svg\b.*?</svg>", content, re.DOTALL)
    if not match:
        return False
    new_content = content[: match.start()] + new_svg + content[match.end():]
    if new_content == content:
        return False
    snippet_path.write_text(new_content, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument(
        "--design-dir",
        default=str(DEFAULT_DESIGN_DIR),
        help=f"Design root (default: {DEFAULT_DESIGN_DIR.relative_to(PROJECT_ROOT)})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change, write nothing",
    )
    parser.add_argument(
        "--name",
        action="append",
        help="Process only this lucide name (repeatable). Skips the design scan.",
    )
    parser.add_argument(
        "--alias",
        action="append",
        metavar="LUCIDE=SUFFIX",
        help=(
            "Map a lucide name to a project snippet suffix when names diverge. "
            "Repeatable. Example: --alias x=close --alias menu=hamburger. "
            "The agent invoking this script should propose aliases by reading the "
            "'Skipped — no project snippet' report and matching against existing "
            "icon-*.liquid files via semantic equivalence."
        ),
    )
    args = parser.parse_args()

    design_dir = Path(args.design_dir)
    if not args.name and not design_dir.exists():
        print(f"✗ design directory not found: {design_dir}", file=sys.stderr)
        return 1
    if not ICONS_DIR.exists():
        print(f"✗ icons directory not found: {ICONS_DIR}", file=sys.stderr)
        return 1

    # Phase 1 — discover lucide names.
    if args.name:
        design_names = set(args.name)
        print(f"[scan] using --name: {len(design_names)} explicit name(s)")
    else:
        design_names = scan_design(design_dir)
        print(f"[scan] {design_dir.relative_to(PROJECT_ROOT)} → {len(design_names)} unique lucide name(s)")

    if not design_names:
        print("(nothing to do)")
        return 0

    # Phase 2 — alias map from CLI.
    alias = parse_aliases(args.alias)
    if alias:
        print(f"[alias] {len(alias)} CLI override(s):")
        for k, v in alias.items():
            print(f"        {k} → icon-{v}.liquid")
    else:
        print("[alias] none (using direct match: lucide-name → icon-<name>.liquid)")

    # Phase 3-4 — resolve, fetch, transform, write.
    refreshed: list[tuple[str, Path]] = []
    no_snippet: list[tuple[str, str]] = []
    not_in_lucide: list[str] = []
    unchanged: list[tuple[str, Path]] = []
    malformed: list[tuple[str, Path]] = []

    for lucide_name in sorted(design_names):
        suffix = resolve_snippet_suffix(lucide_name, alias)
        snippet_path = ICONS_DIR / f"icon-{suffix}.liquid"

        if not snippet_path.exists():
            no_snippet.append((lucide_name, suffix))
            continue

        raw_svg = fetch_lucide_svg(lucide_name)
        if raw_svg is None:
            not_in_lucide.append(lucide_name)
            continue

        new_svg = transform_svg(raw_svg)
        if new_svg is None:
            print(f"⚠ could not parse SVG from lucide for {lucide_name}", file=sys.stderr)
            continue

        rel_path = snippet_path.relative_to(PROJECT_ROOT)
        if args.dry_run:
            refreshed.append((lucide_name, rel_path))
            continue

        modified = replace_svg_block(snippet_path, new_svg)
        if modified:
            refreshed.append((lucide_name, rel_path))
        else:
            # Either no <svg> block or content unchanged.
            content = snippet_path.read_text(encoding="utf-8")
            if "<svg" in content:
                unchanged.append((lucide_name, rel_path))
            else:
                malformed.append((lucide_name, rel_path))

    # Phase 5 — report.
    print()
    print("=== Report ===")
    if args.dry_run:
        print("(dry-run — no files written)")

    print(f"Refreshed: {len(refreshed)}")
    for ln, path in refreshed[:60]:
        print(f"  ✓ lucide:{ln} → {path}")
    if len(refreshed) > 60:
        print(f"  ... +{len(refreshed) - 60} more")

    if unchanged:
        print(f"\nAlready up-to-date: {len(unchanged)}")
        for ln, path in unchanged:
            print(f"  · lucide:{ln} → {path}")

    if no_snippet:
        print(f"\nSkipped — no project snippet: {len(no_snippet)}")
        for ln, suffix in no_snippet:
            print(f"  · lucide:{ln} → looked for icon-{suffix}.liquid (not found)")
        print(f"\n  → Resolution: edit {ALIAS_MAP_PATH.relative_to(PROJECT_ROOT)}")
        print(f"    Add {{\"<lucide-name>\": \"<existing-snippet-suffix>\"}} for each above, OR")
        print(f"    Hand-create icon-<suffix>.liquid then re-run.")

    if not_in_lucide:
        print(f"\nNot in Lucide library (CDN 404): {len(not_in_lucide)}")
        for ln in not_in_lucide:
            print(f"  · {ln}")
        print(f"\n  → These names appeared in design's data-lucide= but Lucide doesn't ship them.")
        print(f"    Either the name is a typo in design, or it's a custom non-lucide icon.")

    if malformed:
        print(f"\nSnippet has no <svg> block: {len(malformed)}")
        for ln, path in malformed:
            print(f"  · {path}")

    if not args.dry_run and refreshed:
        print(f"\nNext: review changes with `git diff src/snippets/icons/`")

    return 0


if __name__ == "__main__":
    sys.exit(main())
