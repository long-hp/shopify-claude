# Block Schema

Authoring block schemas with `createBlockSchema`.

## Import

```javascript
import { createBlockSchema, visible } from "../../../create-schema.js";
```

## Basic Syntax

```javascript
export const schema = createBlockSchema({
  name: 'Block name',  // Display name (required)
  settings: [...],     // Settings array (required)
});
```

## Differences from Section Schema

| Property                  | Section                              | Block                          |
| ------------------------- | ------------------------------------ | ------------------------------ |
| `tag`                     | defaults to `'section'`              | defaults to `null`             |
| `blocks`                  | supported                            | not supported                  |
| `presets`                 | supported                            | not supported                  |
| `disabled_on`             | supported                            | not supported                  |
| `class`                   | supported                            | not supported                  |
| `visible_if` context      | `section.settings.*`                 | `block.settings.*`             |

## Properties

### `name` (required)

```javascript
name: 'Image slide'
```

### `settings` (required)

```javascript
settings: [
  { type: 'image_picker', id: 'image', label: 'Image' },
  { type: 'text', id: 'heading', label: 'Heading', default: 'Slide heading' },
]
```

## Examples

### Simple block

```javascript
import { createBlockSchema } from "../../../create-schema.js";

export const schema = createBlockSchema({
  name: 'Slide',
  settings: [
    { type: 'image_picker', id: 'image', label: 'Image' },
    { type: 'text', id: 'heading', label: 'Heading', default: 'Slide heading' },
    { type: 'richtext', id: 'text', label: 'Text' },
    { type: 'text', id: 'button_text', label: 'Button text' },
    { type: 'url', id: 'button_link', label: 'Button link' },
  ],
});
```

### Block with conditional visibility

```javascript
import { createBlockSchema, visible } from "../../../create-schema.js";

export const schema = createBlockSchema({
  name: 'Feature',
  settings: [
    {
      type: 'select',
      id: 'icon_type',
      label: 'Icon type',
      options: [
        { value: 'none', label: 'None' },
        { value: 'image', label: 'Image' },
        { value: 'emoji', label: 'Emoji' },
      ],
      default: 'none',
    },
    {
      type: 'image_picker',
      id: 'icon_image',
      label: 'Icon image',
      visible_if: visible('icon_type', 'image'),
    },
    {
      type: 'text',
      id: 'icon_emoji',
      label: 'Emoji',
      default: '🎉',
      visible_if: visible('icon_type', 'emoji'),
    },
    { type: 'text', id: 'title', label: 'Title', default: 'Feature title' },
    { type: 'textarea', id: 'description', label: 'Description' },
  ],
});
```

### Block with many grouped settings

```javascript
import { createBlockSchema, visible } from "../../../create-schema.js";

export const schema = createBlockSchema({
  name: 'Testimonial',
  settings: [
    { type: 'header', content: 'Content' },
    { type: 'richtext', id: 'quote', label: 'Quote', default: '<p>"This is an amazing product!"</p>' },
    { type: 'text', id: 'author_name', label: 'Author name', default: 'John Doe' },
    { type: 'text', id: 'author_title', label: 'Author title', default: 'CEO, Company' },

    { type: 'header', content: 'Author image' },
    { type: 'checkbox', id: 'show_author_image', label: 'Show author image', default: true },
    {
      type: 'image_picker',
      id: 'author_image',
      label: 'Author image',
      visible_if: visible('show_author_image', true),
    },

    { type: 'header', content: 'Style' },
    {
      type: 'select',
      id: 'style',
      label: 'Style',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'card', label: 'Card' },
        { value: 'minimal', label: 'Minimal' },
      ],
      default: 'default',
    },
  ],
});
```

## Using a Block Inside a Section

### Pattern 1 — Inline inside the section

```javascript
import { createSectionSchema } from "../../../create-schema.js";

export const schema = createSectionSchema({
  name: 'Testimonials',
  settings: [...],
  blocks: [
    {
      type: 'testimonial',
      name: 'Testimonial',
      settings: [
        // same shape as a block schema
      ],
    },
  ],
});
```

### Pattern 2 — Import from a separate file

```javascript
// blocks/testimonial.schema.js
import { createBlockSchema } from "../../../create-schema.js";

export const testimonialBlock = createBlockSchema({
  name: 'Testimonial',
  settings: [...],
});

// sections/testimonials.schema.js
import { createSectionSchema } from "../../../create-schema.js";
import { testimonialBlock } from "../blocks/testimonial.schema.js";

export const schema = createSectionSchema({
  name: 'Testimonials',
  settings: [...],
  blocks: [
    {
      type: 'testimonial',
      ...testimonialBlock,
    },
  ],
});
```

## `visible_if` Inside a Block

The default context is `block.settings`:

```javascript
// Section context
visible_if: visible('section.settings.show_image', true)

// Block context (default in block schemas)
visible_if: visible('show_image', true)
// Output: {{ block.settings.show_image == true }}
```

## Best Practices

### 1. Keep blocks focused

```javascript
// ✅
{
  name: 'Image',
  settings: [
    { type: 'image_picker', id: 'image', ... },
    { type: 'text', id: 'alt', ... },
  ],
}

// ❌
{
  name: 'Image',
  settings: [
    { type: 'image_picker', id: 'image', ... },
    { type: 'text', id: 'heading', ... },
    { type: 'richtext', id: 'description', ... },
    { type: 'url', id: 'link', ... },
    // …too many unrelated settings
  ],
}
```

### 2. Group with headers

```javascript
settings: [
  { type: 'header', content: 'Content' },
  // content…

  { type: 'header', content: 'Style' },
  // style…
]
```

### 3. Consistent ID naming

```javascript
// Prefix with the block concept when helpful
{ id: 'slide_image' }
{ id: 'slide_heading' }
{ id: 'slide_text' }
```

### 4. Provide meaningful defaults

```javascript
{
  type: 'text',
  id: 'heading',
  label: 'Heading',
  default: 'Feature title',
}
```

## Related

- `./section-schema.md` — section schema
- `./reusable-settings.md` — reusable setting groups
- `./visibility.md` — `visible_if` API
- `./setting-types.md` — all setting types
