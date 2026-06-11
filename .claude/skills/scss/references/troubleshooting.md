# Troubleshooting

Common SCSS issues and fixes.

---

## Grid is not responsive

**Problem:** Columns don't change at the expected breakpoint.

**Fix:** Check the column var syntax — values are plain column counts, not lengths. (The grid is `<div xo-grid class="xo-grid-block">`; there is no `<xo-grid>` element.)

```liquid
<!-- ❌ -->
<div xo-grid class="xo-grid-block" style="--xo-col-desktop: 3px">

<!-- ✅ -->
<div xo-grid class="xo-grid-block" style="--xo-col-desktop: 3; --xo-col-tablet: 2; --xo-col-mobile: 1">
```

---

## `@include media()` not working

**Problem:** The mixin call has no effect.

**Fix:** Import the mixin in the file.

```scss
@use "html/basehtml/src/styles/abstracts/media" as *;
```

---

## `color()` undefined

**Problem:** Function call errors out.

**Fix:** Import the functions.

```scss
@use "html/basehtml/src/styles/abstracts/functions" as *;
```

---

## CSS Variables (Root)

### Easing functions

```scss
:root {
  // Cubic
  --in-cubic: cubic-bezier(0.55, 0.055, 0.675, 0.19);
  --out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
  --in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);

  // Quad
  --in-quad: cubic-bezier(0.55, 0.085, 0.68, 0.53);
  --out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --in-out-quad: cubic-bezier(0.455, 0.03, 0.515, 0.955);

  // Quart
  --in-quart: cubic-bezier(0.895, 0.03, 0.685, 0.22);
  --out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
  --in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);

  // Special
  --out-soft: cubic-bezier(0, 0, 0.3, 1);
  --spring:   cubic-bezier(0.27, 0.79, 0.45, 1.24);
}
```

**Usage:**

```scss
.element {
  transition: all 0.3s var(--out-quart);
}
```

---

## Quick Reference

| Feature       | Usage                              | Example                  |
| ------------- | ---------------------------------- | ------------------------ |
| Grid          | `<div xo-grid class="xo-grid-block" style="--xo-col-desktop: 3">` | 3 desktop columns |
| Container     | `<xo-container>`                   | Centered container       |
| Line clamp    | `class="xo-line-2"`                | 2 lines max              |
| Media query   | `@include media('>md')`            | Desktop and up           |
| Color         | `color(primary, 0.8)`              | Primary at 80% opacity   |
| Font size     | `fz(heading, 2)`                   | Heading scale × 2        |
| Easing        | `var(--out-quart)`                 | Curve token              |

## Related

- `./functions.md` — function reference
- `./media.md` — breakpoints
- `./layout.md` — `xo-container` / `xo-grid`
- `./bem.md` — BEM naming
