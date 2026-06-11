# Reusable Settings

Authoring reusable setting groups (`createSchemaSettings`) and single settings (`createSchemaSetting`).

> [!NOTE]
> For project-provided helpers (`alignmentSetting`, `colorSchemaSettings`, `spaceSchemaSettings`, …) see `./input-settings-helpers.md`. **Always check existing helpers before writing new ones.**

## Import

```javascript
import { createSchemaSettings, createSchemaSetting, visible } from "../../create-schema.js";
```

---

## createSchemaSettings — Multiple Reusable Settings

### Syntax

```javascript
export const mySettings = createSchemaSettings({
  input: {
    // default values
    key1: 'value1',
    key2: 'value2',
  },
  settings: ({ input, builder, idSuffix }) => [
    // settings array
  ],
  // optional
  omitSections: [...],
  orderSections: {...},
  omitFields: [...],
});
```

### Parameters

| Parameter        | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `input`          | Defaults that can be overridden at call time                                |
| `settings`       | Function returning the settings array; receives `{ input, builder, idSuffix }` |
| `omitSections`   | Header contents to hide (optional)                                          |
| `orderSections`  | Header ordering map (optional)                                              |
| `omitFields`     | Field IDs/labels to hide (optional)                                         |

### Usage

```javascript
// Define
export const buttonSettings = createSchemaSettings({
  input: {
    button_text: 'Click me',
    button_link: '',
    button_style: 'primary',
  },
  settings: ({ input }) => [
    { type: 'header', content: 'Button' },
    { type: 'text', id: 'button_text', label: 'Button text', default: input.button_text },
    { type: 'url', id: 'button_link', label: 'Button link', default: input.button_link },
    {
      type: 'select',
      id: 'button_style',
      label: 'Button style',
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'outline', label: 'Outline' },
      ],
      default: input.button_style,
    },
  ],
});

// Consume in a section
export const schema = createSectionSchema({
  name: 'CTA Section',
  settings: [
    { type: 'text', id: 'heading', label: 'Heading' },
    ...buttonSettings(),  // spread the array
  ],
});
```

### Overriding `input`

```javascript
// Top-level keys (Partial<P>)
...buttonSettings({
  button_text: 'Shop now',
  button_style: 'secondary',
})

// Or via the explicit `input` object
...buttonSettings({
  input: { button_text: 'Learn more' },
})
```

### `idSuffix`

Append a suffix to all IDs to avoid collisions:

```javascript
...buttonSettings({ idSuffix: '_primary' })
// IDs: button_text_primary, button_link_primary, button_style_primary

...buttonSettings({ idSuffix: '_secondary' })
// IDs: button_text_secondary, button_link_secondary, button_style_secondary
```

### `omitSections`

Hide a header (and everything under it until the next header):

```javascript
...buttonSettings({
  omitSections: ['Button Style'],
})
```

### `orderSections`

Reorder headers:

```javascript
...buttonSettings({
  orderSections: {
    'Button Style': 1,
    'Button': 2,
  },
})
```

### `omitFields`

Hide individual fields by ID or label:

```javascript
...buttonSettings({
  omitFields: ['button_style'],
})
```

---

## createSchemaSetting — Single Reusable Setting

### Syntax

```javascript
export const mySetting = createSchemaSetting({
  input: {
    // defaults
  },
  setting: ({ input, idSuffix }) => ({
    // single setting object
  }),
});
```

### Usage

```javascript
// Define
export const colorSchemeSetting = createSchemaSetting({
  input: {
    default_scheme: 'scheme-1',
    label: 'Color scheme',
  },
  setting: ({ input }) => ({
    type: 'color_scheme',
    id: 'color_scheme',
    label: input.label,
    default: input.default_scheme,
  }),
});

// Consume
export const schema = createSectionSchema({
  name: 'My Section',
  settings: [
    colorSchemeSetting(),  // single setting — NO spread
    { type: 'text', id: 'heading', label: 'Heading' },
  ],
});
```

### Override

```javascript
colorSchemeSetting({
  default_scheme: 'scheme-2',
  label: 'Background color',
})
```

### `idSuffix`

```javascript
colorSchemeSetting({ idSuffix: '_header' })
// id: color_scheme_header
```

---

## Real-World Examples

### Button settings (with optional style toggle)

```javascript
export const buttonSettings = createSchemaSettings({
  input: {
    button_text: 'Button',
    button_link: '',
    button_style: 'primary',
    button_size: 'md',
    show_button_style: true,
  },
  settings: ({ input }) => [
    { type: 'header', content: 'Button' },
    { type: 'text', id: 'button_text', label: 'Button text', default: input.button_text },
    { type: 'url', id: 'button_link', label: 'Button link', default: input.button_link },

    { type: 'header', content: 'Button Style' },
    input.show_button_style && {
      type: 'select',
      id: 'button_style',
      label: 'Button style',
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'outline', label: 'Outline' },
      ],
      default: input.button_style,
    },
    {
      type: 'select',
      id: 'button_size',
      label: 'Button size',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
      default: input.button_size,
    },
  ].filter(Boolean),
});
```

### Spacing

```javascript
export const spacingSettings = createSchemaSettings({
  input: {
    padding_top: 60,
    padding_bottom: 60,
  },
  settings: ({ input }) => [
    { type: 'header', content: 'Spacing' },
    {
      type: 'range',
      id: 'padding_top',
      label: 'Padding top',
      min: 0, max: 100, step: 4,
      default: input.padding_top,
      unit: 'px',
    },
    {
      type: 'range',
      id: 'padding_bottom',
      label: 'Padding bottom',
      min: 0, max: 100, step: 4,
      default: input.padding_bottom,
      unit: 'px',
    },
  ],
});
```

### Combining multiple groups in a section

```javascript
export const schema = createSectionSchema({
  name: 'Hero Section',
  settings: [
    { type: 'header', content: 'Content' },
    { type: 'text', id: 'heading', label: 'Heading', default: 'Welcome' },
    { type: 'richtext', id: 'text', label: 'Text' },

    // Two buttons, distinct IDs
    ...buttonSettings({ idSuffix: '_primary', button_text: 'Shop now', button_style: 'primary' }),
    ...buttonSettings({ idSuffix: '_secondary', button_text: 'Learn more', button_style: 'outline' }),

    // Spacing
    ...spacingSettings({ padding_top: 80, padding_bottom: 80 }),

    // Shared color scheme
    colorSchemeSetting(),
  ],
});
```

---

## `visible_if` in Reusable Settings

Pass a `visible_if` through `input`:

```javascript
export const imageSettings = createSchemaSettings({
  input: {
    visible_if: visible(),  // empty placeholder
  },
  settings: ({ input }) => [
    {
      type: 'image_picker',
      id: 'image',
      label: 'Image',
      visible_if: input.visible_if,
    },
    {
      type: 'text',
      id: 'image_alt',
      label: 'Alt text',
      visible_if: input.visible_if.and('image', 'blank', '!='),
    },
  ],
});

// Consume
...imageSettings({
  visible_if: visible('show_image', true),
})
```

---

## Best Practices

### 1. Use clear, intent-revealing names

```javascript
// ✅
export const buttonSettings = ...
export const spacingSettings = ...
export const heroContentSettings = ...

// ❌
export const settings1 = ...
export const mySettings = ...
```

### 2. Provide a default for every `input` key

```javascript
// ✅
input: {
  button_text: 'Button',
  button_link: '',
  button_style: 'primary',
}

// ❌
input: {}  // no defaults
```

### 3. Use `idSuffix` whenever the same group is used twice

```javascript
...buttonSettings({ idSuffix: '_primary' }),
...buttonSettings({ idSuffix: '_secondary' }),
```

### 4. Document `input` parameters

```javascript
/**
 * Button settings
 * @param {Object} input
 * @param {string} input.button_text - Button text (default: 'Button')
 * @param {string} input.button_style - Button style (default: 'primary')
 */
export const buttonSettings = createSchemaSettings({ ... });
```

---

## Related

- `./input-settings-helpers.md` — project-provided helpers (always check first)
- `./section-schema.md` — using settings in a section
- `./block-schema.md` — using settings in a block
- `./visibility.md` — `visible_if` API
- `./setting-types.md` — all setting types
