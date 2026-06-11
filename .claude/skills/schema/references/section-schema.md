# Section Schema

Authoring section schemas with `createSectionSchema`.

## Import

```javascript
import { createSectionSchema, visible, deviceSetting } from "../../../create-schema.js";
```

## Basic Syntax

```javascript
export const schema = createSectionSchema({
  name: 'Section name',           // Display name in Theme Editor (required)
  class: 'section-class-name',    // CSS class
  tag: 'section',                 // HTML tag (default: 'section')
  settings: [...],                // Settings array (required)
  blocks: [...],                  // Blocks (optional)
  presets: [...],                 // Presets (optional)
  disabled_on: {...},             // Where the section is disallowed (optional)
});
```

## Properties

### `name` (required)
Display name shown in the Theme Editor.

```javascript
name: 'Image with text'
```

### `class`
CSS class added to the section element.

```javascript
class: 'section-image-with-text'
```

### `tag`
HTML tag for the section. Defaults to `'section'`.

```javascript
tag: 'article'  // or 'div', 'aside', etc.
```

### `settings` (required)
Array of input controls rendered in the Theme Editor.

```javascript
settings: [
  { type: 'header', content: 'Content' },
  { type: 'text', id: 'heading', label: 'Heading', default: 'Default heading' },
  { type: 'image_picker', id: 'image', label: 'Image' },
]
```

> [!NOTE]
> Full setting-type reference: `./setting-types.md`

### `blocks`
Block types the section accepts.

```javascript
blocks: [
  {
    type: 'slide',
    name: 'Slide',
    settings: [
      { type: 'image_picker', id: 'image', label: 'Image' },
      { type: 'text', id: 'heading', label: 'Heading' },
    ],
  },
  {
    type: 'button',
    name: 'Button',
    limit: 2,
    settings: [
      { type: 'text', id: 'button_text', label: 'Button text' },
    ],
  },
]
```

### `presets`
Default configurations shown when the merchant adds the section.

```javascript
presets: [
  {
    name: 'Image slider',
    category: 'Image',
    blocks: [
      { type: 'slide' },
      { type: 'slide' },
      { type: 'slide' },
    ],
  },
]
```

> [!NOTE]
> If `presets` is omitted, the system auto-creates: `[{ name: schema.name }]`.

### `disabled_on`
Restricts where the section may NOT be used.

```javascript
disabled_on: {
  groups: ['header', 'footer', 'custom.overlay', 'custom.popups']
}
```

**Default applied automatically:**
```javascript
disabled_on: {
  groups: ['header', 'footer', 'custom.overlay', 'custom.popups', 'custom.features']
}
```

## Complete Examples

### Simple section

```javascript
import { createSectionSchema } from "../../../create-schema.js";

export const schema = createSectionSchema({
  name: 'Image with text',
  class: 'section-image-with-text',
  settings: [
    { type: 'header', content: 'Content' },
    { type: 'image_picker', id: 'image', label: 'Image' },
    { type: 'text', id: 'heading', label: 'Heading', default: 'Heading' },
    { type: 'richtext', id: 'text', label: 'Text', default: '<p>Description text</p>' },

    { type: 'header', content: 'Layout' },
    {
      type: 'select',
      id: 'image_position',
      label: 'Image position',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ],
      default: 'left',
    },

    { type: 'header', content: 'Style' },
    { type: 'color_scheme', id: 'color_scheme', label: 'Color scheme', default: 'scheme-1' },
  ],
  presets: [
    { name: 'Image with text', category: 'Image' },
  ],
});
```

### Section with blocks

```javascript
import { createSectionSchema } from "../../../create-schema.js";

export const schema = createSectionSchema({
  name: 'Feature list',
  class: 'section-feature-list',
  settings: [
    { type: 'text', id: 'heading', label: 'Heading', default: 'Features' },
    {
      type: 'range',
      id: 'columns',
      label: 'Columns',
      min: 1, max: 4, step: 1, default: 3,
    },
  ],
  blocks: [
    {
      type: 'feature',
      name: 'Feature',
      settings: [
        { type: 'image_picker', id: 'icon', label: 'Icon' },
        { type: 'text', id: 'title', label: 'Title', default: 'Feature title' },
        { type: 'textarea', id: 'description', label: 'Description' },
      ],
    },
  ],
  presets: [
    {
      name: 'Feature list',
      category: 'Text',
      blocks: [
        { type: 'feature' },
        { type: 'feature' },
        { type: 'feature' },
      ],
    },
  ],
});
```

### Section with conditional visibility

```javascript
import { createSectionSchema, visible } from "../../../create-schema.js";

export const schema = createSectionSchema({
  name: 'Conditional section',
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
  ],
});
```

> [!NOTE]
> Full `visible_if` API: `./visibility.md`

### Section with device-specific settings

```javascript
import { createSectionSchema, deviceSetting } from "../../../create-schema.js";

export const schema = createSectionSchema({
  name: 'Responsive grid',
  settings: [
    { type: 'header', content: 'Layout' },
    deviceSetting(),
    {
      type: 'range',
      id: 'columns',
      label: ['Columns (Desktop)', 'Columns (Mobile)'],
      min: 1,
      max: [6, 3],
      step: 1,
      default: [4, 2],
      devices: ['desktop', 'mobile'],
    },
    {
      type: 'range',
      id: 'gap',
      label: ['Gap (Desktop)', 'Gap (Mobile)'],
      min: 0,
      max: 100,
      step: 4,
      default: [40, 20],
      unit: 'px',
      devices: ['desktop', 'mobile'],
    },
  ],
});
```

> [!NOTE]
> Device settings reference: `./device-setting.md`

## Advanced

### Settings Builder

Use a function for dynamic settings:

```javascript
settings: ({ builder }) => {
  builder.add([
    { type: 'text', id: 'heading', label: 'Heading' },
  ]);
  return [
    { type: 'header', content: 'General' },
    ...builder.build(),
  ];
}
```

### `orderSections`

Reorder header groups:

```javascript
orderSections: {
  'Style': 1,
  'Content': 2,
  'Advanced': 3,
}
```

### `omitSections`

Hide header groups (and everything under them):

```javascript
omitSections: ['Advanced', 'Developer']
```

→ Full advanced features: `./advanced.md`

## Best Practices

### 1. Group settings with headers

```javascript
settings: [
  { type: 'header', content: 'Content' },
  // content settings…

  { type: 'header', content: 'Layout' },
  // layout settings…

  { type: 'header', content: 'Style' },
  // style settings…
]
```

### 2. Use specific IDs

```javascript
// ✅
{ id: 'heading_text' }
{ id: 'button_link' }

// ❌
{ id: 'text' }
{ id: 'link' }
```

### 3. Always provide defaults

```javascript
{
  type: 'text',
  id: 'heading',
  label: 'Heading',
  default: 'Welcome to our store',
}
```

### 4. Presets should include sample blocks

```javascript
presets: [
  {
    name: 'Feature list',
    blocks: [
      { type: 'feature' },
      { type: 'feature' },
      { type: 'feature' },
    ],
  },
]
```

## Related

- `./block-schema.md` — block schema
- `./reusable-settings.md` — reusable setting groups
- `./input-settings-helpers.md` — project-provided helpers
- `./visibility.md` — conditional visibility
- `./device-setting.md` — responsive settings
- `./setting-types.md` — all setting types
- `./preset.md` — presets and hover-block patterns
