# SF-MENU-01 — Nested menus are usable at every level on mobile

Requirement and how to verify: `../references/feedback-ledger.md` → `SF-MENU-01`.
Check type: heuristic (3 levels rendered) + runtime

## Recipe (any theme)

Level-2/3 mobile panels must not live inside an ancestor with `transform`, `filter` or `overflow` (they become the containing block for `position: fixed`). Render nested panels as siblings/portals, size them with `100dvh`, give each a collision-free name. Every item must still respond to a tap: a parent that has its own URL needs a split row — the label is an `<a href>` and a separate chevron (role=button, `aria-label`) opens the child panel — so the parent URL stays reachable. Check every header layout's mobile menu.

## History

Each entry is one theme where this was fixed. On a theme built on the same base the files
are usually the same paths, so start from the newest entry; if the root cause differs, fix it
from the recipe above and add a new entry.

### Folio — R2 (2026-11-17)

- **Root cause:** Different bug from R1 (the panels themselves opened fine — `xo-modal` uses `popover=manual`, so the top layer avoids the R1 containing-block problem). In `menu-hamburger.liquid`, every item with children (level 1 and 2) rendered **only** as an `<xo-modal-trigger>` that opened the child panel, and the child panel listed only Back and the children. The item's own `link.url` / `childlink.url` was never rendered on mobile, so tapping `2nd Level Submenu (collection page)` opened level 3 and the collection could never be reached.
- **Fix:** Split row. An item with children AND a real URL (`url != blank and url != '#'`) renders `<div class="xo-menu-hamburger__link xo-menu-hamburger__link--split">` holding a label `<a href="{{ link.url }}" class="xo-menu-hamburger__label-link">` plus a separate chevron `<xo-modal-trigger class="xo-menu-hamburger__arrow-trigger" role="button" tabindex="0" aria-label="{{ 'accessibility.open_submenu' | t: title: link.title }}">` with a 44×44 hit area. Applied at level 1 (`link`) and level 2 (`childlink`). A placeholder parent (blank or `#`) keeps the old whole-row trigger. New key `accessibility.open_submenu` ("Open submenu: {{ title }}") in all 8 `src/locales/*/20-accessibility.json`.
  - Other header layouts had the same gap at level 1: the `editorial` drawer and the `overlay` full-screen menu rendered a parent only as an accordion `xo-collapse-trigger`. Same split row: `<a href="{{ link.url }}">` + a caret-only `xo-collapse-trigger` (role=button, tabindex=0, `aria-label`), laid out by `…__item--split { display: grid; grid-template-columns: minmax(0,1fr) auto }` with `xo-collapse` on a full-width row. The editorial whole-row trigger (placeholder parents) also gained the missing `tabindex="0" role="button"`.
- **Files:** `menu-hamburger.liquid` + SCSS, the editorial and overlay header-layout menu snippets + SCSS, `src/locales/*/20-accessibility.json`
- **Verify:** Runtime at 390px (test-selling-plan store): the chevron opens level 2 then level 3, the label navigates (`/collections`), Enter on the focused chevron fires a click. Check every header layout's mobile menu, not only the default one.
- **Gotcha:** An earlier "View all <parent>" first-row attempt was rejected in review — use the split row. `xo-collapse` pairs with its trigger through `previousElementSibling`, so the trigger must be the IMMEDIATE previous sibling of `<xo-collapse>`; wrapping link + trigger in a row `<div>` silently breaks the accordion (the trigger toggles `xo-active` but the panel never opens).

### Folio — R1 (2026-11-05)

- **Root cause:** The nested `<xo-modal>`s were rendered inside the parent drawer. The parent's leftover `transform` and `overflow-y: auto` became the containing block for their `position: fixed`, so the panels were offset and clipped.
- **Fix:** Render level-2/3 modals as siblings outside the scrolling body (or portal them), use `100dvh`, and make the modal names collision-free (`parent-child`, not `parentchild`).
- **Files:** mobile menu drawer snippet + its SCSS
- **Verify:** Runtime, 390px viewport: open a 3-level menu; every panel fills the screen, scrolls, and Back/Close work.
