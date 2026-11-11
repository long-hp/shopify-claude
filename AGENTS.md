# AGENTS.md

This theme's agent instructions live in `.claude/` (shared with Claude Code). `.claude/` is the single source of truth; do not copy its rules here.

1. Read `.claude/AGENT.md` before doing any work and follow it as your project instructions (language, working philosophy, state docs, skill catalog, validators, key conventions). Where it says CLAUDE.md, it means this setup.
2. Skills: when the user types `/<name>` (or `$<name>`), or the task clearly matches a skill, read `.claude/skills/<name>/SKILL.md` in full and follow it. Load files from its `references/` only when the skill tells you to. Skill list: `ls .claude/skills`. (Codex also loads them natively through the `.codex/skills` → `../.claude/skills` symlink, so `$<name>` works once the project is trusted.)
3. Tools named in those files that you don't have:
   - AskUserQuestion (or any multiple-choice question for the user): call the xo-design MCP tool `ask_user_question` (`mcp__xo_design__ask_user_question`) with the same fields, `preview` included. If it replies that no panel is attached, ask in plain text with numbered options.
   - Agent / Task subagents: do the work yourself, in order.
   - Skill tool: read the SKILL.md as in step 2.
   - TodoWrite: use your own plan tool.
   - Hooks: the skill-reminder hook (which skill to load before editing a liquid / scss / schema file) runs under Codex too, via `.codex/hooks.json`. In the terminal, trust it once via `/hooks`, and again after any edit to that file. If it isn't trusted, check the "Skill catalog" table in `.claude/AGENT.md` before editing.
4. MCP servers come from `.codex/config.toml`, which is generated from `.mcp.json` (`node .codex/scripts/sync-codex-config.mjs`). Codex names their tools `mcp__xo_design__…` / `mcp__xo_components__…`, where Claude's files write `mcp__xo-design__…`; they are the same tools. If a server is not available, say so and continue without it.
5. The design source is `design/` (an XO Design Studio project: `brand.md`, `design-system.md`, `blueprint-*.md`, `src/`); `design/xo-design/` is its preview dashboard. Liquid output goes to `src/`.
6. Codex's sandbox blocks network (localhost included) and Chromium, so prefer the xo-design / playwright MCP tools for render and screenshot checks, or run browser scripts with full access.
7. Never commit or push unless the user asks.
