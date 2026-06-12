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

## Worked primitive — `section-heading` (override, never hand-write)

Most sections open with an overline + title + intro cluster. The project already ships a reusable `section-heading` snippet for exactly this, wired through the `context`/reusable-settings pattern above — so when a design section contains one, **render the snippet; don't re-author the `<header class="xo-section-heading">` markup.** Hand-writing it duplicates a shipped primitive and drifts from the look every other section gets.

**When it applies.** The design section contains either an explicit `<xo-component src="section-heading">`, or a header matching its signature: `<header class="xo-section-heading">` with an overline (`.xo-section-heading__overline`), a required title (`.xo-section-heading__title` — an `h2` that may carry `<em>` italic emphasis), and an optional intro (`.xo-section-heading__intro`). Design-component params: `align` (left/center/right, default center), `overline?`, `title` (required), `intro?`. Source: `design/src/components/section-heading/`.

**Wire it (established pattern — see `src/sections/featured-collection/`, `src/sections/best-sellers/`).** In the section's `schema.js`, spread the snippet's exported settings:

```javascript
import { sectionHeadingSchemaSettings } from "../../snippets/section-heading/section-heading/schema.js";

settings: [
  ...sectionHeadingSchemaSettings(),       // emits ids: heading, sub_heading, description, heading_size, sub_heading_size, alignment
  // …rest of the section's settings
]
```

Then render the dispatcher in the section `.liquid` — it reads those `section.settings` ids itself:

```liquid
{% render 'section-heading' %}
```

Pass input overrides to drop fields the design doesn't show — `sectionHeadingSchemaSettings({ subHeadingDisabled: true })` / `{ descriptionDisabled: true }`. Per "defaults are placeholders, not design copy" (`data-to-settings.md`), the text defaults stay generic placeholders (heading default = the section's purpose), not the design's literal title. When you're *not* on `section.settings` (e.g. rendering per-block in a loop), call the variant directly with explicit params: `{% render 'section-heading-1', heading: ..., sub_heading: ..., description: ..., alignment: ... %}`.

**Param mapping is NOT 1:1.** The snippet uses different names — verified by its DOM order (`sub_heading` renders above `heading` above `description`, matching the design's overline-above-title-above-intro):

| Design component | `section-heading` snippet |
| --- | --- |
| `overline` (renders above) | `sub_heading` |
| `title` | `heading` |
| `intro` | `description` |
| `align` | `alignment` |

The title's `<em>` survives because `heading` is a `richtext` setting. As always, confirm names against the snippet's `{% comment %}` doc block rather than carrying the design's keys over.

**Respect the design — don't over-reach (negativeMatch).** The snippet replaces *only* the overline/title/intro cluster. Keep it section-specific when the header is more than that:

- Header has nav / search / a CTA link like "View all" as a direct child (e.g. a featured-products head) → the `section-heading` sits *inside* the section's own header layout next to the CTA. Render `{% render 'section-heading' %}` for the heading cluster, keep the CTA/nav as section markup.
- Header is filter-pills + search → a different shape; not `section-heading`.
- Header has a stat number beside the title (e.g. `4.9/5`) → a different primitive (stat-heading); not `section-heading`.

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
