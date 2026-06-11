# Layout Components

`xo-container` and `xo-grid` web components, plus helper classes.

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

## `xo-grid`

Responsive grid system driven by CSS variables.

### Basic grid

```liquid
<xo-grid>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</xo-grid>
```

### Responsive columns

```liquid
<!-- 1 col mobile, 2 col tablet, 4 col desktop -->
<xo-grid style="--xs: 1; --md: 2; --xl: 4">
  <div>Item</div>
  <div>Item</div>
</xo-grid>
```

### Auto-fill with minimum column width

```liquid
<xo-grid style="--col-width: 250px">
  <!-- columns auto-fill at min 250px -->
</xo-grid>
```

### Grid-item column span

```liquid
<xo-grid>
  <div style="--xs: 12; --md: 6; --xl: 4">
    <!-- 12-col mobile, 6-col tablet, 4-col desktop (12-col grid) -->
  </div>
</xo-grid>
```

### Item positioning

```liquid
<xo-grid style="--md: 4">
  <div style="--start-md: 2">
    <!-- starts at column 2 from medium up -->
  </div>
  <div style="--order-md: -1">
    <!-- reordered from medium up -->
  </div>
</xo-grid>
```

---

## CSS Variables

```scss
// Container/grid
--xo-grid-col-gap: 30px;   // column gap
--xo-grid-row-gap: 30px;   // row gap
--align: normal;            // align-items

// Per-breakpoint columns
--xs: 1;   --sm: 2;   --md: 3;
--lg: 4;   --xl: 4;   --xxl: 5;

// Auto-fill min width
--col-width: 250px;

// Item positioning (per breakpoint)
--start-{breakpoint}: 1;    // grid-column-start
--order-{breakpoint}: 1;    // order
```

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
  <xo-grid style="--xs: 1; --md: 2; --lg: 3; --xl: 4">
    {% for product in collection.products %}
      <div>
        {% render 'product-card', product: product %}
      </div>
    {% endfor %}
  </xo-grid>
</xo-container>
```

## Related

- `./media.md` — breakpoints used by `xo-grid` variables
- `./functions.md` — SCSS helpers for styling grid children
- `./bem.md` — BEM naming for custom components inside the grid
