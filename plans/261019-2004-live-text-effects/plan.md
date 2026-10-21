---
title: Curved text, outline and shadow with live shirt preview
status: completed
created: 2026-10-19
---

# Outcome

Selected text layers gain up/down curvature, adjustable outline color/width and shadow color/offset/blur/opacity. Changes render directly on shirt and flat/private SVG, persist in drafts/saved designs/orders, work with Vietnamese built-in/uploaded fonts, duplicate/undo/lock and current face. Existing projects render unchanged when effects absent. No new charges, schema/deploy/payment work.

Register: Product Studio. Scene: Vietnamese shoppers combine lettering/stickers on mobile/desktop. Direction: existing neutral tool chrome, grouped text-effect controls with immediate feedback. Color/type: existing tokens/Be Vietnam Pro UI; user colors/fonts only in artwork. Signature: curved typography around a sticker. Dials: variance3 UI/7 artwork, motion2, density6.

- [x] Optional typed textEffects contract and bounded server validation; compatibility defaults.
- [x] Shared SVG text renderer: local safe textPath IDs, stroke paint order, bounded shadow filter; multiline/Unicode/duplicates.
- [x] Text-only inspector controls/presets/reset; live shirt/preview/export; locked layers respected.
- [x] Renderer/security/persistence/checkout tests and real browser visual/undo/lock/resize; mobile and build/lint.
- [x] Docs, inline review, backup/restart one local runtime and report/journal.

Evidence: [implementation report](../reports/implementation-261019-2004-live-text-effects.md).
