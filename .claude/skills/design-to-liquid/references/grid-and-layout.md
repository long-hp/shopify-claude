# Layout & grid — use the system layout, don't hand-roll CSS

> When a design section presents a **collection of repeating items** (cards, media, products, articles, logos) as a **grid / masonry / carousel / grid-hover-expand**, port it onto this theme's layout system instead of re-implementing the layout in section SCSS. The headline option is the **`layout` system** (`src/snippets/_layout/`), which lets the merchant switch between those modes from a single setting. Drives **clarify-protocol Q8 (Layout mechanism)**.

## The `layout` system (`src/snippets/_layout/`)

`_layout/layout/layout.liquid` is a **dispatcher** on `context.settings.layout_type` → renders one of four mode snippets. Children are wrapped in `<xo-item>`. The element each mode emits (verified):

| `layout_type` | Mode snippet | Output element | Columns/gap vars |
| --- | --- | --- | --- |
| `grid` (default) | `layout-grid` | `<div xo-grid class="xo-grid-block" …>` | `--xo-col-desktop` / `--xo-col-tablet` / `--xo-col-mobile` |
| `carousel` | `layout-carousel` | `<xo-carousel>` › `<xo-carousel-inner>` › `<xo-carousel-list>` | same `--xo-col-*` + `--xo-gap-*` |
| `masonry` | `layout-masonry` | `<xo-masonry …>` | shared column base |
| `grid-hover-expand` | `layout-grid-hover-expand` | `<xo-grid-hover-expand …>` | shared column base |

(`layout-freedom` exists but is filtered out of the merchant options.)

> [!IMPORTANT]
> **There is no `<xo-grid>` element here.** The grid is a `<div>` carrying the `xo-grid` *attribute* + the `xo-grid-block` *class*, sized by `--xo-col-desktop/tablet/mobile`. Don't write `<xo-grid …>` (that's a different, non-layout convention). The carousel/masonry/grid-hover-expand **elements are owned by their mode snippets** — render them through the layout system, don't hand-roll them (e.g. `layout-carousel` internals incl. nav are still evolving).

## The three layout targets

| Target | What it is | Merchant control | Use when |
| --- | --- | --- | --- |
| **`layout` system** (`{% render 'layout' %}`) | The dispatcher above + `layoutSchemaSettings`. | **Full + switchable** — one "Type" select flips grid↔carousel↔masonry↔grid-hover-expand; plus columns (per-device), gap, per-mode advanced settings. | **Default for collection sections.** Homogeneous repeating items where ≥2 modes are interchangeable. What `product-list`, `collection-list`, `blog-list`, `recently-viewed`, etc. already do. |
| **Static grid primitive** | A `<div xo-grid class="xo-grid-block" style="--xo-col-desktop:N; --xo-col-tablet:N; --xo-col-mobile:N">` written directly, items in `<xo-item>`. Fixed grid, no Type switch. | Columns can be section settings, but the mode is fixed (grid only). | Only a grid is ever needed AND no merchant grid↔carousel switch. Lighter than the full system. (For a fixed carousel/masonry, prefer the `layout` system pinned to that type — don't hand-roll those elements.) |
| **Raw CSS** | `display:grid` / `column-count` / scroll-snap in the section `.global.scss`. | None. | Bespoke layouts only (asymmetric spans, `grid-template-areas`, named regions) the primitives can't express. Escape hatch. |

## When is the `layout` system the right offer? (the suitable-case gate)

**FIRE Q8 (offer the `layout` system) only when ALL hold:**

1. The section renders **N ≥ 3 homogeneous repeating items** — the same card/media/component repeated (products, articles, collections, logos, testimonials, gallery tiles).
2. The items form a **one-dimensional collection** that grid / carousel / masonry can each present sensibly.
3. The design lays them out as a grid / grid-block / masonry / carousel / grid-hover-expand (raw-CSS **or** an existing layout markup).

**DON'T fire** when any of:

- **Bespoke / heterogeneous layout** — hero collage, feature split (image + text side-by-side), editorial asymmetric, overlapping/absolutely-positioned decoration.
- **Single or 2-item** layouts where carousel/masonry is nonsensical.
- **Layout is intrinsic to meaning** — comparison table, timeline, step flow — where switching to carousel would break it.
- Items aren't a uniform collection.

The gate is "could the merchant plausibly want to flip this between grid and carousel?". If yes → offer it. If the layout is the design's identity, don't.

## What the merchant gets (`layoutSchemaSettings`)

Spreading `...layoutSchemaSettings()` into a section schema exposes:

| Setting | Control |
| --- | --- |
| `layout_type` | **Type** select — grid · carousel · masonry · grid-hover-expand (default grid). The switch. |
| `col` | Columns, per-device (desktop default 4, mobile 1) → emitted as `--xo-col-*` |
| `gap` + `custom_gap` | Global theme gap or a custom per-device value |
| grid → `fixed_row` / `auto_row` | visible when Type = grid |
| carousel → `per_move`, `effect` (slide/fade/nature/water/urban), `speed`, `active_index`, … | visible when Type = carousel |
| `width` / `custom_width` · padding | optional (`width_enabled` / `padding_enabled`) |

masonry + grid-hover-expand reuse the shared columns/gap — no extra settings.

## Recipe A — adopt the `layout` system (primary)

Canonical reference: `src/sections/product-list/`.

```liquid
{# 1. wrap each repeating item in <xo-item> #}
{% capture items %}
  {%- for product in products -%}
    <xo-item>{% render 'product-card', product: product, … %}</xo-item>
  {%- endfor -%}
{% endcapture %}

{# 2. hand the collection to the layout dispatcher; context = the section #}
{% capture layout %}
  {% render 'layout', content: items, context: section %}
{% endcapture %}

{% capture content %}{{ header }}{{ layout }}{% endcapture %}
{% render 'section', content: content %}
```

```js
// schema.js
import { layoutSchemaSettings } from "../../snippets/_layout/layout/schema.js";

export const schema = createSectionSchema({
  name: "…",
  settings: [
    /* …per-section content settings… */
    ...sectionSchemaSettings({ … }),
    ...layoutSchemaSettings(),   // ← Type + columns + gap + per-mode settings
  ],
});
```

The merchant now sees a **Type** selector switching grid/carousel/masonry/grid-hover-expand, with columns/gap and the mode's advanced controls — no extra markup per mode.

## Recipe B — static grid primitive (no merchant switch)

When only a fixed grid is ever needed:

```liquid
<div xo-grid class="xo-grid-block" style="--xo-col-desktop: 4; --xo-col-tablet: 2; --xo-col-mobile: 2">
  {%- for block in section.blocks -%}
    <xo-item {{ block.shopify_attributes }}>{% render '<card>', … %}</xo-item>
  {%- endfor -%}
</div>
```

Gap inherits the theme grid gap; set a custom gap only on a real difference. **Don't write `<xo-grid>`** — it's `<div xo-grid class="xo-grid-block">`.

## Detection — what to look for in the design (Step 1)

While surveying, flag a layout-able collection:

- **Grid:** `display: grid` + `grid-template-columns: repeat(N, 1fr)`, or existing `<div xo-grid class="xo-grid-block">` markup.
- **Masonry:** `column-count` / `columns:` CSS, a JS masonry lib, or staggered-height tiles.
- **Carousel:** `scroll-snap` + `overflow-x`, a slider lib, or `<xo-carousel>`; arrows/dots in the markup.
- **flex-wrap fake-grid:** a `flex-wrap: wrap` row of fixed-percentage children.

Any of these on a homogeneous N≥3 collection → run the suitable-case gate → fire Q8. Don't copy the raw layout CSS into the section verbatim.

## Worked examples

- **`featured-products`** — 4 product cards in a 2×2 raw-CSS grid. Homogeneous collection, switchable → Q8 fires; recommend **A `layout` system** (merchant can flip to carousel on mobile). Wire products into `<xo-item>` + `{% render 'layout' %}` + `...layoutSchemaSettings()`.
- **`logo-marquee`** — a single row of logos that only ever scrolls → a single primitive (`<xo-marquee>`), not the full layout system (grid/masonry don't apply).
- **`hero-collage`** — 6 absolutely-positioned decoration tiles → **don't fire** (bespoke, heterogeneous; switching to carousel is meaningless). Keep bespoke layout (raw CSS allowed, tier-3).

## Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Writing `<xo-grid …>` | The grid is `<div xo-grid class="xo-grid-block" style="--xo-col-desktop:N">`. No `<xo-grid>` element. |
| Copying `display:grid`/`column-count`/scroll-snap into `<name>.global.scss` for a collection section | Use the `layout` system (or the static grid primitive). Don't re-implement the layout engine per section. |
| Reaching for a fixed grid when the merchant should be able to switch to carousel | Offer the `layout` system — that's its whole purpose. |
| Hand-rolling `<xo-carousel>` / `<xo-masonry>` internals | Render them through the `layout` system; those snippets own the markup (and are still evolving). |
| Forgetting the `<xo-item>` wrapper around each child | The layout modes lay out `<xo-item>` units; bare children won't flow correctly. |

## Related

- `./clarify-protocol.md` Q8 — the Layout-mechanism question
- `./sections-to-liquid.md` — section composition + the "hand-rolling a layout wrapper" pitfall
- `./data-to-settings.md` — when collection items become block settings (interplay with Q2/Q3)
- Source: `src/snippets/_layout/` (dispatcher `layout/`, modes `layout-grid` / `layout-carousel` / `layout-masonry` / `layout-grid-hover-expand`, `base/column-base.schema.js`)
