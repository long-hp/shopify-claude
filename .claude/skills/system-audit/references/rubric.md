# Audit Rubric

Per-category scoring rules. Each category starts at 100 and loses points per finding. Weighted overall = sum of (category_score × weight) / 100.

## Severity → point deductions

| Severity | Deduction |
|----------|-----------|
| critical | 25 per finding |
| major    | 10 per finding |
| minor    | 3 per finding |

A category cannot go below 0.

## Category criteria

### Skills (weight 20)

For each `.claude/skills/*/SKILL.md`:

| Check | Severity if failing |
|-------|---------------------|
| YAML frontmatter present and parses | critical |
| `name` field matches directory name | critical |
| `description` field present, ≥ 80 chars | major |
| `description` includes "Use when" / "MUST be invoked" / similar trigger phrasing | minor |
| SKILL.md body ≤ 500 lines | major (>500 lines) / minor (400-500 lines, warn) |
| Every `references/X.md` mentioned in body resolves | critical |
| Every `scripts/X.py` mentioned in body resolves | critical |
| Every `assets/X` mentioned in body resolves | major |
| Description ≤ 2500 chars (overlong descriptions waste context budget) | minor |

### AGENT.md (weight 15)

| Check | Severity |
|-------|----------|
| File exists at `.claude/AGENT.md` | critical |
| Every `.claude/skills/<name>/` path mentioned exists | critical |
| Every `.claude/skills/<name>/scripts/<file>` mentioned exists | critical |
| Every `src/...` path mentioned exists (or is a glob pattern with at least one match) | major |
| Every `.agent-state/<file>` mentioned exists | major |
| Every `theme-config/<file>` mentioned exists | major |
| Skill catalog table lists every skill in `.claude/skills/` (no missing entries) | minor |

### Hooks (weight 10)

For each entry in `.claude/settings.json` + `.claude/settings.local.json` hooks section:

| Check | Severity |
|-------|----------|
| `command` field resolves (file exists OR command on PATH) | critical |
| If command is a path inside the repo, it is executable (mode +x for scripts) | major |
| If command is a `.cjs`/`.mjs`/`.js`, Node.js is on PATH | major |
| If command is a `.py`, `python` or `python3` is on PATH | major |

### MCP (weight 5)

For each entry in `.mcp.json` `mcpServers`:

| Check | Severity |
|-------|----------|
| Entry has either `command` or `type: "http"` with `url` | critical |
| If `command`: resolves on PATH or is absolute existing file | major |
| If HTTP: URL is well-formed (scheme + host) | minor |

No live connectivity test — that's flaky for ephemeral servers like `xo-design` (localhost only).

### Validators (weight 10)

| Check | Severity |
|-------|----------|
| `python .claude/skills/design-to-liquid/scripts/validate-schema.py --all` exits 0 | major |
| `python .claude/skills/planner/scripts/scan-inventory.py --help` exits 0 (smoke test, doesn't write) | minor |

Validators failing is a major signal because something in `src/` may be broken — but it's not critical to the `.claude/` system itself.

### State (weight 15)

| Check | Severity |
|-------|----------|
| `.agent-state/PROGRESS.md` exists | major |
| `.agent-state/PROGRESS.md` ≤ 500 lines (per AGENT.md growth policy) | major if >500 |
| `.agent-state/PLAN.md` exists | major |
| `.agent-state/INVENTORY.md` exists | minor if missing |
| `.agent-state/INVENTORY.md` modified within 14 days of last `src/sections/*/` mtime | minor if stale |

State staleness is mostly a hint that planner needs running, not a hard error.

### Shopify drift (weight 25)

Judgment-based, evidence-required. For each sampled topic per skill (5-8 topics total per audit run):

| Check | Severity |
|-------|----------|
| Topic still accurately described in skill (no contradictions with current shopify.dev) | major if wrong |
| New shopify.dev material on topic not yet in skill content | minor (additive gap) |
| Skill references deprecated API as primary recommendation | critical |
| Skill quotes specific numbers/limits that no longer match | major |

**Evidence requirement (do not skip):** Each Shopify-drift finding must cite either:
- A shopify.dev URL (preferred), or
- A doc section name + the relevant quoted text from context7's response

Findings without evidence are unverifiable and MUST be discarded — don't pad the report with vibes.

## Overall score interpretation

| Range | Verdict |
|-------|---------|
| 90-100 | System is in good shape. Minor polish at most. |
| 75-89  | Healthy but accumulating drift. Address majors when convenient. |
| 60-74  | Significant work needed. Address criticals before continuing porting. |
| < 60   | System is unreliable. Consider pausing feature work to restore correctness. |

## Static-check JSON schema

The `audit-static.py` script outputs the following JSON to stdout:

```json
{
  "schema_version": 1,
  "run_at": "2026-05-27T10:50:00Z",
  "repo_root": "/abs/path/to/repo",
  "categories": {
    "skills": {
      "score_base": 100,
      "findings": [
        {
          "severity": "critical|major|minor",
          "skill": "<skill-name>",
          "type": "<check-name>",
          "file": "<path>",
          "line": <int or null>,
          "detail": "<one-line>"
        }
      ]
    },
    "agent_md": { ... },
    "hooks": { ... },
    "mcp": { ... },
    "validators": { ... },
    "state": { ... }
  }
}
```

The `shopify_drift` category is NOT produced by the script — Claude assembles it in Step 2 of the workflow using context7 evidence.

## How to compute per-category score (formula)

```
score = max(0, score_base - 25*N_critical - 10*N_major - 3*N_minor)
```

Then:

```
overall = round(sum(score[cat] * weight[cat] for cat in categories) / 100)
```

If any category is missing (e.g., `.mcp.json` doesn't exist), exclude its weight from the denominator and renormalize the remaining weights.
