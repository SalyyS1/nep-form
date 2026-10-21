---
title: Live curved text outline and shadow
date: 2026-10-19
summary: Text effects preview directly on shirt and persist through saved designs and private order artwork.
---

# Live curved text outline and shadow

## Delivered
Added optional text effects: signed curve presets/slider, outline color/width and shadow color/opacity/blur/offsets. One shared SVG renderer handles live shirt, previews and artwork. Effects persist in drafts/designs/orders; legacy geometry and pricing preserved.

## Verification and fixes
30 tests pass; browser pixel comparisons prove curve signs, outline/shadow, multiline, reset/undo/lock/duplicate IDs, sticker composition, typed negative input, save/reopen/export and mobile layouts. Existing Studio/COD/admin journey passes, build/lint/typecheck pass. Fixed precision number editing and centered preview. Inline review only.

## Renderer finding
Sharp/librsvg does not paint textPath, confirmed with a minimal probe. Kept curve pixel verification in actual Chromium and server raster tests for supported outline/shadow. Corrected a numeric-geometry regex that accidentally matched font base64. No skipped tests. Compatibility documented; SVG still contains embedded-font text rather than outlined glyphs.

## Local operation
Backed up checkpointed DB and restarted one local UI5173/API3001 runtime; temporary test APIs closed. No schema/payment/production changes. AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
