# `<xo-theme-settings>` schema reference

The schema is JSON in the `xo-schema` attribute (parsed with `objectParse`: safe, no code execution; relaxed JSON
like single quotes is tolerated but write strict JSON). Source of truth: `assets/theme-settings.ts` (`validate()`).

## Contents
1. Top level
2. Targets
3. Field types
4. Behaviour (preview / apply / reset)
5. Events, API, styling hooks
6. Gotchas

## 1. Top level

```json
{
  "title": "Customize",                         // drawer title (default "Tuỳ biến giao diện")
  "button": { "label": "Customize", "position": "bottom-right" },
  "drawer": { "overlay": false, "lockScroll": false },
  "footer": { "reset": "Reset", "apply": "Apply" },
  "cache": 600,                                 // seconds section HTML stays in sessionStorage; 0 = memory only
  "groups": [ { "title": "Header", "open": true, "fields": [ … ] } ]
}
```

- `button.position`: `bottom-right` (default) · `bottom-left` · `middle-right` · `middle-left` · `top-right` ·
  `top-left`. `*-left` also opens the drawer from the left.
- `drawer`: default non-blocking (no backdrop, page keeps scrolling, Tab can leave). `overlay: true` adds the
  backdrop + focus trap; `lockScroll: true` locks body scroll.
- `footer.reset` / `footer.apply`: string = label, `false` = hide. Hiding Apply means visitors can never save.
  Hiding both removes the footer.
- `groups[].open: false` starts that group collapsed (groups are `xo-collapse`).
- Every field may have `label` and `info` (hint under the field).

## 2. Targets

Used by `section-swap` (required), `visibility` (required) and optionally `color` / `range` / `toggle` / `select`.

- A **selector string**: `":root"` (default for color/range), `"html"`, `"body"`, `".store"`…
- A **section object** `{ "match"?, "selector"?, "index"?, "inner"? }`, resolved in this order:
  - `match`: substring of the section wrapper id (`"__header"`) or a class on `.shopify-section`;
  - `selector`: any CSS selector (an inner hit resolves to its `.shopify-section` wrapper);
  - `index`: position in `document.querySelectorAll('.shopify-section')` (fallback only);
  - `inner` (non-swap fields): selector inside the found section, e.g. `"header"`.
- Fields whose target is inside a section are re-applied to the new DOM right after that section is swapped
  (before `shopify:section:load`).

## 3. Field types

| type | keys |
|---|---|
| `section-swap` | `id`, `target`, `options: [ { label, value, section, image? } ]` |
| `visibility` | `id`, `target`, `label`, `default?` (true = shown) |
| `color` | `id`, `var` (`--…`), `target?`, `default?` (hex), `swatches?` (hex[]) |
| `range` | `id`, `var`, `min`, `max`, `step`, `unit?`, `target?`, `default?` |
| `toggle` | `id`, `target?`, `attr` + `on` / `off` (empty `off` removes the attribute) **or** `class`, `default?` |
| `select` | `id`, `target?`, `attr` **or** `class` (prefix) **or** `var`, `options: [ { label, value, image? } ]`, `default?` |
| `preset` | `options: [ { label, values: { <fieldId>: <value> }, image? } ]` (or `label` + `values` on the field for one button) |
| `link` | `options: [ { label, url, image? } ]`, `target?: "_blank"`, `keep?: true` |

Details:

- **section-swap**: requests exactly `<current path>?section_id=<section>`; the response is the full
  `<div id="shopify-section-…" class="shopify-section …">` and replaces the target's outerHTML. An option with
  `value: "default"` (or without `section`) re-inserts the original node; one is added automatically if missing.
  Inline `<script>`s in the new section run once; `src` scripts already on the page aren't reloaded. Fires
  `shopify:section:unload` (old) / `shopify:section:load` (new, `detail.sectionId`). Responses are cached (memory +
  sessionStorage per `cache`) and prefetched on hover/focus. A failed request keeps the old section and shows the
  error under the field.
- **select with `class`**: removes every class with that prefix on the target and adds exactly one
  (`class: "xo-border-radius--"` + value `md` → `xo-border-radius--md`); other classes untouched.
- **color**: native picker + swatches; value must be `#rrggbb`.
- **link**: only `http(s)` or relative URLs (`javascript:`/`data:` dropped). The card whose host equals the current
  host is marked current. `keep: true` appends the current path to the URL.
- **image** (any option): `http(s)` URL or `data:image/…` (SVG data URIs from `scripts/thumb.mjs`).
- Ids must be unique; `section-swap` / `visibility` / `color` / `range` / `toggle` / `select` require `id`.

## 4. Behaviour

| Action | Page | Stored | Drawer | Event |
|---|---|---|---|---|
| Change an option | updates live (preview) | not saved | open | `change` |
| Apply | kept | saved to localStorage (per host, survives navigation) | closes | `apply` |
| Reset | original theme restored (sections, vars, classes, attrs) | cleared | stays open | `reset` |
| X / Esc / re-click button / `close()` | original restored | cleared | closes | `reset` |

Re-opening after Apply shows the applied values; Reset/X from there go back to the original theme.
Saved values re-apply on every page load (section swaps fetch early; the default section may flash on the first
uncached load).

## 5. Events, API, styling

- Events (bubble, on the element): `xo:theme-settings:change` `{ id, value }`, `xo:theme-settings:apply`
  `{ values }`, `xo:theme-settings:reset`.
- API: `open()`, `close()` (= X), `apply()`, `reset()`, `getValues()`, `setValue(id, value)`.
- Author editor: append `?xo-theme-settings-edit` (or attribute `xo-editor`) → a "Schema" tab to edit, validate
  and preview JSON; "copy JSON" to paste back into the snippet.
- Styling: CSS variables on `xo-theme-settings`: `--xo-ts-accent`, `--xo-ts-accent-fg`, `--xo-ts-bg`, `--xo-ts-fg`,
  `--xo-ts-muted`, `--xo-ts-line`, `--xo-ts-radius`, `--xo-ts-width`, `--xo-ts-font`, `--xo-ts-z`, `--xo-ts-backdrop`.
  Class hooks `xo-ts-fab`, `xo-ts__drawer`, `xo-ts__group-btn`, `xo-ts__opt`…; write `.xo-ts.xo-ts .xo-ts__…` to beat
  the panel's reset.

## 6. Gotchas

- Not defined for bots / PageSpeed (by design) and defined after a short delay.
- Two instances on one page share storage keys — keep one.
- A cached header may show a stale cart count until `cache` expires; use `"cache": 0` if that matters.
- Variant sections render with their file defaults; make those defaults look good.
- Theme scripts gated by `Shopify.designMode` won't re-init swapped sections on the live store.
