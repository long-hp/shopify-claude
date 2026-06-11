---
name: scss
description: MUST be invoked (via Skill tool) BEFORE creating or editing any `.scss` file (component `.global.scss`, shared `src/styles/`) AND when user picks "SCSS-first" in clarify-protocol Q7 (also invoked alongside XO-CSS-first since the tier-3 sidecar is unavoidable). Also MUST be invoked when XO-CSS cannot express a style — `&:hover .child` multi-target hover chains, `@keyframes` animations, pseudo-elements (`::before`/`::after`), complex sibling/descendant selectors, dynamic CSS-variable-driven styles. Those edge cases ALWAYS land in SCSS regardless of project CSS strategy. Memory of framework helpers (`color()`, `fz()`, `lh()`, `ls()`, `media('>md')` mixin breakpoints, `<xo-container>`/`<xo-grid>`) is incomplete — agent skip = inlined hex values, raw px units, missing mobile media wraps. Covers the BaseHTML SCSS framework + BEM naming (`xo-block__element--modifier`) + the choice axis vs XO-CSS atomic utilities.
---

# SCSS

BaseHTML SCSS framework: mixins, functions, and layout components for theme-specific styles.

**Framework location**: `html/basehtml/src/styles/`

## Quick Start

### Import

```scss
@use "html/basehtml/src/styles/abstracts/functions" as *;
@use "html/basehtml/src/styles/abstracts/media" as *;
```

### Functions

```scss
.element {
  color: color(foreground, 0.8);     // color with 80% opacity
  font-size: fz(heading, 2);         // heading scale × 2
  line-height: lh(body, 0.6);        // line-height for body
  letter-spacing: ls(heading, 0.06); // letter-spacing for heading
}
```

### Media queries

```scss
.element {
  padding: 10px;

  @include media('>md') {
    padding: 20px; // ≥ 768px
  }
}
```

### Layout components

```liquid
<xo-container>
  <xo-grid style="--md: 3">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
  </xo-grid>
</xo-container>
```

## Navigation — When to read which file

- **Using SCSS functions** (color, fz, lh, ls) → `references/functions.md`
- **Responsive design / breakpoints** → `references/media.md`
- **`xo-container` / `xo-grid` layout** → `references/layout.md`
- **BEM naming conventions** → `references/bem.md`
- **Hitting an error or stuck** → `references/troubleshooting.md`

## SCSS vs XO-CSS — When to use which

### Use SCSS when

- Component with many variations or nested logic
- Theming / dark mode
- Dynamic calculations
- Component-specific stylesheet

### Use XO-CSS when

- Simple layout (flex, grid, spacing)
- Typography basics
- Rapid prototyping in liquid templates
- Utility-first approach

### Combined approach (typical)

```liquid
<div class="xo-product-card d:flex gp:0.6rem">
  <div class="xo-product-card__image bdrs:s4">
    <!-- XO-CSS for utilities, SCSS for component-specific styles -->
  </div>
</div>
```

```scss
.xo-product-card {
  &__image {
    transition: transform 0.3s;

    &:hover {
      transform: scale(1.05);
    }
  }
}
```

## Breakpoint Cheatsheet

| Breakpoint | Min-width | Usage                  |
| ---------- | --------- | ---------------------- |
| `sm`       | 576px     | `@include media('>sm')`|
| `md`       | 768px     | `@include media('>md')`|
| `lg`       | 992px     | `@include media('>lg')`|
| `xl`       | 1200px    | `@include media('>xl')`|
| `xxl`      | 1400px    | `@include media('>xxl')`|

## Functions Cheatsheet

| Function | Purpose            | Example                |
| -------- | ------------------ | ---------------------- |
| `color()`| Color with opacity | `color(primary, 0.8)`  |
| `fz()`   | Font-size scaling  | `fz(heading, 2)`       |
| `lh()`   | Line-height        | `lh(body, 0.6)`        |
| `ls()`   | Letter-spacing     | `ls(heading, 0.06)`    |

## Source

- **Functions**: `html/basehtml/src/styles/abstracts/functions`
- **Media**: `html/basehtml/src/styles/abstracts/media`
- **Layout components**: `html/basehtml/src/styles/components/layout`
