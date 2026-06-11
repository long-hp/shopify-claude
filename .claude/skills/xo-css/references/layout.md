# Layout

Flexbox, grid, spacing, positioning, sizing, and overflow utilities.

## Flexbox

### Display

```html
<div class="d:flex">Flex container</div>
<div class="d:inline-flex">Inline flex container</div>
```

### Flex direction

```html
<div class="d:flex fld:row">Row (default)</div>
<div class="d:flex fld:column">Column</div>
<div class="d:flex fld:row-reverse">Row reverse</div>
<div class="d:flex fld:column-reverse">Column reverse</div>
```

`fld` = `flex-direction`

### Align items

```html
<div class="d:flex ai:center">Vertically centered</div>
<div class="d:flex ai:start">Align start</div>
<div class="d:flex ai:end">Align end</div>
<div class="d:flex ai:stretch">Stretch (default)</div>
<div class="d:flex ai:baseline">Baseline</div>
```

`ai` = `align-items`

### Justify content

```html
<div class="d:flex jc:center">Horizontally centered</div>
<div class="d:flex jc:space-between">Space between</div>
<div class="d:flex jc:space-around">Space around</div>
<div class="d:flex jc:space-evenly">Space evenly</div>
<div class="d:flex jc:start">Start</div>
<div class="d:flex jc:end">End</div>
```

`jc` = `justify-content`

### Flex wrap

```html
<div class="d:flex flw:wrap">Wrap</div>
<div class="d:flex flw:nowrap">No wrap (default)</div>
<div class="d:flex flw:wrap-reverse">Wrap reverse</div>
```

`flw` = `flex-wrap`

### Flex item

```html
<!-- Grow -->
<div class="flxg:1">Grow 1</div>
<div class="flxg:0">No grow</div>

<!-- Shrink -->
<div class="flxs:1">Shrink 1 (default)</div>
<div class="flxs:0">No shrink</div>

<!-- Basis -->
<div class="flxb:auto">Basis auto</div>
<div class="flxb:0">Basis 0</div>
<div class="flxb:200px">Basis 200px</div>

<!-- Shorthand -->
<div class="flx:1">flex: 1</div>
<div class="flx:1|1|auto">flex: 1 1 auto</div>

<!-- Align self -->
<div class="as:center">Self center</div>
<div class="as:start">Self start</div>
```

### Common flex patterns

```html
<!-- Centered content -->
<div class="d:flex ai:center jc:center">Perfectly centered</div>

<!-- Space between -->
<div class="d:flex ai:center jc:space-between">
  <div>Left</div>
  <div>Right</div>
</div>

<!-- Vertical stack with gap -->
<div class="d:flex fld:column gp:0.6rem">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Equal-width items -->
<div class="d:flex gp:0.6rem">
  <div class="flx:1">Item 1</div>
  <div class="flx:1">Item 2</div>
  <div class="flx:1">Item 3</div>
</div>
```

## Grid

`d:grid` is available but for most layouts the `<xo-grid>` web component is preferred.

```html
<xo-container>
  <h3>Equal columns (increment with breakpoint)</h3>
  <xo-grid style="--xs: 1; --sm: 2; --xl: 3">
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
  </xo-grid>

  <h3>Variable per-item columns (12-col grid)</h3>
  <xo-grid>
    <div style="--xs: 12; --sm: 6; --lg: 6;"><div class="comp"></div></div>
    <div style="--xs: 12; --sm: 6; --lg: 3"><div class="comp"></div></div>
    <div style="--xs: 12; --sm: 6; --lg: 3"><div class="comp"></div></div>
    <div style="--xs: 12; --sm: 6; --lg: 3"><div class="comp"></div></div>
    <div style="--xs: 12; --sm: 6; --lg: 6"><div class="comp"></div></div>
    <div style="--xs: 12; --sm: 6; --lg: 3"><div class="comp"></div></div>
  </xo-grid>

  <h3>Auto-responsive based on min column width</h3>
  <xo-grid style="--col-width: 300px">
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
    <div><div class="comp"></div></div>
  </xo-grid>

  <h3>Reorder items with `--order`</h3>
  <xo-grid>
    <div style="--xs: 12; --sm: 6; --lg: 7"><div class="comp"></div></div>
    <div style="--xs: 12; --sm: 6; --lg: 5; --order-lg: -1">
      <div class="comp" style="background-color: #f78c71">--order-lg: -1</div>
    </div>
    <div style="--xs: 12; --sm: 6; --lg: 4"><div class="comp"></div></div>
    <div style="--xs: 12; --sm: 6; --lg: 4"><div class="comp"></div></div>
    <div style="--xs: 12; --sm: 6; --lg: 4"><div class="comp"></div></div>
  </xo-grid>

  <h3>Offset with `--start`</h3>
  <xo-grid>
    <div style="--xs: 12; --md: 6; --lg: 4; --start-lg: 3"><div class="comp"></div></div>
    <div style="--xs: 12; --md: 6; --lg: 4"><div class="comp"></div></div>
  </xo-grid>
</xo-container>
```

## Spacing

### Padding

```html
<!-- All sides -->
<div class="p:1rem">Padding s6</div>

<!-- Per side -->
<div class="pt:0.6rem">Padding top</div>
<div class="pr:0.6rem">Padding right</div>
<div class="pb:0.6rem">Padding bottom</div>
<div class="pl:0.6rem">Padding left</div>

<!-- Logical shorthand -->
<div class="px:1rem">Padding inline (left + right)</div>
<div class="py:0.6rem">Padding block (top + bottom)</div>

<!-- Mixed -->
<div class="p:1rem py:1.4rem">Padding s6 with vertical override to s8</div>
```

| Shortcut | Property            |
| -------- | ------------------- |
| `p`      | `padding`           |
| `pt`     | `padding-top`       |
| `pr`     | `padding-right`     |
| `pb`     | `padding-bottom`    |
| `pl`     | `padding-left`      |
| `px`     | `padding-inline`    |
| `py`     | `padding-block`     |

### Margin

```html
<!-- All sides -->
<div class="m:1rem">Margin s6</div>

<!-- Per side -->
<div class="mt:0.6rem">Margin top</div>
<div class="mr:0.6rem">Margin right</div>
<div class="mb:0.6rem">Margin bottom</div>
<div class="ml:0.6rem">Margin left</div>

<!-- Logical shorthand -->
<div class="mx:1rem">Margin inline</div>
<div class="my:0.6rem">Margin block</div>

<!-- Auto centering -->
<div class="mx:auto">Horizontally centered</div>

<!-- Negative margins -->
<div class="mt:-s4">Negative top</div>
<div class="ml:-s6">Negative left</div>
```

Same shortcuts as padding with `m` prefix.

## Positioning

### Position

```html
<div class="pos:relative">Relative</div>
<div class="pos:absolute">Absolute</div>
<div class="pos:fixed">Fixed</div>
<div class="pos:sticky">Sticky</div>
<div class="pos:static">Static (default)</div>
```

`pos` = `position`

### Offsets

```html
<!-- Individual -->
<div class="pos:absolute t:0 l:0">Top-left corner</div>
<div class="pos:absolute t:0 r:0">Top-right corner</div>
<div class="pos:absolute b:0 l:0">Bottom-left corner</div>
<div class="pos:absolute b:0 r:0">Bottom-right corner</div>

<!-- All sides at once -->
<div class="pos:absolute ins:0">Fill parent</div>
<div class="pos:absolute ins:0.6rem">Inset s4 on all sides</div>

<!-- Centered -->
<div class="pos:absolute t:50% l:50% trf:translate(-50%,-50%)">Perfectly centered</div>
```

| Shortcut | Property |
| -------- | -------- |
| `t`      | `top`    |
| `r`      | `right`  |
| `b`      | `bottom` |
| `l`      | `left`   |
| `ins`    | `inset`  |

### Z-index

```html
<div class="z:1">Z-index 1</div>
<div class="z:10">Z-index 10</div>
<div class="z:100">Z-index 100</div>
<div class="z:-1">Behind</div>
```

## Display

```html
<div class="d:block">Block</div>
<div class="d:inline">Inline</div>
<div class="d:inline-block">Inline block</div>
<div class="d:flex">Flex</div>
<div class="d:inline-flex">Inline flex</div>
<div class="d:grid">Grid</div>
<div class="d:inline-grid">Inline grid</div>
<div class="d:none">Hidden</div>
```

`d` = `display`

## Width & Height

```html
<!-- Width -->
<div class="w:100%">Full width</div>
<div class="w:50%">Half width</div>
<div class="w:auto">Auto width</div>
<div class="w:100vw">Full viewport width</div>
<div class="w:var(--width)">Custom width</div>

<!-- Min / max width -->
<div class="miw:200px">Min width 200px</div>
<div class="maw:800px">Max width 800px</div>

<!-- Height -->
<div class="h:100%">Full height</div>
<div class="h:100vh">Full viewport height</div>
<div class="h:auto">Auto height</div>

<!-- Min / max height -->
<div class="mih:100px">Min height 100px</div>
<div class="mah:500px">Max height 500px</div>
```

| Shortcut | Property     |
| -------- | ------------ |
| `w`      | `width`      |
| `miw`    | `min-width`  |
| `maw`    | `max-width`  |
| `h`      | `height`     |
| `mih`    | `min-height` |
| `mah`    | `max-height` |

## Overflow

```html
<div class="ov:hidden">Overflow hidden</div>
<div class="ov:auto">Overflow auto</div>
<div class="ov:scroll">Overflow scroll</div>
<div class="ov:visible">Overflow visible</div>

<!-- Per axis -->
<div class="ovx:auto">Overflow-x auto</div>
<div class="ovy:hidden">Overflow-y hidden</div>
```

| Shortcut | Property     |
| -------- | ------------ |
| `ov`     | `overflow`   |
| `ovx`    | `overflow-x` |
| `ovy`    | `overflow-y` |

## Related

- `./basics.md` — syntax and tokens
- `./responsive.md` — breakpoints
- `./styling.md` — colors, typography, borders
- `./advanced.md` — pseudo states, group hover, transforms
