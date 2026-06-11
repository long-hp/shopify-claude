# Layout Components

`xo-container` web component + the `xo-grid-block` grid convention, plus helper classes. (The `<xo-grid>` element is removed — see Grid below.)

---

## `xo-container`

Responsive container with max-width and side padding.

```liquid
<xo-container>
  <!-- centered, max-width content -->
</xo-container>

<!-- Fluid (no max-width) -->
<xo-container xo-fluid>
  <!-- full-width content -->
</xo-container>
```

### CSS variables

```scss
--xo-container-width: 1400px;  // max width
--xo-container-gap: 20px;       // side padding
```

### Override

```scss
xo-container {
  --xo-container-width: 1200px;
  --xo-container-gap: 30px;
}
```

---

## Grid — `xo-grid-block`

> [!IMPORTANT]
> **The `<xo-grid>` element is removed — never write `<xo-grid …>`.** The grid is a plain `<div>` carrying the `xo-grid` *attribute* + the `xo-grid-block` *class*, sized by per-device column vars. Children are wrapped in `<xo-item>`. (Existing `<xo-grid>` usages in `src/` are legacy — migrate per the table below.)

### Basic grid

```liquid
<div xo-grid class="xo-grid-block" style="--xo-col-desktop: 4; --xo-col-tablet: 2; --xo-col-mobile: 1">
  <xo-item>Item 1</xo-item>
  <xo-item>Item 2</xo-item>
</div>
```

`--xo-col-{desktop|tablet|mobile}` = number of **equal** columns at each device tier (desktop >991px · tablet 768–991px · mobile <768px). Defaults 4 / 2 / 1. Gap inherits `--xo-grid-col-gap` / `--xo-grid-row-gap` (themed in `grid-config.scss`); override per-instance with `--xo-col-gap-{tier}` / `--xo-row-gap-{tier}`.

> For a **collection of repeating items** (products, cards, articles), prefer the full **`layout` system** — `{% render 'layout', content: items, context: section %}` — which adds a merchant Type switch (grid/carousel/masonry) over this same grid. See `design-to-liquid/references/grid-and-layout.md`.

### Migrating legacy `<xo-grid>`

| Legacy `<xo-grid>` | → `xo-grid-block` |
| --- | --- |
| element `<xo-grid>` … `</xo-grid>` | `<div xo-grid class="xo-grid-block">` … `</div>` |
| `style="--xs:N; --md:M; --lg:K"` | `style="--xo-col-mobile:N; --xo-col-tablet:M; --xo-col-desktop:K"` |
| breakpoint vars | `--xs` → mobile · `--md` → tablet · `--lg` → desktop (`--sm`/`--xl`/`--xxl` had no device tier — fold into the nearest) |
| `--col-width: 250px` (auto-fill) | no direct equivalent — set explicit per-device columns, or a small SCSS `grid-template-columns: repeat(auto-fill, minmax(250px,1fr))` rule |

> [!WARNING]
> **Span is NOT a var-rename.** Legacy `<xo-grid>` let children span a 12-col grid via `--lg:6` etc. (e.g. `featured-collection`'s 2-column split). `xo-grid-block` is **equal columns only** (`repeat(N, 1fr)`) — no per-child span var. A span layout must be rethought: model it as the real column count, or add native `grid-column: span N` on the child in SCSS. **Verify each span usage by eye — don't auto-convert.**

---

## CSS Variables

```scss
// Container
--xo-container-width: 1400px;
--xo-container-gap: 20px;

// Grid (xo-grid-block) — equal columns per device tier
--xo-col-desktop: 4;       // columns >991px
--xo-col-tablet: 2;        // columns 768–991px
--xo-col-mobile: 1;        // columns <768px

// Gap (themed; per-instance override optional)
--xo-grid-col-gap: 3rem;   // column gap
--xo-grid-row-gap: 3rem;   // row gap
```

> The legacy `<xo-grid>` element vars (`--xs`/`--sm`/`--md`/`--lg`/`--xl`/`--xxl`, `--col-width`, `--start-*`, `--order-*`) are gone with the element. Use the `--xo-col-*` vars above.

---

## Helper Classes

### Line clamp

```liquid
<p class="xo-line-1">Single line with ellipsis…</p>
<p class="xo-line-2">Two-line max…</p>
<p class="xo-line-3">Three-line max…</p>
```

---

## Best Practices

```liquid
<!-- ✅ Wrap sections -->
<xo-container>
  <section>…</section>
</xo-container>

<!-- ❌ Nested containers -->
<xo-container>
  <xo-container>…</xo-container>
</xo-container>
```

---

## Combined Example

```liquid
<xo-container>
  <div xo-grid class="xo-grid-block" style="--xo-col-desktop: 4; --xo-col-tablet: 2; --xo-col-mobile: 1">
    {% for product in collection.products %}
      <xo-item>{% render 'product-card', product: product %}</xo-item>
    {% endfor %}
  </div>
</xo-container>
```

## Related

- `./media.md` — breakpoint tiers (mobile / tablet / desktop)
- `./functions.md` — SCSS helpers for styling grid children
- `./bem.md` — BEM naming for custom components inside the grid
- `design-to-liquid/references/grid-and-layout.md` — the `layout` system (grid/carousel/masonry switch) + full `<xo-grid>` → `xo-grid-block` migration
