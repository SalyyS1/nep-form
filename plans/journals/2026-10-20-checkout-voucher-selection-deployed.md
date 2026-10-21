---
title: Checkout voucher selection deployed
date: 2026-10-20
summary: "Public opt-in coupons, exact savings recommendation, tested and deployed."
---

# Checkout voucher selection deployed

Implemented public checkout voucher picker with explicit admin opt-in; legacy codes remain private and manually redeemable. Shared server eligibility ranks actual capped savings; explicit selection re-quotes and order validation stays atomic. Final failed-quote retry regression fixed selected-state source to valid quote.

Verified82 server tests, final lint/build, real Edge desktop/mobile journey, independent review and read-only production smoke. Deployed20261020-1711-voucher-picker-90df5917 after private backup; public HTML/entry hashes match. Kept prior release/config and current database. Probe cart empty; full customer flow tested in isolated SQLite, no live orders or coupon edits. Stopped owned Vite/API/browser. AgentWiki publish skipped; local record only.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
