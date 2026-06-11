# Patterns

Composable patterns reused across snippets. Each is a tool, not a rule — apply when it improves clarity.

## Render rules

### No folder prefix in `{% render %}`

Shopify resolves snippets globally by filename across `src/snippets/**`. Folders are organizational, not namespaces.

```liquid
{% render 'image', image: x %}                       ✓
{% render '_base/image', image: x %}                 ✗
{% render 'icons/icon-arrow', size: '24' %}          ✗
```

### Render in multi-line form when there are ≥ 2 args

```liquid
{# ✓ — diff-friendly, easy to add params later #}
{% render 'button',
  text: 'Click me',
  link: '/about',
  variant: 'primary',
  icon_name: 'arrow'
%}

{# ✓ — single arg, one line is fine #}
{% render 'icon', name: 'search' %}
```

### Pass `class` through, don't merge inside

When rendering a wrapping snippet, hand the caller's extra classes via `class:` and let the snippet append them. Don't pre-merge in the caller.

```liquid
{# ✓ — class is appended inside the snippet's prelude #}
{% render 'card',
  title: 'X',
  class: 'mt:0.6rem ta:center'
%}

{# ✗ — caller builds the class, snippet has no chance to add its own base classes #}
<div class="xo-card mt:0.6rem ta:center">…</div>
```

## Class composition

### Single-axis branching with `{% case %}`

```liquid
{% liquid
  assign btn_class = 'xo-button d:inline-flex ai:center jc:center'

  case size
    when 'sm'  ;  assign btn_class = btn_class | append: ' py:0.4rem px:0.8rem fz:1.2rem'
    when 'md'  ;  assign btn_class = btn_class | append: ' py:0.6rem px:1.2rem fz:1.4rem'
    when 'lg'  ;  assign btn_class = btn_class | append: ' py:1rem px:1.6rem fz:1.5rem'
  endcase
%}
```

### Multi-axis (size × variant × custom)

```liquid
{% liquid
  assign btn_class = 'xo-button d:inline-flex ai:center jc:center'

  # Axis 1: size
  case size
    when 'sm'  ;  assign btn_class = btn_class | append: ' py:0.4rem px:0.8rem fz:1.2rem'
    when 'md'  ;  assign btn_class = btn_class | append: ' py:0.6rem px:1.2rem fz:1.4rem'
    when 'lg'  ;  assign btn_class = btn_class | append: ' py:1rem px:1.6rem fz:1.5rem'
  endcase

  # Axis 2: variant
  case variant
    when 'primary'    ;  assign btn_class = btn_class | append: ' bgc:primary c:button-text'
    when 'secondary'  ;  assign btn_class = btn_class | append: ' bgc:secondary c:button-text'
    when 'ghost'      ;  assign btn_class = btn_class | append: ' bgc:transparent c:foreground'
  endcase

  # Axis 3: caller-supplied
  if class
    assign btn_class = btn_class | append: ' ' | append: class
  endif
%}

<button class="{{ btn_class }}">{{ text }}</button>
```

Keep the axes ordered the same way across snippets (base → size → variant → caller) so they're predictable to scan.

### Don't compute classes inside the markup

```liquid
{# ✗ #}
<div class="xo-card {% if featured %}xo-card--featured{% endif %} {% if size == 'lg' %}p:s8{% else %}p:s4{% endif %}">

{# ✓ #}
{% liquid
  assign card_class = 'xo-card'
  if featured
    assign card_class = card_class | append: ' xo-card--featured'
  endif
  if size == 'lg'
    assign card_class = card_class | append: ' p:1.4rem'
  else
    assign card_class = card_class | append: ' p:0.6rem'
  endif
%}
<div class="{{ card_class }}">
```

The prelude block is where the brain lives — markup stays scannable.

## Conditional wrapper (linked vs static root)

When the root element switches between `<a>` and `<div>` (or `<a>` vs `<button>`), don't duplicate the inner content. Build the opening/closing tag from a variable:

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
  {%- if tag == 'a' and open_in_new_tab %} target="_blank" rel="noopener"{%- endif %}
>
  {% comment %} inner content rendered once, regardless of tag {% endcomment %}
  …
</{{ tag }}>
```

Avoid the alternative — `{% if has_link %}<a …>{% else %}<div …>{% endif %} … {% if has_link %}</a>{% else %}</div>{% endif %}` — which fragments the markup and is error-prone to maintain.

## Nested rendering

A composite snippet (card, panel, banner) usually composes smaller snippets rather than re-implementing image / heading / button markup.

```liquid
<div class="xo-card">
  {% render 'image',
    image: image,
    aspect_ratio: '1/1',
    class: 'xo-card__image'
  %}

  <div class="xo-card__content p:1rem">
    {% render 'text',
      tag_name: 'h3',
      text: title,
      class: 'xo-card__title'
    %}
    {% render 'text',
      tag_name: 'p',
      text: description,
      class: 'xo-card__description'
    %}
    {% render 'button',
      text: 'View',
      link: url,
      variant: 'ghost',
      class: 'xo-card__button'
    %}
  </div>
</div>
```

Each child snippet owns its own markup; the composite owns layout + class hierarchy. Don't duplicate the children's logic.

## Capture-and-pass

When a snippet renders inside another snippet's wrapper, capture the inner content first, then hand it to the wrapper as a `content` param:

```liquid
{%- capture body -%}
  <span class="xo-promo__title">{{ title }}</span>
  <p class="xo-promo__copy">{{ copy }}</p>
{%- endcapture -%}

{% render 'animated-frame',
  content: body,
  effect: 'fade-up'
%}
```

The wrapper snippet (`animated-frame`) only sees a string and renders it inside whatever frame it provides. Cleaner than asking the wrapper to know about every inner shape.

## Settings-driven attrs (border / padding / shadow / size)

When the snippet (or its `*-base` ancestor) needs to apply attrs that the merchant configures, render the project's `*-attrs` helpers in the prelude. They return a `class,style` string that you split and append.

```liquid
{% liquid
  capture border_attrs
    render 'border-attrs', context: block
  endcapture
  assign border_attrs = border_attrs | split: 'COMMA'
  assign border_class = border_attrs[0] | strip
  assign border_style = border_attrs[1] | strip

  assign container_class = container_class | append: ' ' | append: border_class
  assign container_style = container_style | append: border_style
%}

<div class="{{ container_class }}" style="{{ container_style }}">…</div>
```

`border-attrs`, `padding-attrs`, `shadow-attrs`, `size-attrs`, `abs-attrs` (positioning) all follow the same `class,style` return shape. They read from `context.settings.X` and fall back to `settings.X` (theme-level) — see `design-to-liquid` skill's tokens-mapping reference for the cascade.

## Translation strings

Use Shopify's `t:` filter for any user-facing copy that should be translatable:

```liquid
{{ 'sections.subscribe.button_label' | t }}
```

Locale files live under `src/locales/`. When adding a string, register the key in the locale JSON for at least `en.default.json`.

## Anti-patterns recap

- Folder prefix in `{% render %}` — never.
- Class assembly inside markup — move to the `{% liquid %}` prelude.
- Duplicating wrapper content across an if/else — use the `<{{ tag }}>` pattern.
- Skipping `allow_false: true` on booleans — silent flip bug.
- Empty root elements when no content — wrap the whole element in the same `!= blank` check.
- Inlining `style="color:#…"` — atomic classes / SCSS / settings cascade instead.

## Related

- `./pure-snippet.md` — the basic snippet shape
- `./schema-snippet.md` — the context-pattern shape
- `./variant-pattern.md` — dispatcher + numbered variants
- `liquid-doc` skill — `@param` documentation
- `xo-css` skill — atomic class syntax
- `scss` skill — when complex class building isn't enough
