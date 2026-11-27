---
name: stylesheet-scope
argument-hint: "[install | status | exclude <path> | uninstall]"
description: "Use whenever the goal is to make the theme's CSS lighter for PageSpeed / Lighthouse / Core Web Vitals — cut render-blocking CSS, 'unused CSS', a fat styles.css, slow FCP/LCP caused by stylesheets — or whenever the user mentions tách CSS theo section, {% stylesheet %}, CSS per section/snippet, 'css nối một file', 'tối ưu css theme', 'css performance', 'giảm styles.css', 'render-blocking css', 'unused css', 'pagespeed css', or asks why splitting CSS like Dawn made the score WORSE. It installs an idempotent Vite plugin (xo-stylesheet) into an XO theme (vite-xotiny + xo-css pipeline) that compiles each component's `.global.scss` into the `{% stylesheet %}` tag of its own liquid file, so Shopify ships only the CSS of the sections/snippets actually on each page — one early request in <head>, no per-section links in <body>. It finds HTML that arrives via AJAX (quick view, Section Rendering API, predictive search) and keeps that CSS in the shared file, measures before/after, and hands Lighthouse measurement to `lighthouse-audit`. Also use it when a new section/snippet loads via AJAX and its styles vanish, or to answer 'should CSS be split or one file?'. Do NOT use it to author SCSS (`scss`), atomic classes (`xo-css`), or to run Lighthouse itself (`lighthouse-audit`)."
---

# stylesheet-scope

**"Ship each page only the CSS of the sections and snippets that are on it — without adding a single late-discovered request."**

The theme's build concatenates every component's `.global.scss` into one `styles.css` (base-3: 473 KB raw / 60 KB gzip, render-blocking on every page, roughly half of it for sections the page does not have). Splitting it per section the Dawn way (`stylesheet_tag` inside each section) was tried before and **lowered** the Lighthouse score: links in `<body>` are discovered late, each costs a full RTT on Lighthouse's throttled 4G, and small files compress worse. See `references/why-not-dawn-split.md` before proposing that again.

Shopify's `{% stylesheet %}` tag solves exactly this: Shopify gathers the CSS of every liquid file in the page's **render tree** into one generated file linked from `content_for_header` (in `<head>`, pushed by Early Hints). A section dragged into any page carries its CSS with it; a page without the section never receives it. Full behaviour and limits: `references/shopify-stylesheet-tag.md`.

This skill installs a Vite plugin that does the plumbing in the existing vite-xotiny pipeline, decides what must stay shared, and measures.

## When NOT to use this

- Running Lighthouse or reading scores → `lighthouse-audit` (it hands render-blocking / unused-CSS findings on theme CSS to this skill).
- Writing or fixing SCSS for a component → `scss`. Atomic classes → `xo-css`.
- A theme that is not on the vite-xotiny pipeline (no `vite.config.js` with `shopify()` + `xoCssPlugin()`, no `src/styles/main.scss` importing `./global.scss`) — stop at Step 0 and say so; the plugin assumes that layout.

## How it works (read once)

1. vite-xotiny keeps generating `src/styles/global.scss` from every `*.global.scss`. The plugin writes `src/styles/global.shared.scss` = the same list **minus** the files it scopes, and `main.scss` imports the shared file instead. Nothing fights the generator.
2. For each scoped file: prepend the basehtml abstracts (mixins/functions only, no CSS), compile with sass in `expanded` style by default (`cssStyle` in the config; the block must stay readable inside the liquid file, Shopify serves it compressed anyway), inject `{% stylesheet %}…{% endstylesheet %}` into the matching liquid under `shopify/` (before `{% schema %}` for sections, at the end for snippets). Idempotent: the old block is replaced, unchanged files are not rewritten, `--check` exits 1 if anything would change.
3. Dev: it re-injects whenever vite-xotiny regenerates a liquid or a scss changes. Build: it runs at `buildStart` and `closeBundle`.
4. `theme-config/stylesheet.config.json` says what to scope (`include`), what must stay in the shared file (`exclude`), and how to map a scss to liquids when the folder has several (`targets`).

The one thing Shopify cannot know: HTML that arrives **after** the first render (quick view fetched with `?section_id=`, predictive search, product recommendations, cart drawer re-rendered via `?sections=`) is not in the initial render tree, so its `{% stylesheet %}` CSS is never on the page. Those files must stay in the shared CSS. `scripts/find-ajax-sections.mjs` finds them; being conservative here costs a few KB, missing one costs an unstyled quick view.

## Step 0 — Preconditions

From the theme root, confirm:

```bash
ls vite.config.js xo-css.vite-plugin.js src/styles/main.scss theme-config/theme.config.json
grep -n "global.scss\|global.shared.scss" src/styles/main.scss
grep -n "content_for_header\|xo-webcomponents.min.css\|vite-tag' with 'styles" src/layout/theme.liquid
ls ../../html/basehtml/src/styles/abstracts >/dev/null && echo abstracts-ok
```

If `global.shared.scss` is already imported, the plugin is installed: skip to Step 3 (status / exclude maintenance). If the abstracts folder is elsewhere, set `abstractsDir` in the config.

## Step 1 — Measure before

```bash
node .claude/skills/stylesheet-scope/scripts/css-composition.mjs
```

Report the table (raw / gzip / brotli, bytes per group, top files). This is the "before" number for the final report and tells how much is actually section-bound. If `styles.css` is already under ~25 KB gzip, say so and stop — the plugin would add complexity for little gain.

## Step 2 — Install (idempotent, safe to re-run)

1. Copy `assets/xo-stylesheet.vite-plugin.js` → theme root; `assets/xo-stylesheet.mjs` → `scripts/`; `assets/stylesheet.config.json` → `theme-config/` (do not overwrite an existing config).
2. `vite.config.js`: `import xoStylesheetPlugin from "./xo-stylesheet.vite-plugin.js";` and add `xoStylesheetPlugin()` **after** `xoCssPlugin()` in `plugins`.
3. `src/styles/main.scss`: `@import './global.scss';` → `@import './global.shared.scss';` (keep the surrounding order).
4. `.gitignore`: add `src/styles/global.shared.scss` next to the existing `src/styles/global.scss` line (both are generated).
5. `package.json` scripts: `"stylesheet": "node scripts/xo-stylesheet.mjs"`, `"stylesheet:check": "node scripts/xo-stylesheet.mjs --check"`.
6. `src/layout/theme.liquid`: move `{{ 'xo-webcomponents.min.css' | asset_url | stylesheet_tag }}` and `{% render 'vite-tag' with 'styles/main.scss' %}` **above** `{{ content_for_header }}` (Shopify's guidance: base stylesheets before the header tag so they download while sections render and get Early Hints). Keep `{% render 'scripts' %}` and settings adapters where they are.

Show the user the diff of 2, 3 and 6 before writing; they are one-line changes but to shared files.

## Step 3 — Decide what stays shared

```bash
node .claude/skills/stylesheet-scope/scripts/find-ajax-sections.mjs
```

It prints the AJAX entry points it detected (file and pattern that triggered each) and the `.global.scss` files reachable from them through `{% render %}` (tag form and the bare `render 'x'` lines inside `{% liquid %}`), in two groups:

- **HARD** — files that are never in the initial render tree: fetched with `?section_id=` (quick view), predictive search, recommendations, pickup availability. These must stay shared; `--apply` merges them.
- **SOFT** — sections that render initially but are re-fetched later by a web component (`xo-filters`, `xo-cart-mini`, `xo-products-fetcher`…). Their subtree is mostly in the tree already; only children that render for the first time after load are at risk (cart line items when the cart starts empty, "no results" states, lazily shown tabs). Review these: add the specific child snippets, or take all of them with `--apply=all` when you cannot test on a store.

Present both groups, explain that excluded files stay in `styles.css` on every page, and ask the user to confirm or trim. Then:

```bash
node .claude/skills/stylesheet-scope/scripts/find-ajax-sections.mjs --apply        # hard list → stylesheet.config.json
node .claude/skills/stylesheet-scope/scripts/find-ajax-sections.mjs --apply=all    # hard + soft (most conservative)
```

Things the script cannot see — add by hand to `exclude` (folder paths are fine):

- A section whose inner HTML a web component fetches with a URL built in TypeScript, if the tag is not in the script's `FETCHING_TAGS` list (extend the list when you find one).
- Snippets rendered only inside a `{% capture %}` that is injected later by JS.
- A snippet whose classes another file depends on (Shopify subsets per file). `shopify theme check` reports these as `ValidScopedCSSClass` warnings once blocks are injected — see Step 4.

Heavy shared snippets (product card, text, button) will often land in `exclude` because quick view renders them. That is fine: they are on every page anyway, so scoping them saves nothing.

**Leftover Dawn-style links — do this before the AJAX scan.** Some themes still carry an earlier attempt: a non-global `X.scss` next to a section or snippet (vite-xotiny compiles it standalone to `shopify/assets/X.css`) plus `{{ 'X.css' | asset_url | stylesheet_tag }}` at the top of the liquid. Those links stay render-blocking inside `<body>`, which is exactly what this skill removes, and the plugin ignores non-global scss.

```bash
node .claude/skills/stylesheet-scope/scripts/convert-standalone-css.mjs            # dry run: what would be converted / deleted
node .claude/skills/stylesheet-scope/scripts/convert-standalone-css.mjs --apply    # rename to X.global.scss, drop the link line, delete the asset
```

It only converts files that a section/snippet actually links; unlinked ones (dead or linked from a layout) are listed for a manual decision, stale assets with no source are deleted. Layout-level links (`theme.liquid`, `password.liquid`, `gift_card.liquid`, `src/styles/single/`) are left alone. Run the AJAX scan after it so the renamed files (quick view is a typical one) land in `exclude` when they must.

## Step 4 — Run and verify

```bash
node scripts/xo-stylesheet.mjs            # writes global.shared.scss, injects blocks
node scripts/xo-stylesheet.mjs --check    # must print "--check: clean" on a second run
node scripts/xo-stylesheet.mjs --report   # per-file bytes and which liquid each went to
npx vite build                            # styles.css = shared only now
npx shopify theme check --path=shopify    # {% stylesheet %} is a known tag; no new offenses expected
node .claude/skills/stylesheet-scope/scripts/css-composition.mjs   # the "after" number
```

Then run `npx shopify theme check --path=shopify` and grep its output for `ValidScopedCSSClass`: Shopify flags a class used in a file whose `{% stylesheet %}` does not define it, i.e. a cross-file CSS dependency the per-file subsetting would break. For each warning, either keep the defining file's scss shared (add it to `exclude`) or move the rule into the file that uses the class.

Read the plugin's summary carefully:

- **"target liquid not generated yet under shopify/"** — vite-xotiny has not generated that liquid yet (it only does so in dev). Run `npm run dev` once (or `vite` in dev) and re-run; do not create the file by hand.
- **"no liquid next to the scss, kept shared"** — a `.global.scss` with no liquid in its folder is a shared partial; the plugin keeps it in the shared file. Only use `targets` if it really belongs to a specific liquid elsewhere.
- **"duplicate liquid basename"** — two source liquids with the same basename map to one `shopify/` file; the theme should rename one. The plugin merges both CSS blocks meanwhile.
- **"stale block removed"** — a file moved from scoped to `exclude`; the plugin stripped the block it had injected earlier so the CSS now lives only in the shared file. `--check` reports such files until the plugin runs.
- A liquid whose source hand-writes its own `{% stylesheet %}` keeps it: the author's CSS stays first in the block and the compiled scss is appended (Shopify allows one tag per file).

Open one scoped section (`shopify/sections/<name>.liquid`) and one snippet to show the user the injected block, then put the before/after table in the report.

## Step 5 — Measure for real, then watch for missing styles

Hand measurement to `lighthouse-audit` with the protocol in `references/measure.md` (5 runs mobile, compare mean FCP/LCP, not the score). Before that, on a dev theme, click through: home, collection, product, cart, quick view, predictive search, add-to-cart notification, variant change inside quick view, filter pagination, and drag a rare section into home in the editor. Anything that renders unstyled is HTML arriving via AJAX from a scoped file → add its folder to `exclude`, re-run `node scripts/xo-stylesheet.mjs`.

## Report structure

```markdown
# stylesheet-scope — <theme>

| | before | after |
|---|---|---|
| styles.css raw / gzip / brotli | … | … |
| files in {% stylesheet %} | 0 | N (X KB css) |
| kept shared (AJAX / partial) | — | M |

**What a page downloads now:** styles.css (shared) + Shopify's generated stylesheet for the sections on that page, both in <head>.
**Excluded and why:** <grouped list from Step 3>
**Needs a dev-theme check:** quick view, predictive search, cart drawer, editor drag-in.
**Handoff → lighthouse-audit:** URL(s), 5-run protocol (references/measure.md).
**Not in scope, noted:** atomic.scss size, create-effects.scss (hover effects) — separate work.
```

## Day-to-day after install

- New section or snippet with a `.global.scss`: nothing to do; it is scoped automatically on the next dev run.
- New AJAX-loaded content (symptom: it renders unstyled after a fetch): add the folder to `exclude`, run `node scripts/xo-stylesheet.mjs` — it also strips the now-stale block from that liquid. `find-ajax-sections.mjs` will show the new entry point if the fetch URL is in liquid.
- CI / pre-push: `npm run stylesheet:check`.
- `npm run stylesheet -- --cleanup` removes every injected block (then revert `main.scss` and the plugin line to uninstall).
- Liquid inside `{% stylesheet %}` is never rendered: setting-driven values stay as CSS variables on the markup or in `{% style %}`.

## References

- `references/shopify-stylesheet-tag.md` — what Shopify does with the tag, limits, how to verify in DevTools.
- `references/why-not-dawn-split.md` — the measured reasons per-section links lose; what Lighthouse actually rewards.
- `references/measure.md` — before/after protocol, expected numbers, runtime checklist.
- `assets/xo-stylesheet.vite-plugin.js` — the plugin (read its header comment for internals); `assets/xo-stylesheet.mjs` — CLI; `assets/stylesheet.config.json` — config template.
- `scripts/css-composition.mjs` — bytes per source group; `scripts/find-ajax-sections.mjs` — AJAX reachability → exclude list; `scripts/convert-standalone-css.mjs` — converts leftover per-section `stylesheet_tag` links.
