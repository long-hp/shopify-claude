---
name: system-upgrade
argument-hint: "[check | upgrade ...]"
description: "Use whenever the user wants to check, evaluate, score, or UPGRADE the project's `.claude/` system itself — skills, AGENT.md, hooks, .mcp.json, validators, references, overall coherence — OR verify it's still aligned with current Shopify theme-platform docs. Triggers: `/system-upgrade`, `/system-audit`, `/audit`, \"kiểm tra hệ thống\", \"kiểm tra hệ thống xem đủ tốt chưa\", \"kiểm tra và nâng cấp hệ thống như sau...\", \"đánh giá .claude\", \"nâng cấp hệ thống\", \"củng cố system\", \"check the .claude system\", \"is my system good enough\", \"upgrade the system\", \"audit hệ thống\", \"skill nào stale\", \"is our system aligned with current Shopify docs\", \"AGENT.md ổn không\". (For pure \"what's new in Shopify\" news — `Shopify có gì mới`, changelog, Editions — use `shopify-watch`; system-upgrade's own Step 2 drift-check is about OUR skills' staleness and is where shopify-watch hands off actionable findings.) Runs a distribution-repo-aware static checker (skills / AGENT.md / hooks / mcp / validators / state) plus an optional context7 Shopify drift-check, gives a lean health read, then proposes and applies upgrades with per-change approval. CRITICAL ROUTING RULE: any change whose target is a SKILL (a SKILL.md body/frontmatter/description, a skill's `references/*.md`, creating/renaming/deleting a skill, or fixing a skill's triggering) MUST be delegated to the `skill-creator` skill — never hand-edit skill files from here; non-skill targets (hooks under `.claude/hooks/`, `.claude/AGENT.md`, `.mcp.json`, `.claude/settings*.json`, validator scripts) are edited directly. Do NOT use for `src/` Liquid code quality (use the schema validator), git hygiene (use `/git`), or refreshing `.agent-state/` (use `planner`)."
---

# System Upgrade

Check, evaluate, and **upgrade** the project's `.claude/` system — the skills, AGENT.md, hooks, MCP config, and validators that make this repo work — and keep its Shopify-platform knowledge current. Output: a lean health read, then proposed upgrades applied one at a time with your approval.

This skill supersedes the old `system-audit`. Same checks, but (1) **distribution-repo aware** so it doesn't drown you in false "broken path" findings, (2) it leans toward **acting** (upgrading), not just scoring, and (3) it routes all skill-touching work through the **`skill-creator`** skill instead of hand-editing.

## The one rule that matters most — route by target

When you propose or apply an upgrade, look at **what kind of thing you're changing** and route accordingly. This is non-negotiable: skills have their own authoring discipline (frontmatter shape, description-triggering, reference layout, eval loop) that `skill-creator` owns — hand-editing a SKILL.md here silently drifts from that discipline.

| Target of the change | How to apply |
| --- | --- |
| A skill: `SKILL.md` body / frontmatter / **description**, a skill's `references/*.md` or `scripts/`, **creating / renaming / deleting** a skill, fixing a skill's triggering | **Delegate to `skill-creator`** (`Skill(skill-creator:skill-creator)`). Hand it the exact change. Never edit the skill files directly from this skill. |
| Non-skill infra: `.claude/hooks/*`, `.claude/AGENT.md`, `.mcp.json`, `.claude/settings*.json` | **Edit directly** here (with per-change approval). |

> Grey area: a *script* under a skill dir that is pure deterministic tooling (e.g. `validate-schema.py`). A small bugfix there is fine to do directly; but if the change alters the skill's documented behavior/contract, treat it as a skill change → `skill-creator`. When unsure, ask the user.

## Figure out the ask first — CHECK vs UPGRADE

Parse what the user wants before doing anything:

- **"kiểm tra hệ thống xem đủ tốt chưa" / "is my system good enough" / `/system-upgrade check`** → CHECK + EVALUATE only. Run the checker, give the health read + a prioritized list of what *could* be upgraded, then stop and let them choose. Don't apply anything unprompted.
- **"kiểm tra và nâng cấp hệ thống như sau: …" / "upgrade the system to …"** → CHECK, then UPGRADE the specific things they named (plus anything the check surfaced that they approve). Apply with per-change approval, routing each by target.
- **Bare "/system-upgrade" / "nâng cấp hệ thống"** → CHECK + EVALUATE, then *offer* the upgrade list and ask which to apply.

When in doubt, do the CHECK first (it's read-only and cheap) and let the result shape the conversation.

## Step 1 — Static check

Run the bundled checker from the repo root. It emits a JSON document on stdout (use `--human` for a short summary — there is **no `--json` flag**; JSON is the default):

```bash
python .claude/skills/system-upgrade/scripts/audit-static.py            # JSON (full detail)
python .claude/skills/system-upgrade/scripts/audit-static.py --human    # short per-category summary
```

Categories: **skills** (frontmatter present, `name` matches dir, description length, body ≤ 500 lines, every referenced `references/X.md` · `scripts/X.py` exists), **agent_md** (path tokens resolve), **hooks** (`settings*.json` parse, hook commands exist + executable), **mcp** (`.mcp.json` shape + each server resolvable), **validators** (`validate-schema.py --all` exit 0, `scan-inventory.py` invocable), **state** (`.agent-state/` present + within size/freshness policy).

### Distribution-repo awareness (read the `distribution_mode` flag)

The result JSON carries `"distribution_mode": true/false` and `"distribution_downgraded": N`. When `true` (no root `package.json` — i.e. this is the portable `.claude/` distribution repo, not a host Liquid project), findings tied to host-owned paths (`.agent-state/`, `theme-config/`, `shopify/`, `src/`) and "project root not found" validator errors are auto-downgraded to `info` (0 score impact) — they are **expected absences, not defects**. Don't report those as problems or propose "fixing" them (removing the references would break the system once pulled into a real project). Focus on genuine `.claude` defects: mismatched skill name/dir, broken `.claude/...` reference, dead hook command, malformed `.mcp.json`, a skill whose `references/X.md` doesn't exist, a SKILL.md over 500 lines.

If the script itself crashes (Python import error, its own missing dependency), stop and tell the user — that's a bug in this skill, not a finding to score.

## Step 2 — Shopify drift check (optional, judgment + context7)

Only the four Shopify-facing skills carry platform knowledge that can go stale: `liquid`, `schema`, `scss`, `xo-css`. Sample **3-6 high-value topics** (priority: topics the user named → skill content changed since last audit → the rotating shortlist in `references/shopify-drift-checks.md`) and compare against shopify.dev via context7 (`mcp__plugin_context7_context7__query-docs`, e.g. library `/websites/shopify_dev_api_liquid`).

**Evidence is mandatory** — a drift finding without a shopify.dev URL or quoted doc section is unverifiable; drop it. If context7 returns nothing actionable, mark the topic up-to-date and move on — don't manufacture findings. Skip this step for a quick CHECK if no Shopify-facing skill changed recently — say so rather than padding.

## Step 3 — Evaluate (lean health read)

Lead with the headline so the user sees status first. Keep it tight — this is a read, not a 7-page scorecard.

```markdown
# System check — YYYY-MM-DD   ·   distribution repo: yes/no

**Health: <one-line verdict>** (e.g. "solid — 2 real defects, both minor")

| Category | Real findings | Note |
|----------|---------------|------|
| Skills        | <n> | <one line> |
| AGENT.md      | <n> | (<m> project-owned paths ignored in distribution mode) |
| Hooks / MCP   | <n> | |
| Validators    | <n> | |
| Shopify drift | <n> | <topics sampled, or "skipped — no Shopify skill changed"> |

## Real findings (defects worth fixing)
- **[severity]** <what> — `<file>:<line>` — <why it matters>

## Upgrade candidates (proposed)
1. <change> — target: <skill → skill-creator | non-skill → direct> — <rationale>
```

Severity: **critical** (system misbehaves), **major** (stale/wrong, not blocking), **minor** (polish). Use sparingly. Separate *real defects* from *distribution-mode noise* explicitly so the user trusts the read. If there are >~20 findings, summarize and offer the full list on request.

## Step 4 — Upgrade (per-change approval, routed by target)

For each upgrade the user approves:

1. **Route it** (the rule above). Skill target → invoke `skill-creator` with the precise change (which skill, which file, the before/after intent); let it handle authoring + any description-triggering optimization. Non-skill target → edit directly.
2. **One change at a time.** Even on "apply all", surface each edit (or each skill-creator hand-off) individually so the user can follow along. Never bulk-write.
3. **Verify after.** Hook script touched → `node -c <hook>` (or `bash -n`). Validator/script touched → run it. After a skill change via skill-creator → re-run Step 1's checker to confirm `skills` is clean (name/dir match, references resolve, ≤500 lines).
4. **Don't commit, don't log state.** Per AGENT.md, `.claude` system changes go to git history via `/git` (not `.agent-state/`). Tell the user they can `/git` when ready; this skill never commits.

## What this skill does NOT do

- Judge `src/` Liquid/markup quality → schema validator + manual review (`design-to-liquid` / `polish`).
- Refresh `.agent-state/` (PLAN/PROGRESS/INVENTORY) → `planner`.
- Commit or push → `/git`.
- Author skills by hand → always `skill-creator`.

## References

- `references/rubric.md` — per-category scoring criteria + the static-check JSON schema (incl. `distribution_mode` / `distribution_downgraded` + the `info` severity = 0-deduction rule).
- `references/shopify-drift-checks.md` — rotating Shopify topic shortlist per Shopify-facing skill, with evidence-citation discipline.
