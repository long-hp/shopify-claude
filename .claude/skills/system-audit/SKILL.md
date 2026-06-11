---
name: system-audit
description: Use when the user asks for a health check, audit, or score of the project's `.claude/` system (skills, AGENT.md, hooks, MCP servers, validators, planner state) AND/OR wants to verify the project is still aligned with the latest Shopify theme platform documentation. ALSO invoke as a pre-port checkpoint during active port work — when the user is about to modify shared infrastructure (groups, modals, frequently-shared snippets) AND no existing reference documents the pattern. In that mode the workflow is: pause active port → identify .claude/ knowledge gaps that would prevent a future agent from porting the same pattern correctly → propose system upgrades (new references, AGENT.md additions, ladder addendums) → apply with per-patch approval → THEN resume port. This mirrors the header-port precedent (4 system updates committed before header markup work) and the search/cart-modal-port precedent (modals.md reference + AGENT.md groups expansion before completing the modal port). Trigger phrases include `/system-audit`, `/audit`, "audit hệ thống", "tính điểm system", "check .claude", "skill nào stale", "Shopify có gì mới", "AGENT.md ổn không", "verify the system", "health check", "kiểm tra hệ thống", "củng cố system", or any periodic maintenance request after a big refactor of `.claude/` or after a Shopify platform release. Produces a scored markdown report (per-category breakdown + overall 0-100) and proposes patches for each finding the user reviews and applies one-by-one. Bundles a Python script for deterministic checks (broken file references, hook command resolution, MCP entry validity, SKILL.md length limits, state-doc freshness) and uses context7 (`mcp__plugin_context7_context7__query-docs`) to spot-check this project's Shopify-facing skill content (`liquid`/`schema`/`scss`/`xo-css`) against current shopify.dev documentation for drift. Never applies patches automatically — each one requires per-patch user approval. Does NOT audit `src/` Liquid code quality (use the schema validator for that) and does NOT replace the `planner` skill's state-doc workflow.
---

# System Audit

Health-check the project's `.claude/` ecosystem and its alignment with the latest Shopify theme platform. Output: a scored report + proposed patches the user approves one-by-one.

## Identity

This skill is the project's hygiene auditor. Two parallel concerns merged into one report:

1. **Internal coherence** — Is `.claude/` self-consistent? (skills, AGENT.md, hooks, MCP, validators, state)
2. **External drift** — Is the codified Shopify-platform knowledge still accurate? (vs current shopify.dev docs via context7)

Both feed a per-category 0-100 score → overall weighted score → actionable patch list.

## When to invoke

Run on demand. Realistic triggers:

- Periodic maintenance (every few weeks of active porting)
- After a big `.claude/` refactor (new skill added, AGENT.md rewritten, hook script touched)
- After Shopify ships a major theme-platform release
- When the user reports vague "things feel stale" / "is my system OK?"
- Before sharing the `.claude/` setup with another developer

NOT for:

- Validating section schemas — that's `validate-schema.py --all`
- Refreshing PLAN/PROGRESS/INVENTORY — that's the `planner` skill
- Auditing `src/` Liquid code quality — out of scope

## Workflow

Run the four steps in order. Don't skip steps even if the user only mentions one concern — the score is meaningless without all categories.

### Step 1 — Run static checks

Execute the bundled script from the repo root:

```bash
python .claude/skills/system-audit/scripts/audit-static.py --json
```

The script emits a single JSON document to stdout with the structure described in `references/rubric.md` § "Static-check JSON schema". Save it briefly in memory; don't write to disk.

Categories covered:

- **skills** — each `.claude/skills/*/SKILL.md` checked for: YAML frontmatter present (name + description), description length ≥ 80 chars (weak triggering heuristic), SKILL.md body ≤ 500 lines, every `references/X.md` / `scripts/X.py` / `assets/X` path mentioned in body actually exists on disk.
- **agent_md** — every path-like token in `.claude/AGENT.md` (matching `.claude/...`, `src/...`, `.agent-state/...`, `theme-config/...`) resolves to an existing file or directory.
- **hooks** — `.claude/settings.json` + `.claude/settings.local.json` parsed; each hook's `command` (or script path) exists and is executable.
- **mcp** — `.mcp.json` parsed; each server entry has either a resolvable `command` (PATH or absolute) or a valid HTTP `url` (structural check only — does NOT ping the server).
- **validators** — `validate-schema.py --all` runs cleanly (exit 0); `scan-inventory.py` exists and is invocable (`python … --help` exits 0).
- **state** — `.agent-state/PROGRESS.md` line count ≤ 500 (per AGENT.md growth policy); `PLAN.md` modified within last 30 days OR src/sections/ has no commits in 30 days (whichever lets it pass); `INVENTORY.md` exists.

If the script fails outright (Python import error, missing file the script itself depends on), stop and tell the user — that's a bug in this skill, not a finding to score.

### Step 2 — Shopify drift check (judgment + context7)

For the four Shopify-facing skills only — `liquid`, `schema`, `scss`, `xo-css` — sample a handful of high-value topics and compare against shopify.dev via context7.

**Topic budget per audit run: 5-8 topics total.** This is intentional — exhaustive checking is not feasible, and most projects only need a sampling. Pick topics by this priority:

1. Topics the user named in the audit request (if any)
2. Topics covered in skill content recently modified (last commit on the skill dir)
3. Topics with known Shopify churn (see `references/shopify-drift-checks.md` for the rotating shortlist)

For each topic, the flow is:

```
1. Read the skill's local material on the topic (the relevant references/*.md section).
2. Query context7: mcp__plugin_context7_context7__query-docs with the Shopify topic.
3. Compare. Look for:
   - New filters/tags/objects/fields not present in skill content
   - Deprecated APIs the skill still recommends
   - Behavior changes (e.g., new defaults, raised limits, additional validation)
   - Wholly new sections of documentation
4. Record evidence: cite the shopify.dev URL or doc section.
```

**Evidence is mandatory.** A drift finding without a URL or quoted doc section is unverifiable and must not be reported. If context7 returns nothing actionable for a topic, mark it `up-to-date` and move on — don't manufacture findings.

See `references/shopify-drift-checks.md` for the per-skill topic shortlists.

### Step 3 — Score and assemble report

Apply the rubric in `references/rubric.md`. Compute per-category scores (0-100), then overall weighted average:

| Category | Weight |
|----------|--------|
| skills | 20 |
| agent_md | 15 |
| hooks | 10 |
| mcp | 5 |
| validators | 10 |
| state | 15 |
| shopify_drift | 25 |

Render the report directly in the conversation as markdown. Use the exact template below — the user gets the headline first, then details.

```markdown
# System Audit — YYYY-MM-DD

## Overall: NN/100

| Category       | Score | Status              |
|----------------|-------|---------------------|
| Skills         |   NN  | ✓ / ⚠ N findings   |
| AGENT.md       |   NN  | ✓ / ⚠ N findings   |
| Hooks          |   NN  | ✓ / ⚠ N findings   |
| MCP            |   NN  | ✓ / ⚠ N findings   |
| Validators     |   NN  | ✓ / ⚠ N findings   |
| State          |   NN  | ✓ / ⚠ N findings   |
| Shopify drift  |   NN  | ✓ / ⚠ N findings   |

## Findings

### Skills (NN/100)
- **[severity]** <skill-name>: <one-line description>
  - File: <path>:<line>
  - Detail: <specifics>

### AGENT.md (NN/100)
...

### Shopify drift (NN/100)
- **[severity]** <skill-name>: <topic> — <gap>
  - Evidence: <shopify.dev URL or doc section>
  - Local material: <skill ref path>:<line if known>

## Proposed patches

### Patch 1 — <one-line title> [<category>]
File: <path>
```diff
- <old>
+ <new>
```
Rationale: <why this is correct>

### Patch 2 — ...
```

Severity labels: **critical** (broken — system won't behave correctly), **major** (stale/wrong but not blocking), **minor** (polish — description tuning, comment fix). Use sparingly; most findings are minor.

If the report would exceed ~30 findings, summarize categories and offer to render the full list on request. Don't dump 100 findings into the conversation.

### Step 4 — Apply patches with per-patch approval

After the report, ask the user which patches to apply. Suggested phrasing:

> "Có **N patches** đề xuất. Bạn muốn apply những patch nào? (`all` / `1,3,5` / `none` / `walk me through`)"

For each approved patch:

1. Read the target file (via Read tool) to confirm the `old` block matches exactly.
2. Apply via Edit. If the file has changed since the audit ran, abort that patch and tell the user.
3. After applying schema/hook patches, suggest running the relevant validator (`validate-schema.py`, `bash -n` on hook scripts).
4. For Shopify-drift patches that update skill content: ask the user if they want to also re-run the description optimizer on that skill (run_loop.py from the skill-creator plugin).

**Never apply patches in bulk without per-file approval.** Even with `all`, surface each Edit one at a time so the user can scroll back.

## What this skill does NOT cover

- `src/` content quality (use schema validator + manual review)
- Storefront-side Shopify config (theme blocks live in dashboard, not codebase)
- Git hygiene (use `/git`)
- Refreshing `.agent-state/` (use `planner`)
- Auto-deployment, packaging, release management

## Output discipline

- Score table FIRST so the user sees the headline. Detail follows.
- Findings grouped by category, ordered by severity within each.
- Every Shopify-drift finding has an evidence URL or doc citation — no exceptions.
- No saving to `.agent-state/` (per AGENT.md state-doc scope rule). If the user wants a saved copy, ask where.
- Match the user's language (chat in their language, write code/state in English per AGENT.md communication rule).

## References

- `references/rubric.md` — per-category scoring criteria + static-check JSON schema
- `references/shopify-drift-checks.md` — rotating topic shortlist per Shopify-facing skill
