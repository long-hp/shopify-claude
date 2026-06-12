# Project Liquid Idioms

Patterns specific to this codebase. Every section/snippet under `src/` follows them. Read this before authoring new files — copy the existing pattern instead of inventing one.

## 1. The `{% liquid %}` prelude block

Bunch all `assign`s at the top of the file inside a single `{% liquid %}` block. Each statement on its own line; no `{% %}` delimiters needed inside.

```liquid
{%- liquid
  assign overline = section.settings.overline
  assign heading  = section.settings.heading
  assign image    = section.settings.image
  assign show_cta = section.settings.show_cta | default: true, allow_false: true
  assign stage_height = section.settings.stage_height | default: 'full'

  assign cta_class = 'xo-hero__cta'
  if section.settings.invert
    assign cta_class = cta_class | append: ' xo-hero__cta--invert'
  endif
-%}

{%- capture content -%}
  …markup using overline / heading / image / show_cta…
{%- endcapture -%}

{% render 'section', content: content %}
```

**Why:** the alternative — long chains of `{% assign ... %}` tags each on its own line — is visually noisy and harder to scan. The `liquid` block is the project standard.

**Inside a `liquid` block:** use `echo` to output (since `{{ }}` isn't available).

## 2. `default | allow_false: true` for boolean settings

The bare `default` filter treats `false` as falsy and substitutes the default value. To preserve a user-set `false`, pass `allow_false: true`:

```liquid
{% assign show_overline = section.settings.show_overline | default: true, allow_false: true %}
```

Without `allow_false`, if the merchant unchecks "Show overline", the setting becomes `false` → `default` substitutes `true` → the overline shows anyway. The bug is silent and confusing.

Apply this pattern to every `checkbox` setting where the **default is `true`**. (If the default is `false`, the issue doesn't arise because `false | default: false` stays `false`.)

## 3. The capture + section-wrapper pattern (section files)

```liquid
{%- capture content -%}
  <div class="xo-<name>__inner">
    {%- if heading != blank -%}
      <h2 class="xo-<name>__title">{{ heading }}</h2>
    {%- endif -%}
    {%- render 'image', image: image, aspect_ratio: '16/9', class: 'xo-<name>__media' -%}
  </div>
{%- endcapture -%}

{% render 'section', content: content %}
```

The `section` snippet (`src/snippets/_base/section/section.liquid`) is the project's section wrapper. It emits:

- Outer `<section class="xo-section xo-section--<id>">` with color-scheme class
- `{% render 'bg' %}` for background color / gradient / image / video / parallax
- `<xo-container>` with width / gap
- Section padding via CSS variables
- Border, decoration top/bottom (if enabled)

All driven by settings from `sectionSchemaSettings()` (spread in `schema.js`). **Don't hand-write `<section>` + `<xo-container>` + padding inline.**

The whitespace-control `{%- … -%}` keeps the captured output tight.

## 4. Block iteration with `shopify_attributes`

```liquid
{%- for block in section.blocks -%}
  {%- if block.type == 'card' -%}
    <div class="xo-<name>__card" {{ block.shopify_attributes }}>
      <h3>{{ block.settings.heading }}</h3>
    </div>
  {%- endif -%}
{%- endfor -%}
```

`{{ block.shopify_attributes }}` emits `data-shopify-…` attributes the Theme Editor needs to highlight + select the block. **Always include it on the block's root element.**

## 5. Conditional wrapper rendering

If a wrapper element should only appear when its content is present, guard the whole wrapper:

```liquid
{%- if button_label != blank or link_label != blank -%}
  <div class="xo-<name>__actions">
    {%- if button_label != blank -%}
      {% render 'button', text: button_label, link: button_link %}
    {%- endif -%}
    {%- if link_label != blank -%}
      <a href="{{ link_url | default: '#' }}">{{ link_label }}</a>
    {%- endif -%}
  </div>
{%- endif -%}
```

Avoids emitting empty containers that the CSS would still style with padding/border.

## 6. Class composition with `{% case %}` and append

```liquid
{% liquid
  assign container_class = 'xo-card'
  assign final_heading_class = 'xo-card__heading'

  case alignment
    when 'center'
      assign container_class = container_class | append: ' ta:center jc:center'
    when 'right'
      assign container_class = container_class | append: ' ta:right jc:flex-end'
    else
      assign container_class = container_class | append: ' ta:left jc:flex-start'
  endcase

  case size
    when 'h1'
      assign final_heading_class = final_heading_class | append: ' fz:h1'
    when 'h2'
      assign final_heading_class = final_heading_class | append: ' fz:h2'
  endcase
%}

<div class="{{ container_class }}">
  <h2 class="{{ final_heading_class }}">{{ heading }}</h2>
</div>
```

Pattern source: `src/snippets/section-heading/section-heading-1/section-heading-1.liquid`. See the `snippet` skill for variant authoring.

## 7. Image rendering — always via the `image` snippet

```liquid
{%- render 'image',
  image: section.settings.image,
  aspect_ratio: '16/9',
  class: 'xo-<name>__media',
  alt: section.settings.image_alt,
  placeholder: 'general'
-%}
```

The project's `image` snippet handles:
- `image_url` width sizing (responsive)
- `image_tag` with `widths` / `sizes` / `loading` / `fetchpriority`
- Focal point CSS variables (`--pos-x` / `--pos-y`)
- Aspect ratio container (`--ratio-percent` CSS var)
- Lazy-load on/off (`loading: 'lazy'` for below-fold, `'eager'` for LCP)
- Placeholder fallback (`<placeholder-image>` in design mode, none in production)

**Rendering an image into the DOM always goes through the `image` snippet — there is no "structural exception".** The one legitimate reason to call `image_url` directly is a CSS `background-image` (see §8); that is *not* an `<img>` in the DOM. If a layout *seems* to need a raw `<img>` — a scroll / parallax effect, a fill-the-parent stage, a wrapper whose extra `<div>` looks like it would break a fill-chain — it doesn't: pass `aspect_ratio: 'none'` + `height_fill: true` and the snippet's `.xo-image` wrapper fills its parent (object-fit cover included). Animation wrappers like `<xo-parallax-scroll>` operate on their *own* element, not the inner `<img>`, so the snippet's wrapper never disturbs keyframe DOM reads (`this.parentElement.offsetWidth`, `container.querySelector(...)`, etc.).

```liquid
{# Fill-the-parent (e.g. inside a parallax stage) — wrapper fills, no raw <img> #}
{%- render 'image', image: s.image, aspect_ratio: 'none', height_fill: true, alt: s.image_alt, class: 'xo-<name>__media' -%}
```

## 8. Responsive image sizing — width recipe

When you DO need to call `image_url` directly (e.g. for a `background-image`), pick the width based on the maximum size the image will display:

```liquid
{# Hero — full-bleed at 1920px desktop, 768px mobile #}
{% assign bg_url = section.settings.image | image_url: width: 1920 %}
<div style="background-image: url('{{ bg_url }}');">…</div>
```

`image_url` returns the original image cropped to the requested width. Don't request more than you need (perf cost). Max is 5760px.

For srcset / responsive `<img>`, prefer the `image` snippet which handles it.

## 9. Inline richtext: keep tags inline-only

`type: 'inline_richtext'` settings only accept **inline** tags in the default value:

```
Allowed:    em, strong, b, i, u, a, span, sup, sub
Rejected:   br, p, h1-h6, ul, ol, li, div, img
```

For line breaks, use CSS (`max-width: NNch` or `white-space: pre-wrap`) — NOT `<br>`. For paragraphs / lists, use `type: 'richtext'` instead, whose default's top-level node must be `<p>` / `<ul>` / `<ol>` / `<h1>`–`<h6>`.

The italic-emphasis pattern (`<em>` flips to subheading font):

```liquid
{
  type: 'inline_richtext',
  id: 'heading',
  label: 'Heading',
  default: 'A daily <em>ritual</em> for the small ones.',
}
```

Implemented globally in `src/styles/base/content.scss` — `h* em → var(--font-sub-family)`.

## 10. Settings access patterns

Always read settings into local vars in the prelude, then reference the local:

```liquid
{% liquid
  assign heading = section.settings.heading
%}
…
{%- if heading != blank -%}<h2>{{ heading }}</h2>{%- endif -%}
```

Avoids long `{{ section.settings.heading }}` everywhere and makes the dependency between settings and markup explicit.

## 11. LCP eager-load detection

For above-the-fold images (hero section, first product card), set `loading: 'eager'` and `fetchpriority: 'high'`:

```liquid
{% liquid
  assign is_lcp = false
  if section.index == 1 and section.location == 'template'
    assign is_lcp = true
  endif
%}

{%- render 'image', image: image, lazyload: is_lcp == false -%}
```

The project's `image` snippet does this automatically — checks `section.index == 1` + `section.location` matches `'template'` or `'header'`. If you opt out of the snippet, replicate the logic.

## 12. Design-mode placeholder fallback

In Theme Editor preview, show a placeholder when settings are unset; in production, render nothing:

```liquid
{%- if image != blank -%}
  {%- render 'image', image: image, aspect_ratio: '16/9' -%}
{%- elsif request.design_mode -%}
  <placeholder-image data-type="general"></placeholder-image>
{%- endif -%}
```

This makes the editor experience self-documenting (merchant sees "Image goes here") without polluting production.

## 13. `routes` instead of hardcoded URLs

```liquid
{# Bad — hardcoded #}
<a href="/cart">Cart</a>

{# Good — uses routes #}
<a href="{{ routes.cart_url }}">Cart</a>
```

Same for `routes.root_url`, `routes.search_url`, `routes.account_url`, `routes.collections_url`, `routes.cart_add_url`, `routes.product_recommendations_url`, etc. Theme Store rule + multi-locale safe.

## 14. `<html lang>` requirement

`src/layout/theme.liquid` must set:

```liquid
<html lang="{{ request.locale.iso_code }}" …>
```

Already done in this project — don't change.

## 15. Custom Liquid section / block escape hatch

Some Theme Store rules require a "Custom Liquid" section/block where merchants can paste raw Liquid. The pattern:

```liquid
{% schema setting %}
{ "type": "liquid", "id": "custom_liquid", "label": "Liquid" }
{% endschema %}

{# In the section/block .liquid: #}
{{ section.settings.custom_liquid }}
```

The `liquid` setting type renders the merchant's input as Liquid. Use sparingly — it's an escape hatch, not a workflow.

## 16. Translation keys via `t` filter

Theme-owned visible strings in `.liquid` markup go through `'<namespace>.<path>' | t`. Author keys in the **source** locale files `src/locales/NN-<namespace>.json` (namespace = filename; build merges them into `shopify/locales/en.default.json`) — never the compiled file:

```liquid
<button>{{ 'general.cart.add_to_cart' | t }}</button>
{{ 'sections.cart.items_count' | t: count: cart.item_count }}
```

This is for **markup strings only**. Merchant-edited content is a schema setting; schema labels/defaults are never `| t`. Full decision tree (`| t` vs setting vs hardcode), key reuse/add procedure, `_html` no-escape, pluralization → **`references/translations.md`** (source of truth for this project's locale convention).

## 17. Native vs project doc-comment

- **Native Shopify:** `{% doc %} @param … {% enddoc %}`
- **This project:** `{% comment %} @param … {% endcomment %}`

The build pipeline accepts both. Match existing snippets — see the `liquid-doc` skill.

## Related

- `references/tags.md` — `liquid`, `capture`, `render`, `for`, `case` syntax
- `references/filters.md` — `default`, `escape`, `image_url`, `t`
- `references/objects.md` — `section`, `block`, `request`, `routes`
- `references/gotchas.md` — when these patterns break
- `snippet` skill — full snippet body authoring
- `schema` skill — `schema.js` + `sectionSchemaSettings()` spread
