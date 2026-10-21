---
title: Repair login state across tabs
date: 2026-10-20
summary: "Fix authenticated login redirects, tab reconciliation and auth refresh races; deploy verified."
---

# Repair login state across tabs

## What happened
User reported repeated login on a new-tab admin link. Fresh public newtab/crosssite kept cookie, but authenticated login route reproducibly still showed form; other tabs retained stale auth. Added destination redirect and tab/focus reconciliation without changing server session policy.

## Review and verification
Review caught password-reset stale identity and background-refresh superseding successful foreground login. Centralized reset restoration and prioritized foreground refresh; deterministic browser regressions pass. Offline focus keeps Studio draft DOM, late anonymous response cannot overwrite login, role checks and explicit switch remain. Focused12 server checks, lint/build and hosted HTTPS/PostgreSQL journey pass.

## Delivery
Deployed20261020-1612-sessions-27e15dd4 after private backup; public same-session checks, external link and mobile pass. Original user-specific newtab cause not reproduced; report distinguishes that uncertainty from confirmed defects. Test processes stopped. AgentWiki publish skipped; local journal only.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
