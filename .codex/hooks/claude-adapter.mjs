#!/usr/bin/env node
// claude-adapter.mjs: run one of the theme's Claude Code hook scripts under Codex hooks.
//
// .claude/ stays the single source of truth. This file holds NO rules: it only reshapes
// Codex's hook payload into the Claude Code shape, runs the unchanged script, and maps
// the script's answer back onto Codex's output contract. No dependencies (Node >= 18).
//
// Usage (see .codex/hooks.json):
//   node <root>/.codex/hooks/claude-adapter.mjs <script path relative to the theme root>
//   .js / .cjs / .mjs scripts run with node, anything else with bash.
//
// Environment the script sees:
//   CLAUDE_PROJECT_DIR = theme root (nearest dir with .claude/ above this file, else the
//                        session cwd). Codex sets no project-dir variable of its own.
//   XO_HOOK_HOST=codex   lets a script tell the hosts apart if it ever needs to.
//   Everything else is inherited (the xo-design panel sets XO_DESIGN_PORT / XO_DESIGN_CHAT).
//
// Payload translation (Codex -> what the Claude script receives on stdin):
//   apply_patch {command: "*** Begin Patch ..."}  one payload per patched file:
//     *** Add File: p                              Write {file_path: abs, content}
//     *** Update File: p  (@@ hunks)               Edit  {file_path: abs, old_string, new_string}  (first hunk)
//     *** Update File: p + *** Move to: q          Edit on p before the patch, on q after it
//     *** Delete File: p                           skipped (Claude has no delete tool)
//   request_user_input {questions}                 AskUserQuestion (same questions[].header shape)
//   mcp__xo_design__ask_user_question {questions}  AskUserQuestion (the xo-design MCP twin: same input)
//   spawn_agent {message}                          Agent {description, prompt}
//   mcp__xo_design__set_status (MCP tools)         unchanged. Codex writes server names with "_"
//                                                  (mcp__xo_design__x, Claude: mcp__xo-design__x);
//                                                  agent-presence.ts matches on the __<tool> suffix,
//                                                  so both forms work without renaming.
//   everything else                                unchanged (Bash, Stop, Subagent*, SessionEnd: the
//                                                  field names already match Claude's)
//
// Result translation (script -> Codex):
//   exit 2 on PostToolUse  -> {"decision":"block","reason":...}: Codex shows the reason to the
//                             model in place of the tool output (the edit itself is NOT undone,
//                             so the reason says the call completed)
//   exit 2 on other events -> exit 2 + stderr (PreToolUse: Codex blocks the call, same as Claude)
//   stdout JSON            -> passed through (hookSpecificOutput.permissionDecision "deny",
//                             additionalContext: Codex accepts Claude's shape as-is)
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT_TIMEOUT_MS = 8000

const script = process.argv[2]
if (!script) process.exit(0)

let input = {}
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}') } catch { process.exit(0) }
const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd()
const ROOT = themeRoot()
const scriptPath = path.resolve(ROOT, script)
if (!fs.existsSync(scriptPath)) process.exit(0) // a stale hooks.json must never break a tool call

/** Nearest directory with a .claude/ folder above this file, then above the session cwd; else cwd. */
function themeRoot() {
  for (const start of [HERE, cwd]) {
    for (let d = path.resolve(start); ; d = path.dirname(d)) {
      if (fs.existsSync(path.join(d, '.claude'))) return d
      if (path.dirname(d) === d) break
    }
  }
  return cwd
}

/** Parse a Codex apply_patch body into per-file changes. Paths stay as written (cwd-relative). */
function parsePatch(patch) {
  const files = []
  let cur = null
  for (const line of String(patch).split('\n')) {
    let m
    if ((m = /^\*\*\* Add File: (.+)$/.exec(line))) files.push((cur = { kind: 'add', file: m[1], lines: [] }))
    else if ((m = /^\*\*\* Update File: (.+)$/.exec(line))) files.push((cur = { kind: 'update', file: m[1], move: null, hunks: [] }))
    else if ((m = /^\*\*\* Delete File: (.+)$/.exec(line))) files.push((cur = { kind: 'delete', file: m[1] }))
    else if ((m = /^\*\*\* Move to: (.+)$/.exec(line))) { if (cur?.kind === 'update') cur.move = m[1] }
    else if (/^\*\*\* End Patch/.test(line)) cur = null
    else if (/^\*\*\* (Begin Patch|End of File)/.test(line)) continue
    else if (cur?.kind === 'add') { if (line.startsWith('+')) cur.lines.push(line.slice(1)) }
    else if (cur?.kind === 'update') {
      // "@@ <context>" opens a hunk; ' ' lines are context (both sides), '-' old only, '+' new only.
      if (line.startsWith('@@') || !cur.hunks.length) cur.hunks.push({ old: [], neu: [] })
      if (line.startsWith('@@')) continue
      const h = cur.hunks[cur.hunks.length - 1]
      if (line.startsWith('-')) h.old.push(line.slice(1))
      else if (line.startsWith('+')) h.neu.push(line.slice(1))
      else if (line.startsWith(' ') || line === '') { h.old.push(line.slice(1)); h.neu.push(line.slice(1)) }
    }
  }
  return files
}

/** One Codex payload -> the Claude payload(s) the script should see. */
function toClaude(p) {
  if (p.tool_name === 'apply_patch') {
    const abs = (f) => (path.isAbsolute(f) ? f : path.resolve(cwd, f))
    const post = p.hook_event_name === 'PostToolUse'
    const seen = new Set()
    const out = []
    for (const c of parsePatch(p.tool_input?.command ?? p.tool_input?.input ?? '')) {
      let claude
      if (c.kind === 'add') {
        claude = { tool_name: 'Write', tool_input: { file_path: abs(c.file), content: c.lines.join('\n') + '\n' } }
      } else if (c.kind === 'update') {
        // The first hunk that changes something: where the preview cursor should land.
        const h = c.hunks.find((x) => x.old.join('\n') !== x.neu.join('\n')) || c.hunks[0] || { old: [], neu: [] }
        // A moved file: before the patch it lives at the old path, after it at the new one.
        const file = abs(post && c.move ? c.move : c.file)
        claude = { tool_name: 'Edit', tool_input: { file_path: file, old_string: h.old.join('\n'), new_string: h.neu.join('\n') } }
      } else continue
      // A file listed twice in one patch is still one file for the scripts.
      if (seen.has(claude.tool_input.file_path)) continue
      seen.add(claude.tool_input.file_path)
      out.push({ ...p, ...claude })
    }
    return out
  }
  if (p.tool_name === 'request_user_input' || /^mcp__xo[-_]design__ask_user_question$/.test(p.tool_name)) return [{ ...p, tool_name: 'AskUserQuestion' }]
  if (p.tool_name === 'spawn_agent') {
    const msg = String(p.tool_input?.message ?? p.tool_input?.prompt ?? '')
    return [{ ...p, tool_name: 'Agent', tool_input: { description: msg.replace(/\s+/g, ' ').trim().slice(0, 200), prompt: msg } }]
  }
  return [p]
}

const env = { ...process.env, CLAUDE_PROJECT_DIR: ROOT, XO_HOOK_HOST: 'codex' }
const blocked = []
let jsonOut = null
for (const payload of toClaude(input)) {
  const r = spawnSync(/\.[cm]?js$/.test(scriptPath) ? process.execPath : 'bash', [scriptPath], { input: JSON.stringify(payload), env, cwd: ROOT, encoding: 'utf8', timeout: SCRIPT_TIMEOUT_MS })
  if (r.status === 2) blocked.push((r.stderr || '').trim())
  const so = (r.stdout || '').trim()
  if (so.startsWith('{')) { try { jsonOut = JSON.parse(so) } catch { /* not JSON: ignore like Claude does */ } }
}

if (blocked.length) {
  const reason = blocked.filter(Boolean).join('\n') || `${path.basename(script)} blocked this call`
  if (input.hook_event_name === 'PostToolUse') {
    process.stdout.write(JSON.stringify({ decision: 'block', reason: `The tool call completed, but a project hook flagged it:\n${reason}` }))
    process.exit(0)
  }
  process.stderr.write(reason)
  process.exit(2)
}
if (jsonOut) process.stdout.write(JSON.stringify(jsonOut))
process.exit(0)
