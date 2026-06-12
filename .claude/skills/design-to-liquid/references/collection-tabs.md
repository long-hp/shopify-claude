# Collection Tabs — Detect & Port Pattern

A design section that shows a **row of tabs above a product-card grid**, where each tab swaps which collection's products appear, ports to the `xo-collection-tabs` web-component trio wired to Shopify's **Section Rendering API**. This is the one web-component case that is **NOT a pass-through**: the design ships *static* tabs (an `xo-tabs` widget or a plain button/pill row) that you must **convert**, because the live behaviour (fetch a collection's products on tab click, no page reload) only exists once the markup is the collection-tabs contract.

## When this applies (the signature)

MATCH when **all** of these hold in the design section:

- a horizontal **row of tab triggers** — text pills or buttons (in the worked example: `Bowls · Food · Toys · Bedding · Wellness`), sitting directly **above**
- a **repeating product-card grid** (the same card archetype rendered N times), and
- the intent is that **clicking a tab changes which collection's products show**.

DISTINGUISH — these look similar but must **NOT** be converted:

| Looks like tabs, but… | What it actually is | Port as |
| --- | --- | --- |
| Tabs switch arbitrary content panels (FAQ, specs, story) unrelated to collections | generic content tabs | keep `xo-tabs` (see `xo-components` MCP) |
| A product grid with **no** tab row | a single collection / product list | plain `collection` picker or product list |
| Tabs/checkboxes that **filter the current collection page** (price, size, availability) | storefront filter / facet UI | Shopify `filters` on the collection template — not this pattern |

> [!IMPORTANT]
> **No "All" tab.** This project's port uses one inline **block per tab**, and every block maps to exactly **one real collection**. If the design shows an `All` pill, it does not become a tab — drop it (or, only if the user asks, the merchant creates a real "everything" collection and adds it as another block). Never synthesise an `All` handle.

## Why it is the pass-through exception

`<xo-carousel>`, `<xo-modal>`, `<xo-animate>` render identically in design HTML and in Liquid — the runtime script picks them up either way, so you copy them verbatim. Collection-tabs is different: the design's static tabs carry **no data wiring**. Leaving them as-is yields a section that compiles but is dead — clicking a tab does nothing, and no collection products ever load. You must replace the static tab markup with the trio below and add the AJAX-aware Liquid prelude.

## The element contract

```html
<xo-collection-tabs xo-section-id="{{ section.id }}">
  <xo-collection-tabs-trigger xo-handle="best-sellers" xo-active>Best sellers</xo-collection-tabs-trigger>
  <xo-collection-tabs-trigger xo-handle="new-arrivals">New arrivals</xo-collection-tabs-trigger>

  <xo-collection-tabs-content>
    <!-- the active collection's product cards render here; this innerHTML is what gets swapped -->
  </xo-collection-tabs-content>
</xo-collection-tabs>
```

| Element | Role | Key attrs |
| --- | --- | --- |
| `xo-collection-tabs` | Root; owns fetch + state | `xo-section-id` (**required**, = `{{ section.id }}`); `xo-loading` (auto-set boolean while fetching — styling hook only, never author it) |
| `xo-collection-tabs-trigger` | One clickable tab | `xo-handle` (**required**, collection handle to fetch); `xo-active` (boolean, on the initially-active trigger); `xo-active-binding` (optional CSS selector(s) whose attrs sync with active state) |
| `xo-collection-tabs-content` | The swapped container | none — its `innerHTML` is replaced with the fetched collection's content |

## Design → Liquid mapping

| Design (static) | Liquid (converted) |
| --- | --- |
| `<xo-tabs>` / `<div class="tabs">` wrapper | `<xo-collection-tabs xo-section-id="{{ section.id }}">` |
| each `<button>` / pill / `<xo-tab-trigger>` | `<xo-collection-tabs-trigger xo-handle="…" {…xo-active}>` — **one per inline block** |
| the product grid below | a single `<xo-collection-tabs-content>` looping the active collection's products |
| hardcoded tab label text | `{{ col.title }}` (or block `tab_label` override — see schema) |
| hardcoded product cards | `{% render '<product-card-snippet>' %}` chosen via the variant audit |

## Schema — blocks-first

Author with `Skill(schema)`, then validate (`python .claude/skills/design-to-liquid/scripts/validate-schema.py <section-dir>`).

- **One inline block per tab** (NOT a `collection_list` setting — blocks are this project's default per AGENT.md, and they let the merchant reorder/add/remove tabs in the editor).
- Each block carries a **`collection`** picker (`{ type: "collection", id: "collection", … }`).
- **Default-active = the first block** (resolved in the prelude). Keep it that simple — don't add a separate "default tab" setting unless the user asks.
- Add a per-block **`tab_label`** *text* setting **only if** the design's tab label differs from the collection title; otherwise render `{{ col.title }}`.
- `category: Category.Section.Products` — **plural** `Products` for sections (verify against `src/constants.js`; `Block.Product` is singular).

## Liquid skeleton

```liquid
{%- liquid
  # default active = first block's collection
  assign current_handle = section.blocks.first.settings.collection.handle
  # Section Rendering API: the AJAX fragment is fetched at /collections/{handle}?section_id=…
  # so on a collection path, take the handle from the URL — this is how the swapped tab gets its products
  if request.path contains '/collections/'
    assign current_handle = request.path | split: '/' | last
  endif
  assign current_collection = collections[current_handle]
-%}

{%- capture content -%}
  <xo-collection-tabs xo-section-id="{{ section.id }}">
    {%- for block in section.blocks -%}
      {%- assign col = block.settings.collection -%}
      <xo-collection-tabs-trigger
        xo-handle="{{ col.handle }}"
        {%- if col.handle == current_handle %} xo-active{% endif %}
        {{ block.shopify_attributes }}>
        {{ block.settings.tab_label | default: col.title }}
      </xo-collection-tabs-trigger>
    {%- endfor -%}

    <xo-collection-tabs-content>
      {%- for product in current_collection.products -%}
        {% render 'product-card', product: product %}
      {%- endfor -%}
    </xo-collection-tabs-content>
  </xo-collection-tabs>
{%- endcapture -%}

{% render 'section', content: content %}
```

> [!IMPORTANT]
> **Pick the product-card snippet via the audit, don't hardcode.** `{% render 'product-card' … %}` above is a placeholder — run the normal **"Audit Snippet Variants BEFORE Rendering"** ladder (`sections-to-liquid.md`): list `src/snippets/product-card*/`, read both the design card and the project snippet, pick the closest variant. The cards **must** be a reusable snippet — see gotcha (c).

## How the runtime works (so you wire it right)

- On tab click the component fetches `/collections/{handle}?section_id={{ section.id }}`, parses the response, and replaces `xo-collection-tabs-content`'s `innerHTML` with the fetched content. Results are **cached per handle** (refetched once, then instant).
- When the section scrolls into view it **prefetches up to 10** inactive tabs (400px rootMargin) — except in the Theme Editor: `Shopify.designMode` **skips the prefetch**, so in the editor tabs still work on click but aren't warmed ahead of time.
- Because the swap is driven by the **same section** re-rendered standalone on `/collections/{handle}`, the section must render correctly **on its own** in a collection context — that's exactly why the prelude reads `current_handle` from `request.path`. The initial page render and the fetched fragment run identical Liquid; keep both the triggers and the content in this one section so they stay consistent.
- `xo-loading` lands on the root while a fetch is in flight — use it for a loading style if the design has one (`xo-collection-tabs[xo-loading] … { … }`). Never set it yourself.

## Gotchas

- **(a) No `All` tab.** Blocks only, one collection each. Drop any `All` pill from the design unless the user explicitly wants a real catch-all collection block.
- **(b) Don't leave the design's tabs in place.** Static `xo-tabs` / button rows have no data wiring — converting to the trio is the whole point. A passed-through tab row is a dead section.
- **(c) Product cards must be a reusable snippet, not inline markup.** The AJAX swap replaces `innerHTML` wholesale; if the cards were inline one-off markup, the fetched fragment can drift from the initial render and lose styling/behaviour. A single shared `{% render %}` guarantees the initial grid and every swapped grid are byte-identical.
- **(d) Keep triggers + content in the same section.** Both the first paint and the fetched fragment come from this one section file — splitting them across sections breaks the standalone `/collections/{handle}` render the API depends on.
