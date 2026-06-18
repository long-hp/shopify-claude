---
name: shopify-watch
description: "Use when the user wants to know WHAT'S NEW in Shopify that matters to THEME development — Shopify news / changelog / platform updates. A read-only radar. Triggers: `/shopify-watch`, \"Shopify có gì mới\", \"Shopify theme có gì mới\", \"check Shopify updates\", \"Shopify changelog\", \"tin tức Shopify\", \"Editions mới\" / \"Shopify Editions\", \"what's new in Shopify themes\", \"did Shopify change anything\", \"Shopify platform news\". It scans Shopify's official sources (shopify.dev/changelog, Editions, themes/Liquid docs, Dawn/Horizon releases, dev blog), FILTERS to theme-relevant changes (drops app / Functions / checkout-extension runtime news), cites a source URL + date for every item, and produces a grouped digest — then HANDS OFF actionable items to `/system-upgrade` (which evaluates our skills and routes any edit to skill-creator). It is RADAR-ONLY and STATELESS: it never edits skills, writes no files, keeps no ledger, and asks the user for a \"since <date>\" anchor because it can't trust the clock. Do NOT use it to audit or upgrade our own `.claude/` system — that's `system-upgrade`; do NOT use it to port a design — that's `design-to-liquid`."
argument-hint: "(optional: since <date|Edition>)"
---

# shopify-watch

**"What did Shopify ship that a theme dev should know — and which of our skills might it touch?"**

A read-only radar. It does not change anything: it scans, filters to theme-relevant, cites sources, and points the actionable findings at `/system-upgrade`. The pipeline is deliberate:

```
[shopify-watch]  →  digest of theme-relevant Shopify news (cited)
      ↓ (for 🟢 actionable items)
 /system-upgrade →  checks our skills vs the change, proposes upgrades
      ↓
  skill-creator  →  authors the actual skill edit
```

Keeping radar (this skill) separate from action (`system-upgrade`) is the whole point — it stays a cheap, safe "is there anything new?" check that never mutates the system on its own.

## Step 1 — Anchor the window ("since when?")

This skill is **stateless** — it keeps no ledger, so it needs to know how far back to look. You also **cannot trust the clock**, so don't guess the date.

- If the user named a window ("since last month", "since Summer Editions", "since 2026-05-01") → use it.
- Otherwise **ask** (`AskUserQuestion`): e.g. "Scan since roughly when? (last check date / since the last Edition / last ~3 months)". Offer a sensible default (the last ~2 Shopify Editions covers the big launches) but let them set it.

State the chosen window at the top of the digest so the reader knows the scope.

## Step 2 — Scan the sources

Load `references/sources.md` for the curated, theme-filtered source list. Primary source is **shopify.dev/changelog** (filter to Themes / Liquid entries); then Editions, themes/Liquid docs, Dawn/Horizon releases, dev blog.

- Use **WebFetch** + **WebSearch** to pull recent entries; use the **context7 MCP** (`mcp__plugin_context7_context7__query-docs`, e.g. library `/websites/shopify_dev_api_liquid`) to confirm doc-level details when an item is non-trivial.
- **Primary > secondary.** Cross-check 2+ sources before treating a non-trivial claim as real.
- **Evidence is mandatory** — every item you keep must carry a source URL + date. No citation → drop it (same discipline as `system-upgrade`'s drift check). Don't manufacture news to fill the digest; "nothing theme-relevant since `<window>`" is a perfectly good result — say it and stop.

## Step 3 — Filter: THEME, not APP

We build **Shopify themes**, not apps. Keep only what a theme dev can actually act on; push app-runtime news to an ignored tail.

| WE OWN — keep it | APP TERRITORY — drop to the ignored tail |
| --- | --- |
| Liquid templates (sections / snippets / layout / templates) | Shopify Functions (cart-transform / discount / order-routing) — Wasm runtime |
| Theme settings (`settings_schema`, theme editor), section/block schema | Checkout UI & Customer Account UI **extensions** (runtime) |
| Storefront HTML / SCSS / vanilla-JS, web components, Shopify AJAX (`/cart/add.js`) | App blocks, app proxy, Admin extensions |
| Metafields **read via Liquid** | Background jobs (subscription billing, webhook handlers) |
| Native features rendered in-theme: Shop Pay button, Discounts display, Search & Discovery, Customer Accounts links | Third-party-auth integrations (Klaviyo / Recharge / Smile.io **logic**) |
| Theme / Branding API **tokens** (styling only) | |

The rule: a theme can render **UI** for an app feature but not its **runtime**. News about the runtime → ignored tail. News about a **theme-side hook** for it (a new Liquid object, a settings field, a section the merchant places) → keep it.

## Step 4 — Tag relevance to OUR skills

For each kept item, note in one line: which of our skills/conventions it likely touches, so the `/system-upgrade` handoff is concrete. Quick map (full version in `references/sources.md`):

| Shopify change | Likely touches |
| --- | --- |
| New Liquid object / filter / tag, render-scope rule | `liquid` |
| New/changed section or block **schema** setting type, preset rules | `schema` |
| Theme Store requirement / label rule change | `.claude/skills/design-to-liquid/references/theme-store-requirements.md` |
| New Dawn/Horizon pattern (e.g. a new section archetype) | `design-to-liquid` references |
| Storefront CSS capability / token change | `scss` / `xo-css` |

This is a *hint* for the handoff, not a verdict — `system-upgrade` confirms whether our skill is actually stale.

## Step 5 — When NOT to flag

Resist pattern-of-the-week. Not every Shopify announcement is worth escalating:

- App-only / runtime-only change with no theme-side hook → ignored tail (or a count, not a row).
- A change that doesn't affect how we build themes (admin UX, billing, a feature our archetypes don't use) → 🟡 FYI at most, not 🟢.
- "Shopify added X" where X duplicates something we already do, or fits archetypes we don't support → note briefly, don't escalate.

A short, honest digest beats an inflated one. The reader trusts it more.

## Step 6 — Output the digest

Lead with the window + sources consulted, then group by what to do about it:

```markdown
# Shopify watch — since <window>   ·   sources: changelog, Editions, Dawn releases…

## 🟢 Affects our theme / skills  → run `/system-upgrade`
- **<change>** — <one-line what>. Source: <url> (<date>). Likely touches: `<skill>`.

## 🟡 Theme-relevant FYI (no action)
- **<change>** — <one-line>. Source: <url> (<date>).

## ⚫ Ignored — app territory / out of scope
- <N items> (e.g. Functions/runtime, checkout extensions) — not theme-actionable.
```

If nothing is 🟢, say so plainly ("nothing that touches our skills since `<window>`").

## Step 7 — Hand off, don't act

For each 🟢 item, the next step is **`/system-upgrade`** — it checks our skill against the change and routes any actual edit to `skill-creator`. shopify-watch **stops at the digest**: it proposes nothing, edits nothing, commits nothing.

## Guardrails

- **Read-only.** Writes no files, keeps no ledger (stateless), commits nothing.
- **Evidence mandatory.** Every kept item cites a source URL + date, or it's dropped. No citation, no item.
- **Theme, not app.** Filter every item through Step 3 before it reaches the digest.
- **Radar, not actor.** It never edits a skill — actionable findings hand off to `/system-upgrade`.
- **Don't trust the clock.** Always anchor the "since" window with the user (Step 1).

## Reference

- `references/sources.md` — curated theme-relevant Shopify source list, research rules, and the change→skill lookup table.
