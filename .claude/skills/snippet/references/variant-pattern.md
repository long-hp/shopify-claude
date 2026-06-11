# Variant Pattern

When the same logical component needs several visual implementations (button shapes, product-card layouts, hero compositions), the project uses a **dispatcher + numbered variants** pattern.

## When to use

- A component has ≥ 2 visual styles that a merchant or developer should pick between.
- The styles share enough behavior to warrant a common shared core (typography handling, accessibility attrs, animation hooks).
- The variant should be addressable from a theme setting (`buttons_type: 'bdr_rad_2'`) or a per-instance schema setting.

For a single-style component, use the **pure** or **schema** shape instead. Variants add file count and require dispatcher updates — don't reach for them prematurely.

## File layout

```
src/snippets/<name>/
├── <name>/                     # the dispatcher
│   ├── <name>.liquid           # routes based on a `<name>_type` param
│   └── schema.js               # (optional) settings + select for variant choice
├── <name>-base/                # shared core — accessibility, attrs, layout shell
│   ├── <name>-base.liquid
│   └── <name>-base.global.scss
├── <name>-1/                   # visual variant 1
│   ├── <name>-1.liquid
│   └── <name>-1.global.scss
├── <name>-2/
│   ├── <name>-2.liquid
│   └── <name>-2.global.scss
└── utils/                      # (optional) variant-shared helpers (attr renderers, animations)
```

Real example: `src/snippets/button/` → `button/`, `button-base/`, `button-1/` … `button-7/`, `button-icon-1/`, `utils/`.

## Three layers

### Layer 1 — Dispatcher (`<name>/<name>.liquid`)

The entry point every caller renders. It picks a variant based on a `<name>_type` parameter and delegates:

```liquid
{% comment %}
  <Name>

  @param {string} [<name>_type] - Variant key (default falls back to the global setting if absent)
  @param {string} text - Body text (required)
  ...

  @example
  {% render '<name>', text: 'Hello' %}
{% endcomment %}

{%- liquid
  assign <name>_type = <name>_type | default: block.settings.<name>_type
  if <name>_type == blank
    assign <name>_type = '<name>_default_key'
  endif
-%}

{%- case <name>_type -%}
  {%- when '<name>_key_1' -%}
    {%- render '<name>-1',
        text: text,
        ...
    -%}
  {%- when '<name>_key_2' -%}
    {%- render '<name>-2',
        text: text,
        ...
    -%}
{%- endcase -%}
```

The dispatcher passes EVERY caller-supplied parameter through to the chosen variant. Variants only differ in markup / SCSS — never in their parameter contract.

### Layer 2 — Shared core (`<name>-base/<name>-base.liquid`)

Every variant calls into `<name>-base` to render the outer element + universal attrs (border, padding, animations, accessibility). It receives a `content` capture from the variant.

```liquid
{%- capture content -%}
  <!-- variant-specific markup -->
{%- endcapture -%}

{%- render '<name>-base',
  button_text: text,
  size: size,
  class: container_class,
  content: content,
  link: link,
  type: type,
  ...
-%}
```

The base owns:
- The choice between `<a>` and `<button>` (when applicable)
- Settings-driven attrs (`border-attrs`, `padding-attrs`, `shadow-attrs`) → so they apply to ALL variants
- Wrapping in animation / interaction containers (`<xo-animate>`, etc.)
- ARIA labels and accessibility

The base reads from `block.settings.X` (and falls back to `settings.X` theme-level) via the `*-attrs` renderers — variants don't read settings themselves.

### Layer 3 — Variant (`<name>-N/<name>-N.liquid`)

A single visual implementation. Owns:
- Variant-specific class string (e.g. `xo-button--2 bdrs:s10|w`)
- Variant-specific markup (animations, layered overlays)
- The mapping from `variant` param (primary / secondary / etc.) to color classes

Hands the assembled content to `<name>-base` for final wrapping.

## Reading vs hardcoding inside variants

> [!IMPORTANT]
> **The most common bug in variant snippets is hardcoding a class that should be settings-driven.** When a variant's `.liquid` writes `bdrs:s10|w` directly in the container class, the theme-level `settings.border_radius` cascade can't override it. The `design-to-liquid` skill's "Audit Snippet Variants" reference (escalation step B) is about catching exactly this.
>
> Guidance:
> - **Hardcode** only properties that are essential to the variant's identity (e.g. an outline button variant hardcoding `bg:transparent`).
> - **Settings-driven** for properties a merchant might reasonably tweak (radius, padding, shadow). Let `border-attrs` etc. resolve them from `block.settings.X` or `settings.X`.

## Dispatcher registration

When you add a new variant `<name>-8/`, register it in two places:

1. **The dispatcher's `{% case %}`** — add a new `{% when '<name>_key_8' %}` clause.
2. **The global schema** — add an option to the select in `src/config/global-schema/<name>s.js`:

   ```javascript
   {
     type: "select",
     id: "<name>s_type",
     options: [
       { value: "<name>_key_1", label: "…" },
       { value: "<name>_key_2", label: "…" },
       // …
       { value: "<name>_key_8", label: "<descriptive label>" },
     ],
   }
   ```

Both updates must ship together — partial registrations leave merchants able to pick a variant the dispatcher can't render (or render a variant they can't pick).

## Workflow — adding a new variant

> [!CAUTION]
> **Adding a new variant is a step C escalation.** From `design-to-liquid` skill's audit ladder, this is the highest-disruption choice. Before doing this:
>
> 1. Confirm the variant audit (step A: theme settings cascade) and (step B: modify an existing variant) genuinely don't work.
> 2. Ask the user. Adding a variant changes the Theme-Settings UI option list, which affects every preset.
>
> Only proceed if the user approves.

After approval:

1. Copy the closest existing variant folder as a starting point: `cp -r src/snippets/<name>/<name>-2 src/snippets/<name>/<name>-8`
2. Rename internal references: `<name>-2` → `<name>-8` inside `.liquid` and `.global.scss`.
3. Adjust the markup / class strings for the new visual.
4. Register in the dispatcher + global schema (above).
5. If the new variant is the active preset's default, set `<name>s_type: '<name>_key_8'` in `src/config/presets/preset-N.js`.

## Anti-patterns

- **Variants reading `block.settings.X` directly** — defeats the base's settings-driven attrs. Let the base own the attr resolution; variants only emit variant-specific classes.
- **Adding a variant just to change a single value** — usually that single value is overridable via the existing base attrs. Audit before authoring.
- **Forgetting one of the dispatcher / global-schema registrations** — half-registered variants ship broken.
- **`-base/` containing variant-specific styles** — base must stay variant-agnostic. If you find yourself adding `.xo-button--2 specific` rules to `button-base.global.scss`, move them to the variant.
- **Diverging parameter names between variants** — every variant takes the SAME set of params from the dispatcher. If a variant needs a new param, the dispatcher must forward it, AND every other variant must accept (and probably ignore) it.

## Related

- `./pure-snippet.md` / `./schema-snippet.md` — simpler shapes for single-style components
- `./patterns.md` — class building when variants assemble complex class strings
- `design-to-liquid` skill, `sections-to-liquid.md` → "Audit Snippet Variants BEFORE Rendering" — the decision protocol that justifies a new variant
- `schema` skill — when the dispatcher's variant selector lives in `global-schema/<name>s.js`
