---
name: extract-icon
argument-hint: "[--alias lucide=name ...]"
description: Use when the user wants to refresh / sync / extract Lucide SVG content into the project's icon snippets at `src/snippets/icons/`. Trigger phrases include "update icons from lucide", "sync icons", "refresh icon snippets", "extract design lucide icons", "lucide → snippet", or any mention that `data-lucide="..."` references in `design/` HTML/MD have drifted from `src/snippets/icons/icon-*.liquid`. The skill scans `design/` for `data-lucide` values, fetches the current SVG from Lucide's CDN (`unpkg.com/lucide-static@latest`), transforms the outer attributes to the project's template format (`{{ size }}` / `{{ color }}` / `{{ class }}`), and rewrites the matching snippet's `<svg>…</svg>` block in-place. The `icon.liquid` dispatcher is NEVER touched — when a lucide name diverges from the project's snippet name (e.g., lucide `x` ↔ project `close`), the agent invoking the script proposes aliases via `--alias lucide=suffix` CLI flags based on semantic equivalence, no static config file. Use this skill instead of hand-editing SVG content in any `icon-*.liquid`.
---

# Lucide icon extractor

Refresh the `<svg>` inside `src/snippets/icons/icon-*.liquid` from Lucide's source-of-truth SVG, scoped to icons the design actually uses.

## What it does

1. Scans `design/` for `data-lucide="X"` references in both `.html` and `.md` (blueprints) → set of lucide names the design needs.
2. For each name, resolves the matching project snippet via:
   - `--alias lucide=suffix` CLI overrides (agent-proposed, see workflow below), OR
   - direct match: lucide `X` → `src/snippets/icons/icon-X.liquid`.
3. Fetches the SVG from `https://unpkg.com/lucide-static@latest/icons/<name>.svg`.
4. Transforms outer attributes to match the project template (`width='{{ size }}'`, `stroke='{{ color }}'`, `class="{{ class }}"`, drops `height`).
5. Rewrites the first `<svg>…</svg>` block in the snippet file, leaving doc-blocks / liquid-prelude / surrounding markup untouched.

## What it does NOT do

- **Does not modify `icon.liquid` dispatcher.** That file is hand-maintained — if a new lucide name doesn't have a project snippet, the skill skips and reports.
- **Does not create new snippet files.** A lucide name with no project snippet is reported as `skipped — no project snippet`. Resolution: pass an `--alias` to map it to an existing snippet, or hand-create the snippet first and re-run.
- **Does not touch icons design doesn't use.** Snippets for icons not referenced in `design/` (`data-lucide=`) are left alone.
- **Does not depend on any config file in `src/snippets/icons/`.** That folder stays pure `.liquid` snippets — aliases are CLI args, not a checked-in map.

## Agent-driven workflow

The triggering agent (Claude) follows these steps when running the skill:

1. **Dry-run scan** to inventory what design uses and what's missing:
   ```bash
   python .claude/skills/extract-icon/scripts/extract-lucide-icons.py --dry-run
   ```
2. **Read the report.** The `Skipped — no project snippet` section lists lucide names that have no `icon-<name>.liquid`. For each:
   - **Semantic equivalence check** — use general knowledge of icon meaning. Lucide names follow the canonical set documented at lucide.dev. Match against the existing `icon-*.liquid` files in `src/snippets/icons/`. Common equivalences:
     - lucide `x` ↔ project `close` (× cross-shape)
     - lucide `menu` ↔ project `hamburger` (three-bar)
     - lucide `shopping-bag` ↔ project `cart-bag`
     - lucide `trash-2` ↔ project `trash`
     - lucide `volume-x` ↔ project `unmute`
   - **No equivalent** → the design needs a genuinely new icon. Either create a stub `icon-<name>.liquid` (just `<svg></svg>` as placeholder — the script fills it) or skip if it's a typo.
3. **Propose the alias list to the user** before running. Surface the proposed mappings and ask for confirmation (skip this step if the mapping is obvious / user already approved).
4. **Run with `--alias` flags**:
   ```bash
   python .claude/skills/extract-icon/scripts/extract-lucide-icons.py \
     --alias x=close \
     --alias menu=hamburger \
     --alias shopping-bag=cart-bag \
     --alias trash-2=trash
   ```
5. **`git diff src/snippets/icons/`** — review changes. Lucide may have evolved geometry vs the version the project last captured.

> [!IMPORTANT]
> Aliases are intentionally **NOT persisted anywhere** — no JSON map in `src/snippets/icons/`, no pinned npm script in `package.json`, no shell wrapper. The skill (agent) is the sole orchestrator: every invocation re-scans the design, re-inspects existing snippets, re-infers aliases via semantic equivalence, and passes them as `--alias` CLI flags for that run only. The script itself stays a stateless dumb tool. This is deliberate: any persisted alias file will drift out of sync with reality the moment design or snippet inventory changes — better to derive fresh each time.

## Script flags reference

The agent orchestrates the script. These are the only flags it should ever use:

| Flag | Purpose |
|------|---------|
| `--dry-run` | Inventory pass, no writes. Always use first to surface plan + skipped names. |
| `--alias LUCIDE=SUFFIX` (repeatable) | Map lucide name to project snippet suffix for THIS run. Inferred by the agent from the dry-run report + existing snippet inventory. |
| `--name LUCIDE` (repeatable) | Debug: process only this lucide name, skip the design scan. Use when investigating a single icon mismatch. |
| `--design-dir PATH` | Override design root. Default `design/`. Rarely needed. |

There is no `--alias-file`, no env-var override, no config import — every alias is an explicit CLI arg the agent produced this session.

## Transform rules (what changes inside a refreshed snippet)

Source (lucide CDN):

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down">
  <path d="m6 9 6 6 6-6"/>
</svg>
```

Output (project snippet):

```xml
<svg xmlns="http://www.w3.org/2000/svg" width='{{ size }}' viewBox="0 0 24 24" fill="none" stroke='{{ color }}' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{{ class }}">
  <path d="m6 9 6 6 6-6"/>
</svg>
```

Specifically:

| Lucide attr | Project transform | Why |
|-------------|------------------|-----|
| `width="24"` | `width='{{ size }}'` | Template binding — caller passes size |
| `height="24"` | removed | Project convention: width-only, browser computes height from viewBox |
| `stroke="currentColor"` | `stroke='{{ color }}'` | Template binding for color |
| `fill="currentColor"` (rare) | `fill='{{ color }}'` | Same |
| `fill="none"` | unchanged | Lucide outline style, not a color |
| `class="lucide lucide-X"` | `class="{{ class }}"` | Caller adds layout/util classes |
| `viewBox`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `xmlns` | unchanged | Geometry / framework attrs |
| Inner elements (`<path>`, `<circle>`, `<line>`, `<polyline>`, `<rect>`) | unchanged | The actual icon geometry |

## Idempotence

Safe to re-run. If a snippet was already refreshed with the same lucide content, the file write is a no-op (same bytes). If lucide upstream geometry changed between runs, the diff will show in `git diff`. Always commit between runs.

## Edge cases the script handles

- **Lucide CDN returns 404** for a name → reported as `not in Lucide` and skipped. No file written.
- **Snippet file lacks any `<svg>` block** (rare, malformed) → reported as `no <svg> block found` and skipped.
- **`design/` not found** → script aborts with a clear message (run from project root).
- **Malformed `--alias` argument** (missing `=`, empty side) → script warns and ignores that entry, continues with others.
- **Placeholder names** in design (e.g., `data-lucide="${icon}"` template strings) → filtered by regex and excluded from the scan.

## What to do after running

1. `git diff src/snippets/icons/` — review every change. Look for:
   - Icons whose visual changed unexpectedly (lucide may have re-drawn the path) → decide if the new version is acceptable.
   - Snippets that lost custom modifications (e.g., a project-specific viewBox crop) — restore by hand, or drop that lucide name from the alias args next run.
2. `npm run dev` and visually verify a page using the icon (Theme Editor preview).
3. `/git snippets/icons` to checkpoint.

## Why this skill (vs hand-editing)

- Lucide ships ~1500 icons; design picks ~50. Each release of lucide tweaks paths. Hand-syncing 50 icons once per design refresh = tedious and error-prone.
- Centralizing the transform rules in one place (`scripts/extract-lucide-icons.py`) means every snippet refreshed gets the SAME template binding — consistent across the icon set.
- The alias map makes naming divergence explicit and version-controlled, not buried in per-snippet hand-edits.
