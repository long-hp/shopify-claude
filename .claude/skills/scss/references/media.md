# Media Queries

`@include media()` mixin and breakpoint map.

## Import

```scss
@use "html/basehtml/src/styles/abstracts/media" as *;
```

---

## Breakpoints

```scss
$breakpoints: (
  sm:  576px,  // small tablets, large phones landscape
  md:  768px,  // tablets portrait
  lg:  992px,  // tablets landscape, small laptops
  xl:  1200px, // desktops
  xxl: 1400px, // large desktops
);
```

---

## Min-width (mobile-first)

```scss
.element {
  padding: 10px;

  @include media('>md') {
    padding: 20px;  // ≥ 768px
  }

  @include media('>lg') {
    padding: 30px;  // ≥ 992px
  }
}
```

---

## Max-width

```scss
.element {
  display: block;

  @include media('<md') {
    display: none;  // < 768px
  }
}
```

---

## Range (between breakpoints)

```scss
.element {
  @include media('>md', '<xl') {
    // between 768px and 1200px
    background: blue;
  }
}
```

---

## Custom values

```scss
@include media('>600px') {
  // ≥ 600px
}

@include media('<1024px') {
  // < 1024px
}
```

---

## Best Practice — Mobile-first

```scss
// ✅
@include media('>md') {
  // desktop styles
}

// ❌ desktop-first
@include media('<md') {
  // mobile overrides
}
```

---

## Combined Example

```scss
.xo-header {
  padding: 16px;

  @include media('>md') {
    padding: 24px;
  }
}

.xo-header__nav {
  display: none;

  @include media('>md') {
    display: flex;
  }
}
```

## Related

- `./functions.md` — color/fz/lh/ls helpers
- `./layout.md` — `xo-grid` / `xo-container`
- `./troubleshooting.md` — `@include media` not working
