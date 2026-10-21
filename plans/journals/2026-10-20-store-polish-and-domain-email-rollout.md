---
title: Store polish and domain email rollout
date: 2026-10-20
summary: "Verified auth, transactional email, product photos and popup support on VPS"
---

# Store polish and domain email rollout

Completed shop auth/email/media/support polish on the existing VPS. Full50-test regression plus final12 affected tests, isolated browser journeys and public browser checks passed. Independent review fixed proxy auth bucket isolation and stable email-queue encryption. Provider accepted owner setup email; inbox arrival pending confirmation. Prior release/private config retained; no customer/order test fixtures or migrations in production. Current operational owners: docs/deployment-guide.md, docs/local-api-contract.md. SePay stays disabled.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
