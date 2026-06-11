#!/usr/bin/env python3
"""
Polish detector — scans ONE target (section/snippet/page/group dir) and flags
candidate polish opportunities across the three dimensions: a11y, xo-animate, xo-hover.

It emits CANDIDATES, not verdicts. Liquid is dynamic (alt/aria can be injected via a
filter, a wrapping element, or a setting), so the polish skill must open the file and
confirm before proposing a change. Same spirit as design-sync's PROGRESS-mention hints.

Usage:
  python .claude/skills/polish/scripts/scan-target.py src/sections/<name>/
  python .claude/skills/polish/scripts/scan-target.py src/snippets/<name>/ --json
  python .claude/skills/polish/scripts/scan-target.py --sweep            # one block per src/sections/*

Exit codes:
  0  scanned ok
  1  target not found / not a directory
"""
import argparse
import json
import re
import sys
from pathlib import Path


def _find_root() -> Path:
    p = Path(__file__).resolve()
    for parent in (p, *p.parents):
        if (parent / "package.json").exists() and (parent / "src").is_dir():
            return parent
    print("error: project root not found", file=sys.stderr)
    sys.exit(1)


# Raw <img ...> tags (not the image_tag filter, which emits alt for you).
_IMG = re.compile(r"<img\b[^>]*>", re.IGNORECASE | re.DOTALL)
_ICON_RENDER = re.compile(r"render\s+['\"]icons?/|render\s+['\"]icon['\"]", re.IGNORECASE)


def _scan_dir(target: Path) -> dict:
    liquid = sorted(target.rglob("*.liquid"))
    scss = sorted(target.rglob("*.scss"))

    liquid_text = "\n".join(_safe_read(f) for f in liquid)
    scss_text = "\n".join(_safe_read(f) for f in scss)

    imgs = _IMG.findall(liquid_text)
    img_no_alt = [t for t in imgs if "alt=" not in t.lower()]

    res = {
        "target": str(target),
        "liquid_files": len(liquid),
        "scss_files": len(scss),
        # ── a11y candidates ──
        "img_raw": len(imgs),
        "img_raw_without_alt": len(img_no_alt),
        "icon_renders": len(_ICON_RENDER.findall(liquid_text)),
        "aria_label": liquid_text.lower().count("aria-label"),
        "aria_hidden": liquid_text.lower().count("aria-hidden"),
        "buttons": len(re.findall(r"<button\b", liquid_text, re.IGNORECASE)),
        "links": len(re.findall(r"<a\b", liquid_text, re.IGNORECASE)),
        "form_controls": len(re.findall(r"<(input|select|textarea)\b", liquid_text, re.IGNORECASE)),
        "div_onclick": len(re.findall(r"<(div|span)\b[^>]*\bonclick", liquid_text, re.IGNORECASE)),
        # ── scss / motion ──
        "scss_outline_none": len(re.findall(r"outline\s*:\s*(none|0)", scss_text, re.IGNORECASE)),
        "scss_focus_visible": scss_text.lower().count(":focus-visible"),
        "scss_keyframes": scss_text.lower().count("@keyframes"),
        "scss_transition": len(re.findall(r"\btransition\s*:", scss_text, re.IGNORECASE)),
        "reduced_motion": (liquid_text + scss_text).lower().count("prefers-reduced-motion"),
        # ── motion/interaction already present? ──
        "has_xo_animate": "xo-animate" in liquid_text,
        "has_xo_hover": "xo-hover" in liquid_text,
        "has_xo_effect": "xo-effect" in liquid_text,
    }
    res["flags"] = _derive_flags(res)
    return res


def _safe_read(f: Path) -> str:
    try:
        return f.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _derive_flags(r: dict) -> list[str]:
    """Human-readable candidate flags. Each is a CANDIDATE to verify, not a confirmed issue."""
    f = []
    # a11y
    if r["img_raw_without_alt"]:
        f.append(f"♿ {r['img_raw_without_alt']} raw <img> with no alt= — verify each (decorative → alt=\"\")")
    if r["icon_renders"] and r["icon_renders"] > r["aria_label"]:
        f.append(f"♿ {r['icon_renders']} icon render(s) vs {r['aria_label']} aria-label — possible icon-only controls without an accessible name")
    if r["form_controls"] and r["aria_label"] == 0:
        f.append(f"♿ {r['form_controls']} form control(s), 0 aria-label — confirm each has a <label for> or aria-label")
    if r["div_onclick"]:
        f.append(f"♿ {r['div_onclick']} <div/span onclick> — should be <button>/<a> for keyboard + AT")
    if r["scss_outline_none"] and not r["scss_focus_visible"]:
        f.append(f"♿ outline:none/0 ({r['scss_outline_none']}) without any :focus-visible — focus may be invisible")
    if (r["scss_keyframes"] or r["scss_transition"]) and not r["reduced_motion"]:
        f.append("♿ @keyframes/transition present, no prefers-reduced-motion guard — add reduced-motion fallback")
    # animation opportunity
    if not r["has_xo_animate"]:
        f.append("✨ no xo-animate in target — candidate for scroll-reveal (default xo-cascade); confirm against design")
    else:
        f.append("✨ xo-animate already present — don't double-wrap; check it's configured well")
    # hover opportunity
    if not r["has_xo_hover"] and not r["has_xo_effect"]:
        f.append("🖱 no xo-hover/xo-effect — candidate for hover reveal IF the design has hidden-on-hover content")
    else:
        f.append("🖱 xo-hover/xo-effect already present — reuse, don't add a parallel hover")
    return f


def _emit(results: list[dict], as_json: bool) -> None:
    if as_json:
        print(json.dumps(results if len(results) > 1 else results[0], indent=2, ensure_ascii=False))
        return
    for r in results:
        print(f"## {r['target']}  ({r['liquid_files']} liquid · {r['scss_files']} scss)")
        if not r["flags"]:
            print("  (no candidate flags)\n")
            continue
        for fl in r["flags"]:
            print(f"  - {fl}")
        print()
    print("> Flags are CANDIDATES — open the file and confirm before proposing a change. "
          "Counts can't see aria injected via filters/wrappers or alt on a wrapping element.")


def main() -> int:
    ap = argparse.ArgumentParser(description="Polish detector — a11y / xo-animate / xo-hover candidates.")
    ap.add_argument("target", nargs="?", help="path to a section/snippet/page/group dir")
    ap.add_argument("--sweep", action="store_true", help="scan every src/sections/* dir")
    ap.add_argument("--json", action="store_true", help="emit JSON")
    args = ap.parse_args()

    root = _find_root()

    if args.sweep:
        sec = root / "src/sections"
        targets = sorted(d for d in sec.iterdir() if d.is_dir())
    elif args.target:
        t = Path(args.target)
        if not t.is_absolute():
            t = root / args.target
        if not t.is_dir():
            print(f"error: {t} is not a directory", file=sys.stderr)
            return 1
        targets = [t]
    else:
        print("error: pass a target dir or --sweep", file=sys.stderr)
        return 1

    results = [_scan_dir(t) for t in targets]
    _emit(results, args.json)
    return 0


if __name__ == "__main__":
    sys.exit(main())
