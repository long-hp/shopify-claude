# Design Tokens → Theme Settings (Step 0)

> [!IMPORTANT]
> **Run this BEFORE porting any section or page.** Once color, font, type-scale, radius and spacing tokens are mapped into the Shopify theme settings, every ported section automatically inherits the design's foundation through CSS variables. Skipping this step and inlining hex colors / font-family strings inside sections is the most common porting mistake.

## The Token Pipeline (How Settings Become CSS Variables)

```
┌─────────────────────────────────────────┐
│ src/config/global-schema/*.js           │   Theme Editor schema
│   (createGlobalSchema definitions)      │   — defines the editable inputs
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ src/config/settings_data.js             │   Shipped defaults
│   (per-shop chosen values)              │   — the actual values
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ src/snippets/settings-adapter/*.liquid  │   Runtime adapter
│   (typography-adapter / colors-adapter  │   — reads settings.X
│    layout-adapter / buttons-adapter …)  │   — outputs CSS variables
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ :root { --color-primary: …;             │   CSS variables in <head>
│         --font-heading-1-size: …; }     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ SCSS + section/snippet styles           │   Consumed via color()/fz()/
│   color(primary) / var(--font-…)        │   var(--…)
└─────────────────────────────────────────┘
```

A separate path: `theme-config/theme.config.json` ships dev-time tokens (colors, fonts, headingSizes, borderRadius, border, boxShadow) consumed by the **xo-css plugin at build**. Body sizes + spacing are direct rem in atomic classes (`p:1rem`, `fz:1.4rem`) — no token map. Both paths must stay in sync.

## Source of truth — read the schema first

> [!IMPORTANT]
> **Before editing `preset-N.js`, read `src/config/settings_schema.js` and the global-schema files it imports.** They are the canonical contract — every valid setting `id`, every range `min`/`max`/`step`, every select `option` value, every default. Mapping a design token is a mechanical lookup from there.
>
> ```bash
> cat src/config/settings_schema.js                # entry point: lists every imported global-schema
> cat src/config/global-schema/layout.js           # the layout fields you'll set in the preset
> cat src/config/global-schema/typography.js       # heading scale fields
> cat src/config/global-schema/colors.js           # color scheme schema
> # … etc per token group
> ```
>
> A field that's not in any global-schema is not a valid preset key — Shopify will ignore it. A value that violates the schema's range/step/select constraint will be rejected by the Theme Editor preview. The `validate-schema.py` script catches most of these (see the bottom of this file).

## Project Convention — Edit the Existing Preset Slot, Don't Create New

> [!IMPORTANT]
> Preset files are **fixed slots**, not per-design files. When porting a design, **overwrite the content of an existing `preset-N.js`** rather than creating a new file (e.g. `preset-folio.js`, `preset-xyz.js`).
>
> | Step                                              | File                                       |
> | ------------------------------------------------- | ------------------------------------------ |
> | First / primary design ported into the theme      | `src/config/presets/preset-1.js`           |
> | Second design (variant, alt brand demo)           | `src/config/presets/preset-2.js`           |
> | Third, fourth … (only when needed)                | `src/config/presets/preset-3.js`, …        |
>
> Then in `src/config/settings_data.js`, keep the import shape stable:
>
> ```js
> import { preset1 } from './presets/preset-1.js';
> // import { preset2 } from './presets/preset-2.js'; // when present
>
> export const settingsData = {
>   presets: {
>     '<Display Name>': preset1,   // display name shown in Theme Editor preset picker
>   },
> };
> ```
>
> **Why:** keeps the file slot count stable across projects, avoids dangling imports, prevents stale presets being referenced by `current` later. The display name (key in the `presets` map) is what merchants see — pick whatever fits the design ("Folio", "Aurora", "Base 3", etc.).

### When migrating an existing preset

If the slot already contains old content (e.g. `preset-1.js` shipped with the theme's original "Base 3" defaults):

1. **Audit** the existing file for any `color_scheme` IDs (e.g. `inverse`) that may be referenced elsewhere — `grep -r '"<scheme-id>"' src/sections src/blocks src/groups` — leftover schemes that other sections reference will break visually if you simply delete them.
2. **Decide per leftover scheme**:
   - **Keep + restyle** — update its color values to match the new design's palette (preferred when the scheme is referenced).
   - **Remove + sweep** — delete from the preset AND remove the option from any `color_scheme` select that listed it (e.g. `sections/all/schema.js`).
3. **Replace remaining content** with the new design's tokens.

## Anchor Files

| Role                                          | File                                                          |
| --------------------------------------------- | ------------------------------------------------------------- |
| Theme-Editor color scheme schema              | `src/config/global-schema/colors.js`                          |
| Typography schema (fonts + heading scale)     | `src/config/global-schema/typography.js`                      |
| Corner-radius schema                          | `src/config/global-schema/corner-radius.js`                   |
| Buttons schema                                | `src/config/global-schema/buttons.js`                         |
| Layout / spacing schema                       | `src/config/global-schema/layout.js`                          |
| Shipped defaults (per-shop)                   | `src/config/settings_data.js`                                 |
| Colors → CSS variables                        | `src/snippets/settings-adapter/colors-adapter.liquid`         |
| Typography → CSS variables                    | `src/snippets/settings-adapter/typography-adapter.liquid`     |
| Layout / spacing → CSS variables              | `src/snippets/settings-adapter/layout-adapter.liquid`         |
| Buttons → CSS variables                       | `src/snippets/settings-adapter/buttons-adapter.liquid`        |
| Build-time token file (xo-css generator)      | `theme-config/theme.config.json`                              |

## Step-by-Step Workflow

### 0. Discover the design's tokens

Look for the design's style/token file (usually one of these):

- `design/design-system.md`
- `design/brand.md`
- `design/styles/abstracts/variables.scss` (or wherever the design's CSS variables live)

Extract:

- **Palette** — every named color (background, foreground, primary, secondary, button text/bg, border, overlay, error/warning/success, etc.)
- **Inverted scheme(s)** — `.color-background-2` or any dark/alt scheme
- **Fonts** — body, heading, sub/italic-emphasis, accent (4 slots in this theme)
- **Heading scale** — h1…h6 sizes desktop + mobile (clamp ranges)
- **Body text** — size, line-height
- **Radius preset** — e.g. `xs` / `sm` / `md`
- **Spacing** — section padding rhythm, container gap, grid gap

### 1. Decide how many color schemes you need

Most design systems ship at least two:

| Design's scheme                      | Liquid color scheme slot                       |
| ------------------------------------ | ---------------------------------------------- |
| Default light surface                | `scheme-1` (first scheme = `:root` default)    |
| Inverted dark (header, hero overlay) | `scheme-2` (`<section class="color-scheme-2">`)|
| Brand accent / promo                 | `scheme-3` (if needed)                         |

Each scheme is a row inside the `color_scheme_group` definition (see `src/config/global-schema/colors.js`). The merchant can add/remove schemes in the Theme Editor.

### 2. Map every design color to a scheme slot

The schema fixes the **slot names** — primary, secondary, tertiary, background, layer, text, text_2, button_text, button_background, button_text_inverse, button_background_inverse, border, overlay, error/warning/success, status_1/2/3, linear_1.

| Design CSS variable          | Scheme slot                                                              |
| ---------------------------- | ------------------------------------------------------------------------ |
| `--color-background`         | `background`                                                             |
| `--color-foreground`         | `text`                                                                   |
| `--color-foreground-2`       | `text_2`                                                                 |
| `--color-primary`            | `primary` (also fills `button_background` if your primary CTA is filled) |
| `--color-secondary`          | `secondary`                                                              |
| `--color-tertiary`           | `tertiary`                                                               |
| `--color-button-text`        | `button_text`                                                            |
| `--color-button-background`  | `button_background`                                                      |
| Inverted variants            | `button_text_inverse`, `button_background_inverse`                       |
| `--color-border`             | `border`                                                                 |
| `--color-layer`              | `layer` (elevated surfaces like white cards on cream page)               |
| `--color-overlay`            | `overlay` (modal/hero overlay)                                           |

**Pin these as `default` in `src/config/global-schema/colors.js` if the design is the new baseline for the theme**, OR ship as `settings_data.js` shop defaults if only the demo store should match.

### 3. Map fonts

The theme exposes **4 font slots** (defined in `src/config/global-schema/typography.js`, output by `src/snippets/settings-adapter/typography-adapter.liquid`):

| Preset key              | CSS variable             | Note: variable alias drops "subheading" → `sub`              |
| ----------------------- | ------------------------ | ------------------------------------------------------------ |
| `type_body_font`        | `--font-body-family`     | Paragraphs, UI, body                                         |
| `type_subheading_font`  | `--font-sub-family`      | Sub-headings + **italic emphasis pattern** (`<em>` flip)     |
| `type_heading_font`     | `--font-heading-family`  | All h1-h6 (slot referenced by each `font_N` select)          |
| `type_accent_font`      | `--font-accent-family`   | Eyebrow text, labels, accent overlines                       |

The adapter also emits `--font-{body|sub|heading|accent}-style` and `-weight` from `settings.type_*_font.style` and `.weight` (Shopify provides these via the `font_picker` setting object). Plus `-weight-bold` (body only) derived via `font_modify: 'weight', 'bold'`.

#### Shopify font ID format

`font_picker` settings store IDs shaped `<family>_<style><weight>`:

| Token       | Meaning                                                                  | Example                                            |
| ----------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| `<family>`  | Snake-cased family name                                                  | `manrope`, `source_serif_4`, `instrument_sans`     |
| `<style>`   | `n` = normal, `i` = italic                                               | `manrope_n4`, `source_serif_4_i5`                  |
| `<weight>`  | First digit of CSS weight (4 = 400, 5 = 500, 6 = 600, 7 = 700, etc.)     | `manrope_n5` = Manrope normal 500                  |

So mapping `Source Serif 4 italic 500` → `source_serif_4_i5`. Inspect existing themes or the Shopify font library for exact family slugs.

> [!CAUTION]
> The **italic emphasis pattern** (`<h2>A heading with <em>emphasis</em>.</h2>`) requires the `<em>` to render in `--font-sub-family`, not the body italic. The design's serif italic font (Source Serif 4, Recoleta, etc.) MUST be mapped to `type_subheading_font`, even if you also want a separate "subheading" face — pick one purpose per slot.
>
> The SCSS rule that flips it is typically:
> ```scss
> h1 em, h2 em, h3 em, [class*="__title"] em {
>   font-family: var(--font-sub-family);
>   font-style: italic;
>   font-weight: 500;
> }
> ```
> This belongs in a global SCSS file (e.g. `src/styles/base/content.scss`) so every ported heading picks it up automatically.

Defaults for these slots can be tweaked in `src/config/global-schema/typography.js` (`default: "<font_id>"`). Shipped values per design go in the preset.

### 4. Map heading scale

`typography.js` ships **6 heading presets** (`headingSchemaSettings({ idSuffix: "_N" })` × 6, N = 1..6 — defined in `src/config/utils/typography-settings.js`). For each `N`, the preset accepts **8 fields**:

| Preset key                | Type   | Schema constraint                                          | Adapter output                                                       |
| ------------------------- | ------ | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `font_N`                  | select | one of `'body' \| 'subheading' \| 'heading' \| 'accent'`   | resolves to corresponding `type_*_font` family → `--font-heading-N-family` |
| `font_size_N`             | range  | 8..200 px, **step 2** (must be even)                       | divided by 10 → desktop side of `clamp(...)` for `--font-heading-N-size` |
| `mobile_font_size_N`      | range  | 8..200 px, **step 2** (must be even)                       | divided by 10 → mobile side of the `clamp(...)`                      |
| `line_height_N`           | range  | 0..3, **step 0.1** (`1.15` / `1.25` reject — use 1.1 / 1.2 / 1.3) | `--font-heading-N-line-height`                              |
| `mobile_line_height_N`    | range  | 0..3, step 0.1                                             | `--font-heading-N-mobile-line-height`                                |
| `letter_spacing_N`        | range  | -10..10 px, step 0.5                                       | desktop side of `clamp(...)` for `--font-heading-N-letter-spacing` (px ↔ px, **not divided**) |
| `mobile_letter_spacing_N` | range  | -10..10 px, step 0.5                                       | mobile side of clamp — ⚠ see pitfall below                           |
| `case_N`                  | select | raw CSS value: `'none' \| 'uppercase' \| 'capitalize'`     | `--font-heading-N-case`                                              |

> [!NOTE]
> `font_N` is a **`select`** that picks one of the 4 slots — NOT a `font_picker`. Don't put a Shopify font ID here (e.g. `'manrope_n5'`); use `'heading'` and let `type_heading_font` carry the actual family.

For design `--font-heading-1-size: 7.2rem → 3.6rem`, line-height 1.1, letter-spacing -0.05em:

```javascript
// preset-N.js
font_1: 'heading',
font_size_1: 72,           // 7.2rem desktop
mobile_font_size_1: 36,    // 3.6rem mobile
line_height_1: 1.1,
mobile_line_height_1: 1.1,
letter_spacing_1: -5,      // -5px (≈ -0.05em on 72px); px stays px in adapter
mobile_letter_spacing_1: -2,
case_1: 'none',            // raw CSS — NOT 'tt:none'
```

Adapter wraps everything in `clamp(mobile, calc(fluid-60vw→120vw), desktop)`.

### 5. Map radius

The schema `corner-radius.js` exposes a `corner_radius` select. The chosen value lands on `<body class="… xo-border-radius--{value}">` (set up in `src/layout/theme.liquid`).

The actual radius **scales per preset** live in `theme-config/theme.config.json` → `css.borderRadius.{preset}` (each preset is a map `s0…s10 + max`). Build-time SCSS exposes them as `--border-radius-s0…s10`.

| Design radius preset                              | Action                                                       |
| ------------------------------------------------- | ------------------------------------------------------------ |
| Matches an existing preset (`default/medium/large/none`) | Set `settings.corner_radius` default to that key.    |
| Design has a unique scale (e.g. `xs` from memoir) | Add it to `theme.config.json` → `css.borderRadius.xs: { s0:0, s1:0.4, … }` AND ensure `corner-radius.js` exposes that option AND `xo-border-radius--xs` class is generated. |

> [!NOTE]
> The `corner-radius.js` schema option list and the `theme.config.json` preset keys MUST match. If you add an `xs` preset, the schema must offer `{value: 'xs', label: 'Extra small'}`.

### 6. Map spacing & layout

Layout settings live in `src/config/global-schema/layout.js` and adapt via `src/snippets/settings-adapter/layout-adapter.liquid`. Match the design (see `design-system.md §5 — Spacing & Layout: 4 core dimensions + grid`).

#### The 4 core dimensions (+ grid)

| # | Concept                                       | Preset keys                                                                 | Schema constraint              | Adapter emits                                                                 |
| - | --------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| 1 | **Page width** (max content width)            | `page_width`                                                                | 1200..1900 px, step 100        | `--page-width` (`÷10` → rem)                                                  |
| 2 | **Page gap** — insets **content** only        | `container_gap`, `container_gap_mobile`                                     | 0..90 px, step 1               | `--page-gap`, `--page-gap-mobile` (unitless, `÷10` — multiplied by `1rem` downstream) |
| 3 | **Section spacing** — gap *between* sections  | `spacing_sections`, `spacing_sections_mobile`                               | 0..90 px, step 1               | `--spacing-sections`, `--spacing-sections-mobile` (raw px)                    |
| 4 | **Page side margin** — insets the **whole page** | `page_side_margin`, `page_side_margin_mobile`                           | 0..90 / 0..50 px, step 1       | `--page-side-margin`, `--page-side-margin-mobile` (raw px)                    |
| + | **Grid gap** (rows + columns)                 | `spacing_grid_horizontal`, `spacing_grid_vertical`                          | 4..40 px, **step 2**           | `--grid-desktop-{h,v}-spacing` (raw px); mobile = `desktop ÷ 2` in adapter   |

> [!IMPORTANT]
> **`page_gap` (2) vs `page_side_margin` (4)** — these are easily confused:
> - **`container_gap` / `--page-gap`** insets **content only**. The page background stays full-bleed; only the container that holds section content is pushed in. Used for typical breathing room around the content column.
> - **`page_side_margin` / `--page-side-margin`** insets the **whole page**. The body background shows on the L/R strips → produces a "card on canvas" effect. Used when the design wants a visible margin frame around the entire site.
>
> A full-bleed memoir-feel design uses `page_side_margin = 0` and only `container_gap > 0`. A framed/card-on-canvas design might set both > 0.

> [!NOTE]
> **Grid gap has no `_mobile` knob in the preset.** The schema exposes only `spacing_grid_horizontal` and `spacing_grid_vertical`; the adapter automatically halves them for mobile (`mobile = desktop ÷ 2`). If the design specifies mobile grid = desktop grid, you can't express that purely in the preset — the adapter convention wins. Note this in PROGRESS.md if it bites a port.

#### Worked example — Folio full-bleed cinematic

Design `§5` values → preset:

```javascript
// src/config/presets/preset-1.js
page_width: 1900,              // design wants 1920; schema max=1900 → ship 1900 (closest step-safe)
container_gap: 40,             // --page-gap: 4 → 40px desktop content inset
container_gap_mobile: 16,      // --page-gap-mobile: 1.6
spacing_sections: 0,           // edge-to-edge — each section owns pt/pb
spacing_sections_mobile: 0,
page_side_margin: 0,           // no L/R strip — body bg = page bg (full-bleed)
page_side_margin_mobile: 0,
spacing_grid_horizontal: 20,   // 20px column-gap
spacing_grid_vertical: 20,     // 20px row-gap (mobile = 10px via adapter ÷2 convention)
```

#### Per-section vertical padding (NOT a global token)

Section vertical padding (`padding_top` / `padding_bottom`) is **per-section**, not global. Set per design tier via `sectionSchemaSettings({ padding_top, padding_bottom })` in each section's `schema.js`:

| Section tier        | Design fluid range          | `sectionSchemaSettings` defaults |
| ------------------- | --------------------------- | -------------------------------- |
| Content sections    | `pfs(4rem, 8rem)` (40-80 px)| `padding_top: 80, padding_bottom: 80`  |
| Hero sections       | `pfs(6rem, 12rem)` (60-120 px) | `padding_top: 120, padding_bottom: 120` |

The merchant can still override per-instance via the section's settings UI.

### 6b. Map paragraph (body)

Paragraph settings ride in `typography.js` via `paragraphSchemaSettings()`. **Only 4 fields**, none of them mobile-font-size:

| Preset key                | Type   | Constraint                  | Adapter output                                          |
| ------------------------- | ------ | --------------------------- | ------------------------------------------------------- |
| `font_size_body`          | range  | 8..200 px, **step 2**       | `÷10` → `--font-body-size` (rem; single value)         |
| `line_height_body`        | range  | 0..3, step 0.1              | `--font-body-line-height`                               |
| `mobile_line_height_body` | range  | 0..3, step 0.1              | `--font-body-mobile-line-height`                        |
| `color_opacity_body`      | range  | 0..100 step 1               | `--font-body-color-opacity: {{N}}%` (emitted as percent — preset value `70` produces `70%`) |

> [!NOTE]
> **There is no `mobile_font_size_body`.** The adapter hardcodes `--font-body-desktop-size: 1.6rem` and `--font-body-mobile-size: 1.5rem` directly in `typography-adapter.liquid` (lines 39-40). If a design needs different mobile/desktop body sizes than 1.5/1.6 rem, the adapter must be edited — there's no schema knob.

Folio example:
```javascript
font_size_body: 16,            // 1.6rem desktop (matches adapter hardcode)
line_height_body: 1.5,
mobile_line_height_body: 1.5,
color_opacity_body: 70,        // 70% — matches design --font-body-color-opacity: 0.7
```

### 7. Buttons

`buttons.js` exposes a "Button preset" select (Split / Fill up / Underline out / etc.) — pick the preset that most closely matches the design's primary CTA shape. Then:

- Variant (Primary / Secondary / Tertiary / Dark / Light / Dark-inverse / Light-inverse) — pick the default the design uses most often.
- Font, weight, case, corner-radius — match the design.

The actual button styles per variant live in `src/snippets/button/button-{1..7}/*.liquid` and their SCSS — they read the chosen `button_background` / `button_text` from the active color scheme.

## Worked Example — Mapping a Warm-Editorial Design

Design tokens (extracted from `design/design-system.md`):

```
--color-background:   #F4F2F0    (warm cream)
--color-foreground:   #000000
--color-foreground-2: #7A746E    (muted meta)
--color-primary:      #8B5A2B    (saddle brown CTA)
--color-secondary:    #C7A78A
--color-layer:        #FFFFFF    (white cards on cream)
--color-border:       #E1DCD5

Inverted (color-background-2):
--color-background:   #1A1612    (warm near-black)
--color-foreground:   #F4F2F0    (cream text)
--color-button-background: #F4F2F0
--color-button-text:  #1A1612

Body font:    Manrope (300/400/500/600)
Heading font: Manrope (500)
Italic span:  Source Serif 4 italic (500)
H1: 72rem→36rem, line-height 1.1, letter-spacing -0.05em
Radius preset: xs (cards 8px ≈ s1, images 4px ≈ s0/s1, buttons 12px ≈ s2/s3)
```

### Mapping into `settings_data.js` (shop defaults)

```json
{
  "current": {
    "color_schemes": {
      "scheme-1": {
        "settings": {
          "background": "#F4F2F0",
          "text": "#000000",
          "text_2": "#7A746E",
          "primary": "#8B5A2B",
          "secondary": "#C7A78A",
          "layer": "#FFFFFF",
          "border": "#E1DCD5",
          "button_background": "#8B5A2B",
          "button_text": "#FFFFFF",
          "button_background_inverse": "#FFFFFF",
          "button_text_inverse": "#000000"
        }
      },
      "scheme-2": {
        "settings": {
          "background": "#1A1612",
          "text": "#F4F2F0",
          "primary": "#8B5A2B",
          "layer": "#1A1612",
          "border": "#3A332C",
          "button_background": "#F4F2F0",
          "button_text": "#1A1612",
          "button_background_inverse": "#1A1612",
          "button_text_inverse": "#F4F2F0"
        }
      }
    },

    "type_body_font":       "manrope_n4",
    "type_heading_font":    "manrope_n5",
    "type_subheading_font": "source_serif_4_i5",
    "type_accent_font":     "manrope_n5",
    "font_scale":           100,

    "font_1": "heading",  "font_size_1": 72, "mobile_font_size_1": 36, "line_height_1": 1.1, "mobile_line_height_1": 1.1, "letter_spacing_1": -50,
    "font_2": "heading",  "font_size_2": 48, "mobile_font_size_2": 28, "line_height_2": 1.15, "mobile_line_height_2": 1.15,
    "font_3": "heading",  "font_size_3": 40, "mobile_font_size_3": 24, "line_height_3": 1.2,  "mobile_line_height_3": 1.2,

    "corner_radius": "xs",

    "page_width": 1900,
    "container_gap": 40,
    "container_gap_mobile": 16,
    "spacing_sections": 0
  }
}
```

### `theme.config.json` updates (build-time tokens)

Add `xs` preset under `css.borderRadius` if it doesn't exist:

```json
"borderRadius": {
  "xs": {
    "s0": 0, "s1": 0.4, "s2": 0.8, "s3": 1.2, "s4": 1.6,
    "s5": 2.0, "s6": 2.4, "s7": 2.8, "s8": 3.2, "s9": 3.6, "s10": 4.0,
    "max": 999
  },
  "default": { … },
  …
}
```

Ensure `corner-radius.js` lists `{ value: "xs", label: "Extra small" }`.

### Italic emphasis global rule

Add once to `src/styles/base/content.scss` (or wherever heading defaults live):

```scss
h1 em, h2 em, h3 em, h4 em, h5 em, h6 em,
[class*="__title"] em, [class*="__heading"] em {
  font-family: var(--font-sub-family);
  font-style: italic;
  font-weight: 500;
  letter-spacing: -0.07em;
}
```

Every ported section that uses `<em>` inside a heading now gets the italic serif emphasis automatically.

## Decision Flowchart

```
                ┌───────────────────────────────────────┐
                │ Does the design ship a new palette /  │
                │ fonts / radius / heading scale?       │
                └──────────────┬────────────────────────┘
                               │ yes
                               ▼
   ┌───────────────────────────────────────────────────────────┐
   │ Overwrite the content of src/config/presets/preset-N.js   │
   │   - First design → preset-1.js                            │
   │   - Second design → preset-2.js                           │
   │   (NEVER create preset-<brand>.js — keep slot count fixed)│
   └────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
        ┌────────────────────────────────────────────┐
        │ Is this design the new theme baseline      │
        │ (all shops will use it) ?                  │
        └──────┬───────────────────────────┬─────────┘
               │ yes                       │ no — demo only
               ▼                           ▼
   Also update DEFAULTS in:         Stop here — preset is enough.
   - src/config/global-schema/*.js
   - theme.config.json (if needed)
                               │
                               ▼
       ┌──────────────────────────────────────────────┐
       │ Verify CSS variables emit correctly:          │
       │   - npm run dev → inspect <head> <style> tag │
       │   - Check :root has --color-primary, etc.    │
       └───────────────────────┬──────────────────────┘
                               │
                               ▼
       Now port sections. They inherit the tokens.
```

## Validate Against Schema Constraints

Every numeric setting in the schema is a `range` with `min`, `max`, **`step`**, and many select fields have a fixed option list. Shopify Theme Editor rejects the preset (with errors like *"Setting 'mobile_font_size_6' must be a step in the range"*) if any value violates a constraint.

Run this validator after editing any preset to catch invalid values before reloading the editor:

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const schema = JSON.parse(readFileSync('shopify/config/settings_schema.json', 'utf8'));
const c = {};
for (const g of schema) for (const s of (g.settings || [])) {
  if (!s.id) continue;
  if (s.type === 'range')  c[s.id] = { kind: 'range',  min: s.min, max: s.max, step: s.step };
  if (s.type === 'select') c[s.id] = { kind: 'select', opts: s.options.map(o => o.value) };
}
const preset = (await import('./src/config/presets/preset-<name>.js'))['preset<Name>'];
let bad = 0;
for (const [k, v] of Object.entries(preset)) {
  if (k === 'color_schemes' || k === 'sections') continue;
  const r = c[k]; if (!r) continue;
  if (r.kind === 'range') {
    if (typeof v !== 'number' || v < r.min || v > r.max) { console.log('✗', k, '=', v, '(range', r.min + '..' + r.max + ')'); bad++; continue; }
    const ratio = (v - r.min) / r.step;
    if (Math.abs(ratio - Math.round(ratio)) > 0.001) { console.log('✗', k, '=', v, '(step', r.step + ')'); bad++; }
  } else if (r.kind === 'select' && !r.opts.includes(v)) {
    console.log('✗', k, '=', JSON.stringify(v), '(opts:', r.opts.join('|') + ')'); bad++;
  }
}
console.log(bad === 0 ? '✅ valid' : '✗ ' + bad + ' invalid');
"
```

### Common step traps

| Setting family            | Step           | Notes                                                          |
| ------------------------- | -------------- | -------------------------------------------------------------- |
| `font_size_*`             | 2              | Must be even px (8, 10, 12, …)                                 |
| `mobile_font_size_*`      | 2              | Same — odd values (15, 17, …) reject                           |
| `line_height_*`           | 0.1            | Multiples of 0.1 only — `1.15` / `1.25` reject (use 1.1, 1.2, 1.3)|
| `letter_spacing_*`        | 0.5            | Half-px steps                                                  |
| `page_width`              | 100            | Bands of 100 from `min: 1200` to `max: 1900`                   |
| `container_gap*`          | 1              | Any px from 0 to 90                                            |
| `font_scale`              | 5              | 100, 105, 110, …                                               |
| `spacing_grid_*`          | 2              | Even from 4 to 40                                              |

### Common select traps (raw value vs prefixed value)

| Setting             | Schema expects  | Example                                                 |
| ------------------- | --------------- | ------------------------------------------------------- |
| `case_1`..`case_6` (heading case) | raw value | `'none'` / `'uppercase'` / `'capitalize'`  |
| `case_button`                     | xo-css prefix | `'tt:none'` / `'tt:uppercase'`               |
| `font_button`                     | xo-css prefix | `'ff:body'` / `'ff:heading'`                 |
| `weight_button`                   | xo-css prefix | `'fw:400'` / `'fw:500'` / `'fw:600'`         |
| `buttons_type`                    | preset id     | `'bdr_rad_1'` / `'bdr_rad_2'` / `'link'` …   |
| `corner_radius`                   | preset id     | `'none'` / `'xs'` / `'sm'` / `'md'` / `'lg'` |
| `color_scheme` (per section)      | scheme id     | `'background-1'` / `'background-2'` …        |

Reason: settings whose value is **rendered directly as a CSS class** in an adapter (buttons, atomic utilities) use the XO-CSS prefix; settings whose value is **emitted as a CSS variable value** (heading case → `text-transform: var(...)`) use the raw CSS keyword.

## Verification Checklist

After mapping, before porting any section, verify in the rendered HTML's `<head>`:

```html
<style>
  :root, .color-scheme-1 {
    --color-background: 244 242 240 / 1;   /* must equal design hex */
    --color-foreground: 0 0 0 / 1;
    --color-primary:    139 90 43 / 1;
    /* ... */
  }
  .color-scheme-2 {
    --color-background: 26 22 18 / 1;
    /* ... */
  }
  :root {
    --font-body-family:     "Manrope", sans-serif;
    --font-heading-family:  "Manrope", sans-serif;
    --font-sub-family:      "Source Serif 4", serif;
    --font-heading-1-size:  clamp(3.6rem, …, 7.2rem);
    /* ... */
  }
</style>
```

If a variable is missing or wrong, the upstream adapter / setting wasn't filled correctly.

## Pitfalls

| Pitfall                                                  | Fix                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Inlining hex colors inside a section's SCSS              | Map to scheme slot; use `color(primary)` / `var(--color-primary)`. |
| Adding `<style>--color-primary: …</style>` per-section   | Defeats the scheme system; the merchant can't change colors.       |
| Mapping italic emphasis to `type_accent_font`            | The flip pattern relies on `--font-sub-family`. Use that slot.     |
| Defining `corner_radius: "xs"` without `xs` in `theme.config.json` | Adapter compiles, but no actual radii are emitted. Add the preset. |
| Forgetting the inverted scheme                           | Header + hero overlay need it. Define `scheme-2` upfront.          |
| Per-heading mismatch between design (h1=72) and settings (font_size_1=36) | Px units in settings_data are divided by 10 to make rem.   |
| Editing adapter files to hardcode values                 | Never. Adapters are generic; only change settings + global-schema. |
| Shopify Editor errors *"color schemes must be defined in settings_data and settings_schema"* even though the preset is correct | The compiled `shopify/config/settings_data.json` has `"current": "<preset_name>"` (a **string reference**). Theme Editor preview mode requires `current` to be the **full settings object** (a deep clone of the active preset), not just the preset name. Fix: replace `current` with `JSON.parse(JSON.stringify(data.presets.<name>))`. If `npm run dev` regenerates the file with the string form, repeat the fix or update the build to write the object form. |
| `current: "<name>"` references a preset that doesn't exist | Same Shopify error. Check that `data.presets[data.current]` is non-null OR (better) inline `current` as a full clone of the intended preset. |
| Shopify errors *"Preset '...': Preset must contain same color scheme ids"* | Shopify scans the preset object for keys that look like a color-scheme entry (shape: `{ settings: { primary, background, ... } }`). If any such key sits OUTSIDE the `color_schemes` map (e.g. an orphan `inverse: { settings: {...} }` at the top level of the preset), Shopify counts it as a phantom scheme and complains about ID mismatch. Fix: ensure every scheme-shaped object is inside `color_schemes` only. |
| Creating a new file like `preset-folio.js`, `preset-aurora.js`, etc. | Don't. Overwrite `preset-1.js` (or the next free slot `preset-2.js`, …). See "Project Convention" above. |
| Leftover `color_scheme` id in `preset-N.js` (e.g. an `inverse` scheme) renders with the wrong palette | When migrating into an existing preset slot, audit `grep -r '"<scheme-id>"' src/sections src/blocks src/groups` for references before deciding whether to restyle the old scheme or remove + sweep it. |
| Setting `mobile_letter_spacing_N` (heading scale) has no effect | Known adapter bug — `typography-adapter.liquid:73` assigns `mobile_letter_spacing_heading_key = 'letter_spacing_' \| append: i` (typo — missing `mobile_` prefix), so the desktop letter-spacing is read for both ends of the clamp. The schema field exists but is dead. Fix in the adapter if it matters; otherwise leave both `letter_spacing_N` and `mobile_letter_spacing_N` at the same value to avoid confusion. |
| Body font size doesn't change between mobile/desktop despite setting `font_size_body` | The adapter hardcodes `--font-body-desktop-size: 1.6rem` and `--font-body-mobile-size: 1.5rem` (lines 39-40 of `typography-adapter.liquid`). `font_size_body` feeds a different variable (`--font-body-size`). If a design needs non-default mobile/desktop body sizes, edit the adapter — there's no schema knob. |
| Grid gap mobile != desktop in the design but you can only set one value per axis | Schema exposes only `spacing_grid_horizontal` / `spacing_grid_vertical`; the adapter halves them for mobile. If the design wants mobile = desktop (or any non-half ratio), the convention requires an adapter edit. Note in PROGRESS.md and decide whether to ship a follow-up patch. |
| `container_gap` / `container_gap_mobile` confused with `page_side_margin` | `container_gap` insets CONTENT only (page bg stays full-bleed). `page_side_margin` insets the WHOLE page (body bg shows on L/R strips). See §6 "page_gap vs page_side_margin" callout. |

## Related

- `./blueprint-protocol.md` — extract tokens from the design's documentation
- `./sections-to-liquid.md` — sections consume these tokens via `color()` / `var(--…)`
- `./data-to-settings.md` — per-section settings (vs. theme-wide tokens here)
- `schema` skill → `global-schema.md` — `createGlobalSchema` API
