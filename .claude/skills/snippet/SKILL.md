---
name: snippet
description: "MUST be invoked (via Skill tool) BEFORE creating any new .liquid body in src/snippets/ AND BEFORE modifying an existing snippet's behavior. Memory of the 8 rules is unreliable — agent skip = silent bugs (see PROGRESS session 5b: `show_count` boolean missed rule #3 `allow_false: true`). Covers the three snippet shapes — pure-param, context+schema, dispatched variant — and patterns inside the file: the {% liquid %} prelude (allow_false for booleans, default chains, blank checks), conditional wrappers, complex class composition with {% case %} / {% if %}, nested {% render %} calls, no-_base/-prefix rule. Defers to liquid-doc for the {% comment %} @param header, schema for the sibling schema.js, scss for the sibling <name>.global.scss, xo-css for inline atomic class composition, design-to-liquid for the audit-ladder decision on whether to create or modify a snippet at all. Re-read design-to-liquid's \"Audit Snippet Variants BEFORE Rendering\" first if the goal is to render an existing snippet from a section — most of the time you don't need to create one."
---

# Snippet

Patterns for the `.liquid` body of a snippet file. Keep snippets focused, parameterized, and verifiable.

## Three shapes used in this project

| Shape                                                           | When                                                                  | Files                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Pure** — direct params from the render call                   | Self-contained, no per-call settings UI                               | `<name>.liquid` only                                               |
| **Schema (context-pattern)** — reads `context.settings.X`       | Settings exposed to merchants via parent section/block                | `<name>.liquid` + `schema.js` (+ optional `<name>.global.scss`)    |
| **Variant** — child of a dispatched parent                      | Multiple visual styles for the same logical component                 | `<name>/<name>.liquid` (dispatcher) + `<name>-base/`, `<name>-1/`, `<name>-2/`, … |

→ See `references/pure-snippet.md`, `references/schema-snippet.md`, `references/variant-pattern.md`.

## File layout

Every snippet lives in a folder named after itself, even if there's only one file:

```
src/snippets/<name>/
├── <name>/                     # the primary snippet
│   ├── <name>.liquid           # markup
│   ├── schema.js               # optional — schema-pattern only
│   └── <name>.global.scss      # optional — auto-imported by scss-glob plugin
├── <name>-base/                # optional — shared logic for variants
│   ├── <name>-base.liquid
│   └── <name>-base.global.scss
├── <name>-1/                   # optional — style variant 1
├── <name>-2/                   # optional — style variant 2
└── utils/                      # optional — internal helpers (e.g. attr renderers)
```

The folder-per-snippet structure is project convention. Don't flatten.

## Universal rules

These apply to every snippet shape.

### 1. Always document with a `{% comment %}` block at the top

The first thing in every `.liquid` file is a doc comment listing every parameter with type, requirement, and a usage example. → See `liquid-doc` skill for the exact format.

### 2. Use `{% liquid %}` for the prelude

Wrap variable assigns / defaults / conditional class building in a single `{% liquid %}` block at the top of the body. Cleaner than scattering `{% assign %}` tags.

### 3. `allow_false: true` for every boolean default

```liquid
{% liquid
  # ✓ false stays false
  assign show_icon = show_icon | default: false, allow_false: true
%}
```

Without `allow_false`, `| default: false` flips an explicit `false` back to the default. The most common silent bug in Liquid.

### 4. `!= blank` for "has value" checks (not booleans)

```liquid
{% if title != blank %}<h2>{{ title }}</h2>{% endif %}    {# strings / objects #}
{% if show_icon %}<svg>…</svg>{% endif %}                 {# booleans — direct #}
```

### 5. Render snippets by bare name — no folder prefix

```liquid
{% render 'image', image: x %}            ✓
{% render '_base/image', image: x %}      ✗
{% render 'icons/icon-arrow' %}           ✗
```

Shopify resolves snippets globally by filename across `src/snippets/**`. The folder is organizational, not a namespace.

### 6. Prefix root element classes with `xo-<snippet-name>`

```liquid
<div class="xo-my-snippet d:flex">
  <span class="xo-my-snippet__title">…</span>
</div>
```

BEM (`xo-block__element--modifier`) — see the `scss` skill.

### 7. Don't render empty wrappers

```liquid
{# ✗ — outputs <div></div> when nothing inside #}
<div class="xo-card">
  {% if title %}<h3>{{ title }}</h3>{% endif %}
  {% if image %}<img …>{% endif %}
</div>

{# ✓ — wrap the whole block in the same condition #}
{% if title != blank or image != blank %}
  <div class="xo-card">
    {% if title != blank %}<h3>{{ title }}</h3>{% endif %}
    {% if image != blank %}<img …>{% endif %}
  </div>
{% endif %}
```

### 8. Cap snippets at ~200 lines

If you're crossing 200, split logic into smaller render-able sub-snippets or move logic into a `-base/` helper.

## Before you start — read project state

> [!IMPORTANT]
> Snippet authoring is execution. The `planner` skill owns project state. Before creating or modifying a snippet, confirm `.agent-state/PROGRESS.md` (top entries) and `.agent-state/PLAN.md` (the row for the section that drove this snippet need) — make sure the work isn't blocked, and that creating/modifying this snippet was approved by the audit ladder. Skip if `planner` already activated this session.

## Workflow — creating a new snippet

> [!IMPORTANT]
> **First, confirm a new snippet is actually needed.** Most "I need to render a CTA" sections don't need a new snippet — they need to render an existing one. Run the variant audit in `design-to-liquid` skill's `sections-to-liquid.md` BEFORE creating anything new. Only proceed below when the audit's escalation step C concludes "new snippet" and the user has approved.

1. **Pick the shape** — pure / schema / variant. → See the table above.
2. **Create the folder structure** for the chosen shape.
3. **Ask CSS strategy** — fire the same Q7 from `design-to-liquid` clarify-protocol: SCSS-first / XO-CSS-first (2 options only — no Hybrid; tier-3 SCSS sidecar is built into the XO-CSS-first path). Phrase with observation from design's component SCSS (count lines, breakdown of layout-vs-hover-chain). After answer:
   - XO-CSS-first → invoke `Skill(xo-css)` + read `xo-css/references/basics.md` § "Translating from design SCSS". Also invoke `Skill(scss)` (tier-3 sidecar inevitable).
   - SCSS-first → invoke `Skill(scss)`
   - Tier-3 styles (hover chains / keyframes / pseudo-elements / multi-target selectors / dynamic CSS-var styles) ALWAYS land in SCSS regardless of strategy
4. **Write the `{% comment %}` doc block first** — defining the contract before the body forces clarity. Use the `liquid-doc` skill's template.
5. **Write the `{% liquid %}` prelude** with parameter defaults (`allow_false: true` on booleans), class assembly, and any pre-render computations.
6. **Write the markup** — keep it semantic, use `<xo-container>` only at section level (not inside snippets), wrap conditional content in `{% if … != blank %}`. Copy any `xo-hover` / `xo-abs` / `xo-effect` attributes from design markup verbatim.
7. **(schema shape only)** write `schema.js` — see `schema` skill.
8. **(if styles needed)** create `<name>.global.scss` for tier-3 styles + framework helpers — see `scss` skill. Skip if XO-CSS-first strategy covered everything atomically.
9. **Verify** by rendering from a test section. If the snippet is schema-pattern, also re-validate the parent section's schema with the validator.

## Patterns reference

- `references/patterns.md` — building complex classes, conditional wrapper, nested render, no-`_base/`-prefix rule.

## When you finish

Adding or modifying a snippet usually happens as part of a larger section port. Before reporting "done":

1. **Record in `.agent-state/PLAN.md`** — under "Snippets touched / created", add a row with the snippet name, action (`created` / `modified`), and a one-line why. Helps future sessions understand which snippets carry custom work.
2. **Append to `.agent-state/PROGRESS.md`** — the same session entry that records the section work should list the snippet change in "Files touched" or "Decisions".
3. **Don't commit** — `/git` is invoked separately by the user.

## Hand-offs

| Concern                                  | Skill                                  |
| ---------------------------------------- | -------------------------------------- |
| Project state (PLAN/PROGRESS/INVENTORY)  | `planner`                              |
| The `@param` doc-comment block format    | `liquid-doc`                           |
| The sibling `schema.js` file             | `schema`                               |
| The sibling `<name>.global.scss` file    | `scss`                                 |
| Inline atomic classes in the markup      | `xo-css`                               |
| Whether to create a new snippet at all   | `design-to-liquid` (audit ladder)      |
| Committing the change                    | `git` (`/git` workflow)                |
