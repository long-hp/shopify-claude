# Section Blocks

Blocks are the second axis of Shopify's section system. Where a section is "one configurable module", blocks are **repeatable children** that the merchant can add, reorder, and remove from inside that module. A section can hold up to **50 blocks** (Shopify-imposed hard ceiling).

Two big decisions when authoring a section with blocks:

1. **Shape** — inline block (owned by the section) vs theme block (separate file, reusable).
2. **Render pattern** — manual `{% for block in section.blocks %}` + dispatch vs Shopify-managed slot `{% content_for 'blocks' %}`.

Plus: how to **pre-populate defaults** so the merchant sees a working layout on install.

---

## 1. Two block shapes — inline vs theme

### Shape A — inline block (section-owned)

The block's `name` + `settings` are declared **directly in the section schema's `blocks` array**. The block has no separate file. The section liquid renders the block markup inline inside a `{% for %}` loop.

```js
// src/sections/services-grid/schema.js — inline blocks
import { createSectionSchema, createSchemaSettings } from '../../create-schema.js';

const cardSettings = createSchemaSettings({
  settings: () => [
    { type: 'text', id: 'title', label: 'Heading', default: 'Category title' },
    { type: 'text', id: 'description', label: 'Description' },
    { type: 'url',  id: 'link', label: 'Link' },
    { type: 'image_picker', id: 'image', label: 'Image' },
  ],
});

export const schema = createSectionSchema({
  name: 'Services grid',
  blocks: [
    { type: 'large_card', name: 'Large card', settings: cardSettings(), limit: 4 },
    { type: 'small_card', name: 'Small card', settings: cardSettings(), limit: 8 },
  ],
  max_blocks: 12,
});
```

The section's liquid loops + branches on `block.type`:

```liquid
{# src/sections/services-grid/services-grid.liquid #}
{% for block in section.blocks %}
  {% if block.type == 'large_card' %}
    <div class="card card--large" {{ block.shopify_attributes }}>
      <h3>{{ block.settings.title }}</h3>
      …
    </div>
  {% endif %}
{% endfor %}
```

**When to choose:** the block is tightly coupled to this section's layout. Used by **this section only**. The visual is non-reusable. Examples: `decoration` blocks of a hero (positioned absolutely inside the hero's stage), `tab` blocks of a tabs section, `slide` blocks of a slideshow.

### Shape B — theme block (separate file)

The block has its own folder: `src/blocks/<group>/<name>/<name>.liquid` + `<name>/schema.js`. Multiple sections can opt-in to accept it. The section schema declares the block type **without `settings`** — the block file owns those.

```
src/blocks/basic/heading/
├── heading.liquid       # block markup
└── schema.js            # createBlockSchema({ name, settings: [...] })
```

```js
// src/blocks/basic/heading/schema.js
import { createBlockSchema } from '../../../create-schema.js';

export const schema = createBlockSchema({
  name: 'Reveal heading',
  settings: [
    { type: 'text', id: 'text', label: 'Text', default: 'New arrivals' },
    {
      type: 'select', id: 'tag_name', label: 'Tag',
      options: [{ value: 'h1', label: 'Heading 1' }, { value: 'h2', label: 'Heading 2' }],
      default: 'h2',
    },
  ],
});
```

The section schema only references the type:

```js
// src/sections/product-list/schema.js
blocks: [
  { type: '@theme' },          // accept ALL theme blocks
  { type: '@app' },            // accept ALL app blocks (Theme Store rule)
]
```

Or whitelist specific theme block types:

```js
blocks: [
  { type: 'heading' },
  { type: 'button' },
  { type: 'image' },
]
```

**When to choose:** the block is **reusable across multiple sections** (heading / button / image / spacer / divider). The visual is generic. Examples: `src/blocks/basic/heading/`, `src/blocks/basic/button/`, `src/blocks/basic/image/`.

### The two special types — `@theme` and `@app`

| Type | Effect |
| --- | --- |
| `@theme` | Section accepts ANY block from `src/blocks/`. Merchant picks from the full theme-block catalog in the editor. |
| `@app` | Section accepts blocks installed by Shopify apps. **Required by Theme Store for main product + featured product sections.** |

A section that wants both:

```js
blocks: [
  { type: '@theme' },
  { type: '@app' },
]
```

Plus optionally a "Custom Liquid" block (Theme Store requirement where `@app` is offered — so merchants always have a fallback).

### Shape comparison cheat-sheet

| Trait | Inline block | Theme block |
| --- | --- | --- |
| File layout | None — owned by section schema | `src/blocks/<group>/<name>/<name>.liquid` + `schema.js` |
| Reusable across sections | No (section-scoped) | Yes |
| Section schema declares | `{ type, name, settings: [...] }` | `{ type }` (or `@theme` / `@app`) |
| Rendered by | `{% for block in section.blocks %}` + dispatch | `{% content_for 'blocks' %}` (auto) or `{% content_for 'block' %}` (static) |
| Has its own `.liquid` markup | No — section liquid handles it | Yes — `<name>.liquid` |
| Has its own schema validation | No — settings live in section schema | Yes — `createBlockSchema` |
| Typical use | Tabs, slides, decoration, custom cards | Heading, button, image, spacer, divider |

---

## 2. Three render patterns

### Pattern 1 — manual `for` + dispatch (inline blocks)

The section's liquid takes full control of block ordering, wrapping, and conditional rendering. Use with inline blocks.

```liquid
{%- capture content -%}
  <div class="grid">
    {%- for block in section.blocks -%}
      {%- if block.type == 'large_card' -%}
        <div class="grid__item grid__item--large" {{ block.shopify_attributes }}>
          {%- render 'card-large', settings: block.settings -%}
        </div>
      {%- endif -%}
    {%- endfor -%}
  </div>
{%- endcapture -%}

{% render 'section', content: content %}
```

**Pros:** complete control over markup wrapper, ordering, grid placement.
**Cons:** verbose if many block types; you write every dispatch branch.

### Pattern 2 — `{% content_for 'blocks' %}` slot (theme blocks)

Shopify renders each block by invoking its own `.liquid` file. The section's liquid just emits one tag where blocks should go.

```liquid
{%- capture content -%}
  <header>
    {%- if section.settings.heading != blank -%}
      <h2>{{ section.settings.heading }}</h2>
    {%- endif -%}
  </header>

  <div class="section__blocks">
    {% content_for 'blocks' %}     {# Shopify renders all blocks in merchant order #}
  </div>
{%- endcapture -%}

{% render 'section', content: content %}
```

**Pros:** zero dispatch code, theme blocks are self-rendering, supports `@theme` + `@app` blocks.
**Cons:** no per-block wrapper hooks — if you need a special `<div>` around the 3rd block, you can't. Each block decides its own markup.

This is the **only way** to render `@theme` / `@app` blocks correctly — you can't loop over them with `{% for %}` because you don't know what app blocks exist at template-author time.

### Pattern 3 — `{% content_for 'block' %}` static block (pinned)

Render a specific block instance at a fixed location in the section. Used to pin "must-have" UI elements that the merchant can configure but not delete/reorder.

```liquid
{# Render a specific block, pinned, with settings override #}
{% content_for 'block', type: 'product-gallery', id: 'main-gallery', settings: {
  enable_zoom: true,
  thumbnails_position: 'bottom'
} %}

{# Pinned + default settings — most common form #}
{% content_for 'block', type: 'product-title', id: 'product-title' %}
{% content_for 'block', type: 'product-price', id: 'product-price' %}
```

**Pros:** guarantees critical blocks render (title, price, add-to-cart on PDP). Merchant can configure but not remove.
**Cons:** the static block doesn't appear in the merchant's block list — they configure it via the dedicated UI surface or section settings.

### Mixing static + dynamic

PDP template combining pinned essentials with merchant-orderable extras:

```liquid
<div class="product">
  {# Pinned essentials — always present #}
  {% content_for 'block', type: 'product-title', id: 'product-title' %}
  {% content_for 'block', type: 'product-price', id: 'product-price' %}
  {% content_for 'block', type: 'product-form',  id: 'product-form' %}

  {# Merchant-orderable extras — appear in editor sidebar #}
  <div class="product__extras">
    {% content_for 'blocks' %}
  </div>
</div>
```

---

## 3. Dispatch patterns — `if/elsif` vs `case/when`

When using **Pattern 1** (manual `for`), you need to branch on `block.type`. Two shapes:

### `{% if %}` / `{% elsif %}` — best for 1-2 types

```liquid
{%- for block in section.blocks -%}
  {%- if block.type == 'large_card' -%}
    <div class="card card--large" {{ block.shopify_attributes }}>
      <h3>{{ block.settings.title }}</h3>
    </div>
  {%- elsif block.type == 'small_card' -%}
    <div class="card card--small" {{ block.shopify_attributes }}>
      <p>{{ block.settings.title }}</p>
    </div>
  {%- endif -%}
{%- endfor -%}
```

Concise for two block types. Readable when the logic per branch is short.

### `{% case %}` / `{% when %}` — best for 3+ types

```liquid
{%- for block in section.blocks -%}
  {%- case block.type -%}
    {%- when 'heading' -%}
      <h2 class="manifesto__head" {{ block.shopify_attributes }}>{{ block.settings.text }}</h2>
    {%- when 'image' -%}
      <div class="manifesto__image" {{ block.shopify_attributes }}>
        {%- render 'image', image: block.settings.image -%}
      </div>
    {%- when 'quote' -%}
      <blockquote class="manifesto__quote" {{ block.shopify_attributes }}>
        {{ block.settings.text }}
        <cite>— {{ block.settings.author }}</cite>
      </blockquote>
    {%- when 'spacer' -%}
      <div class="manifesto__spacer" {{ block.shopify_attributes }} style="--h:{{ block.settings.height }}px"></div>
    {%- else -%}
      {# Fallback — useful when accepting @theme alongside inline types #}
      <div {{ block.shopify_attributes }}>
        {{ block.settings.custom_liquid }}
      </div>
  {%- endcase -%}
{%- endfor -%}
```

**Why prefer `case` for 3+:** flat structure, all branches at the same indent level, easy to add a new `when` clause. `if/elsif/elsif/elsif…` chains drift right and obscure intent.

### Multi-value match in `case`

```liquid
{%- case block.type -%}
  {%- when 'card', 'card-large', 'card-small' -%}
    {%- render 'card', settings: block.settings -%}
{%- endcase -%}
```

Comma-separated values match the same branch. Useful when several types share the same render path.

### Two-axis dispatch — block type + a setting

```liquid
{%- for block in section.blocks -%}
  {%- liquid
    assign render_class = 'item'
    case block.type
      when 'card'
        case block.settings.size
          when 'large'
            assign render_class = 'item item--card-large'
          when 'small'
            assign render_class = 'item item--card-small'
        endcase
      when 'spacer'
        assign render_class = 'item item--spacer'
    endcase
  -%}
  <div class="{{ render_class }}" {{ block.shopify_attributes }}>…</div>
{%- endfor -%}
```

Nest `case` inside `case`. Cleaner than 6 branches of `if/elsif`.

### Project examples

| Section | Pattern | Block types | Source |
| --- | --- | --- | --- |
| `services-grid` | manual + `if` (2 types) | `large_card`, `small_card` | `src/sections/services-grid/services-grid.liquid` |
| `hero-collage` | manual + `if` (1 type) | `decoration` | `src/sections/hero-collage/hero-collage.liquid` |
| `product-list` | `{% content_for 'blocks' %}` | `@theme`, `@app` | `src/sections/product-list/` |
| `manifesto` (with future blocks) | candidate for `case` | `heading`, `image`, `quote`, `spacer` | — |

---

## 4. Limits — `max_blocks`, `limit`, the 50-ceiling

Three independent caps:

### Per-type `limit`

Cap how many of a specific block type a single section can have:

```js
blocks: [
  { type: 'large_card', name: 'Large card', settings: [...], limit: 4 },   // max 4 large cards
  { type: 'small_card', name: 'Small card', settings: [...], limit: 8 },   // max 8 small cards
]
```

The merchant's "Add block" menu will gray out the option once the limit is reached.

### Section-wide `max_blocks`

Cap the total block count across all types:

```js
export const schema = createSectionSchema({
  name: 'Services grid',
  blocks: [ /* … */ ],
  max_blocks: 12,        // sum across all types
});
```

When `max_blocks` is hit, no more blocks of any type can be added — even if the per-type `limit` hasn't been reached.

### Shopify hard ceiling — 50

A single section can hold at most 50 blocks regardless of what `max_blocks` says. Don't design layouts assuming more.

---

## 5. Preset defaults — pre-populated blocks

The merchant should see a working section the moment they install the theme or add the section to a page. That's the job of `presets`.

### Anatomy

```js
presets: [
  {
    name: 'Services grid',                  // shown in "+ Add section" dialog
    settings: {                              // section-level setting defaults
      padding_top: 80,
      padding_bottom: 80,
    },
    blocks: [                                // block instances pre-populated, in order
      { type: 'large_card', settings: { title: 'Food', description: 'Honest, single-source.' } },
      { type: 'small_card', settings: { title: 'Toys',  description: 'Smart play that lasts.' } },
    ],
  },
],
```

Each block entry: `{ type, settings: { ... } }`. The `settings` keys must match the block's setting `id`s.

### Multiple presets per section

A section can ship multiple presets (e.g. "Hero — left aligned", "Hero — center aligned"). Each preset gets its own row in the "+ Add section" dialog.

```js
presets: [
  {
    name: 'Hero collage — pet',
    settings: { … },
    blocks: [
      { type: 'decoration', settings: { kind: 'shape', position: 'tl', shape: 'bloom', shape_color: '#D24B3B' } },
      { type: 'decoration', settings: { kind: 'shape', position: 'mr', shape: 'flower', shape_color: '#F4D662' } },
      { type: 'decoration', settings: { kind: 'image', position: 'bl' } },
    ],
  },
  {
    name: 'Hero collage — parfum',
    settings: { … },
    blocks: [ /* different decoration layout */ ],
  },
],
```

### Nested blocks (theme blocks accepting children)

Some theme blocks accept their own child blocks. Preset entries can nest:

```js
presets: [
  {
    name: 'Product list',
    blocks: [
      {
        type: 'product-card',
        settings: { aspect_ratio: '1/1' },
        blocks: [                              // nested children inside the product-card block
          { type: 'product-media',  settings: { aspect_ratio: '4/5' } },
          { type: 'product-title' },
          { type: 'price' },
          { type: 'add-to-cart',   settings: { variant: 'primary' } },
        ],
      },
    ],
  },
],
```

The validator (`validate-schema.py --preset <path>`) walks the tree and checks that each nested block's `type` is accepted by the parent's `blocks: [...]` declaration.

### Real example — `hero-collage` ships a 6-block preset

```js
// src/sections/hero-collage/schema.js
presets: [
  {
    name: 'Hero collage',
    settings: {
      overline: 'On rotation · Spring 2026',
      heading: 'A daily <em>ritual</em> for the small ones.',
      subheading: 'A weekly journal entry, curated and kind.',
      stage_height: 'full',
      button_label: 'Shop the kit',
      button_link: '/collections/all',
    },
    blocks: [
      { type: 'decoration', settings: { kind: 'shape', position: 'tl', shape: 'bloom',    shape_color: '#D24B3B', size: 16, opacity: 35, parallax_y_start: -40, parallax_y_end: 60, rotation_start: -8,  rotation_end: 12 } },
      { type: 'decoration', settings: { kind: 'shape', position: 'ml', shape: 'sunburst', shape_color: '#F4877B', size: 11, opacity: 35, parallax_y_start: 30,  parallax_y_end: -30 } },
      { type: 'decoration', settings: { kind: 'shape', position: 'mr', shape: 'flower',   shape_color: '#F4D662', size: 13, opacity: 35, parallax_y_start: -30, parallax_y_end: 30 } },
      { type: 'decoration', settings: { kind: 'image', position: 'tr', size: 21 } },
      { type: 'decoration', settings: { kind: 'image', position: 'bl', size: 16 } },
      { type: 'decoration', settings: { kind: 'image', position: 'br', size: 19 } },
    ],
  },
],
```

The merchant clicks "+ Add section → Hero collage" and gets exactly this 6-block layout, ready to swap images and tweak colors.

### Default-setting rules

- Every preset setting `id` must exist in the section's schema settings (`validate-schema.py --preset` catches mismatches).
- Every preset block `type` must be in `schema.blocks` (or `@theme`/`@app` and the referenced block must exist).
- Resource-based settings (`image_picker`, `product`, `collection`, `link_list`) — defaults must reference resources that exist in every store. Don't default to a specific image from your demo store; leave it blank.
- `link_list` settings in Header/Footer presets must default to `main-menu` (Header) or `footer` (Footer) — Theme Store rule.

---

## 6. The `block` object inside a section

When iterating with `{% for block in section.blocks %}`, each `block` exposes:

| Property | What it is |
| --- | --- |
| `block.id` | Unique instance id (dynamically generated, can change) |
| `block.type` | The block's `type` string from schema — use for dispatch |
| `block.settings.<id>` | Block setting values |
| `block.shopify_attributes` | `data-shopify-…` attributes for Theme Editor selection — **always emit on block root** |
| `block.name` | Human-readable name (rarely used in markup) |

`block.settings` access is identical to `section.settings` — same `default`, `allow_false`, `!= blank` patterns.

```liquid
{%- liquid
  assign size      = block.settings.size      | default: 16
  assign show_link = block.settings.show_link | default: true, allow_false: true
  assign image     = block.settings.image
-%}
```

---

## 7. Common gotchas (block-specific)

### `block.shopify_attributes` is mandatory on the block's root

Without it, the Theme Editor can't highlight the block when the merchant clicks its row in the sidebar.

```liquid
{# BROKEN — block can't be selected #}
<div class="card">
  <h3>{{ block.settings.title }}</h3>
</div>

{# OK #}
<div class="card" {{ block.shopify_attributes }}>
  <h3>{{ block.settings.title }}</h3>
</div>
```

### `section.blocks.size`, not `.length` or `.count`

```liquid
{% if section.blocks.size > 0 %}…{% endif %}     ← OK
{% if section.blocks.length > 0 %}…{% endif %}   ← always 0 (no such property)
```

### Inline blocks and theme blocks can't be mixed in the same `{% for %}` cleanly

If a section declares `blocks: [{ type: 'card', name: 'Card', settings: […] }, { type: '@theme' }]`, the manual `for` loop sees both — but you can't render `@theme` blocks via `{% render %}`. They need `{% content_for 'blocks' %}`.

Pragmatic patterns:
- Use **all-inline** (manual `for` works for everything).
- Use **all-theme** (`{% content_for 'blocks' %}` works for everything).
- Mixing usually means: render inline blocks via `for` + skip `@theme` types, then emit `{% content_for 'blocks' %}` separately (rare and finicky).

### Preset block ordering = render order

The order of `blocks: [...]` in a preset is the order they appear when the merchant adds the section. Reordering in the preset = reordering on install.

### A block's `settings.id` must match the schema, not the preset

```js
// Block schema
settings: [{ type: 'text', id: 'heading', label: 'Heading' }]

// Preset block instance
{ type: 'card', settings: { heading: 'Hello' } }      // ✓ key matches id
{ type: 'card', settings: { title: 'Hello' } }        // ✗ silent — Shopify ignores 'title'
```

The validator catches this with `validate-schema.py --preset <path>`.

### `@theme` doesn't mean "every block file" — only those without `enabled_on` restrictions

Theme blocks can declare `enabled_on: { sections: [...] }` to restrict which sections they're usable in. `@theme` accepts blocks that don't restrict themselves OR explicitly include the section. See the `schema` skill for `enabled_on`.

### A section that accepts `@theme` blocks but is also written for inline blocks won't render correctly

If `blocks: [{ type: '@theme' }]` is declared but the section liquid uses `{% for block in section.blocks %}` + dispatch on a closed type list, theme blocks will fall through the `case` and not render. **Pair declaration with render pattern:**

| Schema declaration | Render pattern |
| --- | --- |
| Specific inline types only | manual `for` + `if/case` |
| `@theme` and/or `@app` | `{% content_for 'blocks' %}` |
| Mix (rare) | manual `for` for inline + `{% content_for 'blocks' %}` for theme (separate slots) |

---

## 8. Choosing — quick decision tree

```
Do these blocks belong only to THIS section's layout?
├── Yes  → Inline blocks.
│         Use manual {% for %} + if/case.
│         Set defaults via presets[i].blocks array.
│         Use limit + max_blocks to cap.
│
└── No, they're shared across sections.
    ├── Are they your own theme blocks (src/blocks/...)?
    │   ├── Yes — declare specific types in schema.blocks
    │   │        OR { type: '@theme' } to accept all
    │   │        Render via {% content_for 'blocks' %}
    │   └── No — they're @app blocks (from installed apps)
    │            Declare { type: '@app' } (Theme Store rule for product/featured-product sections)
    │            Render via {% content_for 'blocks' %}
    │
    └── Mix: pin essential blocks + accept theme/app extras
        Pin via {% content_for 'block', type, id %}
        Slot extras via {% content_for 'blocks' %}
```

---

## Related

- `references/tags.md` — `for`, `case`, `content_for`, `render`
- `references/objects.md` — `section`, `block`, `block.shopify_attributes`
- `references/idioms.md` — block iteration with `shopify_attributes` (§4)
- `references/gotchas.md` — block-specific pitfalls (#14, #20)
- `schema` skill — `createSectionSchema`, `createBlockSchema`, `enabled_on`, `visible`
- `design-to-liquid` skill — block-driven section composition (Step 3)
