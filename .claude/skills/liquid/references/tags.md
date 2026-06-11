# Liquid Tags Reference

Tags drive control flow, iteration, variable assignment, theme rendering. Source: <https://shopify.dev/docs/api/liquid/tags>.

## Index

| Group | Tags |
| --- | --- |
| Control flow | `if`, `unless`, `elsif`, `else`, `case`/`when` |
| Iteration | `for`, `tablerow`, `paginate`, `cycle`, `break`, `continue` |
| Variable | `assign`, `capture`, `increment`, `decrement`, `liquid` (block), `echo` |
| Theme | `render`, `section`, `sections`, `content_for`, `form`, `layout`, `schema`, `stylesheet`, `javascript` |
| Output / misc | `comment`, `raw`, `doc` |

---

## Control flow

### `if` / `unless` / `elsif` / `else`

```liquid
{% if condition %}…{% elsif other %}…{% else %}…{% endif %}
{% unless condition %}…{% endunless %}
```

Truthy values: any non-`nil`, non-`false`. **Empty string `""` is truthy.** Use `!= blank` to test for "non-empty content" (also catches whitespace-only strings).

```liquid
{% if section.settings.heading != blank %}
  <h2>{{ section.settings.heading }}</h2>
{% endif %}
```

### `case` / `when`

```liquid
{% case variable %}
  {% when value1 %}…
  {% when value2, value3 %}…   {# multi-value match — comma list #}
  {% else %}…
{% endcase %}
```

Used heavily in this project for variant dispatching (e.g. `{% case shape %}{% when 'bloom' %}<svg…>{% when 'sunburst' %}<svg…>{% endcase %}`). See `src/snippets/services-grid-shape/`.

---

## Iteration

### `for`

```liquid
{% for item in array %}
  {{ item }} (index: {{ forloop.index }})
{% endfor %}
```

**Hard ceiling: 50 iterations** by default. Larger arrays need `limit:` + offset paging or `paginate` (see below).

Parameters:
- `limit: N` — stop after N items
- `offset: N` — start at 1-based index N
- `reversed` — iterate backwards
- range syntax: `{% for i in (1..10) %}` — iterate over numeric range

`forloop` object inside the loop:
- `forloop.index` (1-based), `forloop.index0` (0-based)
- `forloop.first`, `forloop.last` (booleans)
- `forloop.length` (total count)
- `forloop.rindex` (1-based from end)
- `forloop.parentloop` (outer loop, when nested)

`{% else %}` — runs when array is empty:

```liquid
{% for product in collection.products %}
  …
{% else %}
  <p>No products yet.</p>
{% endfor %}
```

`{% break %}` and `{% continue %}` work inside `for`.

### `tablerow`

Generates HTML `<tr>`/`<td>` rows. Must be wrapped in `<table>`.

```liquid
<table>
  {% tablerow product in collection.products cols: 3 %}
    {{ product.title }}
  {% endtablerow %}
</table>
```

Parameters: `cols: N` (columns), `limit:`, `offset:`, `range`. Rarely used — modern themes prefer CSS grid via `{% for %}`.

### `paginate`

Splits an array across multiple pages. Required when iterating arrays with > 50 items.

```liquid
{% paginate collection.products by 24, window_size: 2 %}
  {% for product in collection.products %}
    {% render 'product-card', product: product %}
  {% endfor %}

  {% if paginate.pages > 1 %}
    {% render 'pagination', paginate: paginate %}
  {% endif %}
{% endpaginate %}
```

Parameters:
- `by N` — items per page (max 50 for `collection.products` / `search.results`; max 1000 for other arrays in some contexts)
- `window_size: N` — number of page links to show (default 2)

`paginate` object exposed inside the block:
- `paginate.current_page`, `paginate.pages` (total)
- `paginate.items` (total items across all pages)
- `paginate.previous` (`{ url, title }` or `nil` on page 1)
- `paginate.next` (`{ url, title }` or `nil` on last page)
- `paginate.parts` — array of `{ is_link, title, url }` for rendering pagination UI

**Gotcha:** `paginate` must be at the section's top level — it can't be nested inside `{% for %}` or `{% if %}`. See `references/gotchas.md`.

### `cycle`

Rotates through a list of values on successive calls.

```liquid
{% for product in collection.products %}
  <div class="card card--{% cycle 'a', 'b', 'c' %}">…</div>
{% endfor %}
{# emits: card--a, card--b, card--c, card--a, … #}
```

Use named groups when you want independent counters: `{% cycle 'group-1': 'a', 'b' %}`.

---

## Variable

### `assign`

```liquid
{% assign overline = section.settings.overline %}
{% assign heading_class = 'xo-hero__title' %}
{% assign size = block.settings.size | default: 16 %}
```

Combine with filters via `|`. Most assignments in the project happen inside a `{% liquid %}` block (see below).

### `capture`

Captures rendered output into a string variable. Used for multi-line composition or wrapper patterns.

```liquid
{%- capture content -%}
  <h2>{{ heading }}</h2>
  <p>{{ subheading }}</p>
{%- endcapture -%}

{% render 'section', content: content %}
```

The whitespace-control `{%-` / `-%}` trims leading/trailing whitespace inside the capture — important to keep output clean.

### `increment` / `decrement`

Maintain a counter across the template (independent from `assign`):

```liquid
{% increment counter %} → outputs 0, then increments
{% increment counter %} → outputs 1
{% decrement counter %} → outputs 0, then decrements
```

Rare in modern theme code.

### `liquid` (block)

Wrap multiple Liquid statements without `{% %}` delimiters on each. **Each statement on its own line.** Use `echo` to output (since `{{ }}` isn't available).

```liquid
{% liquid
  assign overline = section.settings.overline
  assign heading  = section.settings.heading
  assign show_cta = section.settings.show_cta | default: true, allow_false: true
  assign style    = 'color: ' | append: section.settings.accent

  case section.settings.layout
    when 'compact'
      assign max_width = '40rem'
    when 'wide'
      assign max_width = '80rem'
    else
      assign max_width = '60rem'
  endcase
%}
```

**Project convention:** all top-of-file variable setup goes in a `{% liquid %}` block. Cleaner than long chains of `{% assign … %}` tags. Use `echo` to emit:

```liquid
{% liquid
  assign greeting = 'Hello, ' | append: customer.first_name
  echo greeting
%}
```

### `echo`

Outputs an expression. Only useful inside a `{% liquid %}` block (outside, use `{{ }}`).

```liquid
{% liquid
  echo 'Hello'
  echo ', '
  echo customer.first_name
%}
```

---

## Theme

### `render`

Renders a snippet (`src/snippets/<name>/<name>.liquid` → compiled `snippets/<name>.liquid`).

```liquid
{% render 'button', text: 'Shop now', link: '/products/all', variant: 'primary' %}
{% render 'product-card', product: product %}
{% render 'icon', name: 'arrow-right', size: '1.6rem' %}
```

**Render is isolated.** The snippet sees ONLY:
- Parameters passed via `, key: value`
- Global objects (`section`, `block`, `settings`, `cart`, `request`, `routes`, `shop`, etc.)
- It does NOT see local variables from the caller.

Iterate over an array, rendering once per item:

```liquid
{% render 'product-card' for collection.products as product %}
```

This is equivalent to `{% for product in collection.products %}{% render 'product-card', product: product %}{% endfor %}` but more concise.

Aliased iteration:

```liquid
{% render 'card' with product as item %}
{# inside snippet: {{ item }} refers to the product #}
```

> [!NOTE]
> `{% include 'snippet' %}` is **deprecated** — it shared scope with the caller, which made snippets brittle. Use `{% render %}` always.

### `section`

Renders a section by name. Used inside layout files or section groups.

```liquid
{# in src/layout/theme.liquid #}
{% sections 'header-group' %}
{{ content_for_layout }}
{% sections 'footer-group' %}
```

Single section:

```liquid
{% section 'announcement-bar' %}
```

This compiles the section's `schema.js` settings into the section instance and renders the section liquid with those settings injected.

### `sections`

Renders a section group (`src/groups/<group>/`). The group can contain multiple sections that the merchant can reorder.

```liquid
{% sections 'header-group' %}
{% sections 'footer-group' %}
```

### `content_for`

Renders dynamic content slots. Two key uses:

```liquid
{# inside theme.liquid <head> — Shopify-injected scripts/styles #}
{{ content_for_header }}

{# main template body — the page-specific sections #}
{{ content_for_layout }}

{# inside a section that accepts blocks — render the blocks slot #}
{% content_for 'blocks' %}
```

**Don't modify or parse `content_for_header`** (Theme Store rule). Just emit it once in `<head>`.

### `form`

Generates a `<form>` with the correct `action`, `method`, hidden inputs, and CSRF token for Shopify's stores.

```liquid
{% form 'customer', class: 'xo-subscribe__form' %}
  <input type="hidden" name="contact[tags]" value="newsletter">
  <input type="email" name="contact[email]" required>
  <button type="submit">Subscribe</button>

  {% if form.errors %}
    <p>{{ form.errors.messages.email }}</p>
  {% endif %}
  {% if form.posted_successfully? %}
    <p>{{ 'newsletter.success' | t }}</p>
  {% endif %}
{% endform %}
```

Common form types:
- `'customer'` — newsletter signup, customer creation, login, recover, activate, addresses
- `'product'` — add-to-cart for a specific product (pass the product: `{% form 'product', product %}`)
- `'cart'` — cart update, additional checkout buttons
- `'contact'` — page.contact template
- `'create_customer'`, `'recover_customer_password'`, `'reset_customer_password'`, `'activate_customer_password'`
- `'guest_login'`, `'login'`
- `'storefront_password'` — password page

Inside the form, the `form` object exposes `errors` (array), `posted_successfully?` (boolean), and form-specific properties.

### `layout`

Selects which layout file wraps the template, or disables the layout entirely.

```liquid
{% layout 'minimal' %}     {# uses src/layout/minimal.liquid #}
{% layout none %}          {# no layout wrapper #}
```

Most templates don't need this — they inherit `theme.liquid` by default.

### `schema`

Embeds JSON section schema. **In this project, you DON'T write `{% schema %}` directly** — it's generated from the sibling `schema.js` at build time. See the `schema` skill.

```liquid
{# What the compiler emits — DO NOT hand-write this in src/ #}
{% schema %}
{
  "name": "Hero",
  "settings": [...],
  "presets": [...]
}
{% endschema %}
```

### `stylesheet` / `javascript`

Inline section-scoped CSS / JS, scoped to the section's instance.

```liquid
{% stylesheet %}
  .my-section { color: var(--color-primary); }
{% endstylesheet %}

{% javascript %}
  console.log('Section loaded');
{% endjavascript %}
```

**Project convention:** styles live in sibling `<name>.global.scss` (auto-imported by scss-glob plugin). Don't inline `{% stylesheet %}` unless you need section-instance-scoped styling.

---

## Output / misc

### `comment`

```liquid
{% comment %}
  This is a Liquid comment. Stripped at compile time.
{% endcomment %}
```

**Used at the top of every snippet for the `@param` doc block** — see the `liquid-doc` skill.

### `raw`

Outputs Liquid syntax literally (for displaying code in docs / readme):

```liquid
{% raw %}
  {{ product.title }}  ← rendered as text, not evaluated
{% endraw %}
```

### `doc`

Native Shopify doc-comment tag for snippets:

```liquid
{% doc %}
  Renders a product card.
  @param {object} product - the product
  @param {boolean} [show_vendor=true] - show the vendor line
{% enddoc %}
```

> [!IMPORTANT]
> **This project uses `{% comment %}` (not `{% doc %}`)** for snippet doc headers. The build pipeline translates if needed. Match existing snippets — see `liquid-doc` skill.

---

## Whitespace control

Add `-` immediately after `{%` or before `%}` (and `{{` / `}}`) to trim whitespace around the tag:

```liquid
{%- if condition -%}
  inline output, no surrounding whitespace
{%- endif -%}
```

| Form | Effect |
| --- | --- |
| `{% tag %}` | preserves whitespace around tag |
| `{%- tag %}` | trims whitespace BEFORE tag |
| `{% tag -%}` | trims whitespace AFTER tag |
| `{%- tag -%}` | trims whitespace on both sides |

Same applies to `{{ }}` / `{{- -}}`. Use liberally for clean HTML output, especially inside `for` loops and `capture` blocks.

**Why it matters:** Theme Store requires Lighthouse performance ≥ 60 on home/product/collection (desktop + mobile) — see `design-to-liquid/references/theme-store-requirements.md` § Performance. Cleaner emitted HTML = smaller transferred bytes (even after gzip) and less parser work in the browser.

> **Gotcha — hyphens don't propagate across blocks.** Each tag controls only its OWN boundary. Trim every `{%` and `%}` you want clean:
>
> ```liquid
> {%- if cond -%}A{% else %}B{%- endif -%}      ← B still has stray whitespace around it
> {%- if cond -%}A{%- else -%}B{%- endif -%}    ← clean
> ```
>
> Hyphens also work on `{% liquid %}` block delimiters: `{%- liquid … -%}` trims blank lines around the prelude.

## Related

- `references/filters.md` — filter syntax (used in `assign`, `if`, output)
- `references/objects.md` — what's available inside global scope
- `references/idioms.md` — project-specific patterns (capture+render wrapper, prelude block)
- `references/gotchas.md` — for-loop ceiling, paginate nesting rules
- `snippet` skill — how to write snippet bodies
- `schema` skill — how `schema.js` works (vs hand-written `{% schema %}`)
