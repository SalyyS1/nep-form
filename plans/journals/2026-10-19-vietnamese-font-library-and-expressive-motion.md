---
title: Vietnamese font library and expressive motion
date: 2026-10-19
summary: "15 ready-to-use Vietnamese fonts with live previews and richer garment, seam and scroll animation."
---

# Vietnamese font library and expressive motion

## Delivered
15 bundled Vietnamese fonts with shared searchable live-preview picker, retained uploaded fonts, server allowlist and self-contained private design/order SVG. Added expressive print/thread/fabric hero motion, pointer tilt, scroll typography ribbon and fluid reveals/hover.

## Evidence and decisions
23 tests pass, font/assistance/Studio/motion browser checks pass, lint/build pass. All15 fonts verified against Vietnamese upper/lower glyphs and licenses. Initial aggregate font data created an oversized899KB chunk; replaced with per-font lazy modules. Fixed hero copy overlap from screenshots and recorded real static font weight in manifest. Reviewed inline; no independent review claimed.

## Local state
Checkpointed DB backed up before restart. Exactly one local UI5173/API3001 runtime remains, temporary browser APIs closed. No production deployment or payment changes. AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
