---
title: Product sales and checkout coupons
date: 2026-10-20
summary: "Discounts implemented, verified and deployed; invalidated-code recovery fixed."
---

# Product sales and checkout coupons

## What happened
Implemented product SALE and checkout coupons across admin, storefront, custom pricing, authoritative quotes, orders and email. Server suite67/67, build/lint/typecheck, isolated browser and hosted HTTPS/PostgreSQL journey pass. Review caught an invalidated-coupon checkout trap; kept its removal control outside the valid quote and covered the recovery in browser.

## Decision
Sale reduces garment only, printing unchanged. One coupon discounts after-sale goods subtotal, excluding shipping. Quote/redeem/stock/idempotency/mail snapshots commit together; cancellation releases usage once. No live prices/promotions seeded.

## Delivery
Deployed existing VPS release20261020-1545-discounts-f5b85dd4 after private DB backup and archive secret scan. Public admin/mobile smoke passes, existing product prices unchanged, test processes stopped. Operational result and rollback caveat in plans/reports/implementation-261020-2223-discounts.md. AgentWiki publish skipped; local journal only.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
