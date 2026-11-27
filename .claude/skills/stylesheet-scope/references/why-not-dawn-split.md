# Why splitting CSS per section the Dawn way lowers the Lighthouse score

Written down so nobody tries it a second time. The Dawn pattern: every section starts with `{{ 'section-x.css' | asset_url | stylesheet_tag }}`. It was tried on an XO theme and scored lower than a single file.

## What Lighthouse measures

- Mobile simulates slow 4G: **150 ms RTT, 1.6 Mbps down, CPU 4× slower**. 60 KB gzip downloads in about 0.3 s; every extra request costs at least one 150 ms RTT just waiting. Bytes are cheap, requests are expensive.
- The Performance score is built from FCP, LCP, TBT, CLS and Speed Index. **Nothing rewards "less unused CSS"**; "Reduce unused CSS" is only an opportunity hint.
- Scores swing ±5 between runs. Compare FCP / LCP in ms, averaged over 5 runs, same page, same machine.

## What happens when the CSS link lives inside the section

1. A link in `<head>` is found by the preload scanner from the first bytes, downloads in parallel with HTML parsing, and Shopify pushes it with Early Hints. A link in `<body>` is only discovered when the parser **reaches that section**.
2. A stylesheet link in `<body>` **blocks rendering of everything after it** until the file arrives. A hero section holding the LCP image whose CSS is a separate file adds a full request round-trip to LCP.
3. Ten 2 KB files compress worse than one 20 KB file: gzip and brotli need a few KB to learn patterns, plus HTTP headers per request.
4. A page with 8 sections and 20 snippets with their own CSS → 28 late-discovered render-blocking requests.

Dawn accepts this because it values maintainability over score; Dawn's mobile score is not high either.

## The right shape

Two render-blocking requests, both in `<head>`, both discovered early:

- the theme's `styles.css`: core, base, atomic, shared snippets, AJAX-loaded sections;
- Shopify's file generated from `{% stylesheet %}`: only the CSS of the sections and snippets on this page.

See `shopify-stylesheet-tag.md`. Do not split by template (`template.name`) either: any section can be dragged into any JSON template.
