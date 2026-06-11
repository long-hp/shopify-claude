# Setting Types

All input types supported by Shopify section schema, grouped by purpose.

## Layout

### `header`

Groups settings visually. Renders as a section header in the Theme Editor.

```javascript
{ type: 'header', content: 'Content' }
```

| Property  | Required | Description    |
| --------- | -------- | -------------- |
| `type`    | yes      | `'header'`     |
| `content` | yes      | Display text   |

### `paragraph`

```javascript
{ type: 'paragraph', content: 'Helper text for this group.' }
```

---

## Text Inputs

### `text`

Single-line text input.

```javascript
{
  type: 'text',
  id: 'heading',
  label: 'Heading',
  default: 'Default heading',
  info: 'Optional help text',
  placeholder: 'Enter heading...',
}
```

### `textarea`

Multi-line text input.

```javascript
{
  type: 'textarea',
  id: 'description',
  label: 'Description',
  default: 'Default description',
}
```

### `richtext`

Rich-text editor (limited HTML — paragraphs, links, basic formatting).

```javascript
{
  type: 'richtext',
  id: 'content',
  label: 'Content',
  default: '<p>Default content</p>',
}
```

### `inline_richtext`

Inline-only rich text (no paragraphs).

### `html`

Raw HTML editor.

```javascript
{
  type: 'html',
  id: 'custom_html',
  label: 'Custom HTML',
  default: '<div>Custom HTML</div>',
}
```

### `liquid`

Liquid code editor.

```javascript
{ type: 'liquid', id: 'custom_liquid', label: 'Custom Liquid' }
```

### `url`

URL input with internal/external link validation.

```javascript
{
  type: 'url',
  id: 'link',
  label: 'Link',
  default: '/collections/all',
}
```

---

## Numbers & Toggles

### `number`

```javascript
{
  type: 'number',
  id: 'items_count',
  label: 'Items count',
  default: 10,
}
```

### `range`

Slider for bounded numeric input.

```javascript
{
  type: 'range',
  id: 'columns',
  label: 'Columns',
  min: 1, max: 6, step: 1,
  default: 3,
  unit: 'col',
}
```

| Property | Required | Description           |
| -------- | -------- | --------------------- |
| `min`    | yes      | Minimum value         |
| `max`    | yes      | Maximum value         |
| `step`   | yes      | Increment             |
| `unit`   | no       | Suffix (`px`, `%`, …) |

### `checkbox`

```javascript
{
  type: 'checkbox',
  id: 'show_border',
  label: 'Show border',
  default: false,
}
```

---

## Selection

### `select`

Dropdown.

```javascript
{
  type: 'select',
  id: 'alignment',
  label: 'Alignment',
  options: [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ],
  default: 'center',
}
```

### `radio`

Radio buttons.

```javascript
{
  type: 'radio',
  id: 'layout',
  label: 'Layout',
  options: [
    { value: 'grid', label: 'Grid' },
    { value: 'list', label: 'List' },
  ],
  default: 'grid',
}
```

---

## Color

### `color`

Solid color picker.

```javascript
{
  type: 'color',
  id: 'text_color',
  label: 'Text color',
  default: '#000000',
}
```

### `color_background`

Solid or gradient.

```javascript
{
  type: 'color_background',
  id: 'background',
  label: 'Background',
  default: 'linear-gradient(#ffffff, #000000)',
}
```

### `color_scheme`

Select one of the theme's defined color schemes.

```javascript
{
  type: 'color_scheme',
  id: 'color_scheme',
  label: 'Color scheme',
  default: 'scheme-1',
}
```

### `color_scheme_group`

(Global schema only.) Define multiple color schemes.

---

## Typography

### `font_picker`

Theme font picker.

```javascript
{
  type: 'font_picker',
  id: 'font',
  label: 'Font',
  default: 'assistant_n4',
}
```

### `text_alignment`

```javascript
{
  type: 'text_alignment',
  id: 'alignment',
  label: 'Alignment',
  default: 'center',
}
```

---

## Media

### `image_picker`

```javascript
{
  type: 'image_picker',
  id: 'image',
  label: 'Image',
  info: 'Recommended size: 1200x800px',
}
```

### `video`

Picker for a Shopify-hosted video.

```javascript
{ type: 'video', id: 'video', label: 'Video' }
```

### `video_url`

External video URL.

```javascript
{
  type: 'video_url',
  id: 'video_url',
  label: 'Video URL',
  accept: ['youtube', 'vimeo'],
  default: 'https://www.youtube.com/watch?v=_9VUPq3SxOc',
  placeholder: 'https://www.youtube.com/watch?v=...',
}
```

---

## Resource Pickers

### `article`

```javascript
{ type: 'article', id: 'article', label: 'Article' }
```

### `blog`

```javascript
{ type: 'blog', id: 'blog', label: 'Blog' }
```

### `collection`

```javascript
{ type: 'collection', id: 'collection', label: 'Collection' }
```

### `collection_list`

```javascript
{
  type: 'collection_list',
  id: 'collections',
  label: 'Collections',
  limit: 8,
}
```

### `product`

```javascript
{ type: 'product', id: 'product', label: 'Product' }
```

### `product_list`

```javascript
{
  type: 'product_list',
  id: 'products',
  label: 'Products',
  limit: 12,
}
```

### `page`

```javascript
{ type: 'page', id: 'page', label: 'Page' }
```

### `link_list`

Navigation menu picker.

```javascript
{
  type: 'link_list',
  id: 'menu',
  label: 'Menu',
  default: 'main-menu',
}
```

### `metaobject` / `metaobject_list`

Pickers for custom metaobjects.

```javascript
{
  type: 'metaobject',
  id: 'feature',
  label: 'Feature',
  metaobject_type: 'feature',
}
```

---

## Style Panels (Shopify 2024+)

### `style.size_panel`

```javascript
{
  type: 'style.size_panel',
  id: 'size',
  label: 'Size',
  default: { width: '100%', height: 'auto' },
}
```

### `style.spacing_panel`

```javascript
{
  type: 'style.spacing_panel',
  id: 'spacing',
  label: 'Spacing',
  default: { padding: '16px', margin: '0' },
}
```

### `style.layout_panel`

```javascript
{
  type: 'style.layout_panel',
  id: 'layout',
  label: 'Layout',
  default: { display: 'flex', gap: '16px' },
}
```

## Common Properties

Every input setting accepts:

| Property      | Description                                     |
| ------------- | ----------------------------------------------- |
| `id`          | Unique identifier                               |
| `label`       | Display label (string or `[desktop, mobile]`)   |
| `default`     | Default value                                   |
| `info`        | Help text under the label                       |
| `visible_if`  | Conditional visibility (see `./visibility.md`)  |
| `devices`     | `['desktop', 'mobile']` (see `./device-setting.md`) |

## Related

- `./visibility.md` — conditional visibility
- `./device-setting.md` — responsive settings
- `./section-schema.md` — section schema
- `./block-schema.md` — block schema
