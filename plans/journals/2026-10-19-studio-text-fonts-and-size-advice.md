---
title: Studio text fonts and size advice
date: 2026-10-19
summary: Delivered local text/font tools and height-weight shirt size suggestions with persistence and browser verification.
---

# Studio text fonts and size advice

## Changes
Added text composer below stickers and custom font upload with private design/SVG persistence. Added shared demo size advice in Studio and product pages; measurements clear on close.

## Verification
21 server/unit checks pass, Studio E2E and assistance E2E pass on isolated DBs, lint/build pass, render checker clean at 375/768/1440. First UI harness run used the wrong mobile breakpoint; corrected the harness against existing CSS and reran. Review fixed font ID coercion before delivery.

## Runtime and limits
Backed up checkpointed SQLite and restarted one local UI/API runtime. Size chart remains demo; no production/SePay deployment. AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
