// @ts-nocheck
/**
 * xo-stylesheet — puts the CSS of each section / page / group / block / snippet into the `{% stylesheet %}` tag of
 * its own liquid file instead of concatenating everything into styles.css.
 *
 * Why: Shopify gathers the `{% stylesheet %}` CSS of every file in the CURRENT PAGE's render tree into one file,
 * linked from content_for_header (head, Early Hints). A section that is not on the page costs nothing; a section
 * dragged into any page brings its CSS along. One early request — unlike the Dawn-style split (a <link> inside
 * each section: discovered late in <body>, one RTT per section).
 *
 * How (wraps vite-xotiny, never fights it):
 *   1. vite-xotiny keeps generating src/styles/global.scss from every *.global.scss. This plugin writes
 *      src/styles/global.shared.scss = the same list MINUS the scoped files. main.scss imports the shared file.
 *   2. Each scoped file: prepend the basehtml abstracts (mixins / functions only), compile with sass `expanded` (readable),
 *      inject `{% stylesheet %}…{% endstylesheet %}` into the matching liquid under shopify/ (before `{% schema %}`
 *      for sections, at the end for snippets). Idempotent: the old block is replaced, unchanged files are not
 *      rewritten.
 *   3. Dev: re-run on scss changes (Vite's watcher) and whenever vite-xotiny regenerates a liquid under shopify/
 *      (own fs.watch, because server.watch.ignored skips shopify/**).
 *
 * Config: theme-config/stylesheet.config.json (template: stylesheet-scope skill → assets/stylesheet.config.json).
 * CLI: node scripts/xo-stylesheet.mjs [--check] [--report] [--cleanup]
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fg from 'fast-glob';

export const CONFIG_FILE = 'theme-config/stylesheet.config.json';

export const DEFAULT_CONFIG = {
  // Folders / globs under src whose *.global.scss go into {% stylesheet %} (trailing ** = subfolders too)
  include: ['src/sections/**', 'src/pages/**', 'src/groups/**', 'src/blocks/**', 'src/snippets/**'],
  // Keep in the shared file: HTML that arrives via AJAX (quick view, Section Rendering API, predictive search) is
  // not in the initial render tree, so Shopify never ships its {% stylesheet %} CSS. Folder paths or globs,
  // relative to the theme root.
  exclude: [],
  // scss → liquid when it cannot be inferred (folder with several liquids, none sharing the scss basename):
  // { "src/snippets/price/price.global.scss": ["price.liquid", "unit-price.liquid"] }
  targets: {},
  // Shared mixins / functions, prepended when each file is compiled on its own
  abstractsDir: '../../html/basehtml/src/styles/abstracts',
  sharedFile: 'src/styles/global.shared.scss',
  // Theme build folder (vite-xotiny themeRoot)
  themeRoot: 'shopify',
  // CSS written inside {% stylesheet %}: 'expanded' (default — readable in the liquid file, diffs and the theme
  // editor; Shopify serves it compressed anyway) or 'compressed'
  cssStyle: 'expanded',
};

// Same order as vite-xotiny (styles.js) so the cascade inside the shared file does not change
const GLOBAL_PATTERNS = ['src/pages', 'src/snippets', 'src/groups', 'src/sections'].flatMap((d) => [`${d}/**/*.global.scss`, `${d}/**/*.global.css`]);

export function loadConfig(root) {
  const file = path.join(root, CONFIG_FILE);
  let user = {};
  if (fs.existsSync(file)) user = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { ...DEFAULT_CONFIG, ...user, targets: { ...(user.targets || {}) } };
}

/** sass is rarely a direct dependency of the theme; resolve it through vite / vite-xotiny */
export async function loadSass(root) {
  const req = createRequire(path.join(root, 'package.json'));
  const bases = [root];
  for (const pkg of ['vite', '@xotiny-private/vite-xotiny', 'xo-css']) {
    try {
      bases.push(path.dirname(req.resolve(`${pkg}/package.json`)));
    } catch {
      try {
        bases.push(path.dirname(req.resolve(pkg)));
      } catch {}
    }
  }
  let resolved = null;
  for (const base of bases) {
    try {
      resolved = req.resolve('sass', { paths: [base] });
      break;
    } catch {}
  }
  if (!resolved) throw new Error('[xo-stylesheet] cannot resolve the sass package');
  const mod = await import(pathToFileURL(resolved).href);
  return mod.compileString ? mod : mod.default;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** include / exclude entries: folder, file or glob → glob over *.global.{scss,css} */
function expand(root, patterns) {
  const globs = [];
  for (const raw of patterns || []) {
    const p = toPosix(raw).replace(/\/+$/, '');
    if (/\.(scss|css)$/.test(p)) globs.push(p);
    else if (p.endsWith('/**')) globs.push(`${p}/*.global.{scss,css}`);
    else if (fg.isDynamicPattern(p)) globs.push(p);
    else globs.push(`${p}/**/*.global.{scss,css}`);
  }
  return new Set(fg.sync(globs, { cwd: root }).map(toPosix));
}

export function collect(root, cfg) {
  const all = fg.sync(GLOBAL_PATTERNS, { cwd: root }).map(toPosix);
  const inc = expand(root, cfg.include);
  const exc = expand(root, cfg.exclude);
  const unmapped = [];
  const scoped = all.filter((f) => {
    if (!inc.has(f) || exc.has(f)) return false;
    // No liquid next to it (a partial imported by other scss) → nowhere to inject, keep it shared
    if (!sourceLiquids(root, cfg, f).length) {
      unmapped.push(f);
      return false;
    }
    return true;
  });
  const shared = all.filter((f) => !scoped.includes(f));
  return { all, scoped, shared, unmapped };
}

function abstractsImports(root, cfg) {
  const dir = path.resolve(root, cfg.abstractsDir);
  if (!fs.existsSync(dir)) {
    // Fallback: reuse the abstracts @import lines vite-xotiny writes at the top of global.scss
    const g = path.join(root, 'src/styles/global.scss');
    if (!fs.existsSync(g)) return [];
    return fs
      .readFileSync(g, 'utf8')
      .split('\n')
      .filter((l) => /^@import\s+["'].*\/abstracts\//.test(l));
  }
  return fg
    .sync('**/*.scss', { cwd: dir })
    .sort()
    .map((f) => `@import "${toPosix(path.join(dir, f))}";`);
}

/** src/styles/global.shared.scss: global.scss minus the scoped files */
export async function writeShared(root, cfg, { shared }) {
  const header = abstractsImports(root, cfg);
  const body = shared.map((f) => `@import "../../${f}";`);
  const content = `// GENERATED by xo-stylesheet.vite-plugin.js — do not edit.\n// = global.scss minus the files that went into {% stylesheet %} (${CONFIG_FILE}).\n${header.join('\n')}\n\n${body.join('\n')}\n`;
  const file = path.join(root, cfg.sharedFile);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (prev !== content) await fsp.writeFile(file, content);
  return prev !== content;
}

export async function compileScoped(root, cfg, sass, file) {
  const abs = path.join(root, file);
  const source = `${abstractsImports(root, cfg).join('\n')}\n@import "${toPosix(abs)}";\n`;
  const result = sass.compileString(source, {
    style: cfg.cssStyle === 'compressed' ? 'compressed' : 'expanded',
    loadPaths: [root, path.join(root, 'src/styles')],
    // Virtual url in the same folder: relative @imports inside the file resolve, without importing itself
    url: pathToFileURL(`${abs}.xo-stylesheet.scss`),
    quietDeps: true,
    logger: { warn() {}, debug() {} },
  });
  return result.css.replace(/^@charset "UTF-8";/, '').trim();
}

/** Source liquid file(s) this scss belongs to */
export function sourceLiquids(root, cfg, file) {
  const dir = path.dirname(file);
  const base = path.basename(file).replace(/\.global\.(scss|css)$/, '');
  const liquids = fg.sync('*.liquid', { cwd: path.join(root, dir) }).sort();
  if (cfg.targets[file]) return cfg.targets[file].map((l) => toPosix(path.join(dir, l)));
  if (liquids.includes(`${base}.liquid`)) return [toPosix(path.join(dir, `${base}.liquid`))];
  if (liquids.length === 1) return [toPosix(path.join(dir, liquids[0]))];
  return [];
}

/** src/.../X.liquid → shopify/<sections|snippets|blocks>/X.liquid. Snippets may live under src/pages/<page>/snippets/ */
export function outputLiquid(cfg, srcLiquid) {
  const name = path.basename(srcLiquid);
  if (/(^|\/)snippets\//.test(srcLiquid)) return `${cfg.themeRoot}/snippets/${name}`;
  if (/(^|\/)blocks\//.test(srcLiquid)) return `${cfg.themeRoot}/blocks/${name}`;
  return `${cfg.themeRoot}/sections/${name}`;
}

const BLOCK_RE = /\n*\{%-?\s*stylesheet\s*-?%\}[\s\S]*?\{%-?\s*endstylesheet\s*-?%\}\n*/g;

/** Remove a previously injected block, if any */
export function stripBlock(liquid) {
  return liquid.replace(BLOCK_RE, '\n');
}

/**
 * Inject the block: always strip the old one and re-insert with a fixed layout (one blank line before and after,
 * file ends with exactly one newline) so repeated runs produce identical output.
 */
export function injectBlock(liquid, css) {
  const base = stripBlock(liquid);
  const block = `{% stylesheet %}\n${css}\n{% endstylesheet %}`;
  const schema = base.search(/\{%-?\s*schema\s*-?%\}/);
  if (schema >= 0) return `${base.slice(0, schema).replace(/\s*$/, '')}\n\n${block}\n\n${base.slice(schema).replace(/\s*$/, '')}\n`;
  return `${base.replace(/\s*$/, '')}\n\n${block}\n`;
}

/**
 * One full pass. check=true: write nothing, only report which files would change (CI).
 * Returns { scoped, shared, unmapped, injected, unchanged, missing, removed, collisions, errors, bytes }.
 */
export async function run(root, { check = false, log = () => {}, only = null } = {}) {
  const cfg = loadConfig(root);
  const sass = await loadSass(root);
  const sets = collect(root, cfg);
  const stats = { ...sets, injected: [], unchanged: [], missing: [], removed: [], collisions: [], errors: [], bytes: 0, sharedChanged: false };
  if (!check) stats.sharedChanged = await writeShared(root, cfg, sets);
  // Group by target liquid: several scss files may point at the same liquid (multi-file folder) → one block
  const byLiquid = new Map();
  for (const file of sets.scoped) {
    let css;
    try {
      css = await compileScoped(root, cfg, sass, file);
    } catch (error) {
      stats.errors.push({ file, message: error.message.split('\n')[0] });
      continue;
    }
    stats.bytes += Buffer.byteLength(css);
    for (const src of sourceLiquids(root, cfg, file)) {
      const out = outputLiquid(cfg, src);
      if (!byLiquid.has(out)) byLiquid.set(out, { css: [], files: [], srcs: new Set() });
      byLiquid.get(out).css.push(css);
      byLiquid.get(out).files.push(file);
      byLiquid.get(out).srcs.add(src);
    }
  }
  for (const [out, { css, files, srcs }] of byLiquid) {
    // Two source liquids in different folders with the same basename → vite-xotiny keeps only one; flag it
    if (srcs.size > 1) stats.collisions.push(`${out} ← ${[...srcs].join(' + ')}`);
    if (only && !files.some((f) => only.includes(f))) continue;
    const abs = path.join(root, out);
    if (!fs.existsSync(abs)) {
      stats.missing.push(out);
      continue;
    }
    const prev = fs.readFileSync(abs, 'utf8');
    // A hand-written {% stylesheet %} in the SOURCE liquid is the author's: keep it first, append the compiled CSS
    // (Shopify allows one tag per file, so both go into the same block)
    const authored = [...srcs].map((src) => authoredCss(path.join(root, src))).filter(Boolean);
    const next = injectBlock(prev, [...authored, ...css.filter(Boolean)].join('\n'));
    if (next === prev) stats.unchanged.push(out);
    else {
      stats.injected.push(out);
      if (!check) await fsp.writeFile(abs, next);
    }
  }
  // A file that moved from scoped to shared (typically added to "exclude" because its HTML arrives via AJAX) still
  // carries the block injected earlier under shopify/. Strip it so the CSS lives only in the shared file, and make
  // --check report the stale state. Left alone: liquids still targeted by another scoped scss, and liquids whose
  // SOURCE hand-writes its own {% stylesheet %} (vite-xotiny copies that one; it is not ours to remove).
  for (const file of sets.shared) {
    for (const src of sourceLiquids(root, cfg, file)) {
      const out = outputLiquid(cfg, src);
      if (byLiquid.has(out)) continue;
      if (authoredCss(path.join(root, src)) !== null) continue;
      const abs = path.join(root, out);
      if (!fs.existsSync(abs)) continue;
      const prev = fs.readFileSync(abs, 'utf8');
      if (!hasBlock(prev)) continue;
      const next = `${stripBlock(prev).replace(/\s*$/, '')}\n`;
      stats.removed.push(out);
      stats.injected.push(out);
      if (!check) await fsp.writeFile(abs, next);
    }
  }
  log(stats);
  return stats;
}

const hasBlock = (liquid) => /\{%-?\s*stylesheet\s*-?%\}/.test(liquid);

/** CSS of a hand-written {% stylesheet %} in a source liquid, or null when the file has none */
function authoredCss(srcAbs) {
  if (!fs.existsSync(srcAbs)) return null;
  const m = fs.readFileSync(srcAbs, 'utf8').match(/\{%-?\s*stylesheet\s*-?%\}([\s\S]*?)\{%-?\s*endstylesheet\s*-?%\}/);
  return m ? m[1].trim() : null;
}

/** Remove every injected block (when disabling the plugin) */
export async function cleanup(root) {
  const cfg = loadConfig(root);
  const files = fg.sync([`${cfg.themeRoot}/sections/*.liquid`, `${cfg.themeRoot}/snippets/*.liquid`, `${cfg.themeRoot}/blocks/*.liquid`], { cwd: root });
  let n = 0;
  for (const f of files) {
    const abs = path.join(root, f);
    const prev = fs.readFileSync(abs, 'utf8');
    const next = stripBlock(prev);
    if (next !== prev) {
      await fsp.writeFile(abs, next);
      n++;
    }
  }
  return n;
}

export function summary(stats) {
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  const lines = [`xo-stylesheet: ${stats.scoped.length} files scoped (${kb(stats.bytes)} css), ${stats.shared.length} files kept in the shared stylesheet`];
  if (stats.injected.length) lines.push(`  injected / updated: ${stats.injected.length} liquid files`);
  if (stats.removed.length) lines.push(`  stale block removed (scss now in the shared file): ${stats.removed.join(', ')}`);
  if (stats.missing.length) lines.push(`  target liquid not generated yet under shopify/ (run dev once so vite-xotiny writes it): ${stats.missing.length}`);
  if (stats.unmapped.length) lines.push(`  no liquid next to the scss, kept shared (or declare "targets"): ${stats.unmapped.join(', ')}`);
  for (const c of stats.collisions) lines.push(`  duplicate liquid basename under shopify/, both CSS blocks merged: ${c}`);
  for (const e of stats.errors) lines.push(`  compile error ${e.file}: ${e.message}`);
  return lines.join('\n');
}

export default function xoStylesheetPlugin() {
  let root = process.cwd();
  let cfg;
  let timer = null;
  let running = false;
  let pending = false;
  const schedule = (server, only) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (running) {
        pending = true;
        return;
      }
      running = true;
      try {
        const stats = await run(root, { only });
        if (stats.injected.length || stats.sharedChanged) server?.config.logger.info(`[xo-stylesheet] ${stats.injected.length} liquid files updated`);
      } catch (error) {
        server?.config.logger.error(`[xo-stylesheet] ${error.message}`);
      }
      running = false;
      if (pending) {
        pending = false;
        schedule(server, null);
      }
    }, 150);
  };

  return {
    name: 'xo-stylesheet',
    enforce: 'post',
    configResolved(config) {
      root = config.root || process.cwd();
      cfg = loadConfig(root);
    },
    async buildStart() {
      const stats = await run(root);
      console.log(summary(stats));
    },
    async closeBundle() {
      // vite-xotiny may have rewritten liquids during the build
      await run(root);
    },
    configureServer(server) {
      run(root).then((stats) => server.config.logger.info(summary(stats)));
      const isGlobal = (f) => /\.global\.(scss|css)$/.test(f);
      const isConfig = (f) => toPosix(f).endsWith(CONFIG_FILE);
      server.watcher.on('change', (f) => {
        if (isConfig(f)) schedule(server, null);
        else if (isGlobal(f)) schedule(server, [toPosix(path.relative(root, f))]);
      });
      server.watcher.on('add', (f) => (isGlobal(f) ? schedule(server, null) : undefined));
      server.watcher.on('unlink', (f) => (isGlobal(f) ? schedule(server, null) : undefined));
      // Vite ignores shopify/** (server.watch.ignored); vite-xotiny regenerates liquids there → re-inject
      for (const sub of ['sections', 'snippets', 'blocks']) {
        const dir = path.join(root, cfg.themeRoot, sub);
        if (!fs.existsSync(dir)) continue;
        try {
          fs.watch(dir, (event, name) => {
            if (name && name.endsWith('.liquid')) schedule(server, null);
          });
        } catch {}
      }
    },
  };
}
