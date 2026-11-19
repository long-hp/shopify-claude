# SF-MENU-02 — Desktop dropdowns fit their labels and open level 3 beside level 2

Requirement and how to verify: `../references/feedback-ledger.md` → `SF-MENU-02`.
Check type: heuristic + runtime

## Recipe (any theme)

The desktop dropdown panel must size to its content, not to its top-level parent: `width: max-content` with a `min-width` and a `max-width` so very long labels wrap inside the panel instead of running past its background. The level-3 list is `position: absolute; top: 0; inset-inline-start: 100%` against a `position: relative` level-2 `<li>`, so it opens beside level 2 (flip to the other side near the viewport edge / in RTL). Verify with a 40+ character label and a 3-level menu at 1280px and near the right edge.

## History

Each entry is one theme where this was fixed. On a theme built on the same base the files
are usually the same paths, so start from the newest entry; if the root cause differs, fix it
from the recipe above and add a new entry.

### Folio — R2 (2026-11-17)

- **Root cause:** `.xo-menu-horizontal__sub-menu` was `width: 100%`, i.e. the width of the top-level menu item, so long labels overflowed the panel background.
- **Fix:** `width: max-content; min-width: 20rem; max-width: 32rem` on the sub-menu, so long labels wrap inside the panel. The level-3 panel keeps `top: 0; left: 100%` against its `position: relative` level-2 `<li>`. Commit `aea0690`.
- **Files:** the `menu-horizontal` snippet SCSS (`.xo-menu-horizontal__sub-menu`)
- **Verify:** Runtime, 2026-11-17: injected a 60-character label plus a level-3 list — the label wraps inside the 320px panel and level 3 starts at the panel's right edge. `scan-feedback.py --only SF-MENU-02` is a MANUAL reminder only.
