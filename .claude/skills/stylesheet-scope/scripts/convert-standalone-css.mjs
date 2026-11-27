#!/usr/bin/env node
// Finds the Dawn-style leftovers an earlier attempt may have left in the theme and converts them to the
// {% stylesheet %} flow:
//   - a non-global `X.scss` next to a section / snippet → vite-xotiny compiles it standalone into shopify/assets/X.css
//   - the liquid links it with `{{ 'X.css' | asset_url | stylesheet_tag }}` → a render-blocking <link> inside <body>,
//     discovered late (exactly what stylesheet-scope removes)
//
//   node .claude/skills/stylesheet-scope/scripts/convert-standalone-css.mjs            # report only
//   node .claude/skills/stylesheet-scope/scripts/convert-standalone-css.mjs --apply    # rename X.scss → X.global.scss,
//                                                                                      # drop the stylesheet_tag line, delete the asset
//
// Left alone on purpose: src/styles/single/*.scss (layouts such as password / gift_card link them from <head>),
// layout files, and assets without a source (reported as stale so the theme can delete them).
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apply = process.argv.includes('--apply');

function walk(dir, test, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, test, acc);
    else if (test(p)) acc.push(path.relative(root, p).split(path.sep).join('/'));
  }
  return acc;
}
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// 1. standalone scss under component folders (not .global, not .module, not styles/)
const standalone = walk(path.join(root, 'src'), (p) => /\.scss$/.test(p) && !/\.(global|module)\.scss$/.test(p) && !/\/src\/styles\//.test(p));
// 2. stylesheet_tag links inside sections / snippets / groups / blocks / pages (layouts excluded)
const liquids = walk(path.join(root, 'src'), (p) => p.endsWith('.liquid') && !/\/src\/layout\//.test(p));
const TAG_RE = /^[ \t]*\{\{-?\s*['"]([\w.-]+)\.css['"]\s*\|\s*asset_url\s*\|\s*stylesheet_tag[^}]*\}\}[ \t]*\n?/gm;
const links = [];
for (const f of liquids) for (const m of read(f).matchAll(TAG_RE)) links.push({ liquid: f, asset: m[1], line: m[0].trim() });

const assetsDir = path.join(root, 'shopify/assets');
const plan = [];
for (const scss of standalone) {
  const base = path.basename(scss, '.scss');
  const dir = path.dirname(scss);
  const usedBy = links.filter((l) => l.asset === base);
  const target = `${dir}/${base.replace(/^section-/, '')}.global.scss`;
  plan.push({ scss, target, asset: `shopify/assets/${base}.css`, usedBy });
}
const stale = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((n) => n.endsWith('.css') && !/^(styles|xo-)/.test(n) && !standalone.some((s) => path.basename(s, '.scss') === n.replace(/\.css$/, '')) && !fs.existsSync(path.join(root, 'src/styles/single', n.replace(/\.css$/, '.scss'))))
  : [];

console.log(`Standalone component scss (compiled to shopify/assets/*.css): ${plan.length}`);
for (const p of plan) {
  console.log(`  ${p.scss}\n      → ${p.target}${p.usedBy.length ? `\n      linked by: ${p.usedBy.map((u) => u.liquid).join(', ')}` : '\n      (no liquid links its css: dead or linked by a layout — check before applying)'}`);
}
const orphanLinks = links.filter((l) => !plan.some((p) => path.basename(p.scss, '.scss') === l.asset) && !fs.existsSync(path.join(root, 'src/styles/single', `${l.asset}.scss`)));
if (orphanLinks.length) {
  console.log(`\nstylesheet_tag links to assets with no component scss (leave or fix by hand): ${orphanLinks.length}`);
  for (const l of orphanLinks) console.log(`  ${l.liquid}: ${l.line}`);
}
if (stale.length) console.log(`\nStale assets without a source (safe to delete): ${stale.map((n) => `shopify/assets/${n}`).join(', ')}`);

if (!apply) {
  console.log('\nDry run. Add --apply to rename the scss files, remove the stylesheet_tag lines and delete the assets.');
  process.exit(0);
}
for (const p of plan) {
  if (!p.usedBy.length) {
    console.log(`skip ${p.scss}: no liquid links it (decide by hand)`);
    continue;
  }
  if (fs.existsSync(path.join(root, p.target))) {
    console.log(`skip ${p.scss}: ${p.target} already exists`);
    continue;
  }
  fs.renameSync(path.join(root, p.scss), path.join(root, p.target));
  for (const u of p.usedBy) {
    const abs = path.join(root, u.liquid);
    fs.writeFileSync(abs, read(u.liquid).replace(new RegExp(`^[ \\t]*\\{\\{-?\\s*['"]${p.asset.replace(/^shopify\/assets\//, '').replace('.', '\\.')}['"][^}]*\\}\\}[ \\t]*\\n?`, 'm'), ''));
    // vite-xotiny only regenerates shopify/ in dev: mirror the removal into the compiled copy if present
    const compiled = path.join(root, 'shopify', /\/snippets\//.test(u.liquid) ? 'snippets' : 'sections', path.basename(u.liquid));
    if (fs.existsSync(compiled)) fs.writeFileSync(compiled, fs.readFileSync(compiled, 'utf8').replace(new RegExp(`^[ \\t]*\\{\\{-?\\s*['"]${p.asset.replace(/^shopify\/assets\//, '').replace('.', '\\.')}['"][^}]*\\}\\}[ \\t]*\\n?`, 'm'), ''));
  }
  if (fs.existsSync(path.join(root, p.asset))) fs.unlinkSync(path.join(root, p.asset));
  console.log(`converted ${p.scss} → ${p.target}; removed link in ${p.usedBy.map((u) => u.liquid).join(', ')}; deleted ${p.asset}`);
}
for (const n of stale) {
  fs.unlinkSync(path.join(assetsDir, n));
  console.log(`deleted stale shopify/assets/${n}`);
}
console.log('\nNow run: node scripts/xo-stylesheet.mjs   (the renamed files are picked up as scoped or, if AJAX-loaded, add them to exclude first)');
