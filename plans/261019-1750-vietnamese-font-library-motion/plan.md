---
title: Vietnamese font library and expressive motion
status: completed
created: 2026-10-19
---

# Outcome and scope

Customers choose from 15 bundled Vietnamese typefaces with real per-font previews, without uploading. Same choice in text composer and layer inspector, preserved across save/order/SVG. Keep own-font uploads. Make storefront substantially more expressive through visible entrance/ambient/scroll/hover motion; preserve existing garment story, shopping flows and reduced-motion fallback. Local only, no production/payment work.

Register: Brand storefront, Product Studio.
Scene: Vietnamese custom-shirt shoppers exploring and designing on phone/desktop.
Direction: tactile editorial workshop; expressive typography and fabric/thread motion from Nếp brand.
Color: restrained ivory/ink/olive with existing lime accent; existing tokens authoritative.
Type: Be Vietnam Pro UI; curated display/script/serif/handwriting fonts only in designs/previews.
Signature: moving seam lines and floating print samples that converge on a shirt; scroll-driven type specimen strip.
Dials: variance7, motion9 storefront /3 Studio, density3 storefront /6 tools.

- [x] Bundle licensed fonts, verify Vietnamese glyph coverage, store source/license manifest; generate reusable data for SVG with only used fonts embedded.
- [x] Searchable font preview picker with style groups, actual entered text preview; composer and inspector; server allowlist.
- [x] More prominent entrance, ambient cloth/seams, scroll typography/parallax, gentle interactive tilt and fluid hover; reduced-motion and SPA cleanup.
- [x] Font lifecycle/validation/visual browser checks, scroll evidence, responsive render, lint/build, update docs.
- [x] Backup before restarting one local runtime, report and journal.

Evidence: [implementation report](../reports/implementation-261019-1750-vietnamese-font-library-motion.md).
