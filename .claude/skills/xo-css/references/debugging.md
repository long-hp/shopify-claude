# Debugging

Common XO-CSS problems and their fixes.

## A class is not generating CSS

### Checklist

1. **Syntax correct?**
   ```html
   ✅ c:primary
   ❌ color:primary
   ❌ c-primary
   ```

2. **Token defined?**
   - Check `theme-config/theme.config.json`
   - Tokens must exist in the config

3. **Property shortcut correct?**
   - See `./properties.md`
   - e.g. `p` (padding), not `padding`

4. **File being watched?**
   - XO-CSS scans `*.liquid`, `*.ts`, `*.js`
   - Other extensions are ignored

5. **Dynamic class name?**
   - XO-CSS cannot generate from runtime-concatenated strings
   - See "Dynamic Classes" below

### Console output

During build:

```bash
✅ [valid] (class: c:primary)
❌ [invalid] (class: c:notexist) - Token 'notexist' not found
❌ [invalid] (class: color:primary) - Unknown property 'color'
```

## Dynamic Classes

### The problem

XO-CSS scans static strings in the source to generate CSS. It cannot detect class names assembled at runtime.

### ❌ Patterns that fail

```liquid
<!-- Concatenation -->
{% assign spacing = 's6' %}
<div class="p:{{ spacing }}">

<!-- append filter -->
{% assign class = 'p:' | append: spacing %}
<div class="{{ class }}">

<!-- String interpolation -->
<div class="c:{{ color_token }}">
```

**Why?** At build time XO-CSS sees `p:{{ spacing }}` and has no idea what value it will become. It never generates `p:1rem` because that literal string never appears in the source.

### ✅ Solutions

#### Solution 1 — Case statement

```liquid
{% case spacing %}
  {% when 's4' %}
    {% assign padding_class = 'p:0.6rem' %}
  {% when 's6' %}
    {% assign padding_class = 'p:1rem' %}
  {% when 's8' %}
    {% assign padding_class = 'p:1.4rem' %}
{% endcase %}

<div class="{{ padding_class }}">
```

XO-CSS sees the literals `'p:0.6rem'`, `'p:1rem'`, `'p:1.4rem'` and generates all three.

#### Solution 2 — Conditional classes

```liquid
<div class="{% if spacing == 's4' %}p:s4{% elsif spacing == 's6' %}p:s6{% elsif spacing == 's8' %}p:s8{% endif %}">
```

#### Solution 3 — CSS variables

```liquid
<div class="p:var(--spacing)" style="--spacing: {{ spacing_value }}">
```

(The class `p:var(--spacing)` is itself a static string.)

#### Solution 4 — Include all options

```liquid
<div class="
  {% if spacing == 's4' %}p:s4{% endif %}
  {% if spacing == 's6' %}p:s6{% endif %}
  {% if spacing == 's8' %}p:s8{% endif %}
">
```

## Token does not exist

```bash
[invalid] (class: c:notexist) - Token 'notexist' not found in colors
```

**Fix:**

1. Check `theme-config/theme.config.json`
2. Find the relevant section:
   - Colors → `colors`
   - Spacing → `space`
   - Heading font sizes → `headingSizes` (body font sizes are direct rem — no token)
   - etc.
3. Add the token if it is genuinely missing:
   ```json
   {
     "colors": {
       "primary": "#000000",
       "notexist": "#ff0000"
     }
   }
   ```
4. Rebuild.

## Wrong property shortcut

```bash
[invalid] (class: padding:s6) - Unknown property 'padding'
```

**Fix:** Use the shortcut, not the full property name.

```html
❌ padding:s6, margin:s4, color:primary
✅ p:1rem, m:0.6rem, c:primary
```

See `./properties.md` for the full map.

## Wrong pseudo shortcut

```bash
[invalid] (class: c:primary|hover) - Unknown pseudo 'hover'
```

**Fix:** Use the pseudo token, not the full name.

```html
❌ c:primary|hover, c:primary|focus
✅ c:primary|h, c:primary|f
```

See `./pseudo.md` for the full map.

## Breakpoint not working

### Checklist

1. **Breakpoint syntax correct?**
   ```html
   ✅ d:block@md
   ❌ d:block-md
   ❌ d:block:md
   ```

2. **Viewport wide enough?**
   - `@md` = ≥768px
   - Verify with browser dev tools

3. **Specificity conflict?**
   - The last class wins
   - Add `!` if needed: `d:block@md!`

4. **Max-width syntax?**
   ```html
   ✅ d:block@+md (applies until <768px)
   ❌ d:block@md- (no such syntax)
   ```

## CSS not updating

### Fixes

1. **Clear cache and rebuild**
   ```bash
   # Stop dev server
   rm -rf shopify/assets/
   # Restart dev server
   npm run dev
   ```

2. **Hard refresh browser**
   - Chrome/Edge: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
   - Firefox: Ctrl+F5 / Cmd+Shift+R

3. **Confirm file is being watched**
   - XO-CSS scans `.liquid`, `.ts`, `.js` only
   - `.html` / `.jsx` are not scanned

## Specificity Issues

### Symptom

Class doesn't apply because another rule wins.

### Fixes

1. **Use `!important`**
   ```html
   <div class="c:primary!">
   ```

2. **Order matters** — later classes win
   ```html
   <div class="c:primary c:secondary">  <!-- c:secondary wins -->
   ```

3. **Inspect**
   - Dev tools → Computed
   - Identify which selector has higher specificity

## Invalid value

```bash
[invalid] (class: w:notvalid) - Invalid value 'notvalid'
```

### Fixes

1. **Use a token from config**
   ```html
   ✅ w:full  (if defined in the config)
   ```

2. **CSS keywords**
   ```html
   ✅ w:auto, w:100%, w:inherit
   ```

3. **CSS variables**
   ```html
   ✅ w:var(--width)
   ```

4. **Literal values** (discouraged)
   ```html
   ✅ w:200px, w:50%, w:10rem
   ```

## Multiple pseudo classes not stacking

```html
<!-- Want: hover + focus -->
<div class="c:primary|h|f">  ❌ Doesn't work
```

### Fix — write them as separate classes

```html
<div class="c:primary|h c:primary|f">  ✅
```

## Pseudo + element

```html
<div class="c:primary|h|af">  <!-- hover ::after? -->
```

### Fix — order matters: `pseudo|pseudo||element`

```html
<!-- ::after -->
<div class="c:primary||af">

<!-- :hover ::after -->
<div class="c:primary|h||af">

<!-- :focus ::before -->
<div class="c:primary|f||be">
```

## Performance Issues

### Slow file scan

**Causes:** Too many files.

**Fixes:**
1. Exclude unneeded folders in plugin config (`node_modules`, `.git`, …)
2. Limit file types if you can

### CSS output too large

**Fixes:**
1. **Purge unused classes** — the plugin purges by default; verify it's enabled
2. **Avoid bulk-generating unused tokens** — remove unused tokens from the config

## Common Error Messages

### "Cannot find module"

```bash
Error: Cannot find module 'theme-config/theme.config.json'
```

**Fix:** Config file is missing or the path in the plugin config is wrong.

### "Invalid JSON"

```bash
SyntaxError: Unexpected token } in JSON at position 123
```

**Fix:** `theme.config.json` has a syntax error. Validate it.

### "Class already exists"

```bash
Warning: Duplicate class 'c:primary' detected
```

Just a warning — class was declared in multiple files. No action needed.

## Debug Tools

### 1. Console logging

```bash
[XO-CSS] Scanning files...
[XO-CSS] Found 234 classes
[XO-CSS] Generated atomic.scss (45kb)
```

### 2. Generated CSS

`src/styles/atomic.scss` contains the compiled output:

```scss
.c\:primary { color: var(--color-primary); }
.p\:s6     { padding: var(--space-s6); }
```

### 3. Browser dev tools

- Inspect element
- Check the "Computed" tab
- Verify which selectors apply and their specificity

## Getting Help

If you're still stuck:

1. Check the console for error messages
2. Re-read `./basics.md` to validate the syntax
3. Verify `theme-config/theme.config.json`
4. Simplify — test with a minimal class first
5. Clear cache and rebuild

## Related

- `./basics.md` — syntax and tokens
- `./properties.md` — full property shortcut map
- `./pseudo.md` — full pseudo shortcut map
- `./layout.md` / `./styling.md` / `./responsive.md` / `./advanced.md` — usage references
