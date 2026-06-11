# SCSS Functions

Helper functions for color, font size, line height, and letter spacing.

## Import

```scss
@use "html/basehtml/src/styles/abstracts/functions" as *;
```

---

## `color()` — Color with opacity

```scss
.element {
  color: color(foreground, 0.8);        // 80% opacity
  background: color(primary, 0.5);       // 50% opacity
  border-color: color(#ff0000, 0.3);     // hex color with opacity
}
```

**Accepts:**
- Theme color tokens — `color(foreground)`, `color(primary)`
- Hex colors — `color(#ff0000, 0.5)`
- CSS variables — `color(var(--custom-color), 0.8)`

---

## `fz()` — Font size

```scss
.heading {
  font-size: fz(heading, 1.6);      // heading scale × 1.6rem
}

.body {
  font-size: fz(body, 1.2);         // body scale × 1.2rem
}

.responsive {
  font-size: fz(heading, 2, true);  // enable progressive font scaling
}
```

**Parameters:**

| Position | Name        | Default | Description                          |
| -------- | ----------- | ------- | ------------------------------------ |
| 1        | `$type`     | —       | `'heading'` or `'body'`              |
| 2        | `$absValue` | `1.2`   | Multiplier                           |
| 3        | `$usePfs`   | `false` | Enable progressive font scaling      |

---

## `lh()` — Line height

```scss
.text {
  line-height: lh(body, 0.6);    // 1 + 0.6 / font-body-scale
}
```

---

## `ls()` — Letter spacing

```scss
.heading {
  letter-spacing: ls(heading, 0.06);  // font-heading-scale × 0.06rem
}
```

---

## Combined Examples

```scss
.hero-title {
  font-size: fz(heading, 2.5);
  line-height: lh(heading, 0.2);
  letter-spacing: ls(heading, -0.02);
  color: color(foreground, 1);
}

.card {
  background: color(background, 0.95);
  border: 1px solid color(border, 0.2);

  &:hover {
    background: color(layer-1, 1);
    box-shadow: 0 4px 12px color(foreground, 0.1);
  }
}
```

## Related

- `./media.md` — responsive breakpoints
- `./layout.md` — layout components
- `./troubleshooting.md` — when a function returns nothing
