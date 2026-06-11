# Debugging

Common schema problems and their fixes.

## Schema doesn't show up in Theme Editor

### Symptoms
- Section is missing from the section picker
- Cannot add the section to a template

### Causes & fixes

#### 1. Schema not exported

```javascript
// ❌
const schema = createSectionSchema({...});

// ✅
export const schema = createSectionSchema({...});
```

#### 2. The `.liquid` file is missing the `{% schema %}` block

```liquid
{% schema %}
  {{ schema }}
{% endschema %}
```

#### 3. Syntax error in the schema

```bash
npm run build
npm run lint
```

Look for missing commas, unbalanced braces, etc.

```javascript
// ❌
{
  type: 'text',
  id: 'heading',
  label: 'Heading'
  default: 'Default'   // missing comma above
}

// ✅
{
  type: 'text',
  id: 'heading',
  label: 'Heading',
  default: 'Default',
}
```

#### 4. Schema is too large

Shopify limits:
- 512 KB per section schema
- 50 blocks per section

Fixes:
- Split into multiple smaller sections
- Reduce block count
- Trim long labels/descriptions

---

## A setting doesn't appear

### Causes & fixes

#### 1. `visible_if` references a non-existent ID

```javascript
// ❌
{
  type: 'text',
  id: 'text',
  visible_if: visible('non_existent_id', true),
}

// ✅
{ type: 'checkbox', id: 'show_text', default: false },
{ type: 'text', id: 'text', visible_if: visible('show_text', true) },
```

To debug: temporarily remove `visible_if` and see whether the setting reappears.

#### 2. ID mismatch with device settings

```javascript
// ❌
{
  type: 'range',
  id: 'columns',
  devices: ['desktop', 'mobile'],
  visible_if: visible('show_grid_desktop', true),  // don't add the device suffix manually
}

// ✅
{ type: 'checkbox', id: 'show_grid', default: true },
{
  type: 'range',
  id: 'columns',
  devices: ['desktop', 'mobile'],
  visible_if: visible('show_grid', true),
}
```

#### 3. Missing `deviceSetting()`

```javascript
// ❌
{ type: 'range', id: 'columns', devices: ['desktop', 'mobile'], ... }

// ✅
deviceSetting(),
{ type: 'range', id: 'columns', devices: ['desktop', 'mobile'], ... }
```

#### 4. Setting is being omitted

```javascript
{ type: 'header', content: 'Advanced' },
{ type: 'text', id: 'custom_class', label: 'Custom class' },
...
omitSections: ['Advanced'],  // The setting is hidden
```

Remove `'Advanced'` from `omitSections` to bring it back.

---

## Blocks not working

### Causes & fixes

#### 1. Duplicate block `type`

```javascript
// ❌
blocks: [
  { type: 'item', name: 'Item 1', ... },
  { type: 'item', name: 'Item 2', ... },
]

// ✅
blocks: [
  { type: 'item_1', name: 'Item 1', ... },
  { type: 'item_2', name: 'Item 2', ... },
]
```

#### 2. Block missing `settings`

```javascript
// ❌
blocks: [
  { type: 'slide', name: 'Slide' },
]

// ✅
blocks: [
  {
    type: 'slide',
    name: 'Slide',
    settings: [
      { type: 'image_picker', id: 'image', label: 'Image' },
    ],
  },
]
```

#### 3. Preset doesn't declare blocks

```javascript
// ❌
presets: [
  { name: 'Slider' },
]

// ✅
presets: [
  {
    name: 'Slider',
    blocks: [
      { type: 'slide' },
      { type: 'slide' },
    ],
  },
]
```

#### 4. Block limit exceeded

Shopify limits:
- 50 blocks per section
- 300 blocks per theme

```javascript
blocks: [
  {
    type: 'slide',
    name: 'Slide',
    limit: 10,
    settings: [...],
  },
]
```

---

## `visible_if` not behaving correctly

### Causes & fixes

#### 1. Operator inverted

```javascript
// ❌ — shows when false?
visible_if: visible('show_image', false)

// ✅
visible_if: visible('show_image', true)
// or
visible_if: visible('show_image', false, true)  // != false
```

#### 2. AND vs OR mistake

```javascript
// ❌ — wanted "A OR B"
visible_if: visible('a', true).and('b', true)

// ✅
visible_if: visible('a', true).or('b', true)
```

#### 3. Wrong context reference

```javascript
// ❌ — inside a block schema
visible_if: visible('section.settings.show_image', true)

// ✅
visible_if: visible('show_image', true)
// or explicit:
visible_if: visible('block.settings.show_image', true)
```

#### 4. Forgot the compiler appends `idSuffix`

```javascript
// Inside a createSchemaSettings consumed with idSuffix: '_primary'
// ✅ — leave the ID unsuffixed, the compiler rewrites it
visible_if: visible('enable', true)
// effective: {{ section.settings.enable_primary == true }}
```

---

## Device settings produce wrong output

### Causes & fixes

#### 1. Missing `deviceSetting()`

```javascript
// ✅
deviceSetting(),
{
  type: 'range',
  id: 'columns',
  devices: ['desktop', 'mobile'],
}
```

#### 2. Array length mismatch

```javascript
// ❌
{
  label: ['Columns (Desktop)'],         // 1 entry
  devices: ['desktop', 'mobile'],       // 2 devices
}

// ✅
{
  label: ['Columns (Desktop)', 'Columns (Mobile)'],
  devices: ['desktop', 'mobile'],
}
```

#### 3. `devices` formatted wrong

```javascript
// ❌
devices: 'desktop,mobile'
devices: ['Desktop', 'Mobile']

// ✅
devices: ['desktop', 'mobile']
```

---

## Common Errors

### "Setting ID already exists"

Duplicate `id` in the settings array. Make every `id` unique.

### "Invalid visible_if syntax"

Raw Liquid string is malformed. Use the `visible()` helper instead.

### "Schema too large"

Schema exceeds 512 KB. Split into multiple sections, trim labels, or hide unused settings.

### "Invalid setting type"

Unsupported type. Check `./setting-types.md` for the valid list.

---

## Debugging Workflow

1. **Type-check / lint**
   ```bash
   npm run lint
   npm run build
   ```

2. **Simplify**
   ```javascript
   export const schema = createSectionSchema({
     name: 'Test section',
     settings: [
       { type: 'text', id: 'heading', label: 'Heading' },
       // …comment out everything else
     ],
   });
   ```

3. **Add back incrementally** — re-introduce settings in small groups until the bug returns.

4. **Check the Theme Editor console** for errors.

5. **Disable `visible_if`** temporarily on the misbehaving setting to confirm whether the issue is in the condition.

---

## Prevention

### Always validate after changes

```bash
npm run build
```

### Use the JSDoc type annotation

```javascript
/** @type {import('./schema.types').SectionSchema} */
export const schema = createSectionSchema({...});
```

### Test in the Theme Editor

Add the section to a template and verify it behaves as expected.

### Keep schemas small

If a section feels too big, split it into multiple smaller sections.

## Related

- `./section-schema.md` — section schema
- `./block-schema.md` — block schema
- `./visibility.md` — `visible_if` API
- `./device-setting.md` — device settings
- `./setting-types.md` — setting types
