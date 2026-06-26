---
name: lighthouse-audit
description: "Use to run Google Lighthouse against a STOREFRONT URL and get the numeric quality SCORES for the ported Shopify theme — Performance, Accessibility, Best Practices, SEO — plus Core Web Vitals (LCP, CLS, TBT, FCP, Speed Index) measured pass/fail against a 90+ bar. A read-only, stateless radar that reports then HANDS OFF fixes to polish / design-to-liquid; it changes nothing itself. Triggers: `/lighthouse-audit`, \"đo lighthouse\", \"chạy lighthouse\", \"điểm lighthouse\", \"lighthouse score\", \"check performance\", \"đo performance\", \"kiểm tra hiệu năng\", \"performance audit\", \"core web vitals\", \"LCP/CLS/TBT\", \"check SEO score\", \"đo SEO\", \"kiểm tra best practices\", \"đo điểm a11y runtime\", \"có đạt chuẩn điểm chưa\", \"is the theme fast enough\". The user supplies the finished storefront URL each run (it cannot audit the admin /editor URL). IMPORTANT disambiguation: for STATIC markup accessibility review (alt text, aria-label, heading order) use `polish` — this skill is the RUNTIME numeric score (incl. rendered-DOM contrast) and hands a11y fixes to polish; for driving the live Theme Editor for responsive/visual QA use `editor-qa` — this skill runs the Lighthouse CLI for SCORES, not visual QA. Do NOT use it to port a design (design-to-liquid) or audit the .claude system (system-upgrade)."
argument-hint: "<storefront-url> (e.g. https://store.myshopify.com/?preview_theme_id=ID)"
---

# lighthouse-audit

**"What's the theme's Lighthouse score on this URL, does it pass, and who fixes what fails?"**

A read-only, **stateless** radar. It runs Google Lighthouse (all four categories) against a storefront URL, reports scores + Core Web Vitals against a 90+ pass bar, then routes the failing audits to the skill that owns the fix. It **applies nothing** and keeps no ledger.

```
[lighthouse-audit]  →  scores + metrics + failing audits (cited to audit ids)
       ↓ (failing items, by category)
   polish          →  static markup a11y fixes
   design-to-liquid→  image/markup/Liquid perf fixes
   (flag only)     →  app/platform perf · SEO/Best-Practices references
```

Keeping the radar (this skill) separate from the fix (polish / design-to-liquid) is the point: it stays a cheap, safe "do we pass?" check that never mutates `src/`.

## When NOT to use this — pick the sibling instead

- **Static markup a11y** (is there alt text / an aria-label / correct heading order in the `.liquid`?) → **`polish`**. This skill measures the *rendered* score and hands a11y findings to polish.
- **Live-editor responsive / visual QA** (does the section look right on mobile in the real editor?) → **`editor-qa`**.
- **Porting a design** → **`design-to-liquid`**. **Auditing the `.claude` system** → **`system-upgrade`**.

## Step 1 — Get a valid target URL

This skill is stateless: **the user supplies the finished storefront URL**. If none was given, ask for it (and which pages matter — home / a product / a collection).

The target **must be a storefront page**, not the admin editor. The repo's `.editor` file is the auth-walled Theme Editor and is **not** valid — the runner refuses any `/admin/` or `/editor` URL. Valid shapes (see `references/setup.md`):

- Theme preview: `https://<store>.myshopify.com/?preview_theme_id=<THEME_ID>` (theme id = the number in `.editor`).
- Published storefront page.

If the store has a **storefront password** (common on dev/preview stores), Lighthouse will silently audit the password splash page and the scores are meaningless. If results look suspiciously empty/perfect, suspect this and ask the user to disable the password or give a public URL — don't report password-page scores. (`references/setup.md` → "Password-page caveat".)

## Step 2 — Run Lighthouse (both form-factors)

Run the bundled wrapper. It audits **mobile and desktop** (Shopify perf is mobile-weighted, but merchants see both) and writes JSON+HTML to `.lighthouse/`:

```bash
bash .claude/skills/lighthouse-audit/scripts/run-lighthouse.sh "<storefront-url>" .lighthouse both
```

`npx --yes lighthouse` fetches Lighthouse on demand (nothing installed into the repo) and drives headless Chrome. The first run may take a bit while npm downloads it. It prints the JSON report paths on its final stdout lines.

For several pages, run it once per URL.

## Step 3 — Compact the report (don't read raw JSON)

A raw Lighthouse JSON is multi-MB. Use the parser to extract just scores + metrics + top failing audits (sorted by weight = impact):

```bash
python .claude/skills/lighthouse-audit/scripts/parse-report.py \
  .lighthouse/<stem>-mobile.report.json \
  .lighthouse/<stem>-desktop.report.json --pass 90
```

Paste the parser's output near-verbatim into the digest. The default pass bar is 90 (green); use `--pass 80` only if the user explicitly wants a softer early-stage bar. Thresholds and what each metric means are in `references/thresholds.md`.

## Step 4 — Report + hand off

Produce a compact digest. Lead with the verdict so status is visible first.

```markdown
# Lighthouse — <url>   ·   <fetch date from report>

**Verdict:** <one line, e.g. "mobile FAILS Performance (62) + A11y (88); desktop passes all">

<paste parse-report.py output: per-form-factor score table + metrics + failing audits>

## Handoff
**→ polish** (static markup a11y): …
**→ design-to-liquid** (image/markup perf): …
**Flag only — app/platform (not theme-owned):** …
**Flag only — SEO / Best-Practices (reference):** …
```

State **PASS/FAIL per category per form-factor** — a theme can pass desktop and fail mobile. Route every failing audit via `references/handoff.md`:

- **Accessibility** audits → **`polish`** (mark `color-contrast` and other rendered-only items as "runtime-detected" so polish verifies against the live render).
- **Performance** audits on **theme-owned** resources (oversized/unsized images, render-blocking theme CSS/JS, lazy-loaded LCP, high CLS) → **`design-to-liquid`**.
- **Performance** audits on **third-party/app/Shopify-injected** resources → **flag only, "not theme-owned"**. Apps routinely depress the Performance score on a perfectly good theme — split these out so the user isn't chasing a non-theme problem (`references/thresholds.md` → Shopify caveat).
- **Best Practices / SEO** → flag with the Lighthouse/shopify.dev reference; route to `design-to-liquid` only if it traces to theme template/markup.

## What this skill writes

Only the Lighthouse report files in `.lighthouse/` (throwaway). **Don't commit them** — suggest gitignoring `.lighthouse/` if needed. No `.agent-state/` entry, no ledger: per project policy, skill/system traces live in git history, and this skill doesn't move the theme port forward on its own. Surface the HTML report path so the user can open the full interactive report.

## References

- `references/setup.md` — prerequisites, getting a Shopify preview URL, password-page caveat, multi-page runs, git/output handling.
- `references/thresholds.md` — pass bar per category, the 5 metrics + good values, and the app-script vs theme-owned perf split.
- `references/handoff.md` — full audit-id → fixing-skill routing table + the handoff block format.
