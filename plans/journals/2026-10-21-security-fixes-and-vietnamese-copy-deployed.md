---
title: Security fixes and Vietnamese copy deployed
date: 2026-10-21
summary: Confirmed app flaws patched and verified; unrelated VPS access decisions remain pending.
---

# Security fixes and Vietnamese copy deployed

Reviewed auth/email/support, commerce/media/Studio, transport/static/proxy and dependencies. Confirmed unlimited per-account persisted resource growth; added transactional Studio write budgets and active cart/address caps with SQLite/PostgreSQL race/rollback/restart evidence. Added production CSP/framing protection, generic internal error codes and hidden Nginx version. Polished23 Vietnamese frontend files without changing accepted policies.

Full92 server tests, final lint/build and five browser journeys passed including production HTTPS/PostgreSQL/CSP/inline-script blocking. Deployed20261020-2159-security-polish-f142d650 after private backup; read-only live smoke verified served build/security headers/admin/mobile, session revoked. Preserved credentials/database/oldrelease and stopped owned processes.

Other-project Docker database publications and root password SSH require owner network/access coordination; no answer to async clarification yet, so those remain unchanged. Prior shared credentials need private rotation. Documented residual limits and97% disk usage. AgentWiki publish skipped; local journal only.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
