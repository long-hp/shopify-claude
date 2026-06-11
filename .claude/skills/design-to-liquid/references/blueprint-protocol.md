# Design Documentation Protocol

How to read the design folder's documentation before porting.

## What to Look For

The design folder often ships markdown documentation that constrains how the port should look and behave. Common file shapes:

| Likely filename                              | What it describes                                       |
| -------------------------------------------- | ------------------------------------------------------- |
| `brand.md` / `brand-*.md`                    | Brand identity — palette, type, voice                   |
| `design-system.md`                           | Tokens, components, spacing rhythm, layout rules        |
| `blueprint*.md`, `blueprint-<page>.md`       | Per-page architecture: section order, density, primitives |
| `component-inventory*.md`                    | Catalog of reusable components and their slots          |
| `style-guide.md`, `tokens.md`, etc.          | Variant-specific specs                                  |

**Open whatever exists before touching any HTML file.** The HTML is the *result*; the markdown is the *intent*.

## Reading Order

1. **Brand / design-system first** — establishes color tokens, typography, spacing, radius, shadow. The extracted tokens feed the **Step 0 token mapping** (see `./tokens-mapping.md`). Do this once per design before touching any page.
2. **Component inventory next** — tells you which design components map to which existing snippets in `src/snippets/`.
3. **Per-page blueprint last** — gives the section order, density, and color scheme per section for the page you're porting.

If only HTML is present (no docs), reverse-engineer from the page HTML itself.

## What to Extract from a Blueprint

A well-formed blueprint typically contains:

### Primitives inventory

A table listing project primitives (under `<design>/components/`) and framework primitives (xo-*) used by the page.

**Action:** for each project primitive, verify a matching snippet exists in `src/snippets/`. For each framework primitive, query the `xo-components` MCP server to confirm its API.

### Section map

Per-section breakdown: journey stage, density, color scheme, primitives reused.

**Action:**
- Each row becomes one entry in the page's JSON template.
- "Color scheme" → the section's `color_scheme` setting value (e.g. `background-1`, `background-2`).
- "Density" informs spacing settings (sparser = larger section padding).
- "Reuses primitive" tells you which snippets to render inside the section.

### Wireframes

ASCII or visual block diagrams showing intent.

**Action:** use as the visual contract while writing the section liquid markup. Every labeled box becomes either an element of the section or a rendered child snippet.

### Build order

Ordered list of sections to build, often with checkpoints.

**Action:** follow the order. If running a dev server, verify rendering at each checkpoint before continuing.

### Component plan

Two tables — components that already exist (reuse) and components proposed for future extraction.

**Action:**
- "Existing" → map 1:1 to `src/snippets/`. No new snippets.
- "New (extract candidate)" → first decide: inline the markup in the section (default — simpler) or pre-emptively extract a snippet (only if it's used in ≥ 3 places already).

### Adaptation rules

When the design was derived from a reference, this lists the find/replace pairs (reference text → final copy).

**Action:** historical context — the copy in the design HTML already reflects these rules. Just lift the final copy into settings.

## When the Blueprint Disagrees with the HTML

The HTML is the source of truth at port time. If the blueprint says "5 sections" but the HTML has 7, port the 7 that exist.

## When No Blueprint Exists

Reverse-engineer from the page HTML:

1. **Enumerate sections** — every `<xo-include>` in the page body is one section.
2. **Infer color scheme** — look at the section's classes (e.g. `color-background-2`) and the body class.
3. **Infer density** — section padding declared via `--section-pt`/`--section-pb` (or measured visually).
4. **Identify components** — every `<xo-component src="…">` references a folder under `<design>/components/<name>/`.

Cross-reference the design's `design-system.md` (if any) for token mappings, then proceed.

## Pitfalls

| Pitfall                                                  | Fix                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Skipping the brand / design-system doc                   | Read it first — it defines tokens you must match.                  |
| Following the blueprint over the HTML when they diverge  | Trust the HTML; the blueprint can be stale.                        |
| Listing every blueprint "extract candidate" as a snippet to create | Most should be inlined; extract only when reuse ≥ 3.       |
| Treating editorial names as required snippet names       | Section / snippet names in `src/` follow project conventions, not the design's editorial labels. |

## Related

- `./tokens-mapping.md` — translate the brand / design-system tokens into theme settings (Step 0)
- `./pages-to-templates.md` — building the JSON template from the blueprint's section map
- `./sections-to-liquid.md` — turning a section wireframe into liquid
- `./components-to-snippets.md` — the rare new-snippet case
