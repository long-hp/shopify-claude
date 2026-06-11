---
name: schema
description: "MUST be invoked (via Skill tool) BEFORE creating or modifying any `schema.js` (section, block, global settings, preset). Schema is compiled into Shopify's `{% schema %}` JSON — bugs reach the editor as hard errors (rejected by Shopify). Memory of the project's builder API surface (createSectionSchema / createBlockSchema / createGlobalSchema / createSchemaSettings / createSchemaSetting / createPreset / visible() / deviceSetting() / input-setting helpers in `src/snippets/_base/input-settings/`) is incomplete — agent skip = duplicate setting IDs, unresolved block types, label hygiene violations, missing visibility guards. Pair every invocation with the validator: `python .claude/skills/design-to-liquid/scripts/validate-schema.py <section-dir>` (add `--strict` to surface Theme Store label warnings as errors)."
---

# Schema

JavaScript-authored schema for Shopify section/block/theme settings, compiled via `src/create-schema.js`.

## Quick Reference

| Function              | Purpose                                 |
| --------------------- | --------------------------------------- |
| `createSectionSchema` | Schema for a section                    |
| `createBlockSchema`   | Schema for a block                      |
| `createGlobalSchema`  | Schema for theme settings (global)      |
| `createSchemaSettings`| Reusable group of settings (array)      |
| `createSchemaSetting` | Reusable single setting (object)        |
| `createPreset`        | Preset entry for sections/blocks        |
| `visible()`           | Conditional visibility (visible_if)     |
| `deviceSetting()`     | Desktop/mobile selector                 |

## Critical Rule — Check Input-Setting Helpers First

**Before writing any settings array, check `src/snippets/_base/input-settings/`.**

The project ships ready-made helpers (`alignmentSetting`, `colorSchemaSettings`, `spaceSchemaSettings`, `typographySchemaSettings`, etc.). Re-implementing one of these by hand breaks consistency.

→ See `references/input-settings-helpers.md` for the full catalog and spread-operator rules.

## Critical Rule — Verify `Category` enum before assigning to preset

`src/constants.js` exports the authoritative `Category` shape:

```js
Category.Section = { Basic, Header, Banners, Collections, Products, Carts, Blog, Forms, Storytelling, Footer, Layout }
Category.Block   = { Basic, Product, Article, Collection, Cart, Layout, Links, Forms, Header, Footer, Custom }
```

**Read this file BEFORE writing `category: Category.Section.X` or `category: Category.Block.X`.** Misnaming the leaf (`Product` vs `Products`, `Collection` vs `Collections`) compiles to `undefined` silently — preset still ships, but lands in the wrong category bucket in Theme Editor.

Common slips:
- `Category.Section.Product` → does NOT exist. Use `Category.Section.Products` (plural).
- `Category.Section.Collection` → does NOT exist. Use `Category.Section.Collections` (plural).
- `Category.Block.Products` → does NOT exist. Use `Category.Block.Product` (singular — opposite of Section).
- `Category.Section.Banner` → does NOT exist. Use `Category.Section.Banners` (plural).

When in doubt, run a quick grep:

```bash
grep -A 15 "Section:" src/constants.js
```

The validator does NOT currently catch undefined `Category.Section.X` references — verification must happen at write-time.

## Navigation — When to read which file

### By schema type

- **Building a section?** → `references/section-schema.md`
- **Building a block?** → `references/block-schema.md`
- **Building theme settings?** → `references/global-schema.md`

### By feature

- **Reusing settings across files** → `references/reusable-settings.md`
- **Using project helpers (alignment, color, space, typography, …)** → `references/input-settings-helpers.md`
- **Presets (with hover-block patterns)** → `references/preset.md`
- **Conditional visibility (`visible_if`)** → `references/visibility.md`
- **Responsive desktop/mobile settings** → `references/device-setting.md`

### Lookup

- **Setting type reference** (text, range, image_picker, color_scheme, etc.) → `references/setting-types.md`
- **Advanced features** (getComponentOptions, builder, orderSections, omitSections, __noSuffix, translate) → `references/advanced.md`
- **Errors and fixes** → `references/debugging.md`

## Source

- **Implementation**: `src/create-schema.js`
- **Types**: `src/schema.types.ts`
- **Project helpers**: `src/snippets/_base/input-settings/`
- **Global schemas**: `src/config/global-schema/`
- **Presets**: `src/config/presets/`
