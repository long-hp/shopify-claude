# Pure Snippet

A pure snippet takes its parameters directly from the `{% render %}` call. No `schema.js`, no merchant-editable settings, no `context` object.

## When to use

- The caller always knows every value at render time (e.g. a section liquid that already has `section.settings.X` and just needs to pipe values in).
- No merchant configuration is needed beyond what the calling section/block already exposes.
- The snippet is small / one logical purpose (icon render, text formatting, badge, link wrapper, etc.).

If a snippet would otherwise need its own settings UI inside the parent section's Theme Editor, use the **schema** shape instead — see `./schema-snippet.md`.

## File layout

```
src/snippets/<name>/
└── <name>/
    ├── <name>.liquid
    └── <name>.global.scss      # optional, if it has styles
```

(`schema.js` and `<name>-base/` / `<name>-N/` siblings are not needed.)

## Skeleton

```liquid
{% comment %}
  <Name>

  One-line description of what it renders.

  @param {string} title - Heading text (required)
  @param {string} [class] - Extra utility classes appended to the root (optional)
  @param {boolean} [show_icon=false] - Show the leading icon
  @param {string} [icon_name='check'] - Icon name (only if show_icon is true)

  @example
  {% render '<name>',
    title: 'Hello',
    show_icon: true,
    icon_name: 'star'
  %}
{% endcomment %}

{% liquid
  assign show_icon = show_icon | default: false, allow_false: true
  assign icon_name = icon_name | default: 'check'

  assign container_class = 'xo-<name> d:flex ai:center gp:0.6rem'
  if class
    assign container_class = container_class | append: ' ' | append: class
  endif
%}

{%- if title != blank -%}
  <div class="{{ container_class }}">
    {%- if show_icon -%}
      {% render 'icon', name: icon_name %}
    {%- endif -%}
    <span class="xo-<name>__title">{{ title }}</span>
  </div>
{%- endif -%}
```

## Key patterns

### Defaults: chain with `allow_false: true` on booleans

```liquid
{% liquid
  assign show_icon = show_icon | default: false, allow_false: true   # boolean — keep allow_false
  assign icon_name = icon_name | default: 'check'                    # string — no allow_false needed
  assign aspect   = aspect    | default: '1/1'
  assign tag      = tag       | default: 'div'
%}
```

### Class building — assemble once in the prelude

```liquid
{% liquid
  assign container_class = 'xo-card bdrs:s2 p:1rem'

  if variant == 'featured'
    assign container_class = container_class | append: ' bgc:layer'
  endif

  if class
    assign container_class = container_class | append: ' ' | append: class
  endif
%}

<div class="{{ container_class }}">…</div>
```

(For larger class matrices with size/variant axes — see `./patterns.md`.)

### Conditional root wrapper

When the snippet sometimes wraps with `<a>` (linked) and sometimes with `<div>` (static):

```liquid
{% liquid
  assign tag = 'div'
  if link != blank
    assign tag = 'a'
  endif
%}

<{{ tag }}
  class="{{ container_class }}"
  {%- if tag == 'a' %} href="{{ link }}"{%- endif %}
>
  …
</{{ tag }}>
```

### Don't render empty wrappers

```liquid
{# ✓ #}
{% if title != blank %}
  <h2 class="xo-<name>__title">{{ title }}</h2>
{% endif %}

{# ✗ — outputs <h2></h2> when title is blank #}
<h2 class="xo-<name>__title">{{ title }}</h2>
```

### Forward unrecognized HTML attrs sparingly

If a caller needs to add a one-off attribute (e.g. `data-test-id`), accept a single `attrs` string param rather than enumerating every possible attribute:

```liquid
{# in render call: attrs: 'data-test-id="hero-cta"' #}

<button class="{{ container_class }}" {{ attrs }}>{{ text }}</button>
```

Use sparingly — explicit named params are usually clearer.

## Anti-patterns

- **No doc comment** — every snippet starts with one, no exceptions.
- **Missing `allow_false: true`** on boolean defaults — silent bug.
- **Using `{% if x %}` to check "has value"** on a string — use `{% if x != blank %}` (an empty string is truthy in Liquid).
- **Rendering raw user input** in URL attrs without `| escape` — XSS risk.
- **Hardcoded hex / px** in the markup — use design tokens via `color()` / atomic classes from `xo-css` skill.
- **Per-snippet copy-paste of icon SVGs** — use `{% render 'icon', name: 'X' %}`.
- **Logic inside the markup**: `<div class="{% if x %}a{% else %}b{% endif %} c">` — compute the class in the `{% liquid %}` prelude instead.

## Related

- `./schema-snippet.md` — when the snippet needs merchant-editable settings
- `./variant-pattern.md` — when the snippet has multiple visual styles
- `./patterns.md` — class building, conditional wrapper, nested render
- `liquid-doc` skill — the `@param` doc-comment grammar
