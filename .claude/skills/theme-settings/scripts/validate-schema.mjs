#!/usr/bin/env node
/**
 * Validate an <xo-theme-settings> schema and cross-check it against the theme.
 *
 *   node validate-schema.mjs schema.json [--theme src] [--placeholders]
 *       --placeholders: missing variant sections are warnings (user will build them later), not errors
 *   node validate-schema.mjs src/snippets/xo-theme-settings/xo-theme-settings.liquid --theme src
 *       (a .liquid file: the JSON between {%- capture … -%} and {%- endcapture -%} is extracted)
 *
 * Structure rules mirror validate() in assets/theme-settings.ts. With --theme, also checks:
 *   - section-swap option `section` ids exist as section files (src/sections/<id>, src/groups/<x>/<id>, or <id>.liquid);
 *   - a select with class "xo-border-radius--" targets the element the layout puts that class on;
 *   - CSS variables used by color / range appear somewhere in the theme (warning only).
 * Exit 1 on errors.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const theme = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : null;
if (!file) {
  console.error('usage: node validate-schema.mjs <schema.json|snippet.liquid> [--theme src]');
  process.exit(2);
}

let text = readFileSync(file, 'utf8');
if (extname(file) === '.liquid') {
  const m = text.match(/{%-?\s*capture\s+\w+\s*-?%}([\s\S]*?){%-?\s*endcapture\s*-?%}/);
  if (!m) {
    console.error('No {% capture %}…{% endcapture %} block with the schema found.');
    process.exit(2);
  }
  text = m[1];
}

const errors = [];
const warnings = [];
let data;
try {
  data = JSON.parse(text);
} catch (e) {
  console.error(`JSON syntax error: ${e.message}`);
  process.exit(1);
}

const TYPES = ['section-swap', 'visibility', 'color', 'range', 'toggle', 'select', 'preset', 'link'];
const VALUED = ['section-swap', 'visibility', 'color', 'range', 'toggle', 'select'];
const HEX = /^#[0-9a-f]{6}$/i;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const safeUrl = (u) => typeof u === 'string' && (/^https?:\/\//i.test(u) || (/^\/(?!\/)/.test(u)));
const POS = ['bottom-right', 'bottom-left', 'middle-right', 'middle-left', 'top-right', 'top-left'];

if (!isObj(data)) errors.push('Schema must be an object');
else {
  if (data.button?.position && !POS.includes(data.button.position)) warnings.push(`button.position "${data.button.position}" not one of ${POS.join(', ')}`);
  if (data.footer && data.footer.apply === false) warnings.push('footer.apply is false: visitors cannot save their choices');
  if (!Array.isArray(data.groups)) errors.push('Missing "groups" array');
}

const ids = new Map();
const swaps = [];
const radius = [];
const vars = [];
const presets = [];

(data.groups || []).forEach((g, gi) => {
  if (!isObj(g) || !Array.isArray(g.fields)) return errors.push(`groups[${gi}]: missing "fields" array`);
  g.fields.forEach((f, fi) => {
    const at = `groups[${gi}].fields[${fi}]${f?.id ? ` (${f.id})` : ''}`;
    if (!isObj(f)) return errors.push(`${at}: must be an object`);
    if (!TYPES.includes(f.type)) return errors.push(`${at}: unsupported type ${JSON.stringify(f.type)}`);
    if (VALUED.includes(f.type) && f.id == null) errors.push(`${at}: missing "id"`);
    if (f.id != null) {
      if (ids.has(String(f.id))) errors.push(`${at}: duplicate id "${f.id}"`);
      ids.set(String(f.id), f);
    }
    if ((f.type === 'section-swap' || f.type === 'visibility') && !(typeof f.target === 'string' || isObj(f.target))) errors.push(`${at}: missing "target"`);
    if (isObj(f.target) && f.target.index != null && f.target.match == null && f.target.selector == null) warnings.push(`${at}: target uses only "index" — fragile, prefer "match"`);
    if ((f.type === 'color' || f.type === 'range') && !/^--\S+$/.test(f.var || '')) errors.push(`${at}: "var" must be a CSS variable like "--color-primary"`);
    if (f.type === 'color') {
      if (f.default != null && !HEX.test(f.default)) errors.push(`${at}: default must be #rrggbb`);
      (f.swatches || []).forEach((c) => !HEX.test(c) && errors.push(`${at}: swatch ${c} must be #rrggbb`));
    }
    if (f.type === 'range' && !(Number(f.max) > Number(f.min))) errors.push(`${at}: max must be > min`);
    if (f.type === 'toggle' && !f.attr && !f.class) errors.push(`${at}: needs "attr" or "class"`);
    if (f.type === 'select' && !f.attr && !('class' in f) && !f.var) errors.push(`${at}: needs "attr", "class" or "var"`);
    if (typeof f.attr === 'string' && /^on/i.test(f.attr)) errors.push(`${at}: on* attributes are not allowed`);
    if (f.var) vars.push([at, f.var]);
    if (f.type === 'select' && f.class === 'xo-border-radius--') radius.push([at, f]);
    if (['section-swap', 'select', 'preset', 'link'].includes(f.type)) {
      const list = Array.isArray(f.options) ? f.options : f.type === 'preset' && isObj(f.values) ? [{ values: f.values }] : null;
      if (!list?.length) return errors.push(`${at}: missing "options"`);
      list.forEach((o, i) => {
        const oat = `${at}.options[${i}]`;
        if (!isObj(o)) return errors.push(`${oat}: must be an object`);
        if (f.type === 'link' && !safeUrl(o.url)) errors.push(`${oat}: url must be http(s) or relative`);
        if (f.type === 'preset') isObj(o.values) ? presets.push([oat, o.values]) : errors.push(`${oat}: missing "values"`);
        if (f.type === 'section-swap' && o.value !== 'default' && o.section) swaps.push([oat, o.section]);
        if (o.image && !(safeUrl(o.image) || /^data:image\//.test(o.image))) warnings.push(`${oat}: image must be http(s) or data:image/ — will be dropped`);
        if (f.type === 'section-swap' && ('style' in o || 'params' in o)) warnings.push(`${oat}: "style"/"params" are ignored; only ?section_id= is requested`);
      });
    }
  });
});

presets.forEach(([at, values]) => Object.keys(values).forEach((k) => !ids.has(k) && errors.push(`${at}: values.${k} does not match any field id`)));

if (theme) {
  const sectionExists = (id) =>
    existsSync(join(theme, 'sections', id)) ||
    existsSync(join(theme, 'sections', `${id}.liquid`)) ||
    (existsSync(join(theme, 'groups')) &&
      readdirSync(join(theme, 'groups')).some((g) => statSync(join(theme, 'groups', g)).isDirectory() && (existsSync(join(theme, 'groups', g, id)) || existsSync(join(theme, 'groups', g, `${id}.liquid`)))));
  const missing = args.includes('--placeholders') ? warnings : errors;
  swaps.forEach(([at, id]) => !sectionExists(id) && missing.push(`${at}: section "${id}" not found in ${theme}/sections or ${theme}/groups/* (build it, or mark as placeholder)`));

  const layout = join(theme, 'layout', 'theme.liquid');
  if (existsSync(layout) && radius.length) {
    const src = readFileSync(layout, 'utf8');
    const on = /<body[^>]*xo-border-radius--/s.test(src) ? 'body' : /<html[^>]*xo-border-radius--/s.test(src) ? 'html' : null;
    radius.forEach(([at, f]) => {
      if (on && f.target !== on) errors.push(`${at}: the layout puts xo-border-radius--* on <${on}>, but target is ${JSON.stringify(f.target)}`);
      if (!on) warnings.push(`${at}: could not find where the layout sets xo-border-radius--*`);
    });
  }

  if (vars.length) {
    const hay = [];
    const walk = (d) => readdirSync(d).forEach((n) => {
      const p = join(d, n);
      if (statSync(p).isDirectory()) { if (n !== 'node_modules') walk(p); }
      else if (/\.(liquid|scss|css|ts|js)$/.test(n)) hay.push(readFileSync(p, 'utf8'));
    });
    walk(theme);
    const all = hay.join('\n');
    vars.forEach(([at, v]) => !all.includes(v) && warnings.push(`${at}: ${v} is not used anywhere in ${theme} — the field will change nothing visible`));
  }
}

warnings.forEach((w) => console.log(`warn  ${w}`));
errors.forEach((e) => console.log(`ERROR ${e}`));
console.log(errors.length ? `✗ ${errors.length} error(s), ${warnings.length} warning(s)` : `✓ valid (${warnings.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
