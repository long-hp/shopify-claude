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
