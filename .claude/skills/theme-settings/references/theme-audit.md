# Theme audit for `<xo-theme-settings>`

Goal: collect facts so every schema entry points at something real. Read files with bounded limits; prefer `grep`
/ `ls` over reading whole files. Paths below follow the XO theme layout (`src/…`); adapt if the theme differs.

## 1. Runtime prerequisites

```bash
grep -n "xo-critical\|xo-webcomponents\|main.ts\|vite-tag\|</body>" src/layout/theme.liquid
grep -rn "xo-webcomponents" src/snippets --include=*.liquid -l | head   # scripts may be loaded from a snippet (e.g. 'scripts')
sed -n 1,40p src/main.ts                      # Vite entry: the LOADER is imported here (import "./theme-settings-loader";)
ls src/theme-settings*.ts 2>/dev/null          # already installed?
grep -rn "import.meta.glob" src/utils src/main.ts | head   # folders auto-imported eagerly — the component must NOT live there
```

Need: `xo-critical` (provides `@xo/utils` / `window.XotinyUtils`) and `xo-webcomponents` JS **and** CSS (xo-modal,
xo-collapse). If the JS bundle isn't loaded on the storefront, stop and tell the user — the panel cannot open.

Check decorators are enabled for TS (`experimentalDecorators` in `tsconfig.json`) — the component uses
`@customElements`. Other theme `.ts` files using `@customElements` (e.g. in `src/scripts/`) are enough evidence.

## 2. Sections that can be swapped

```bash
ls src/groups/*/ ; cat src/groups/headers/header-group.json | head -60    # header group: section keys + types
ls src/sections/                                                          # section folders = section file names
grep -rln "showcase" src/sections src/groups 2>/dev/null                 # variant sections, if the author keeps them apart
```

For each candidate:

- **section_id to request** = the section file name (folder / `.liquid` name), e.g. `header`, `header-2`,
  `footer-dark`. `?section_id=<name>` renders that file with its schema **defaults** (not the group's saved settings).
  If a variant should look different from the default file, it must be its own section file.
- **Storefront wrapper**: group sections render as `<div|header id="shopify-section-sections--<id>__<key>"
  class="shopify-section shopify-section-group-header-group …">`. Use the key suffix as `match`
  (`"__header"`, `"__footer"`, `"__announcement-bar"`). Template sections render as
  `shopify-section-template--<id>__<key>` — match on `__<key>` or a class the section adds (e.g. `xo-section-header`).
- Prefer `match` > `selector` > `index`. `index` changes when sections are added/hidden — only as fallback.

Report a table: purpose → current section → candidate variant section ids (exist? yes/no) → target `match`.

## 3. Global look controls

```bash
grep -n "border-radius\|corner_radius\|class=" src/layout/theme.liquid | head -20
grep -rn "corner_radius" src/config src/snippets | head
ls src/snippets/settings-adapter/ 2>/dev/null        # XO themes: colors-adapter, typography-adapter, buttons-adapter… print :root vars
grep -hoE -- "--color-[a-z0-9-]+" src/snippets/settings-adapter/colors-adapter.liquid | sort -u
grep -hoE -- "--font-[a-z0-9-]+" src/snippets/settings-adapter/typography-adapter.liquid | sort -u
grep -rlE -- "--color-primary" src | head             # fallback when the adapter lives elsewhere
ls src/config/global-schema/                          # colors, typography, buttons, corner-radius, dark-mode…
```

Map to fields:

| Theme fact | Field |
|---|---|
| `xo-border-radius--{{ settings.corner_radius }}` on `<body>` (or `<html>`) | `select`, `target: "body"` (or `"html"`), `class: "xo-border-radius--"`, options = the setting's values (`none, xs, sm, md, lg`), `default` = current setting value |
| `--color-primary` etc. printed by `settings-adapter/colors-adapter.liquid` (or per color scheme) | `color`, `var: "--color-primary"`, `target: ":root"` (or the scheme selector) |
| Font variables `--font-heading-family` / `--font-body-family` | `select` with `var` and option values that are font stacks the theme already loads (don't add web-font requests unless asked) |
| Button style class on body (`btn-style--pill`) | `select` with `class` prefix |
| Dark mode attribute (`data-theme="dark"`, `xo-dark`) | `toggle` with `attr`/`on`/`off` or `class` |
| Optional section (announcement bar, newsletter) | `visibility` with the same `target` shape as section-swap |

Read the setting's actual option values and current default from `src/config/global-schema/*.js` /
`settings_data` — the radius values in this theme family are `none | xs | sm | md | lg`.

## 4. Existing install

```bash
grep -rn "xo-theme-settings" src --include=*.liquid --include=*.ts | head
```

If present: read the current schema and edit it instead of creating a second instance (two instances would share
the same localStorage keys and fight over the page).

## 5. Theme JS that must survive a swap

```bash
grep -rln "shopify:section:load" src | head
grep -rn "designMode" $(grep -rln "shopify:section:load" src) | head
```

The panel fires `shopify:section:unload` / `shopify:section:load` after swapping. Scripts that only listen inside
`if (Shopify.designMode)` won't re-init the new header on the live demo — list them in the hand-off.
