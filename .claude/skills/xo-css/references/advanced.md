# Advanced

Pseudo states, group hover, parent attributes, children selectors, CSS variables, transforms, transitions, and filters.

## Pseudo States

### Basic pseudo classes

```html
<!-- Hover -->
<div class="c:primary|h">Color on hover</div>

<!-- Focus -->
<div class="c:blue|f">Color on focus</div>

<!-- Active -->
<div class="bgc:layer-1|a">Background on active</div>

<!-- Visited -->
<a href="#" class="c:primary|vi">Visited link color</a>

<!-- Disabled -->
<button class="op:0.5|di">Disabled opacity</button>
```

### Pseudo elements

```html
<!-- ::before -->
<div class="cnt:'→'||be">Arrow before</div>

<!-- ::after -->
<div class="cnt:'←'||af">Arrow after</div>

<!-- ::placeholder -->
<input class="c:foreground.5||ph" placeholder="Enter text">
```

Syntax: `property:value||element`

| Token | Maps to        |
| ----- | -------------- |
| `||be` | `::before`    |
| `||af` | `::after`     |
| `||ph` | `::placeholder` |

### Multiple pseudo

```html
<!-- Multiple pseudo classes -->
<div class="c:primary|h c:primary|f">Hover and focus</div>

<!-- Pseudo class + element -->
<div class="c:blue|h||af">Blue ::after on hover</div>

<!-- Content on hover ::after -->
<div class="cnt:'✓'|h||af">Checkmark appears on hover</div>
```

### nth-child

```html
<!-- Every 2nd child -->
<div class="bgc:layer-1|nch(2n)">Even items</div>

<!-- Every 3rd child -->
<div class="c:primary|nch(3n)">Every 3rd item</div>

<!-- First child -->
<div class="fw:700|fc">Bold first child</div>

<!-- Last child -->
<div class="mb:0|lc">No margin on last</div>
```

| Token       | Maps to          |
| ----------- | ---------------- |
| `|nch(n)`   | `:nth-child(n)`  |
| `|fc`       | `:first-child`   |
| `|lc`       | `:last-child`    |

### Common pseudo patterns

```html
<!-- Hover underline -->
<a class="td:none td:underline|h">
  Link with hover underline
</a>

<!-- Disabled state -->
<button class="op:1 op:0.5|di cur:pointer cur:not-allowed|di">
  Button with disabled style
</button>

<!-- Custom bullet -->
<li class="cnt:'•'||be c:primary||be mr:0.2rem||be">
  Custom bullet
</li>

<!-- Hover scale -->
<div class="trf:scale(1) trf:scale(1.05)|h">
  Grows on hover
</div>
```

## Group Hover

Apply styles to a child when its parent is hovered.

### Basic usage

```html
<div class="group">
  <div class="c:foreground c:primary*gh">
    Becomes primary when parent .group is hovered
  </div>
</div>
```

Syntax: `property:value*gh` (`*gh` = group hover).

### Advanced — `xo-hover` and `xo-abs` attributes

```html
<div xo-hover class="w:20rem">
  <div class="h:20rem bgc:layer-1"></div>
  <div xo-effect="up out fade-out" xo-abs="left bottom" style="--left: 1rem; --bottom: 1rem">
    <div class="fz:1.2rem c:foreground">Content 1</div>
  </div>
  <div xo-effect="up in fade-in" xo-abs="left bottom" style="--left: 1rem; --bottom: 1rem">
    <div class="fz:1.2rem c:foreground">Content 2</div>
  </div>
</div>
```

### `xo-abs` positions

| Value                 | Notes                                                    |
| --------------------- | -------------------------------------------------------- |
| `top left`            |                                                          |
| `top right`           |                                                          |
| `bottom left`         |                                                          |
| `bottom right`        |                                                          |
| `center`              |                                                          |
| `center left`         |                                                          |
| `center right`        |                                                          |
| `center top`          |                                                          |
| `center bottom`       |                                                          |
| `fill`                | Stretches over the entire parent                         |
| Custom via variables  | e.g. `style="--left: 1rem; --bottom: 1rem"`              |

### `xo-effect` effects

`up`, `down`, `left`, `right`, `zoom`, `fade-in`, `fade-out` (combine with `in`/`out`).

## Parent Attributes

Apply styles based on a parent element's attribute.

### XO attributes

```html
<!-- Parent has [xo-active] -->
<div xo-active>
  <span class="c:foreground c:primary/xo-active">
    Becomes primary when parent has xo-active
  </span>
</div>

<!-- Parent has [xo-hover] -->
<div xo-hover>
  <span class="bgc:transparent bgc:layer-1/xo-hover">
    Background appears when parent has xo-hover
  </span>
</div>
```

Syntax: `property:value/xo-attribute`

### Self has the attribute (same element)

```html
<div xo-active class="bd:none bd:s1 bdc:primary/xo-active-">
  Border when self has xo-active
</div>
```

Syntax: `property:value/xo-attribute-` (trailing dash = self).

### Direct child only

```html
<div xo-active>
  <div class="bgc:transparent bgc:layer-1/xo-active">
    Only direct children are affected
  </div>
</div>
```

### Common patterns

```html
<!-- Tab system -->
<div class="tabs">
  <button xo-active class="c:foreground c:primary/xo-active- bdb:s2 bdbc:transparent bdbc:primary/xo-active-">
    Active tab
  </button>
</div>

<!-- Accordion -->
<div class="accordion-item">
  <button xo-expanded>
    Title
    <svg class="trf:rotate(0deg) trf:rotate(180deg)/xo-expanded">
      Arrow rotates when expanded
    </svg>
  </button>
</div>

<!-- Current menu item -->
<nav>
  <a xo-current class="c:foreground c:primary/xo-current- fw:400 fw:600/xo-current-">
    Current page
  </a>
</nav>
```

## Children Selector

Apply styles to specific children.

```html
<div class="c:primary*span">
  <span>This span becomes primary</span>
  <div>This div is NOT affected</div>
</div>
```

Syntax: `property:value*selector`.

### Examples

```html
<!-- All links -->
<div class="c:primary*a td:none*a">
  <a href="#">Link 1</a>
  <a href="#">Link 2</a>
</div>

<!-- All images -->
<div class="w:100%*img h:auto*img">
  <img src="1.jpg">
  <img src="2.jpg">
</div>

<!-- All headings -->
<div class="c:primary*h1 c:primary*h2 c:primary*h3">
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <h3>Heading 3</h3>
</div>
```

## CSS Variables

### Basic usage

```html
<div class="w:var(--width)" style="--width: 20rem">
  Width driven by a CSS variable
</div>
```

### Dynamic values from Liquid

```liquid
<div
  class="p:var(--spacing) c:var(--color)"
  style="--spacing: {{ section.settings.spacing }}; --color: {{ section.settings.color }}"
>
  Dynamic spacing and color
</div>
```

### Responsive variables

```html
<div
  class="p:var(--spacing) p:var(--spacing-md)@md p:var(--spacing-lg)@lg"
  style="--spacing: 1rem; --spacing-md: 2rem; --spacing-lg: 3rem"
>
  Responsive padding via CSS variable
</div>
```

### Why use them

1. **Maintainable** — easy to update from JavaScript
2. **Responsive** — easy to vary per breakpoint
3. **Dynamic** — pairs well with Liquid settings
4. **Inheritable** — variables cascade from the parent

## Advanced Combinations

### Responsive + pseudo

```html
<!-- Hover only on desktop -->
<div class="c:foreground c:primary|h@md">
  Hover effect at ≥768px only
</div>

<!-- Different hover per breakpoint -->
<div class="bgc:transparent bgc:layer-1|h@md bgc:layer-2|h@lg">
  Progressive hover backgrounds
</div>
```

### Parent attr + responsive

```html
<div xo-active>
  <div class="d:none d:block/xo-active@md">
    Shows when parent is active AND ≥768px
  </div>
</div>
```

### Everything combined

```html
<div class="group" xo-theme="dark">
  <div class="
    c:foreground
    c:primary*gh
    c:secondary|h
    c:white/xo-theme@md
  ">
    - foreground by default
    - primary on group hover
    - secondary on self hover
    - white when parent has xo-theme on desktop
  </div>
</div>
```

## Transform

```html
<!-- Translate -->
<div class="trf:translateX(1rem)">Move right</div>
<div class="trf:translateY(-1rem)">Move up</div>
<div class="trf:translate(1rem,2rem)">Move right and down</div>

<!-- Scale -->
<div class="trf:scale(1.1)">Scale to 110%</div>
<div class="trf:scale(0.9)">Scale to 90%</div>

<!-- Rotate -->
<div class="trf:rotate(45deg)">Rotate 45°</div>
<div class="trf:rotate(-90deg)">Rotate -90°</div>

<!-- Combined (use underscore as separator) -->
<div class="trf:translateX(1rem)_scale(1.1)_rotate(5deg)">
  Multiple transforms
</div>

<!-- Hover transform -->
<div class="trf:scale(1) trf:scale(1.05)|h trs:transform_0.3s">
  Smooth hover scale
</div>
```

## Transition

```html
<!-- Single property -->
<div class="trs:0.3s">Transition all properties</div>
<div class="trs:opacity_0.2s">Transition opacity only</div>

<!-- With easing -->
<div class="trs:0.3s_var(--out-soft)">Custom easing</div>

<!-- Common pattern -->
<div class="op:0.7 op:1|h trs:0.2s">
  Smooth opacity change
</div>
```

### Easings (available in `:root`)

```css
:root {
  --in-cubic:     cubic-bezier(0.55, 0.055, 0.675, 0.19);
  --out-cubic:    cubic-bezier(0.215, 0.61, 0.355, 1);
  --in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);
  --in-quad:      cubic-bezier(0.55, 0.085, 0.68, 0.53);
  --out-quad:     cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --in-out-quad:  cubic-bezier(0.455, 0.03, 0.515, 0.955);
  --in-quart:     cubic-bezier(0.895, 0.03, 0.685, 0.22);
  --out-quart:    cubic-bezier(0.165, 0.84, 0.44, 1);
  --in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
  --in-sine:      cubic-bezier(0.47, 0, 0.745, 0.715);
  --out-sine:     cubic-bezier(0.39, 0.575, 0.565, 1);
  --in-out-sine:  cubic-bezier(0.445, 0.05, 0.55, 0.95);
  --out-soft:     cubic-bezier(0, 0, 0.3, 1);
  --spring:       cubic-bezier(0.27, 0.79, 0.45, 1.24);
}
```

## Filter

```html
<!-- Blur -->
<div class="fil:blur(4px)">Blurred</div>

<!-- Brightness -->
<div class="fil:brightness(1.2)">Brighter</div>

<!-- Grayscale -->
<div class="fil:grayscale(100%)">Grayscale</div>

<!-- Combined -->
<div class="fil:blur(2px)_brightness(1.1)">
  Multiple filters
</div>

<!-- Hover filter -->
<img class="fil:grayscale(100%) fil:grayscale(0)|h trs:filter_0.3s">
```

## Backdrop Filter

```html
<!-- Frosted glass -->
<div class="bdft:blur(10px)">Frosted glass effect</div>

<!-- Combined -->
<div class="bdft:blur(10px)_brightness(1.2)">
  Bright frosted glass
</div>
```

## Related

- `./basics.md` — syntax and tokens
- `./pseudo.md` — full pseudo-shortcut map
- `./properties.md` — full property-shortcut map
- `./responsive.md` — combining with breakpoints
