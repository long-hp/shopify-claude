# Visibility (`visible_if`)

The `visible()` helper builds conditional visibility expressions for any setting.

## Import

```javascript
import { createSectionSchema, visible } from "../../../create-schema.js";
```

## Basic Syntax

```javascript
visible_if: visible('field_id', 'value', equality)
```

| Argument   | Description                                  |
| ---------- | -------------------------------------------- |
| `field_id` | ID of the setting being compared             |
| `value`    | Value to compare against                     |
| `equality` | Operator (optional, default `==`)            |

## Operators

### Equality (`==`)

```javascript
// All three are equivalent
visible_if: visible('show_image', true)
visible_if: visible('show_image', true, false)
visible_if: visible('show_image', true, '==')

// Output: {{ section.settings.show_image == true }}
```

### Not equal (`!=`)

```javascript
visible_if: visible('show_image', true, true)
visible_if: visible('show_image', true, '!=')

// Output: {{ section.settings.show_image != true }}
```

### Contains

```javascript
visible_if: visible('text', 'hello', 'contains')

// Output: {{ section.settings.text contains 'hello' }}
```

### Blank check

```javascript
// Not blank
visible_if: visible('image', 'blank', '!=')
// Output: {{ section.settings.image != blank }}

// Is blank
visible_if: visible('image', 'blank', '==')
// Output: {{ section.settings.image == blank }}
```

## AND

```javascript
visible_if: visible('show_image', true)
  .and('image_style', 'rounded')
  .and('show_caption', true)
```

### Mixing operators inside an AND chain

```javascript
visible_if: visible('show_image', true)
  .and('image', 'blank', '!=')         // image not blank
  .and('text', 'hello', 'contains')    // text contains 'hello'
```

## OR

```javascript
visible_if: visible('layout', 'grid')
  .or('layout', 'masonry')

// Output: {{ section.settings.layout == 'grid' or section.settings.layout == 'masonry' }}
```

## Combined AND / OR

```javascript
visible_if: visible('show_image', true)
  .and('image_style', 'rounded')
  .or('use_default_style', true)

// Output: {{ ... show_image == true and ... image_style == 'rounded' or ... use_default_style == true }}
```

> [!WARNING]
> Liquid does not support grouping with parentheses. Conditions are evaluated left to right: `A and B or C` is `(A and B) or C`.

## Path References

### Section settings

```javascript
// Short form (preferred)
visible_if: visible('show_image', true)

// Full path (also works)
visible_if: visible('section.settings.show_image', true)
```

### Block settings

```javascript
// Short form (preferred in block schemas)
visible_if: visible('show_caption', true)

// Full path (also works)
visible_if: visible('block.settings.show_caption', true)

// Output: {{ block.settings.show_caption == true }}
```

> [!NOTE]
> `section.settings.` / `block.settings.` prefix is added automatically based on context (section schema vs block schema).

## Realistic Examples

### Show/Hide image settings

```javascript
settings: [
  { type: 'checkbox', id: 'show_image', label: 'Show image', default: false },
  {
    type: 'image_picker',
    id: 'image',
    label: 'Image',
    visible_if: visible('show_image', true),
  },
  {
    type: 'select',
    id: 'image_position',
    label: 'Image position',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
    ],
    default: 'left',
    visible_if: visible('show_image', true).and('image', 'blank', '!='),
  },
]
```

### Conditional layout settings

```javascript
settings: [
  {
    type: 'select',
    id: 'layout',
    label: 'Layout',
    options: [
      { value: 'grid', label: 'Grid' },
      { value: 'list', label: 'List' },
      { value: 'carousel', label: 'Carousel' },
    ],
    default: 'grid',
  },
  {
    type: 'range',
    id: 'columns',
    label: 'Columns',
    min: 1, max: 6, step: 1, default: 3,
    visible_if: visible('layout', 'grid'),
  },
  {
    type: 'checkbox',
    id: 'autoplay',
    label: 'Autoplay',
    default: false,
    visible_if: visible('layout', 'carousel'),
  },
  {
    type: 'range',
    id: 'autoplay_speed',
    label: 'Autoplay speed',
    min: 1000, max: 10000, step: 500, default: 3000, unit: 'ms',
    visible_if: visible('layout', 'carousel').and('autoplay', true),
  },
]
```

### Multiple conditions

```javascript
settings: [
  { type: 'checkbox', id: 'enable_custom_style', label: 'Enable custom style', default: false },
  {
    type: 'select',
    id: 'style_type',
    label: 'Style type',
    options: [
      { value: 'minimal', label: 'Minimal' },
      { value: 'bold', label: 'Bold' },
    ],
    default: 'minimal',
    visible_if: visible('enable_custom_style', true),
  },
  {
    type: 'color',
    id: 'custom_color',
    label: 'Custom color',
    default: '#000000',
    // (enable_custom_style AND style_type == 'bold') OR use_brand_colors
    visible_if: visible('enable_custom_style', true)
      .and('style_type', 'bold')
      .or('use_brand_colors', true),
  },
]
```

## Array `visible_if` (Device-Specific)

For settings with `devices`, `visible_if` may be an array (one per device):

```javascript
{
  type: 'range',
  id: 'columns',
  label: ['Columns (Desktop)', 'Columns (Mobile)'],
  min: 1,
  max: [6, 3],
  default: [4, 2],
  devices: ['desktop', 'mobile'],
  visible_if: [
    visible('show_grid', true),  // Desktop
    visible('show_grid', true),  // Mobile
  ],
}
```

> [!NOTE]
> The device condition (e.g. `section.settings.device == 'desktop'`) is appended automatically.

## String `visible_if`

You can pass a raw Liquid string, but it's discouraged:

```javascript
{
  type: 'text',
  id: 'heading',
  label: 'Heading',
  visible_if: "{{ section.settings.show_heading == true }}",
}
```

> [!CAUTION]
> Avoid raw strings:
> - No type checking
> - Easy to mistype
> - Harder to maintain

## Edge Cases

### ID suffix

When used inside `createSchemaSettings` with an `idSuffix`, the compiler rewrites referenced IDs automatically:

```javascript
const mySettings = createSchemaSettings({
  input: {},
  settings: () => [
    { type: 'checkbox', id: 'enable', label: 'Enable', default: false },
    {
      type: 'text',
      id: 'text',
      label: 'Text',
      visible_if: visible('enable', true),
    },
  ],
});

const settings = mySettings({ idSuffix: '_primary' });
// IDs become enable_primary, text_primary
// visible_if becomes {{ section.settings.enable_primary == true }}
```

### References to non-existent IDs

The compiler auto-removes `visible_if` clauses that reference IDs not present in the final schema:

```javascript
{
  type: 'text',
  id: 'text',
  label: 'Text',
  visible_if: visible('non_existent_id', true).and('another_non_existent', 'value'),
}
// If both IDs are absent, visible_if is stripped entirely.
```

## Best Practices

### 1. Prefer `visible()` over raw strings

```javascript
// ✅
visible_if: visible('show_image', true)

// ❌
visible_if: "{{ section.settings.show_image == true }}"
```

### 2. Declare the gating setting BEFORE the dependent one

```javascript
// ✅
[
  { type: 'checkbox', id: 'enable', ... },
  { type: 'text', id: 'text', visible_if: visible('enable', true) },
]

// ❌
[
  { type: 'text', id: 'text', visible_if: visible('enable', true) },
  { type: 'checkbox', id: 'enable', ... },
]
```

### 3. Use blank-check for resource pickers

```javascript
{ type: 'image_picker', id: 'image', label: 'Image' },
{
  type: 'text',
  id: 'image_alt',
  label: 'Alt text',
  visible_if: visible('image', 'blank', '!='),
}
```

### 4. Avoid overly complex conditions

```javascript
// ❌
visible_if: visible('a', true)
  .and('b', 'value')
  .or('c', false)
  .and('d', 'test')
  .or('e', true)

// ✅ — split into separate settings or simplify
visible_if: visible('a', true).and('b', 'value')
```

## Related

- `./section-schema.md` — section schema
- `./block-schema.md` — block schema
- `./device-setting.md` — combining `visible_if` with device settings
