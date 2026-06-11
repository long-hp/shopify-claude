# Input-Setting Helpers

Project-provided helpers that wrap common settings. **Always check these first** before writing settings by hand — they ensure consistency across the theme.

## Location

```
src/snippets/_base/input-settings/
```

## Import Paths

> [!CAUTION]
> **Verify import paths after creating a file.**
>
> From `src/snippets/[snippet-name]/schema.js`:
> - ✅ `import { createSchemaSettings } from "../../create-schema.js";`
> - ✅ `import { alignmentSetting } from "../_base/input-settings/alignment.js";`
> - ❌ `"../../../create-schema.js"` (too many `../`)

## Helper Catalog

| Helper                          | File                  | Returns           | Use case               | Example                                                       |
| ------------------------------- | --------------------- | ----------------- | ---------------------- | ------------------------------------------------------------- |
| `alignmentSetting`              | `alignment.js`        | **Object**        | Text alignment         | `alignmentSetting({ idSuffix: "_text" })`                     |
| `borderRadiusSetting`           | `border-radius.js`    | **Object**        | Border radius          | `borderRadiusSetting()`                                       |
| `aspectRatioSetting`            | `aspect-ratio.js`     | **Object**        | Aspect ratio           | `aspectRatioSetting()`                                        |
| `orderSetting`                  | `order.js`            | **Object**        | Order number           | `orderSetting()`                                              |
| `headerItemPositionSetting`     | `header-item-position.js` | **Object**    | Header item position   | `headerItemPositionSetting()`                                 |
| `colorSchemaSettings`           | `color.js`            | **Array**         | Color picker group     | `...colorSchemaSettings({ id: "bg_color" })`                  |
| `spaceSchemaSettings`           | `space.js`            | **Array**         | Padding / margin       | `...spaceSchemaSettings({ position: ["top"] })`               |
| `linkSchemaSettings`            | `link.js`             | **Array**         | URL + open-in-new-tab  | `...linkSchemaSettings()`                                     |
| `shadowSchemaSettings`          | `shadow.js`           | **Array**         | Box shadow             | `...shadowSchemaSettings()`                                   |
| `iconNameSchemaSettings`        | `icon-name.js`        | **Array**         | Icon picker            | `...iconNameSchemaSettings()`                                 |
| `typographySchemaSettings`      | `typography.js`       | **Array**         | Font settings          | `...typographySchemaSettings()`                               |
| `aspectRatioSchemaSettings`     | `aspect-ratio.js`     | **Array**         | Aspect ratio (multi)   | `...aspectRatioSchemaSettings()`                              |
| `blockAppearanceSchemaSettings` | `block-appearance.js` | **Array**         | Block appearance       | `...blockAppearanceSchemaSettings()`                          |
| `colorSchemeSchemaSettings`     | `color-scheme.js`     | **Array**         | Color scheme           | `...colorSchemeSchemaSettings()`                              |

## Spread-Operator Rule

> [!CAUTION]
> **Match the spread operator to the return type.**
>
> | Naming                              | Built with               | Returns | Spread?       |
> | ----------------------------------- | ------------------------ | ------- | ------------- |
> | `xxxSetting` (singular)             | `createSchemaSetting`    | Object  | **No** `...`  |
> | `xxxSettings` / `xxxSchemaSettings` | `createSchemaSettings`   | Array   | **Yes** `...` |
>
> Easy mnemonic: word ends in `Settings` (plural) → spread it.

### Correct usage

```javascript
import { createSchemaSettings } from "../../create-schema.js";
import { alignmentSetting } from "../_base/input-settings/alignment.js";
import { colorSchemaSettings } from "../_base/input-settings/color.js";

export const mySettings = createSchemaSettings({
  input: {},
  settings: ({ input }) => [
    { type: "text", id: "title", label: "Title" },

    // ✅ Singular helper (Object) — NO spread
    alignmentSetting({
      idSuffix: "_title",
      default_alignment: "center",
    }),

    // ✅ Plural helper (Array) — REQUIRES spread
    ...colorSchemaSettings({
      id: "bg_color",
      label: "Background color",
    }),
  ],
});
```

### Incorrect usage

```javascript
// ❌ Spreading a singular helper (it is already an object)
...alignmentSetting({ idSuffix: "_title" })

// ❌ Not spreading a plural helper (it returns an array)
colorSchemaSettings({ id: "bg_color" })
```

## `idSuffix` Convention

> [!IMPORTANT]
> When the same helper is used multiple times in the same schema, use `idSuffix` to avoid ID collisions.

```javascript
// Two alignment fields in the same schema
alignmentSetting({ idSuffix: "_title" }),    // → id: alignment_title
alignmentSetting({ idSuffix: "_subtitle" }), // → id: alignment_subtitle
```

In Liquid you then read `context.settings.alignment_title` (not `alignment`).

## Authoring Workflow

1. **Need a common setting?** (alignment, color, spacing, typography, …)
2. **Check** `src/snippets/_base/input-settings/` for an existing helper.
3. **If a helper exists** — use it. Apply `idSuffix` when needed.
4. **If no helper exists** — consider whether one *should* exist (does another file already roll its own?). If yes, add it to `_base/input-settings/` first.
5. **Only as a last resort** — inline the settings directly in your schema.

## Related

- `./reusable-settings.md` — `createSchemaSettings` / `createSchemaSetting` API
- `./section-schema.md` — using helpers in a section
- `./block-schema.md` — using helpers in a block
- `./visibility.md` — `visible_if` API for helpers that accept it
