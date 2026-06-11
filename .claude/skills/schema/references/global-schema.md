# Global Schema

Authoring theme-wide settings with `createGlobalSchema` (compiled into `settings_schema.json`).

## Import

```javascript
import { createGlobalSchema, visible } from "../../create-schema.js";
```

## Purpose

`createGlobalSchema` produces a group of settings inside **Theme settings**, not inside a section or block. The output is merged into `src/config/settings_schema.js` / `settings_schema.json`.

## Syntax

```javascript
export const schema = createGlobalSchema({
  name: 'Setting group name',
  settings: [...],
});
```

## Differences from Section/Block Schema

| Aspect                  | Section/Block                                  | Global                            |
| ----------------------- | ---------------------------------------------- | --------------------------------- |
| Where it appears        | Inside a section/block instance                | Theme settings                    |
| `visible_if` context    | `section.settings.*` / `block.settings.*`      | `settings.*`                      |
| Output file             | `sections/*.liquid`                            | `settings_schema.json`            |
| `presets`, `blocks`     | supported                                      | not supported                     |
| Device settings prefix  | `section.settings.device`                      | `settings.device`                 |

## Examples

### Typography

```javascript
import { createGlobalSchema } from "../../create-schema.js";

export const typographySchema = createGlobalSchema({
  name: 'Typography',
  settings: [
    { type: 'header', content: 'Headings' },
    { type: 'font_picker', id: 'font_heading', label: 'Heading font', default: 'assistant_n4' },
    {
      type: 'range',
      id: 'font_heading_scale',
      label: 'Heading font scale',
      min: 100, max: 150, step: 5, default: 100, unit: '%',
    },

    { type: 'header', content: 'Body' },
    { type: 'font_picker', id: 'font_body', label: 'Body font', default: 'assistant_n4' },
    {
      type: 'range',
      id: 'font_body_scale',
      label: 'Body font scale',
      min: 100, max: 130, step: 5, default: 100, unit: '%',
    },
  ],
});
```

### Colors

```javascript
import { createGlobalSchema } from "../../create-schema.js";

export const colorsSchema = createGlobalSchema({
  name: 'Colors',
  settings: [
    { type: 'header', content: 'Primary' },
    { type: 'color', id: 'color_primary', label: 'Primary color', default: '#000000' },
    { type: 'color', id: 'color_secondary', label: 'Secondary color', default: '#333333' },

    { type: 'header', content: 'Background' },
    { type: 'color', id: 'color_background', label: 'Background color', default: '#ffffff' },
    { type: 'color', id: 'color_foreground', label: 'Foreground color', default: '#000000' },
  ],
});
```

### Corner radius

```javascript
import { createGlobalSchema } from "../../create-schema.js";

export const cornerRadiusSchema = createGlobalSchema({
  name: 'Corner radius',
  settings: [
    {
      type: 'select',
      id: 'border_radius',
      label: 'Corner style',
      options: [
        { value: 'none', label: 'None' },
        { value: 'default', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
      ],
      default: 'default',
    },
  ],
});
```

### Animations (with `visible_if`)

```javascript
import { createGlobalSchema, visible } from "../../create-schema.js";

export const animationSchema = createGlobalSchema({
  name: 'Animations',
  settings: [
    { type: 'checkbox', id: 'enable_animations', label: 'Enable animations', default: true },
    {
      type: 'select',
      id: 'animation_style',
      label: 'Animation style',
      options: [
        { value: 'fade', label: 'Fade' },
        { value: 'slide', label: 'Slide' },
        { value: 'zoom', label: 'Zoom' },
      ],
      default: 'fade',
      visible_if: visible('enable_animations', true),
    },
    {
      type: 'range',
      id: 'animation_duration',
      label: 'Animation duration',
      min: 100, max: 1000, step: 50, default: 300, unit: 'ms',
      visible_if: visible('enable_animations', true),
    },
  ],
});
```

## `visible_if` in Global Schema

Context is `settings` (no `section.` or `block.` prefix):

```javascript
visible_if: visible('enable_feature', true)
// Output: {{ settings.enable_feature == true }}
```

## Device Settings in Global Schema

```javascript
import { createGlobalSchema, deviceSetting } from "../../create-schema.js";

export const responsiveSchema = createGlobalSchema({
  name: 'Responsive',
  settings: [
    deviceSetting(),
    {
      type: 'range',
      id: 'container_width',
      label: ['Container width (Desktop)', 'Container width (Mobile)'],
      min: [800, 320],
      max: [1600, 768],
      step: 10,
      default: [1200, 375],
      unit: 'px',
      devices: ['desktop', 'mobile'],
    },
  ],
});
```

## Reading in Liquid

```liquid
{{ settings.color_primary }}
{{ settings.font_heading.family }}
{{ settings.border_radius }}

{% if settings.enable_animations %}
  <div class="animate animate--{{ settings.animation_style }}">
{% endif %}
```

## Best Practices

### 1. One concern per group

```javascript
export const typographySchema = createGlobalSchema({ name: 'Typography', ... });
export const colorsSchema = createGlobalSchema({ name: 'Colors', ... });
```

### 2. Use headers inside the group

```javascript
settings: [
  { type: 'header', content: 'Primary' },
  // primary settings…

  { type: 'header', content: 'Secondary' },
  // secondary settings…
]
```

### 3. Always set defaults

```javascript
{ type: 'color', id: 'color_primary', default: '#000000' }
```

### 4. Use `visible_if` to gate advanced settings

```javascript
{ type: 'checkbox', id: 'enable_advanced', label: 'Enable advanced settings', default: false },
{
  type: 'range',
  id: 'advanced_option',
  label: 'Advanced option',
  visible_if: visible('enable_advanced', true),
}
```

## Related

- `./section-schema.md` — section schema
- `./visibility.md` — `visible_if` API
- `./device-setting.md` — responsive settings
- `./setting-types.md` — all setting types
