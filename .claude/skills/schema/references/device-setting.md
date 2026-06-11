# Device Settings

Create settings that have separate desktop and mobile values.

## Import

```javascript
import { createSectionSchema, deviceSetting } from "../../../create-schema.js";
```

## The `deviceSetting()` Selector

`deviceSetting()` adds a dropdown that toggles between desktop and mobile setting values:

```javascript
export const schema = createSectionSchema({
  name: 'Responsive section',
  settings: [
    { type: 'header', content: 'Layout' },
    deviceSetting(),
    // device-aware settings below…
  ],
});
```

### Output

```javascript
{
  type: 'select',
  id: 'device',
  label: 'Device',
  default: 'desktop',
  options: [
    { value: 'desktop', label: 'Desktop' },
    { value: 'mobile', label: 'Mobile' },
  ],
}
```

### Customizing

```javascript
deviceSetting({
  label: 'Device',
  visible_if: visible('enable_responsive', true),
})
```

## Device-Specific Settings

Add `devices: ['desktop', 'mobile']` to any setting that needs separate per-device values:

```javascript
{
  type: 'range',
  id: 'columns',
  label: ['Columns (Desktop)', 'Columns (Mobile)'],
  min: 1,
  max: [6, 3],        // desktop max 6, mobile max 3
  step: 1,
  default: [4, 2],    // desktop 4, mobile 2
  devices: ['desktop', 'mobile'],
}
```

### What gets emitted

Two real settings are produced:

```javascript
// Desktop
{
  type: 'range',
  id: 'columns_desktop',
  label: 'Columns (Desktop)',
  min: 1, max: 6, step: 1, default: 4,
  visible_if: "{{ section.settings.device == 'desktop' }}",
}

// Mobile
{
  type: 'range',
  id: 'columns_mobile',
  label: 'Columns (Mobile)',
  min: 1, max: 3, step: 1, default: 2,
  visible_if: "{{ section.settings.device == 'mobile' }}",
}
```

## Properties That Accept Arrays

When `devices` is set, these properties can be `[desktop_value, mobile_value]`:

- `label`
- `default`
- `min` (range/number)
- `max` (range/number)
- `info`

```javascript
{
  type: 'range',
  id: 'gap',
  label: ['Gap (Desktop)', 'Gap (Mobile)'],
  min: [0, 0],
  max: [100, 50],
  step: 1,
  default: [40, 20],
  info: ['Desktop gap in pixels', 'Mobile gap in pixels'],
  devices: ['desktop', 'mobile'],
}
```

## `visible_if` With Device Settings

When a device-aware setting has `visible_if`, the device condition is appended automatically:

```javascript
{
  type: 'range',
  id: 'columns',
  label: ['Columns (Desktop)', 'Columns (Mobile)'],
  min: 1, max: [6, 3], default: [4, 2],
  devices: ['desktop', 'mobile'],
  visible_if: visible('show_grid', true),
}
```

Compiles to:

```text
Desktop: {{ section.settings.show_grid == true and section.settings.device == 'desktop' }}
Mobile:  {{ section.settings.show_grid == true and section.settings.device == 'mobile' }}
```

## Complete Example

```javascript
import { createSectionSchema, deviceSetting, visible } from "../../../create-schema.js";

export const schema = createSectionSchema({
  name: 'Responsive grid',
  class: 'section-responsive-grid',
  settings: [
    { type: 'header', content: 'General' },
    { type: 'text', id: 'heading', label: 'Heading', default: 'Grid section' },

    { type: 'header', content: 'Layout' },
    { type: 'checkbox', id: 'enable_responsive', label: 'Enable responsive settings', default: true },

    deviceSetting({
      visible_if: visible('enable_responsive', true),
    }),

    {
      type: 'range',
      id: 'columns',
      label: ['Columns (Desktop)', 'Columns (Mobile)'],
      min: 1, max: [6, 3], step: 1, default: [4, 2],
      devices: ['desktop', 'mobile'],
      visible_if: visible('enable_responsive', true),
    },
    {
      type: 'range',
      id: 'gap',
      label: ['Gap (Desktop)', 'Gap (Mobile)'],
      min: 0, max: [100, 50], step: 1, default: [40, 20], unit: 'px',
      devices: ['desktop', 'mobile'],
      visible_if: visible('enable_responsive', true),
    },
    {
      type: 'range',
      id: 'padding',
      label: ['Padding (Desktop)', 'Padding (Mobile)'],
      min: 0, max: 100, step: 1, default: [60, 30], unit: 'px',
      devices: ['desktop', 'mobile'],
      visible_if: visible('enable_responsive', true),
    },
  ],
});
```

## Reading in Liquid

```liquid
{% liquid
  assign columns_desktop = section.settings.columns_desktop
  assign columns_mobile = section.settings.columns_mobile
  assign gap_desktop = section.settings.gap_desktop
  assign gap_mobile = section.settings.gap_mobile
%}

<div
  class="grid"
  style="
    --columns-desktop: {{ columns_desktop }};
    --columns-mobile: {{ columns_mobile }};
    --gap-desktop: {{ gap_desktop }}px;
    --gap-mobile: {{ gap_mobile }}px;
  "
>
  <!-- grid items -->
</div>
```

```css
.grid {
  display: grid;
  grid-template-columns: repeat(var(--columns-mobile), 1fr);
  gap: var(--gap-mobile);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(var(--columns-desktop), 1fr);
    gap: var(--gap-desktop);
  }
}
```

## Supported Setting Types

Most types accept `devices`. Common patterns:

### Range

```javascript
{
  type: 'range',
  id: 'columns',
  label: ['Columns (Desktop)', 'Columns (Mobile)'],
  min: 1, max: [6, 3], default: [4, 2],
  devices: ['desktop', 'mobile'],
}
```

### Number

```javascript
{
  type: 'number',
  id: 'items_count',
  label: ['Items (Desktop)', 'Items (Mobile)'],
  default: [12, 6],
  devices: ['desktop', 'mobile'],
}
```

### Select

```javascript
{
  type: 'select',
  id: 'alignment',
  label: ['Alignment (Desktop)', 'Alignment (Mobile)'],
  options: [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ],
  default: ['left', 'center'],
  devices: ['desktop', 'mobile'],
}
```

### Checkbox

```javascript
{
  type: 'checkbox',
  id: 'show_image',
  label: ['Show image (Desktop)', 'Show image (Mobile)'],
  default: [true, false],
  devices: ['desktop', 'mobile'],
}
```

## Best Practices

### 1. Always add `deviceSetting()` before device-aware settings

```javascript
// ✅
[
  deviceSetting(),
  { type: 'range', id: 'columns', devices: ['desktop', 'mobile'], ... },
]

// ❌
[
  { type: 'range', id: 'columns', devices: ['desktop', 'mobile'], ... },
  // no deviceSetting()
]
```

### 2. Disambiguate labels

```javascript
// ✅
label: ['Columns (Desktop)', 'Columns (Mobile)']

// ❌
label: ['Columns', 'Columns']
```

### 3. Choose reasonable defaults

```javascript
// ✅
{ id: 'columns', max: [6, 3], default: [4, 2] }

// ❌
{ id: 'columns', max: [6, 3], default: [6, 3] }  // saturates the range
```

### 4. Group device settings under their own header

```javascript
settings: [
  { type: 'header', content: 'General' },
  // general settings…

  { type: 'header', content: 'Responsive Layout' },
  deviceSetting(),
  // device-specific settings…
]
```

### 5. Gate with `visible_if` when responsiveness is optional

```javascript
{ type: 'checkbox', id: 'enable_responsive', label: 'Enable responsive settings', default: false },
deviceSetting({ visible_if: visible('enable_responsive', true) }),
{
  type: 'range',
  id: 'columns',
  devices: ['desktop', 'mobile'],
  visible_if: visible('enable_responsive', true),
}
```

## More Than Two Breakpoints

> [!CAUTION]
> The `devices` shortcut supports exactly `['desktop', 'mobile']`. For more breakpoints, fall back to explicit settings:

```javascript
settings: [
  {
    type: 'select',
    id: 'breakpoint',
    label: 'Breakpoint',
    options: [
      { value: 'mobile', label: 'Mobile' },
      { value: 'tablet', label: 'Tablet' },
      { value: 'desktop', label: 'Desktop' },
    ],
    default: 'desktop',
  },
  {
    type: 'range',
    id: 'columns_mobile',
    label: 'Columns (Mobile)',
    min: 1, max: 2, default: 1,
    visible_if: visible('breakpoint', 'mobile'),
  },
  {
    type: 'range',
    id: 'columns_tablet',
    label: 'Columns (Tablet)',
    min: 1, max: 4, default: 2,
    visible_if: visible('breakpoint', 'tablet'),
  },
  {
    type: 'range',
    id: 'columns_desktop',
    label: 'Columns (Desktop)',
    min: 1, max: 6, default: 4,
    visible_if: visible('breakpoint', 'desktop'),
  },
]
```

## Common Issues

### Device settings don't appear

Check:
1. Did you add `deviceSetting()`?
2. Is `devices` formatted as `['desktop', 'mobile']`?
3. Is there a `visible_if` blocking it?

### Duplicate ID error

```text
Setting ID 'columns' already exists
```

Cause: two settings with the same `id`, one with `devices` and one without.

```javascript
// ❌
[
  { type: 'range', id: 'columns', ... },
  { type: 'range', id: 'columns', devices: ['desktop', 'mobile'], ... },
]

// ✅
[
  { type: 'range', id: 'columns', devices: ['desktop', 'mobile'], ... },
]
```

### `visible_if` not behaving

```javascript
// ✅ — the compiler appends the device suffix
visible_if: visible('show_grid', true)

// ❌ — don't append `_desktop` / `_mobile` yourself
visible_if: visible('show_grid_desktop', true)
```

## Related

- `./section-schema.md` — section schema
- `./visibility.md` — `visible_if` API
- `./global-schema.md` — device settings in theme settings
