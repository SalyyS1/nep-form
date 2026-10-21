---
title: First-order and quantity coupons
date: 2026-10-20
summary: "Coupon audience, quantity and one-use controls verified and deployed."
---

# First-order and quantity coupons

## Outcome
Added coupon eligibility: global/percustomer one-use presets, first-order-only, minimum summed quantity including identical/custom garments. Server computes history/count within the existing order transaction; pending/unpaid count, cancelledorders restore eligibility/usage once. Legacyfields defaultfalse/1, no livepromotion seeds or DDL.

## Evidence
Focused14 backend checks and full74 server tests pass; browser covers admin mappings,2→3 identical units, realCOD snapshot, cancellation, stale-quantity no-write rollback, custom3 and oldcoupon compatibility. Independentreview closed; lint/typecheck/build pass.

## Deployment
Private backup and secret-safe artifactscan precede existingVPS release20261020-1629-coupon-eligibility-db009367. Public admin/mobile read-only smoke passes, no catalog/promotion changes. Oldcode ignores neweligibility: pausecheckout before rollback. Owned test processes stopped. AgentWiki publish skipped; local journal only.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
