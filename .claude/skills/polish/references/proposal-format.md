# Proposal + choice format (Step 3 → Step 4)

> How to present polish findings so the user can choose **correctly** — every item self-explanatory, severity-tagged, risk surfaced, before→after concrete. A user should never have to open the file to understand what a choice does or costs.

> [!NOTE]
> Question text + labels below are English documentation. At runtime, localise to the user's conversation language per `.claude/AGENT.md` § "Communication language". Identifiers (`action-quick-view.liquid:15`, `xo-cascade`, `aria-label`) stay English.

## Badges (use in both Step 3 and Step 4)

| Axis | Badge | Meaning |
| --- | --- | --- |
| Severity | 🔴 **Must-fix** | A11y correctness — broken for some users. Recommend applying unless there's a reason not to. |
| Severity | 🟡 **Optional** | xo-animate / xo-hover — taste/polish. Only where it genuinely serves the design. |
| Risk | 🟢 **Additive-safe** | Pure attribute/wrapper/aria add on a section-private element. No ripple. |
| Risk | 🔁 **Shared snippet** | Edits a snippet rendered by other sections → ripples theme-wide. |
| Risk | 🧩 **Group** | Lives under `src/groups/` → follows the group override ladder; non-trivial markup = STOP and ask. |
| Confidence | ⚠️ **Needs-confirm** | Static read can't be sure (web component may wire `role`/keyboard at runtime; aria may be injected). Will verify before writing. |
| Confidence | 👁 **Human-eye** | Not statically checkable (colour contrast, actual motion feel). Recommendation only, not auto-applied. |

## Step 3 — the per-item template

Group by dimension, ordered **a11y → animate → hover**. Each finding:

```markdown
- **<ID>** `file:line` · <severity badge> · <risk badge> [· <confidence badge>]
  - **Symptom:** what's wrong, observed in the actual markup — plain language, no spec citations.
  - **Impact:** WHO is affected / WHAT breaks, in human terms ("keyboard users can't open it", not "violates 4.1.2").
  - **Fix:** `before` → `after` — exact, copy-pasteable markup (the attribute/wrapper, in place).
  - **Caveat:** only if a confidence badge applies — what you'll confirm, or why it's recommendation-only.
```

IDs: `A#` a11y, `V#` xo-animate, `H#` xo-hover — stable within a run so the user can refer to them.

Every item must answer three questions on its face: **what changes, why it matters to a real user, and what it might cost (ripple/caveat).** If you can't fill "Impact" in human terms, you haven't justified the item — drop it.

## Step 4 — the choice (`AskUserQuestion`)

**One multi-select question per dimension** (a11y / animate / hover), in that order. Never mix dimensions in one question — severity must be uniform within a question so the user isn't weighing "broken for blind users" against "nice fade-in" in the same list.

### Question text must state

- The **target** + the **dimension** + the **count**: *"♿ A11y on `product-card` — 2 issues."*
- That it's **multi-select and only picks are written**: *"Pick what to apply (multi-select; only chosen items get written)."*
- For a11y, the **steer**: *"A11y is correctness → apply all unless you have a reason."*

### Each option = one finding

- **Label** (chip, short): `<ID> — <plain short name>` — e.g. `A1 — quick-view unreadable`. Name the *symptom in user terms*, not the attribute.
- **Description** carries the four fixed facets, compact:
  - **Changes:** `<plain change>` (`attr/wrapper`) @ `file:line`
  - **Without it:** `<impact — who/what breaks>`
  - **Level:** 🔴 Must-fix / 🟡 Optional
  - **Risk:** `<🟢/🔁/🧩 + any ⚠️/👁 caveat>`

### Option-count rules (the `AskUserQuestion` ≥2 / ≤4 constraint)

`AskUserQuestion` **requires 2–4 options per question.** Handle every dimension size:

| Items in dimension | Options to present |
| --- | --- |
| **1** | The item **+ an explicit "Skip this group"** option (→ 2 options). A lone option errors. |
| **2–3** | One option per item. Optionally add **"Apply all (N)"** as the lead option for a11y. User deselects to opt out. |
| **4+** | Lead with **"Apply all (N)"**, then the top 2–3 individually; list the rest in the Step 3 checklist above and note "+K more in the list — say which IDs". Never silently drop items; `log`/say what's not shown. |

Always leave a real opt-out (a "Skip / none" option, or rely on multi-select deselect — but for a 1-item group the explicit Skip is mandatory).

### Never bury

- A **⚠️ needs-confirm** or **👁 human-eye** caveat must appear in the option itself — the user is choosing provisionally and deserves to know. e.g. *"Risk: 🔁 shared · ⚠️ will check the web component doesn't already handle keyboard at runtime before writing."*
- A **🔁 shared / 🧩 group** ripple must appear in the option — it changes the cost of "yes".

## Worked example — real `product-card` audit (2 a11y, 0 animate, 0 hover)

`product-card` already ships `xo-animate` + `xo-hover` → propose nothing there (don't duplicate). Two real a11y findings remain.

**Step 3 checklist shown to the user:**

```markdown
## ♿ A11y (2) · ✨ xo-animate (0 — already present) · 🖱 xo-hover (0 — already present)

- **A1** `action-quick-view.liquid:15` · 🔴 Must-fix · 🔁 Shared snippet · ⚠️ Needs-confirm
  - Symptom: `<xo-product-quick-view-trigger class="cur:pointer">` wraps icon-only content — no `role` / `tabindex` / `aria-label` on the element.
  - Impact: screen-reader users hear nothing; keyboard users may not be able to open quick-view.
  - Fix: `<xo-product-quick-view-trigger …>` → add `role="button" tabindex="0" aria-label="{{ 'products.product.quick_view' | t }}"`.
  - Caveat: confirm the web component doesn't inject role/keyboard at runtime before writing; if it does, drop A1.

- **A2** `add-to-compare.liquid:20,26` · 🔴 Must-fix · 🔁 Shared snippet · ⚠️ Needs-confirm
  - Symptom: `<xo-products-fetcher-add/remove>` carry visible text (name OK) but aren't native buttons.
  - Impact: keyboard users likely can't focus/activate them.
  - Fix: add `role="button" tabindex="0"` to each (text already supplies the name — no aria-label).
  - Caveat: same runtime check as A1.
```

**Step 4 question (a11y only — animate/hover have nothing to ask):**

> **Question:** "♿ A11y on `product-card` — 2 issues. Pick what to apply (multi-select; only chosen items get written). A11y is correctness → apply both unless you have a reason."
>
> - **A1 — quick-view unreadable**
>   - Changes: add `role`/`tabindex`/`aria-label` to the trigger @ `action-quick-view.liquid:15`
>   - Without it: SR users hear nothing; keyboard can't open quick-view
>   - Level: 🔴 Must-fix
>   - Risk: 🔁 shared snippet · ⚠️ will verify the web component doesn't handle keyboard at runtime first
> - **A2 — compare not keyboard-operable**
>   - Changes: add `role="button"`/`tabindex="0"` to the two fetcher elements @ `add-to-compare.liquid:20,26`
>   - Without it: keyboard users can't focus/activate Compare
>   - Level: 🔴 Must-fix
>   - Risk: 🔁 shared snippet · ⚠️ same runtime check
> - **Apply both** — write A1 + A2
> - **Skip a11y** — change nothing; keep as a recorded recommendation

(If hover had exactly one finding, its question would carry that finding **+ "Skip hover"** so it has the required 2 options.)

## Anti-patterns

| Anti-pattern | Why it's bad |
| --- | --- |
| Option says only "what changes", no "without it" | The user can't weigh a fix they don't understand the cost of skipping. |
| Hiding ripple/caveat until after apply | The user picked "yes" without knowing it edits a theme-wide snippet or is unconfirmed. |
| One multi-select mixing a11y + animate | Different severity → trains the user to skim-click; a11y items get dropped beside taste items. |
| A single-option question | `AskUserQuestion` errors (needs ≥2). Always add the explicit "Skip this group". |
| Spec-citation impact ("WCAG 4.1.2") | Means nothing to most users. Say the human consequence. |
| Re-proposing what the port already added | Detector/read shows `xo-animate`/`xo-hover` present → skip, don't duplicate. |
| Silently truncating a long list to 4 | Say what's not shown ("+3 more — say which IDs"); never let ≤4 hide coverage. |
