#!/usr/bin/env python3
from __future__ import annotations
"""
Liquid anti-pattern validator for this Shopify theme.

Catches Liquid mistakes that COMPILE but misbehave at runtime — the kind a
schema validator can't see because they live in markup, not schema.js. Run it
after writing/editing ANY .liquid file, the same way validate-schema.py is run
after a schema edit.

v1 rule set (intentionally small — grow it as new classes of bug surface):

  assign-with-condition
    `{% assign x = a != blank %}` does NOT evaluate the comparison. Liquid's
    `assign` takes a single VALUE (a variable/literal, optionally piped through
    filters) — it is not an expression evaluator, so comparison / logical
    operators (== != <> > < >= <= , contains / and / or) are not understood on
    an assign's right-hand side. The variable does not become the boolean you
    expect.
    Fix A: branch — `assign x = false` then `if … / assign x = true / endif`.
    Fix B: skip the flag — put the comparison straight in `{% if … %}`.
    See the liquid skill: references/gotchas.md #31.

Both Liquid assign shapes are scanned:
  - tag form:    {% assign x = … %}  /  {%- assign x = … -%}
  - prelude form: bare `assign x = …` lines inside a {%- liquid … -%} block

Usage:
  python scripts/validate-liquid.py src/sections/<name>/           # every .liquid under a dir
  python scripts/validate-liquid.py src/sections/<name>/x.liquid   # one file
  python scripts/validate-liquid.py --all                          # every .liquid under src/

Exit codes:
  0  no anti-patterns found
  1  at least one anti-pattern found
  2  missing files / bad invocation
"""
import argparse
import re
import sys
from pathlib import Path


# ─── project root (only needed for --all) ────────────────────────────────────
# An explicit file/dir target does NOT need a project root, so the validator
# stays usable in the portable .claude distribution repo (no package.json) and
# is self-testable against an ad-hoc fixture path.
def _find_src_root() -> Path | None:
    p = Path(__file__).resolve()
    for parent in (p, *p.parents):
        if (parent / "src").is_dir():
            return parent
    return None


# ─── tiny logger (mirrors validate-schema.py) ─────────────────────────────────
def _color(code: int, s: str) -> str:
    return f"\033[{code}m{s}\033[0m" if sys.stdout.isatty() else s

def heading(msg: str) -> None:
    print(f"\n{_color(1, msg)}")

def err_line(msg: str) -> None:
    print(f"  {_color(31, '✗')} {msg}")

def ok(msg: str) -> None:
    print(f"  {_color(32, '✓')} {msg}")


# ─── rule: assign-with-condition ──────────────────────────────────────────────
_STRING_RE = re.compile(r"'[^']*'|\"[^\"]*\"")

def _clean_rhs(rhs: str) -> str:
    """Neutralise everything that could carry an operator-looking character
    WITHOUT being an operator: string literals (`'>'`, `'#fff'`, `'a and b'`)
    and trailing `#` line-comments inside a {% liquid %} block. Strings go
    first so a `#` inside a hex literal is gone before the comment split."""
    s = _STRING_RE.sub(" ", rhs)
    s = s.split("#", 1)[0]
    return s

# Multi-char operators first so `>=` isn't mis-reported as `>`.
_COMPARISON_OPS = ["==", "!=", "<>", ">=", "<=", ">", "<"]
_WORD_OPS = ["contains", "and", "or"]

def _offending_op(rhs: str) -> str | None:
    clean = _clean_rhs(rhs)
    for op in _COMPARISON_OPS:
        if op in clean:
            return op
    for w in _WORD_OPS:
        if re.search(r"\b" + w + r"\b", clean):
            return w
    return None


_LIQUID_BLOCK_RE = re.compile(r"\{%-?\s*liquid\b(.*?)-?%\}", re.DOTALL)
_INNER_ASSIGN_RE = re.compile(r"^[ \t]*assign\s+\w+\s*=\s*(.*)$", re.MULTILINE)
_TAG_ASSIGN_RE   = re.compile(r"\{%-?\s*assign\s+\w+\s*=\s*(.*?)\s*-?%\}")

def _lineno(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1

def scan_text(text: str) -> list[tuple[int, str, str]]:
    """Return sorted unique (lineno, operator, snippet) for each offending assign."""
    hits: set[tuple[int, str, str]] = set()

    # prelude form — bare `assign` lines inside {%- liquid … -%}
    for block in _LIQUID_BLOCK_RE.finditer(text):
        inner, base = block.group(1), block.start(1)
        for a in _INNER_ASSIGN_RE.finditer(inner):
            op = _offending_op(a.group(1))
            if op:
                hits.add((_lineno(text, base + a.start()), op, a.group(0).strip()))

    # tag form — {% assign x = … %}
    for a in _TAG_ASSIGN_RE.finditer(text):
        op = _offending_op(a.group(1))
        if op:
            hits.add((_lineno(text, a.start()), op, a.group(0).strip()))

    return sorted(hits)


# ─── driver ───────────────────────────────────────────────────────────────────
def gather_targets(target: str | None, do_all: bool) -> list[Path]:
    if do_all:
        root = _find_src_root()
        if root is None:
            print(_color(31, "✗ --all needs a project root containing src/ — none found above this script"),
                  file=sys.stderr)
            sys.exit(2)
        return sorted((root / "src").rglob("*.liquid"))
    p = Path(target).resolve()
    if p.is_dir():
        return sorted(p.rglob("*.liquid"))
    if p.is_file():
        return [p]
    print(_color(31, f"✗ not found: {p}"), file=sys.stderr)
    sys.exit(2)


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("target", nargs="?",
                    help="A .liquid file or a directory to scan recursively.")
    ap.add_argument("--all", action="store_true",
                    help="Scan every .liquid under src/.")
    args = ap.parse_args()

    if not args.target and not args.all:
        ap.print_help()
        print(_color(33, "\nNothing to validate — pass a .liquid file, a directory, or --all."))
        sys.exit(2)

    files = gather_targets(args.target, args.all)
    if not files:
        print(_color(33, "No .liquid files found at the given target."))
        sys.exit(0)

    total = 0
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as e:
            heading(f"─── {f} ───")
            err_line(f"could not read: {e}")
            continue
        hits = scan_text(text)
        if not hits:
            continue
        try:
            label = f.relative_to(Path.cwd())
        except ValueError:
            label = f
        heading(f"─── {label} ───")
        for lineno, op, snippet in hits:
            total += 1
            err_line(f"L{lineno}: assign with `{op}` — `assign` takes a value, not a condition.")
            print(f"      {snippet}")
            print(f"      fix: branch with if/assign true|false, or put `{op}` straight in {{% if %}}. "
                  f"(liquid gotchas.md #31)")

    print()
    if total:
        print(_color(31, f"✗ {total} assign-with-condition error(s) across {len(files)} file(s) scanned"))
        sys.exit(1)
    print(_color(32, f"✅ No Liquid anti-patterns found ({len(files)} file(s) scanned)"))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
