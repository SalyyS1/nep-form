---
title: PostgreSQL and free hosting preparation
date: 2026-10-20
summary: "Added cloud PostgreSQL adapter, SQL maintenance and Render deployment setup with isolated HTTPS verification."
---

# PostgreSQL and free hosting preparation

## Work
Prepared cloud SQL support while preserving the working SQLite preview. Async adapters use pg.Pool with verified TLS, private schema, constraints and serialized write transactions. Added init/admin bootstrap/backup/restore and Render hosted runtime serving the Vite build.

## Findings and evidence
35 server tests and local commerce/Studio/chat browsers passed. Hosted built UI also passed a real local HTTPS browser journey against PGlite PostgreSQL, including Secure cookies and no demo UI. Fixed stale profile updates restoring old password hashes, static error content types, external GET navigation filtering and pool lifetime ownership. Database backup restored into a separate empty engine; nonempty restore rejected.

## Boundary
No cloud account/secret supplied, so no remote DB or public URL claimed. Supabase+Render recommended using current official Free limits; live provider TLS/quota still need verification after private configuration. SePay/email remain separate setup. Local runtime retained; all temporary test processes closed. AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
