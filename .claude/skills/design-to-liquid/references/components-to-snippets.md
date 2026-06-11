# Components → Snippets (Rare Case)

How to convert a design component HTML template into a Liquid snippet at `src/snippets/<name>/<name>/<name>.liquid` — **only when no existing snippet covers it.**

> [!CAUTION]
> **Reuse first, always.** The snippets in `src/snippets/` are mature and parameterized. Before you create anything:
>
> 1. Run `ls src/snippets/` and grep for the component's purpose (e.g. `card`, `media`, `slide`, `tile`).
> 2. Read the existing snippet's liquid-doc to learn its parameters.
> 3. Check whether a schema param (style variant, corner radius, color scheme) makes the existing snippet match the design.
> 4. If yes — render the existing snippet and restyle via SCSS / XO-CSS.
>
> A new snippet should be the exception (estimate: ≤ 10 % of components in a typical design).

## When a New Snippet IS Warranted

- The pattern is genuinely novel (no existing equivalent).
- The pattern appears ≥ 3 times across sections (single use → inline in the section).
- The pattern has its own merchant-editable settings (use the `context` schema pattern).

If the pattern appears once, **inline** the markup in the section. Snippets are for reuse.

## Folder Layout

For a new snippet named `<name>`:

```
src/snippets/<name>/
└── <name>/
    ├── <name>.liquid           # render output
    ├── schema.js               # optional — only if it accepts a context object with settings
    └── <name>.global.scss      # optional — component-scoped styles
```

For larger snippets that ship variants:

```
src/snippets/<name>/
├── <name>/                     # entrypoint that dispatches to variants
├── <name>-base/                # shared logic across variants
├── <name>-1/, <name>-2/, …     # style variants
```

Match whatever convention is already used in the repo (look at `src/snippets/product-card/`, `src/snippets/article-card/`, `src/snippets/button/`).

## Anatomy

```liquid
{% comment %}
  <Name>

  Brief description of what this snippet renders.

  @param {string} text - Required text content
  @param {string} [link] - Optional link href
  @param {string} [variant=primary] - Visual variant (optional)

  @example
  {% render '<name>', text: 'Hello', link: '/about' %}
{% endcomment %}

{% liquid
  assign variant = variant | default: 'primary'
%}

<a href="{{ link | default: '#' }}" class="xo-<name> xo-<name>--{{ variant }}">
  {{ text }}
</a>
```

The leading `{% comment %}` is the liquid-doc — see the `liquid-doc` skill.

## Translating from Design Templates

Design components are JS template literals with optional `<script template>` blocks:

```html
<!-- design/<some>/components/<name>/<name>.html -->
<script template>
  const tag = href ? 'a' : 'button';
  const v = variant || 'primary';
</script>
<${tag} class="xo-<name> xo-<name>--${v}" ${href ? `href="${href}"` : ''}>
  ${icon && `<i data-lucide="${icon}"></i>`}
  <span>${label}</span>
</${tag}>
```

Equivalent liquid:

```liquid
{% comment %}
  <Name>

  @param {string} text - Label text (required)
  @param {string} [link] - href; when present renders <a>, else <button>
  @param {string} [variant=primary]
  @param {string} [icon_name]
  @param {string} [type=button] - button type when no link

  @example
  {% render '<name>', text: 'Hello', link: '/x', icon_name: 'arrow' %}
{% endcomment %}

{% liquid
  assign variant = variant | default: 'primary'
  assign type    = type    | default: 'button'
  assign tag     = 'button'
  if link != blank
    assign tag = 'a'
  endif
%}

<{{ tag }}
  {% if tag == 'a' %}href="{{ link }}"{% else %}type="{{ type }}"{% endif %}
  class="xo-<name> xo-<name>--{{ variant }}"
>
  {%- if icon_name != blank -%}
    {% render 'icon', name: icon_name, size: '18' %}
  {%- endif -%}
  <span class="xo-<name>__label">{{ text }}</span>
</{{ tag }}>
```

## Key Differences from Design Templates

| Design template literal                               | Liquid snippet                                              |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `${variable}` interpolation                           | `{{ variable }}` output, `{% liquid %}` for logic           |
| `<script template>` prelude block                     | `{% liquid %}` block for assigns                            |
| `${cond && '…'}` conditional fragment                 | `{% if cond %}…{% endif %}`                                 |
| `data.map(x => …).join('')`                           | `{% for x in data %}…{% endfor %}`                          |
| `${h(text)}` for HTML-escape                          | Default in Liquid — `{{ text }}` already escapes            |
| Raw HTML output `${rawHtml}`                          | `{{ rawHtml }}` escapes; use `| raw` only for trusted source|
| Component path attribute auto-injected at build       | No equivalent; ignore                                       |

## Snippets That Take Their Own Settings (the `context` Pattern)

If the snippet needs schema settings exposed to whichever section/block renders it, it takes a `context` object (the parent `section` or `block`) and ships a `schema.js`:

```liquid
{% comment %}
  Product Media

  @param {object} context - Section or block (required)
  @param {object} product - Product (required)

  Available settings on `context.settings`:
  - aspect_ratio {string} - Aspect ratio (e.g. '1/1', '3/4')
  - hover_effect {string} - Hover effect

  @example
  {% render 'product-media', context: section, product: product %}
{% endcomment %}

{% liquid
  assign aspect_ratio = context.settings.aspect_ratio | default: '1/1'
%}

<div class="xo-product-media" style="--ratio: {{ aspect_ratio }};">
  <!-- ... -->
</div>
```

The matching `schema.js` exports a `createSchemaSettings(...)` factory — see the `schema` skill → `reusable-settings.md`. The consuming section spreads it into its own settings.

## SCSS Co-location

If the snippet needs styles:

```
src/snippets/<name>/<name>/<name>.global.scss
```

The `.global.scss` is auto-imported globally. Use BEM (`.xo-<name>__element--modifier`) — see the `scss` skill.

## Pitfalls

| Pitfall                                                  | Fix                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Re-creating an existing snippet under a new name         | Search `src/snippets/` first; reuse + restyle.                     |
| Copying design's data keys verbatim as Liquid params     | Match the project's parameter naming convention.                   |
| Outputting raw HTML by mistake                           | Liquid escapes by default; use `| raw` only for trusted input.     |
| Missing the liquid-doc comment at the top                | Required — see `liquid-doc` skill.                                 |
| Creating a snippet for a one-section markup pattern      | Inline in the section instead.                                     |

## Related

- `liquid-doc` skill — doc-comment format
- `schema` skill — `createSchemaSettings` / `createSchemaSetting` for the `context` pattern
- `scss` skill — component-scoped styles
- `./sections-to-liquid.md` — composing snippets inside a section
