---
title: NẾP Studio local custom commerce
date: 2026-10-19
summary: "Custom editor, animated storefront and local commerce verified"
---

# NẾP Studio local custom commerce

## What happened
Delivered the custom-first NẾP Studio local revision: animated fabric-fold homepage, two-sided layered design editor, immutable designs, server pricing, cart/order/admin integration. Preserved the existing24readywear catalog and backed up SQLite before seed.

## Decisions
Keep 2D SVG previews and self-contained Vietnamese fonts; text/icons/uploads only, no AI or3D. Decode raster uploads before transaction and re-read inventory at commit. Paginate metadata instead of returning all embedded images. Production and SePay remain later per user sequencing.

## Verification
Build/lint pass;16server tests; existing store regression/browser and custom Studio browser flow pass. Home/Studio render checks375/768/1440:0errors/0warnings. Fixed review findings around upload decode, undo ref capture, aggregate UI stock, listpayload and duplicate labels. Runtime kept on5173/3001 for local preview; isolated test servers stopped.

## Next
User reviews local UI. Later production adapter/private assets/payment setup per accepted sequencing. AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
