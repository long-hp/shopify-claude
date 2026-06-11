# Advanced Features

Less-common but powerful features of `create-schema.js`.

## getComponentOptions

Auto-generate select options from sibling component folders.

### Import

```javascript
import { getComponentOptions } from "../../../create-schema.js";
```

### Signature

```javascript
const options = getComponentOptions(import.meta.url, callback);
```

| Parameter | Description                                                  |
| --------- | ------------------------------------------------------------ |
| `url`     | `import.meta.url` of the calling file                        |
| `callback`| Optional filter/transform applied to the discovered names    |

### How it discovers options

Given:

```
components/
├── slider/
│   └── schema.js
├── slider-basic/
├── slider-advanced/
└── slider-fullscreen/
```

Calling `getComponentOptions(import.meta.url)` from `slider/schema.js` returns:

```javascript
[
  { value: 'basic', label: 'Basic' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'fullscreen', label: 'Fullscreen' },
]
```

It looks for sibling folders whose names start with the current folder's basename, excluding `base`, `utils`, `helpers`, and anything containing `.`.

### Example

```javascript
import { createSectionSchema, getComponentOptions } from "../../../create-schema.js";

const componentOptions = getComponentOptions(import.meta.url);

export const schema = createSectionSchema({
  name: 'Slider',
  settings: [
    {
      type: 'select',
      id: 'component',
      label: 'Component variant',
      options: componentOptions,
      default: componentOptions[0]?.value,
    },
  ],
});
```

### With callback

```javascript
const options = getComponentOptions(import.meta.url, (components) => {
  return components.filter(c => !c.includes('deprecated'));
});
```

---

## Settings Builder

Use a function for dynamic settings.

### Syntax

```javascript
settings: ({ builder }) => {
  builder.add([...]);
  return builder.build();
}
```

### Methods

#### `add(value)`

Append one or many settings:

```javascript
builder.add({ type: 'text', id: 'heading', label: 'Heading' });

builder.add([
  { type: 'text', id: 'heading', label: 'Heading' },
  { type: 'text', id: 'subheading', label: 'Subheading' },
]);
```

#### `build()`

Return the accumulated array:

```javascript
const result = builder.build();
```

### Example

```javascript
export const schema = createSectionSchema({
  name: 'Dynamic section',
  settings: ({ builder }) => {
    builder.add([
      { type: 'header', content: 'Content' },
      { type: 'text', id: 'heading', label: 'Heading' },
    ]);

    if (someCondition) {
      builder.add({ type: 'image_picker', id: 'image', label: 'Image' });
    }

    return builder.build();
  },
});
```

---

## orderSections

Reorder header groups in a schema.

### Syntax

```javascript
export const schema = createSectionSchema({
  settings: [...],
  orderSections: {
    'Header Name': order,
  },
});
```

### Behavior

- Headers not listed get `order = 0`.
- Sorted by `order` ascending.
- Stable sort: equal orders preserve original position.

### Example

```javascript
export const schema = createSectionSchema({
  settings: [
    { type: 'header', content: 'Advanced' },
    // advanced settings…

    { type: 'header', content: 'Content' },
    // content settings…

    { type: 'header', content: 'Style' },
    // style settings…
  ],
  orderSections: {
    'Content': 1,
    'Style': 2,
    'Advanced': 3,
  },
});

// Resulting order: Content → Style → Advanced
```

---

## omitSections

Hide a header group and everything under it.

### Syntax

```javascript
export const schema = createSectionSchema({
  settings: [...],
  omitSections: ['Header Name 1', 'Header Name 2'],
});
```

### Example

```javascript
export const schema = createSectionSchema({
  settings: [
    { type: 'header', content: 'Content' },
    { type: 'text', id: 'heading', label: 'Heading' },

    { type: 'header', content: 'Advanced' },
    { type: 'text', id: 'custom_class', label: 'Custom class' },

    { type: 'header', content: 'Developer' },
    { type: 'text', id: 'custom_id', label: 'Custom ID' },
  ],
  omitSections: ['Advanced', 'Developer'],
});

// Result: only the Content section remains.
```

---

## omitFields

Hide specific fields by ID or label.

### Syntax

```javascript
// Inside a createSchemaSettings definition
export const mySettings = createSchemaSettings({
  settings: [...],
});

// At call time
...mySettings({
  omitFields: ['field_id', 'Field Label'],
});
```

### Example

```javascript
export const buttonSettings = createSchemaSettings({
  settings: () => [
    { type: 'text', id: 'button_text', label: 'Button text' },
    { type: 'url', id: 'button_link', label: 'Button link' },
    { type: 'select', id: 'button_style', label: 'Button style', /* … */ },
  ],
});

...buttonSettings({
  omitFields: ['button_style'],
})
```

---

## Translate Function

Use translation keys for labels:

```javascript
export const schema = createSectionSchema((t) => ({
  name: t('sections.my_section.name'),
  settings: [
    {
      type: 'text',
      id: 'heading',
      label: t('settings.heading.label'),
    },
  ],
}));
```

### How `t` rewrites keys

| Input                           | Output                                |
| ------------------------------- | ------------------------------------- |
| `t('heading')`                  | `'ts:settings.heading'`               |
| `t('settings.heading')`         | `'ts:settings.heading'`               |
| `t('sections.my_section.name')` | `'ts:sections.my_section.name'`       |

---

## `__noSuffix` Flag

Opt out of `idSuffix` injection.

### Syntax

```javascript
{
  type: 'text',
  id: 'shared_setting',
  label: 'Shared',
  __noSuffix: true,
}
```

### Example

```javascript
export const mySettings = createSchemaSettings({
  settings: () => [
    { type: 'text', id: 'unique_setting', label: 'Unique' },
    { type: 'text', id: 'shared_setting', label: 'Shared', __noSuffix: true },
  ],
});

...mySettings({ idSuffix: '_primary' })

// Result:
// - unique_setting_primary  (suffix applied)
// - shared_setting          (untouched)
```

Use this when you need an ID that's shared across multiple instances of the same group (e.g. a single `color_scheme` for the whole page).

---

## Visible class — Advanced API

### Merge two `visible` instances

```javascript
import { visible } from "../../../create-schema.js";

const condition1 = visible('show_image', true);
const condition2 = visible('image_style', 'rounded');

const merged = condition1.merge('and', condition2);
// Output: {{ parent.settings.show_image == true and parent.settings.image_style == 'rounded' }}
```

### `addIdSuffix`

Manually append an ID suffix to the referenced IDs:

```javascript
const condition = visible('show_image', true);
condition.addIdSuffix('_primary');
// Output: {{ parent.settings.show_image_primary == true }}
```

### `withParent`

Force the context (`section` vs `block`) when the helper is used inside a schema whose default context differs:

```javascript
visible('show_image', true).withParent('block')
// Always emits {{ block.settings.show_image == true }}
```

---

## Best Practices

### 1. Use `orderSections` for predictable UX

```javascript
orderSections: {
  'Content': 1,
  'Layout': 2,
  'Style': 3,
  'Advanced': 4,
}
```

### 2. Hide settings that aren't merchant-facing

```javascript
omitSections: ['Developer', 'Debug']
```

### 3. Use `getComponentOptions` for variant pickers

```javascript
{
  type: 'select',
  id: 'variant',
  label: 'Variant',
  options: getComponentOptions(import.meta.url),
}
```

### 4. Document `__noSuffix` usage

```javascript
// Shared color scheme across all hero instances on the page
{
  id: 'color_scheme',
  __noSuffix: true,
}
```

## Related

- `./section-schema.md` — section schema
- `./reusable-settings.md` — `createSchemaSettings` API
- `./visibility.md` — `visible_if` API
