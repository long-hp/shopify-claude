# SF-TABS-01 — Tabbed sections always have a default active tab

Requirement and how to verify: `../references/feedback-ledger.md` → `SF-TABS-01`.
Check type: heuristic + runtime

## Recipe (any theme)

A tabbed section must pick its active tab from its own blocks, never blindly from the page it sits on. If the section reads the active tab from `request.path` (common when it re-renders itself through the Section Rendering API), only accept that handle after matching it against one of the blocks; otherwise fall back to `section.blocks.first`. Verify by placing the section on the collection template and opening a collection that matches none of the tabs, plus an empty collection.

## History

Each entry is one theme where this was fixed. On a theme built on the same base the files
are usually the same paths, so start from the newest entry; if the root cause differs, fix it
from the recipe above and add a new entry.

### Folio — R2 (2026-11-17)

- **Root cause:** `featured-products-tabs.liquid` set `current_handle` from the URL whenever `request.path contains '/collections/'` (meant for its Section Rendering API re-render). On an unrelated collection page that handle matched no tab, so no tab got `xo-active`, and `collections[handle]` was the empty current collection, so the section rendered placeholder cards.
- **Fix:** `assign url_handle = request.path | split: '/' | last`, then `for block in section.blocks` → `if block.settings.spf_collection.handle == url_handle` → `assign current_handle = url_handle`. Otherwise `current_handle` stays on the first block. `bundle-builder.liquid` already did this (`col.handle == url_handle` over `collection_list`) and served as the reference.
- **Files:** `src/sections/featured-products-tabs/featured-products-tabs.liquid`
- **Verify:** `scan-feedback.py --only SF-TABS-01` (flags a `request.path` handle used without a `.handle ==` match); runtime: `/collections/empty-collection` and `/collections/theme-test-products` both show the first tab active.
