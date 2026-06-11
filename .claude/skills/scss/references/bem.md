# BEM Methodology

Block-Element-Modifier naming for custom SCSS components in this theme.

---

## Syntax

```scss
.xo-block { }                    // Block (component)
.xo-block__element { }           // Element inside the block
.xo-block--modifier { }          // Variant of the block
.xo-block__element--modifier { } // Variant of the element
```

---

## Naming Rules

- **Block** — `xo-block-name`
- **Element** — `xo-block-name__element` (double underscore)
- **Modifier** — `xo-block-name--modifier` (double hyphen)
- **Prefix** — always use `xo-` for custom components

---

## Basic Example

```scss
// Block
.xo-product-card {
  display: block;
  border: 1px solid color(border);
}

// Elements
.xo-product-card__image {
  width: 100%;
  aspect-ratio: 1/1;
}

.xo-product-card__title {
  font-size: fz(body, 1.2);
  margin-top: 12px;
}

// Modifiers
.xo-product-card--featured {
  border-color: color(primary);
}

.xo-product-card--horizontal {
  display: flex;

  .xo-product-card__image {
    width: 40%;
  }
}
```

---

## States Example

```scss
.xo-button {
  padding: 12px 24px;
  background: color(primary);
}

.xo-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.xo-button--loading {
  position: relative;
  color: transparent;
}

.xo-button__icon {
  margin-right: 8px;
}
```

---

## Best Practices

### ✅ Do

```scss
// Clear hierarchy
.xo-modal { }
.xo-modal__header { }
.xo-modal__body { }
.xo-modal--large { }

// Modifier affects both block and element
.xo-card--featured .xo-card__title {
  color: color(primary);
}
```

### ❌ Don't

```scss
// Too many element levels (max one)
.xo-modal__header__title { }  // ❌
.xo-modal__header-title { }    // ✅

// Modifiers should be semantic, not presentational
.xo-button--blue { }     // ❌
.xo-button--primary { }  // ✅

// Don't rely on tag selectors inside a BEM block
.xo-card div { }          // ❌
.xo-card__content { }     // ✅
```

---

## Combined With XO-CSS

```liquid
<!-- BEM for structure, XO-CSS for utilities -->
<div class="xo-product-card xo-product-card--featured d:flex gp:0.6rem">
  <div class="xo-product-card__image bdrs:s4">
    {{ image }}
  </div>
  <div class="xo-product-card__content p:1rem">
    <h3 class="xo-product-card__title">Title</h3>
  </div>
</div>
```

## Related

- `./layout.md` — composing components with `xo-grid`
- `./functions.md` — color/fz helpers inside BEM rules
