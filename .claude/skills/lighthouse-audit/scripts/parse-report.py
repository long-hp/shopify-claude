#!/usr/bin/env python3
"""parse-report.py — compact a Lighthouse JSON report for the lighthouse-audit skill.

A raw Lighthouse JSON report is multi-MB; loading it into the model context is
wasteful. This script reads one or more report JSONs and prints a small text
summary: per-category scores, the 5 Core-Web-Vitals-ish metrics, and the top
failing audits (score < pass threshold) per category, sorted by weight so the
highest-impact problems surface first.

Usage:
    parse-report.py <report.json> [<report2.json> ...] [--pass 90] [--top 8]

Each JSON's form-factor (mobile/desktop) is read from the report itself
(configSettings.formFactor), so you can pass mobile + desktop in any order.

Output is plain text grouped by report; designed to be pasted near-verbatim
into the skill's digest.
"""
import argparse
import json
import sys

CATEGORY_ORDER = ["performance", "accessibility", "best-practices", "seo"]
CATEGORY_LABEL = {
    "performance": "Performance",
    "accessibility": "Accessibility",
    "best-practices": "Best Practices",
    "seo": "SEO",
}
# The metric audit ids Lighthouse exposes, in the order we report them.
METRIC_IDS = [
    ("first-contentful-paint", "FCP"),
    ("largest-contentful-paint", "LCP"),
    ("total-blocking-time", "TBT"),
    ("cumulative-layout-shift", "CLS"),
    ("speed-index", "Speed Index"),
]


def pct(score):
    """Lighthouse scores are 0..1 floats (or null for informative audits)."""
    return None if score is None else round(score * 100)


def load(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def summarize(report, pass_threshold, top_n):
    lines = []
    cfg = report.get("configSettings", {})
    form = cfg.get("formFactor", "?")
    url = report.get("finalDisplayedUrl") or report.get("finalUrl") or report.get("requestedUrl", "?")
    fetch_time = report.get("fetchTime", "")
    lh_ver = report.get("lighthouseVersion", "")

    lines.append(f"### {form.upper()} — {url}")
    if fetch_time:
        lines.append(f"_fetched {fetch_time} · lighthouse {lh_ver}_")
    lines.append("")

    cats = report.get("categories", {})
    audits = report.get("audits", {})

    # --- Category score table -------------------------------------------------
    lines.append("| Category | Score | Verdict |")
    lines.append("|----------|-------|---------|")
    for cat in CATEGORY_ORDER:
        c = cats.get(cat)
        if not c:
            continue
        s = pct(c.get("score"))
        if s is None:
            verdict = "n/a"
            sdisp = "—"
        else:
            verdict = "PASS ✅" if s >= pass_threshold else "FAIL ❌"
            sdisp = str(s)
        lines.append(f"| {CATEGORY_LABEL[cat]} | {sdisp} | {verdict} |")
    lines.append("")

    # --- Key metrics ----------------------------------------------------------
    metric_bits = []
    for aid, label in METRIC_IDS:
        a = audits.get(aid)
        if a and a.get("displayValue"):
            metric_bits.append(f"{label} {a['displayValue']}")
    if metric_bits:
        lines.append("**Metrics:** " + " · ".join(metric_bits))
        lines.append("")

    # --- Failing audits per category -----------------------------------------
    for cat in CATEGORY_ORDER:
        c = cats.get(cat)
        if not c:
            continue
        fails = []
        for ref in c.get("auditRefs", []):
            aid = ref.get("id")
            weight = ref.get("weight", 0) or 0
            a = audits.get(aid, {})
            score = a.get("score")
            if score is None:
                continue  # informative / manual audit — no pass/fail
            if score >= 0.9:
                continue  # treat >=0.9 as effectively passing at the audit level
            fails.append({
                "id": aid,
                "title": a.get("title", aid),
                "score": pct(score),
                "weight": weight,
                "display": a.get("displayValue", ""),
            })
        # Sort by weight desc (impact on the category score), then score asc.
        fails.sort(key=lambda f: (-f["weight"], f["score"] if f["score"] is not None else 0))
        if not fails:
            continue
        lines.append(f"**{CATEGORY_LABEL[cat]} — failing audits (top {top_n}):**")
        for f in fails[:top_n]:
            wtag = f"w{f['weight']}" if f["weight"] else "w0"
            disp = f" — {f['display']}" if f["display"] else ""
            lines.append(f"- [{wtag}] {f['title']} (audit `{f['id']}`, score {f['score']}){disp}")
        remaining = len(fails) - top_n
        if remaining > 0:
            lines.append(f"- …and {remaining} more lower-impact audit(s).")
        lines.append("")

    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Compact Lighthouse JSON report(s) into a text summary.")
    ap.add_argument("reports", nargs="+", help="path(s) to lighthouse .report.json")
    ap.add_argument("--pass", dest="pass_threshold", type=int, default=90,
                    help="category pass threshold 0-100 (default 90)")
    ap.add_argument("--top", dest="top_n", type=int, default=8,
                    help="max failing audits to list per category (default 8)")
    args = ap.parse_args()

    blocks = []
    for path in args.reports:
        try:
            report = load(path)
        except (OSError, json.JSONDecodeError) as e:
            print(f"WARN: could not read {path}: {e}", file=sys.stderr)
            continue
        blocks.append(summarize(report, args.pass_threshold, args.top_n))

    if not blocks:
        print("ERROR: no readable reports.", file=sys.stderr)
        sys.exit(1)

    print("\n\n".join(blocks))


if __name__ == "__main__":
    main()
