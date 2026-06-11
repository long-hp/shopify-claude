# Schema Snippet (context pattern)

A schema snippet ships its own `schema.js`. Settings are exposed to merchants through whatever section or block renders it — the snippet reads them via a `context` object passed in.

## When to use

- The same snippet is rendered from multiple sections, and each instance needs its own settings.
- The settings would otherwise be re-declared in every consuming section's schema (DRY violation).
- A merchant should be able to customize the snippet's appearance from the Theme Editor.

When the snippet is always used with values the caller already has, prefer the **pure** shape — see `./pure-snippet.md`. Schema snippets carry more weight (settings UI surface, validation, defaults) so use them only when the reuse case justifies the overhead.

## File layout

```
src/snippets/<name>/
└── <name>/
    ├── <name>.liquid
    ├── schema.js               # createSchemaSettings(...) — see `schema` skill
    └── <name>.global.scss      # optional
```

## The context pattern

The snippet takes one mandatory parameter: `context`. The caller passes whichever object owns the settings — typically `section` or `block`:

```liquid
{# inside a section's liquid #}
{% render 'my-snippet', context: section %}

{# inside a block iteration #}
{% render 'my-snippet', context: block %}
```

Inside the snippet, read settings off `context.settings.X`:

```liquid
{% liquid
  assign title    = context.settings.title
  assign show_icon = context.settings.show_icon | default: false, allow_false: true
%}
```

This way the snippet's schema (defined in `schema.js`) cleanly merges into whichever parent renders it, via `...mySnippetSchemaSettings()` spread in the parent's `createSectionSchema` / `createBlockSchema`.

## Skeleton

### `<name>.liquid`

```liquid
{% comment %}
  <Name>

  Reusable component. Settings come from the calling section/block via the
  `context` parameter (see `schema.js` for the merchant-facing fields).

  @param {object} context - Section or block object containing settings (required)
  @param {string} [class] - Extra utility classes appended to the root (optional)

  Available settings on `context.settings`:
  - title {string}: Heading text
  - show_icon {boolean}: Show the leading icon (default false)
  - icon_name {string}: Icon name (default 'check')

  @example
  {%- comment -%} From inside a section {%- endcomment -%}
  {% render '<name>', context: section %}

  {%- comment -%} From inside a block iteration {%- endcomment -%}
  {% render '<name>', context: block %}
{% endcomment %}

{% liquid
  assign title    = context.settings.title
  assign show_icon = context.settings.show_icon | default: false, allow_false: true
  assign icon_name = context.settings.icon_name | default: 'check'

  assign container_class = 'xo-<name> d:flex ai:center gp:0.6rem'
  if class
    assign container_class = container_class | append: ' ' | append: class
  endif
%}

{%- if title != blank -%}
  <div class="{{ container_class }}">
    {%- if show_icon -%}{% render 'icon', name: icon_name %}{%- endif -%}
    <span class="xo-<name>__title">{{ title }}</span>
  </div>
{%- endif -%}
```

### `schema.js`

```javascript
import { createSchemaSettings, visible } from "../../../create-schema.js";

export const myNameSchemaSettings = createSchemaSettings({
  input: {
    visible_if: visible(),
  },
  settings: ({ input }) => [
    {
      type: "text",
      id: "title",
      label: "Title",
      visible_if: input.visible_if,
    },
    {
      type: "checkbox",
      id: "show_icon",
      label: "Show icon",
      default: false,
      visible_if: input.visible_if,
    },
    {
      type: "text",
      id: "icon_name",
      label: "Icon name",
      default: "check",
      visible_if: visible("show_icon", true),
    },
  ],
});
```

→ See `schema` skill (`reusable-settings.md` reference) for the full `createSchemaSettings` API: spread operator rules, `input` defaults, `omitFields`, `idSuffix`, etc.

## Consuming in a parent section

```javascript
// src/sections/my-section/schema.js
import { createSectionSchema } from "../../create-schema.js";
import { sectionSchemaSettings } from "../../snippets/_base/section/schema.js";
import { myNameSchemaSettings } from "../../snippets/<name>/<name>/schema.js";

export const schema = createSectionSchema({
  name: "My Section",
  settings: [
    { type: "header", content: "<Name>" },
    ...myNameSchemaSettings(),
    ...sectionSchemaSettings({ padding_top: 80, padding_bottom: 80 }),
  ],
});
```

```liquid
{# src/sections/my-section/my-section.liquid #}
{%- capture content -%}
  {% render '<name>', context: section %}
{%- endcapture -%}

{% render 'section', content: content %}
```

## Key patterns

### Per-block usage (inside `{% for block in section.blocks %}`)

```liquid
{% for block in section.blocks %}
  {% render '<name>', context: block %}
{% endfor %}
```

The schema settings then live on the block schema (spread `myNameSchemaSettings()` into the block's settings array), not the section's.

### Settings with `idSuffix` (the same snippet reused twice in the same section)

When the parent renders the snippet TWO+ times and each instance needs its own settings (e.g. left vs right column), `createSchemaSettings` supports `idSuffix`:

```javascript
// section schema
settings: [
  { type: "header", content: "Left column" },
  ...myNameSchemaSettings({ idSuffix: "_left" }),

  { type: "header", content: "Right column" },
  ...myNameSchemaSettings({ idSuffix: "_right" }),
]
```

In the snippet, you don't read settings differently — the caller wires the context with `idSuffix` already applied. → See `schema` skill for details.

### Conditional visibility on settings inside the snippet's schema

```javascript
{
  type: "text",
  id: "icon_name",
  visible_if: visible("show_icon", true),
}
```

Snippets-with-schemas can declare their own internal visibility logic. Use the `visible()` helper from the schema framework — don't inline raw Liquid strings.

## Anti-patterns

- **Calling without `context`** — `{% render 'X' %}` with no context arg means `context.settings.Y` evaluates to nil for every read.
- **Hardcoding `block.settings.X` or `section.settings.X` inside the snippet** — defeats the reusability. Always go through `context.settings.X`.
- **Forgetting to spread `...mySnippetSchemaSettings()`** into the parent schema — the settings won't appear in the Theme Editor and reads return blank.
- **Duplicating schema settings** in both the parent section AND the snippet's `schema.js` — pick one source of truth (usually the snippet's).
- **Skipping the doc-comment "Available settings" list** — without it, future readers have to chase the schema.js to know what the snippet consumes.

## Related

- `./pure-snippet.md` — when no merchant settings are needed
- `./variant-pattern.md` — when one snippet logically has multiple visual styles
- `schema` skill — `createSchemaSettings`, `visible()`, `idSuffix`, the helper catalog in `input-settings-helpers.md`
- `design-to-liquid` skill — when a section consumes this snippet, the audit ladder decides which variant or whether a new one is needed
