#!/usr/bin/env python3
"""Extract element refs from a saved Playwright snapshot by label.

A full Theme Editor `browser_snapshot` is ~60KB of YAML — too big to scan by
eye and wasteful to pull into context. Save it to a file (snapshot's `filename`
param) and run this to pull just the refs you need, with their role + name, so
you can pass the ref straight to browser_click / browser_type.

Usage:
    python grep-refs.py <snapshot-file> [<label-substring> ...]

Examples:
    python grep-refs.py panel.md "Add section" "Heading"
    python grep-refs.py panel.md            # no label -> every ref + role/name

Labels match the element's NAME (not the whole line), case-insensitive — so
"Heading" finds the field labelled Heading, not every `heading`-role element.
Both name shapes are handled:  - button "Add section" [ref=f2e169]
                               - generic [ref=f2e1273]: Heading
"""
import re
import sys

REF_RE = re.compile(r"\[ref=([a-z]?\d*e\d+)\]")
# role is the first token after the leading "- "
ROLE_RE = re.compile(r"-\s*([a-zA-Z]+)\b")
# name as a quoted string:  role "the name" [...]
QUOTED_NAME_RE = re.compile(r"-\s*[a-zA-Z]+\s+\"([^\"]*)\"")
# name after the ref, colon-style:  generic [ref=..]: the name
COLON_NAME_RE = re.compile(r"\[ref=[^\]]+\]\s*:\s*(.+?)\s*$")


def parse(line):
    """Return (ref, role, name) for a snapshot line, or None if no ref."""
    m = REF_RE.search(line)
    if not m:
        return None
    ref = m.group(1)
    role = (ROLE_RE.search(line) or [None, "?"])[1]
    qn = QUOTED_NAME_RE.search(line)
    cn = COLON_NAME_RE.search(line)
    name = qn.group(1) if qn else (cn.group(1) if cn else "")
    return ref, role, name


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1

    path = argv[1]
    labels = [a.lower() for a in argv[2:]]

    try:
        lines = open(path, encoding="utf-8").read().splitlines()
    except OSError as e:
        print(f"cannot read {path}: {e}", file=sys.stderr)
        return 1

    hits = []
    for line in lines:
        parsed = parse(line)
        if not parsed:
            continue
        ref, role, name = parsed
        if labels and not any(lbl in name.lower() for lbl in labels):
            continue
        hits.append((ref, role, name))

    if not hits:
        what = f" matching {labels}" if labels else ""
        print(f"no refs{what} in {path}", file=sys.stderr)
        return 1

    # stable order: by role then name, so similar controls group together
    for ref, role, name in sorted(hits, key=lambda h: (h[1], h[2])):
        print(f"{ref:>10}  {role:<10} {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
