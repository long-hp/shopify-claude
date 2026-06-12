# Preset

Author presets with `createPreset` and configure group/hover blocks inside them.

## Import

```javascript
import { createPreset } from "../../../create-schema.js";
```

## Purpose

Presets are starter configurations for a section. When a merchant inserts the section, they pick from the listed presets.

## Syntax

```javascript
export const myPreset = createPreset({
  name: 'Preset name',     // Display name (required)
  category: 'Category',    // Group in the section picker (optional)
  blocks: [...],           // Default block tree (optional)
  settings: {...},         // Default section settings (optional)
});
```

## Section padding in presets — the input-param names are NOT the setting IDs

A recurring trap. In a section's `schema.js` you set padding defaults via the helper:

```javascript
...sectionSchemaSettings({ padding_top: 60, padding_bottom: 60 })
```

Here `padding_top` / `padding_bottom` are **input parameters** of `sectionSchemaSettings` — they seed default values. They are *not* the setting IDs that end up in the compiled schema. The helper expands them (via `paddingAttrsSchemaSettings` → `spaceSchemaSettings`, idSuffix `_padding`) into a device-aware control whose emitted IDs are:

```javascript
device_padding: "desktop",      // select: which device the values below apply to
inherit_desktop_padding: true,  // checkbox: mobile inherits desktop
top_padding_desktop: 60,
top_padding_mobile: 60,
bottom_padding_desktop: 60,
bottom_padding_mobile: 60,
left_padding_desktop: 0,
left_padding_mobile: 0,
right_padding_desktop: 0,
right_padding_mobile: 0,
```

So in a **preset's `settings`**, key on those real IDs — never `padding_top` / `padding_bottom`. Writing `padding_top: 60` in a preset matches no setting, so Shopify silently drops it; the section may *look* right purely because the schema default already equals the value you intended, which masks the bug until someone wants a preset value that differs from the default.

Two more things worth knowing:

- **You can usually omit padding from the preset entirely.** The `sectionSchemaSettings({...})` input already set the default, so a preset only needs these keys when it wants a value *different* from that default.
- **The padding range is 0–100 (px).** A helper input like `padding_bottom: 120` produces an out-of-range default that the editor rejects — cap intended values at 100.

`validate-schema.py <section-dir>` cross-checks the sibling `preset-*.js` against the schema and flags both mistakes (`undefined setting 'padding_top'`, `… greater than max 100`), so run it after editing either file.

## Preset & default values are placeholders, not real content

Content-bearing `default`s (heading, body, button label) and any preset `settings` values are **generic placeholders** that teach the merchant what belongs in the field — never a design's literal copy or a real product's text. This mirrors Shopify's Dawn theme: heading defaults are the section's purpose name (`"Featured collection"`, `"Image with text"`), body defaults are a "what goes here" sentence (`"<p>Share information about your brand…</p>"`), button defaults are `"Button label"`.

In practice a preset usually should **not set content values at all** — it declares the block tree and layout, and lets each setting's own placeholder `default` supply the text (exactly as Dawn presets do). Only set a value in a preset when it must differ from the schema default. Full rationale + per-kind table: `design-to-liquid` skill → `data-to-settings.md` § "Defaults are placeholders, not design copy".

## Example — Hero preset

```javascript
import { Category } from "../../constants.js";
import { createPreset } from "../../create-schema.js";

export const heroPreset = createPreset({
  name: "Hero",
  category: Category.Section.Basic,
  blocks: {
    group_9qV9wm: {
      type: "group",
      name: "Group",
      settings: {
        c_direction: "column",
        v_align: "center",
        hafdc: "center",
        vafdc: "center",
      },
      blocks: {
        group_FGDJCc: {
          type: "group",
          name: "Content",
          settings: {
            c_direction: "column",
            v_align: "center",
            hafdc: "center",
            vafdc: "center",
            gap: 20,
          },
          blocks: {
            heading_Pqq6mg: {
              type: "heading",
              name: "Heading",
              settings: {
                text: "New [arrivals]",
              },
              blocks: {},
            },
            text_NJ4JTV: {
              type: "text",
              name: "Text",
              settings: {
                text: "<p>We make things that work better and last longer. Our products solve real problems with clean design and honest materials.</p>",
                alignment: "center",
                bottom_margin_desktop: 30,
              },
              blocks: {},
            },
            button_nbMNwd: {
              type: "button",
              name: "Button",
              settings: {
                text: "Shop now",
                link: "shopify://collections/all",
                button_type: "bdr_rad_2",
                button_variant: "light-inverse",
                icon_name: "arrow",
                icon_name_button: "arrow",
                icon_position: "right",
              },
              blocks: {},
            },
          },
          block_order: ["heading_Pqq6mg", "text_NJ4JTV", "button_nbMNwd"],
        },
      },
      block_order: ["group_FGDJCc"],
    },
  },
  block_order: ["group_9qV9wm"],
  settings: {
    device_bg_image: "desktop",
    use_parallax: true,
  },
});
```

## Hover Effects — Group Block

The `group` block has a built-in hover system. Understanding it is required when authoring presets that include image overlays or interactive cards.

### Hover-related schema settings

```javascript
{
  id: "parent",
  type: "checkbox",
  default: true,
  label: "Parent",
},
{
  id: "hover_type",
  type: "select",
  options: [
    "none", "in zoom", "in up", "in down", "in left", "in right",
    "out zoom", "out up", "out down", "out left", "out right",
  ],
  visible_if: "{{ block.settings.parent == false }}",
},
{
  id: "hover_duration",
  type: "range",
  min: 100, max: 1000, step: 50, default: 300, unit: "ms",
},
{
  id: "hover_strength",
  type: "range",
  min: 0, max: 50, step: 1, default: 10,
},
```

### How to use

1. **Enable hover effects** — set `parent: false`.
2. **Pick an effect** — e.g. `hover_type: "in up"` (slides in from the bottom).
3. **Tune timing** — `hover_duration: 400` (ms).
4. **Tune distance/scale** — `hover_strength: 20`.

### Example — Image overlay with hover

```javascript
group_item_wrapper: {
  type: "group",
  settings: {
    c_direction: "column",
    o_hidden: true,  // important — clips the hover overflow
  },
  blocks: {
    image_bg: {
      type: "image",
      settings: {
        aspect_ratio: "3/4",
        width_desktop: "fill",
      },
    },
    group_default_overlay: {
      type: "group",
      settings: {
        absolute: "left bottom",  // title pinned bottom-left
        // …padding settings
      },
      blocks: {
        heading_title: {
          type: "heading",
          settings: {
            text: "Title",
            color: "var(--color-background)",  // white text
          },
        },
      },
    },
    group_hover_overlay: {
      type: "group",
      settings: {
        absolute: "left top",     // full overlay
        width_desktop: "fill",
        height_desktop: "fill",
        bg_type: "color",
        color_bg: "var(--color-background)",
        parent: false,            // enable hover behavior
        hover_type: "in up",      // slide in from bottom
        hover_duration: 400,
        hover_strength: 20,
        // …padding settings
      },
      blocks: {
        heading_title_hover: { /* … */ },
        text_description: { /* … */ },
        button_cta: { /* … */ },
      },
    },
  },
}
```

### Key invariants

- `o_hidden: true` on the wrapper prevents overflow when the hover effect plays.
- Default overlay and hover overlay can coexist.
- A hover overlay typically uses `absolute: "left top"` to cover the full area.
- `parent: false` is **required** to enable hover effects on the block.

## Related

- `./section-schema.md` — declaring presets in a section
- `./block-schema.md` — block schema fundamentals
