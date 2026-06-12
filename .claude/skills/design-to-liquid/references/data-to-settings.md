# Data → Schema Settings

Lift every hardcoded value in a design section/component into a Shopify schema setting so the merchant can edit it.

> [!NOTE]
> **This page covers per-section / per-block settings.** For theme-wide design tokens (colors, fonts, type scale, radius, spacing) — which must be mapped once before porting any section — see `./tokens-mapping.md`.

## Default Promotion Rules

| Hardcoded design value                              | Setting type                                          |
| --------------------------------------------------- | ----------------------------------------------------- |
| Short label / overline                              | `text`                                                |
| Heading with inline `<em>` emphasis                 | `inline_richtext`                                     |
| Paragraph / intro                                   | `richtext`                                            |
| Multiline plain copy                                | `textarea`                                            |
| Internal link (`/collections/all`)                  | `url` (Shopify resolves `shopify://` URIs too)        |
| External link                                       | `url`                                                 |
| Image URL                                           | `image_picker`                                        |
| Product reference                                   | `product`                                             |
| Collection reference                                | `collection`                                          |
| Article / blog / page reference                     | `article` / `blog` / `page`                           |
| List of products (≤ 50)                             | `product_list`                                        |
| List of collections (≤ 50)                          | `collection_list`                                     |
| Boolean toggle (show/hide)                          | `checkbox`                                            |
| Choice from a fixed set                             | `select` (`radio` for ≤ 3 options)                    |
| Numeric within a range (columns, gap, padding)      | `range`                                               |
| Numeric without a range                             | `number`                                              |
| Color                                               | `color`                                               |
| Theme color scheme                                  | `color_scheme`                                        |
| Font                                                | `font_picker`                                         |
| Per-device variant                                  | any of the above + `devices: ['desktop', 'mobile']`   |

Full list with examples: `schema` skill → `setting-types.md`.

## Section-Level vs Block-Level

- **Section setting** (`section.settings.X`): one value per section instance — heading, overline, color scheme, CTA link, layout toggle, columns count.
- **Block setting** (`block.settings.X`): one value per repeating child — product, badge text, slide image.

Rule of thumb:

- One value at the section header / once-per-section → section setting.
- N values inside a repeated `<xo-grid>` / list (e.g. multiple cards each with different content) → block settings.

## Use the Project's Helpers (Always Check First)

> [!CAUTION]
> **Check `src/snippets/_base/input-settings/` first.** For alignment, spacing, padding, typography, color scheme, border radius, shadow, etc. the project provides ready-made helpers (`alignmentSetting`, `spaceSchemaSettings`, `typographySchemaSettings`, `colorSchemaSettings`, …).
>
> Spreading these into your settings:
> - guarantees consistency with the rest of the theme,
> - benefits from any future helper updates,
> - reduces the schema size.
>
> Full catalog and spread-operator rules: `schema` skill → `input-settings-helpers.md`.

```javascript
import { spaceSchemaSettings } from "../_base/input-settings/space.js";
import { typographySchemaSettings } from "../_base/input-settings/typography.js";

settings: [
  // …content settings
  ...spaceSchemaSettings({ position: ["top", "bottom"] }),
  ...typographySchemaSettings(),
]
```

## Worked Example — Generic Section

Design HTML (abbreviated, names generic):

```html
<section class="xo-section xo-<name>">
  <xo-container>
    <header class="xo-<name>__head">
      <p class="xo-<name>__overline">Some overline</p>
      <h2 class="xo-<name>__title">A heading with <em>emphasis</em>.</h2>
      <xo-component src="button" data="{
        href: '/some-link',
        label: 'View all',
        variant: 'ghost'
      }"></xo-component>
    </header>
    <div xo-grid class="xo-grid-block" style="--xo-col-desktop:4; --xo-col-tablet:2; --xo-col-mobile:2">
      <xo-component src="product-card" data="{ /* product 1 */ }"></xo-component>
      <xo-component src="product-card" data="{ /* product 2 */ }"></xo-component>
      <xo-component src="product-card" data="{ /* product 3 */ }"></xo-component>
      <xo-component src="product-card" data="{ /* product 4 */ }"></xo-component>
    </div>
  </xo-container>
</section>
```

### Settings extraction

**Section-level:**

| Design value                  | Setting                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Color scheme                  | `color_scheme`, id `color_scheme`, default `background-1`                      |
| "Some overline"               | `text`, id `overline`                                                          |
| "A heading with *emphasis*."  | `inline_richtext`, id `heading`                                                |
| "View all"                    | `text`, id `cta_label`                                                         |
| `/some-link`                  | `url`, id `cta_link`                                                           |
| 4 columns desktop / 2 mobile  | `range` × 2 with `devices: ['desktop', 'mobile']`                              |

**Block-level (one block type per repeated child):**

| Design value                  | Setting                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Product reference             | `product`, id `product`                                                        |
| Optional badge text           | `text`, id `badge`                                                             |
| Badge variant                 | `select`, id `badge_kind` (options match the snippet's expectations)           |

### Resulting `schema.js`

```javascript
import { createSectionSchema, deviceSetting } from "../../create-schema.js";
import { spaceSchemaSettings } from "../../snippets/_base/input-settings/space.js";

export const schema = createSectionSchema({
  name: "<Name>",
  class: "section-<name>",
  settings: [
    { type: "color_scheme", id: "color_scheme", label: "Color scheme", default: "background-1" },

    { type: "header", content: "Content" },
    // `default`s below are generic PLACEHOLDERS, not the design's copy — see
    // "Defaults are placeholders, not design copy" above. Heading = section
    // purpose; the <em> shows the emphasis pattern; button = "Button label".
    { type: "text",            id: "overline",  label: "Overline",   default: "Overline" },
    { type: "inline_richtext", id: "heading",   label: "Heading",    default: "Featured <em>products</em>" },
    { type: "text",            id: "cta_label", label: "CTA label",  default: "Button label" },
    { type: "url",             id: "cta_link",  label: "CTA link" },

    { type: "header", content: "Layout" },
    deviceSetting(),
    {
      type: "range",
      id: "columns",
      label: ["Columns (Desktop)", "Columns (Mobile)"],
      min: 1, max: [6, 4], step: 1,
      default: [4, 2],
      devices: ["desktop", "mobile"],
    },

    { type: "header", content: "Spacing" },
    ...spaceSchemaSettings({ position: ["top", "bottom"] }),
  ],
  blocks: [
    {
      type: "product",
      name: "Product",
      settings: [
        { type: "product", id: "product", label: "Product" },
        { type: "text",    id: "badge",   label: "Badge text" },
        {
          type: "select",
          id: "badge_kind",
          label: "Badge style",
          options: [
            { value: "none", label: "None" },
            { value: "new",  label: "New" },
            { value: "sale", label: "Sale" },
          ],
          default: "none",
        },
      ],
    },
  ],
  presets: [
    {
      name: "<Name>",
      blocks: [
        { type: "product" },
        { type: "product" },
        { type: "product" },
        { type: "product" },
      ],
    },
  ],
});
```

## Defaults are placeholders, not design copy

A setting's `default` (and any preset value) is a **generic placeholder that teaches the merchant what content belongs in the field** — it is NOT the design's literal text. This is how every Shopify theme behaves: a freshly inserted section shows self-explanatory filler the merchant then replaces, never someone else's finished copy. The design's actual words (`"Build their first ritual."`) are only the **visual target while porting** — they are not persisted into `default`, into a preset, or into a JSON template.

Per-kind rule (mirrors Shopify's Dawn theme — see `dawn/sections/*.liquid` + `dawn/locales/en.default.schema.json`):

| Setting kind | `default` placeholder | Dawn examples |
| --- | --- | --- |
| heading / title | the section or block's **purpose name**, or a short prompt | `"Image with text"`, `"Featured collection"`, `"Talk about your brand"` |
| body (`richtext`/`textarea`) | a generic sentence describing **what kind of content goes here** | `"<p>Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.</p>"` |
| button label | the field name itself | `"Button label"` |
| overline / short label | the field name or a one-word hint | `"Overline"` |

> [!IMPORTANT]
> **Plain strings — no `t:` keys.** Dawn writes `default: "t:sections.image-with-text.blocks.heading.settings.heading.default"` (a translation-key indirection resolved from `locales/*.schema.json`). This project does **not** use locale schema files — write the placeholder as a literal string directly in `schema.js`: `default: "Featured collection"`.
>
> **`default` ≠ the `placeholder` attribute.** `default` pre-fills a *value* the merchant can edit; the separate `placeholder` attribute is the greyed hint shown only while the field is empty. This rule is about `default` (and preset values).

## Naming Conventions

- IDs in `snake_case`.
- Be specific: `heading_text` over `text`, `cta_link` over `link`.
- Block type IDs also `snake_case` (`product`, `image_slide`, `feature_card`).
- Use the same id name on similar settings across sections — predictable for the merchant.

## What NOT to Promote

Some values stay hardcoded:

- Visual constants tied to the project (e.g. `<em>` literal inside a default heading — kept inside the default value of an `inline_richtext`).
- Structural classnames (`xo-<name>__title`).
- xo-webcomponent attributes that never vary (`xo-type="fade"`).
- A layout constant that's already exposed via another setting (don't expose twice).

## Related

- `schema` skill — full `createSectionSchema` API, all setting types, visibility, device settings
- `schema` skill → `input-settings-helpers.md` — project-provided helpers
- `./sections-to-liquid.md` — consuming these settings in the liquid file
- `./pages-to-templates.md` — providing values via the JSON template
