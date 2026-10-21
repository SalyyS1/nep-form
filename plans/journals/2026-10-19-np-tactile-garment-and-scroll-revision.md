---
title: NẾP tactile garment and scroll revision
date: 2026-10-19
summary: Rebuilt garment previews and scroll story after user visual feedback
---

# NẾP tactile garment and scroll revision

## What happened
User rejected flat garment SVG, imperceptible scroll, oversized NẾP word section and rigid hover. Baseline showed animations ran but the hero moved only33px/5percent by650px scroll.

## Changes
Replaced mockup with generated transparent cotton front/back cutouts shared across storefront/Studio/privatepreviews; recorded prompt/source. Removed giant brandword. Added one pinned blank/print/back scroll story with reverse behavior, softer link/button/imagehover, Vietnamese Lora accents and clean ivory/olive composition.

## Findings and verification
Fixed tablet grid min-content clipping that scrollWidth missed; motion test now checks garment bounds. Darkened local muted text after24contrastwarnings. Build/lint,16server tests, legacybrowser/Studio flows, real-wheel motion/reverse/SPA/reducedmotion tests pass. Final home/Studio render checks0errors/0warnings at375/768/1440. No DB/data changes or public deploy; one runtime left running.

## Next
User reviews local art direction; keep production setup deferred. AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
