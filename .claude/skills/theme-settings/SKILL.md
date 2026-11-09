---
name: theme-settings
description: "Install and configure the <xo-theme-settings> floating 'try the theme' panel on a Shopify DEMO store: a fixed button opens a drawer where visitors swap header / footer / any section for other designs (via ?section_id=), change colors, corner radius, fonts, toggle classes, hide sections, apply presets, or jump to other preset demo stores. Use this skill WHENEVER the user wants a demo customizer / style switcher / 'theme settings panel' / 'bảng tuỳ biến' / 'cho khách thử đổi header footer trên demo' / 'nút cài đặt nổi trên store demo' / 'đổi giao diện section ở demo' / 'link sang các preset demo' — even if they don't name xo-theme-settings. It audits the whole theme first, interviews the user for missing choices, then writes the component, the schema and the layout hook. NOT for Shopify's own theme editor settings (settings_schema.json for merchants) — that is the schema skill."
argument-hint: "<what visitors should be able to change> (e.g. 'đổi 3 kiểu header, 2 footer, màu chính, bo góc, link sang 2 preset')"
---

# /theme-settings — demo-store customizer (`<xo-theme-settings>`)

## Identity

One job: put a working `<xo-theme-settings>` panel on the theme's **demo storefront** with a schema that matches
**this** theme — its real sections, its real CSS variables / classes, its real corner-radius mechanism — so a
prospective buyer can preview variations live, then Apply or Reset.

The component already exists (bundled in `assets/theme-settings.ts`); this skill does not redesign it. The value
this skill adds is **correct configuration**: targets that actually match the theme's DOM, variant section ids that
actually exist, CSS variables / classes the theme actually reads. A schema written from guesses renders a panel
whose buttons do nothing — that is the failure mode to avoid, and why the audit comes before any writing.

Chat in the user's language; write code, schema labels the user didn't dictate, comments and file contents in
English (project convention). Visible panel labels follow whatever language the user wants their visitors to see —
ask if unclear (default: the store's main language).

## When to use / not

- Use: a floating settings / style-switcher panel for the demo store; letting visitors swap header/footer/section
  designs, colors, radius, fonts; preset cards linking to other demo stores; editing an existing
  `<xo-theme-settings>` schema.
- Not: merchant-facing theme settings in the Shopify editor (`settings_schema` → `schema` skill); building the
  variant sections themselves (`design-to-liquid` / `build-page`); authoring a brand-new web component
  (`web-components`).

## Workflow

### 1. Audit the theme first (always, before asking or writing)

Read `references/theme-audit.md` and run its checklist. Minimum to know before step 2:

- How scripts are loaded: the Vite entry `src/main.ts` (the component is imported there explicitly). Are `xo-critical` and
  `xo-webcomponents` (JS **and** CSS) loaded in `layout/theme.liquid`? The panel needs both (xo-modal, xo-collapse).
- Section inventory: header / footer / announcement groups (`src/groups/*/…-group.json`), sections under
  `src/sections/`, and any "showcase" variant sections. Record each section's **type / file name** (that is the
  `section_id` the panel requests) and the wrapper id pattern on the storefront (`shopify-section-sections--…__header`).
- Global look controls the theme already has: corner radius (e.g. `settings.corner_radius` →
  `xo-border-radius--{none|xs|sm|md|lg}` on **body** or **html** — check `layout/theme.liquid`), color scheme CSS
  variables (where `--color-*` are emitted, e.g. a `xotiny-theme` snippet), typography variables, button style
  classes, dark mode attribute.
- Whether a `<xo-theme-settings>`, `src/theme-settings.ts` or an `import "./theme-settings"` in `src/main.ts` already exists (then you are editing, not
  installing).

Summarize what you found to the user in 5–10 lines before asking anything.

### 2. Interview for what's missing

Only ask what the request + audit don't already answer. Use `AskUserQuestion` (2–4 questions per round, offer a
recommended option first). Typical gaps — see `references/interview.md` for the full question bank:

- Which sections are swappable and which **variant section ids** to offer (they must exist as section files; if they
  don't yet, say so and offer placeholders the user will build later).
- Which global controls to expose (radius, accent color, font pairing, button style, dark mode, section visibility).
- Preset demo stores for `link` cards (URLs, open in new tab?, keep current path?).
- Where/when to show the panel: every page, only on the demo store (guard by a theme setting, by
  `shop.permanent_domain`, or always), and `{% unless request.design_mode %}`.
- Button label/position, drawer title, footer button labels, visible-label language.

Don't invent variant sections, URLs or brand colors — ask. If the user says "you decide", choose sensibly from the
audit and state the choices.

### 3. Write the files

1. **Component**: copy `assets/theme-settings.ts` to **`src/theme-settings.ts`** (directly in the theme's `src/`, not
   `src/scripts/`), then import it in **`src/main.ts`** with one line next to the other imports:
   `import "./theme-settings";`. Skip the copy if an identical/newer file is already there, and never add the import
   twice. Don't edit the component to fit a schema — the schema adapts to the theme, not the component.
2. **Schema**: build it per `references/schema-reference.md`. Rules that matter most:
   - `section-swap.target`: prefer `match` (id suffix like `"__header"`, or a class on `.shopify-section`), then
     `selector`, `index` last (fragile).
   - Each option's `section` = the variant's section file name; renders with that file's **default settings**.
   - Global radius: `{ "type": "select", "id": "radius", "target": "<body|html per audit>", "class": "xo-border-radius--", … }`.
   - Colors/ranges target the CSS variables the theme actually reads.
   - Thumbnails: use inline SVG data URIs (see step 4); keep `image` keys so the user can swap in screenshots later.
   - Every id unique; preset `values` reference existing ids.
3. **Liquid hook**: a small snippet (follow the theme's snippet convention — consult the `snippet` skill) that
   captures the JSON and outputs
   `<xo-theme-settings xo-schema="{{ schema_json | strip_newlines | escape }}"></xo-theme-settings>`,
   rendered from `layout/theme.liquid` just before `</body>` inside the agreed guard. `| escape` is mandatory —
   unescaped JSON quotes truncate the attribute. Template: `references/liquid-hook.md`.

### 4. Thumbnails

Generate SVG data URIs with `node scripts/thumb.mjs <kind> [...]` (kinds: header-left, header-center,
header-burger, header-topbar, footer-columns, footer-newsletter, footer-dark, hero-left, hero-split, hero-full,
grid, image-text, swatch:<hex>, preset:<hex>,<hex>). `--list` prints all kinds; `--json` prints a map. Pick the
kind closest to each variant's layout so visitors can tell options apart; the user can later replace any `image`
with a real screenshot URL.

### 5. Validate and verify

- `node scripts/validate-schema.mjs <schema.json|snippet.liquid> --theme src` (add `--placeholders` when the user
  agreed to build some variant sections later) — checks structure (same rules as the component),
  that `section` ids exist as files in the theme, preset values point to real ids, link URLs are http(s), radius
  class prefix matches the theme. Fix every error; review warnings.
- If a dev server / preview is available (playwright MCP or the theme's preview URL), open a page, click the button,
  try each field once, and confirm no console errors. If not, say what you couldn't verify.

### 6. Hand off

Tell the user: files changed, how to show/hide the panel, which variant sections must exist (and any still missing),
how to replace thumbnails with screenshots, and the behaviour rule (changes preview live; **Áp dụng/Apply** saves
& closes; **Đặt lại/Reset** restores the original & keeps the drawer open; **X / Esc / button** resets & closes).
Mention that theme scripts that only re-init on `shopify:section:load` inside `Shopify.designMode` won't re-init a
swapped header on the live demo — the panel fires the event, but those scripts must not be gated by design mode.

## References

| File | Read when |
|---|---|
| `references/theme-audit.md` | Step 1 — what to inspect and how to map theme facts to schema fields |
| `references/interview.md` | Step 2 — question bank with recommended defaults |
| `references/schema-reference.md` | Step 3 — every schema key, field type, behaviour, events, API |
| `references/liquid-hook.md` | Step 3 — snippet + layout templates and guard options |
| `references/example-schema.json` | A complete working schema to adapt (do not paste blindly) |
| `scripts/thumb.mjs` | Step 4 — SVG thumbnail data URIs |
| `scripts/validate-schema.mjs` | Step 5 — schema + theme cross-check |
| `assets/theme-settings.ts` | The component source to install |
