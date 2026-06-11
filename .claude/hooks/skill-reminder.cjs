#!/usr/bin/env node
/**
 * PreToolUse hook — skill-reminder
 *
 * Fires before Edit/Write tools. Emits a targeted system-reminder telling the
 * agent which skill(s) to consult based on the file path being edited.
 *
 * Soft enforcement: does NOT block the tool. Just injects a reminder into the
 * agent's context. Agent compliance is still required — but reminder hard to
 * ignore.
 *
 * Input: JSON via stdin (Claude Code passes tool details).
 * Output:
 *   - stderr: human-readable diagnostics (logged but not surfaced)
 *   - stdout: JSON `{ "hookSpecificOutput": { "additionalContext": "..." } }`
 *     to inject context for the next assistant turn.
 *
 * If we don't emit additionalContext, the tool runs as normal with no nudge.
 */

const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    process.exit(0);
  }

  const toolName = input.tool_name || input.toolName || '';
  const toolInput = input.tool_input || input.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || '';

  if (!filePath) {
    process.exit(0);
  }

  // Only handle Edit / Write / NotebookEdit tools.
  if (!['Edit', 'Write', 'NotebookEdit'].includes(toolName)) {
    process.exit(0);
  }

  const reminders = matchReminders(filePath);
  if (reminders.length === 0) {
    process.exit(0);
  }

  const context = formatReminder(filePath, reminders);

  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: context,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
});

/**
 * Match file path against patterns; return array of { skill, rules }.
 * Order matters — most-specific first.
 */
function matchReminders(filePath) {
  const out = [];

  const isSnippetLiquid = /\/src\/snippets\/.+\.liquid$/.test(filePath);
  const isSectionLiquid = /\/src\/sections\/.+\.liquid$/.test(filePath);
  const isBlockLiquid = /\/src\/blocks\/.+\.liquid$/.test(filePath);
  const isGroupLiquid = /\/src\/groups\/.+\.liquid$/.test(filePath);
  const isLayoutLiquid = /\/src\/layout\/.+\.liquid$/.test(filePath);
  const isAnyLiquid =
    isSnippetLiquid || isSectionLiquid || isBlockLiquid || isGroupLiquid || isLayoutLiquid;

  const isGlobalScss = /\.global\.scss$/.test(filePath);
  const isAnyScss = /\.scss$/.test(filePath);

  const isSchemaJs = /\/(sections|blocks|snippets)\/.+\/schema\.js$/.test(filePath);
  const isPresetJs = /\/(sections|blocks)\/.+\/preset-[0-9]+\.js$/.test(filePath);
  const isGlobalSchemaJs = /\/src\/config\/global-schema\/.+\.js$/.test(filePath);

  if (isSnippetLiquid) {
    out.push({
      skill: 'snippet',
      headline: 'Editing a snippet body',
      rules: [
        'Rule #1 — `{% comment %}` doc block at the top (delegate format to `liquid-doc` skill).',
        'Rule #2 — `{% liquid %}` prelude for assigns/defaults (not scattered `{% assign %}`).',
        'Rule #3 — `default: false, allow_false: true` for every boolean param.',
        'Rule #4 — `!= blank` for string/object "has value" checks (not booleans).',
        'Rule #5 — Render snippets by bare name, no folder prefix.',
        'Rule #6 — Root element class prefixed with `xo-<snippet-name>` (BEM).',
        'Rule #7 — Don\'t render empty wrappers. Guard the whole block.',
        'Rule #8 — Cap snippets at ~200 lines.',
      ],
      action:
        'Invoke `Skill(snippet)` before proceeding if not loaded this session. See PROGRESS 5b for the allow_false miss.',
    });
  }

  if (isSectionLiquid) {
    out.push({
      skill: 'design-to-liquid + snippet',
      headline: 'Editing a section body',
      rules: [
        'Section wrapper: `{%- capture content -%} … {%- endcapture -%}` then `{% render \'section\', content: content %}` (never hand-roll `<section><xo-container>…padding…</section>`).',
        'BEFORE rendering any `{% render \'X\' %}` — run the variant audit (`design-to-liquid` Step 2). Read BOTH `design/src/components/X/` AND `src/snippets/X/`; don\'t reuse if visual archetypes differ.',
        'Class composition follows `snippet` rule #6 (BEM root) + atomic XO-CSS where the section\'s CSS strategy (clarify Q7) allows.',
      ],
      action:
        'Invoke `Skill(design-to-liquid)` for Step 2/3 patterns + `Skill(snippet)` for class/render conventions.',
    });
  }

  if (isBlockLiquid || isGroupLiquid || isLayoutLiquid) {
    out.push({
      skill: 'snippet + liquid',
      headline: `Editing ${isBlockLiquid ? 'a block' : isGroupLiquid ? 'a group' : 'a layout'} body`,
      rules: [
        '`{{ block.shopify_attributes }}` on the block root element (theme blocks only).',
        'Snippet-style render conventions: `{% liquid %}` prelude, `allow_false: true` booleans, conditional wrappers, no empty wrappers.',
      ],
      action: 'Invoke `Skill(liquid)` + `Skill(snippet)` for body patterns.',
    });
  }

  if (isGlobalScss) {
    out.push({
      skill: 'scss',
      headline: 'Editing a component SCSS (`.global.scss`)',
      rules: [
        'Use framework helpers — `color(<name>)`, `fz(<size>)`, `lh(...)`, `ls(...)`. No raw hex / px / rem values.',
        'VERIFY `color(<name>)` and `fz:<token>` args against `theme-config/theme.config.json` (`css.colors` map for color names; `css.headingSizes` for heading fz tokens — body fz uses direct rem like `fz:1.4rem`, not tokenized) BEFORE writing. Common slips: `color(layer-2)` (does NOT exist; use `color(layer)`), `color(foreground-3)` (does NOT exist; use `color(foreground)` or `color(foreground-2)`). Undefined references compile to empty CSS silently.',
        'Media queries via `@include media(\'>md\')` mixin — not raw `@media (min-width: …)`.',
        'BEM naming: `.xo-block`, `.xo-block__element`, `.xo-block--modifier`.',
        'Tier-3 styles (hover chains, keyframes, pseudo-elements, complex selectors) ALWAYS land in SCSS regardless of project CSS strategy.',
        'Atomic-eligible styles (layout, spacing, typography, simple state) — check clarify-protocol Q7 answer for this section: if "XO-CSS-first", lift atomic styles to liquid classes; SCSS file should only carry tier-3. Atomic body-size = direct rem (e.g. `fz:1.4rem`), NOT a SCSS `fz(body, N)` call moved to sidecar.',
      ],
      action: 'Invoke `Skill(scss)` before authoring.',
    });
  } else if (isAnyScss && !isGlobalScss) {
    out.push({
      skill: 'scss',
      headline: 'Editing shared SCSS',
      rules: [
        'Use framework helpers (`color()`, `fz()`, `media()`).',
        'No raw hex / px in component-scope styles.',
      ],
      action: 'Invoke `Skill(scss)` for framework helper reference.',
    });
  }

  if (isSchemaJs || isPresetJs || isGlobalSchemaJs) {
    const flavor = isPresetJs
      ? 'a preset (`preset-N.js`)'
      : isGlobalSchemaJs
      ? 'a global schema (theme settings)'
      : 'a section/block schema';
    out.push({
      skill: 'schema',
      headline: `Editing ${flavor}`,
      rules: [
        'Use the project builder API — `createSectionSchema` / `createBlockSchema` / `createGlobalSchema` / `createSchemaSettings` / `createPreset` / `visible()` / `deviceSetting()`.',
        'Spread `...sectionSchemaSettings(...)`, `...layoutSchemaSettings(...)`, and snippet helper settings as needed — do NOT re-declare overlapping IDs.',
        'Label hygiene: AmE spelling, no banned phrases (CTA / X position / Y position / homepage / slider / sub-heading / shortcut icon / button text). No `&` or `?` in labels.',
        'BEFORE referencing `Category.Section.X` or `Category.Block.X` — read `src/constants.js`. Common slips: `Section.Products` (plural) NOT `Section.Product`; `Block.Product` (singular) NOT `Block.Products`. Undefined references compile to `undefined` silently.',
        'Theme blocks are OFF by default — do NOT declare new `blocks: [{ type: "@app" }, …]` referencing files in `src/blocks/` unless user explicitly opted in. Default to INLINE blocks (full settings declared in this section schema).',
        `After editing, run: \`python .claude/skills/design-to-liquid/scripts/validate-schema.py <section-dir>\` (add \`--strict\` for Theme Store warnings).`,
      ],
      action: 'Invoke `Skill(schema)`. Validate after every edit.',
    });
  }

  return out;
}

function formatReminder(filePath, reminders) {
  const lines = [];
  lines.push(`⚠️ skill-reminder hook fired for: ${filePath}`);
  lines.push('');
  for (const r of reminders) {
    lines.push(`### ${r.headline}`);
    lines.push(`Skill: **${r.skill}**`);
    lines.push('Key rules:');
    for (const rule of r.rules) {
      lines.push(`  - ${rule}`);
    }
    lines.push(`→ ${r.action}`);
    lines.push('');
  }
  lines.push(
    '(Soft reminder — does NOT block the edit. Acknowledge by invoking the listed Skill if not already loaded this session.)',
  );
  return lines.join('\n');
}
