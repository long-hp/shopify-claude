# SF-LAYOUT-01 — Section content never overflows onto the next section

Requirement and how to verify: `../references/feedback-ledger.md` → `SF-LAYOUT-01`.
Check type: heuristic + runtime

## Recipe (any theme)

When content overlaps the next row or section, look for a **fixed grid track** before blaming the JS that swaps content: `grid-auto-rows` / `grid-template-rows` with a plain length, or a merchant setting that sets one (`fixed_row`, `auto_row`, `row_height`). A fixed track makes every row that height whatever the card height. Remove such settings (and their stored values in presets and templates) rather than defaulting them off — the reviewer turns every setting on. If a design needs a minimum row height, use `minmax(<h>, auto)` and make sure something inside the tile is in normal flow, otherwise the row cannot grow. Also check swapped-content containers for a fixed `height` / `max-height` and JS that locks `style.height` during a fetch. Verify by turning every layout setting on and clicking every tab / filter / load-more at desktop and 390px.

## History

Each entry is one theme where this was fixed. On a theme built on the same base the files
are usually the same paths, so start from the newest entry; if the root cause differs, fix it
from the recipe above and add a new entry.

### Folio — R2 (2026-11-17)

- **Root cause:** NOT the tabs logic. The shared `layout-grid` snippet exposed `Fixed row` + `Auto row` (default 20 → `grid-auto-rows: 20rem`) on 14 grid sections + `main-collection` / `main-search-results` / `main-product`. With it on, every row is 200px whatever the card height (~430px), so cards overlap the next row and spill out of the section. Reproduced on a dev store by enabling `fixed_row` on `featured-products-tabs`; the collection-not-in-tabs path, masonry and slow network (1.5–4.5s images) were all ruled out.
- **Fix:** Removed the setting entirely — `fixed_row` / `auto_row` from `layout-grid/schema.js` (file deleted) and `main-product/schema.js`, the `--fixed-row` rule in `layout-grid.global.scss`, the liquid in `layout-grid` / `main-collection` / `main-search-results`, and the stored values from section `preset-*.js` + `src/pages/**/*.json`. The one design that relied on the class (`promise-tiles`, full-bleed image tiles) got its own `grid-auto-rows: minmax(30rem, auto)` in its SCSS.
- **Files:** `src/snippets/layout-grid/`, `src/sections/main-product/schema.js`, `src/sections/main-collection/`, `src/sections/main-search-results/`, `src/sections/promise-tiles/`, section `preset-*.js`, `src/pages/**/*.json`
- **Verify:** `scan-feedback.py --only SF-LAYOUT-01` (flags fixed `grid-auto-rows` and `fixed_row`/`auto_row`/`row_height` settings); runtime: click every tab of `featured-products-tabs` at desktop + 390px and confirm the next section moves down.
- **Gotcha:** For `minmax` to grow a row, the tile needs in-flow content. In `promise-tiles` the media became a true absolute layer (`render 'image', relative: false` — the snippet's default `pos:relative` atomic class otherwise overrides the section's `position: absolute`) and the text body moved into flow (`position: relative; min-height: 100%`).
- **Other themes:** the scanner (2026-11-17) found the same `layout-grid` fixed-row setting in Pawra, Ronin and Stray — apply this entry there.
