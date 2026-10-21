---
title: Local admin operations and customer support chat
date: 2026-10-19
summary: "Persisted private chat, operational dashboard and tracked order history; isolated tests verified."
---

# Local admin operations and customer support chat

## What happened
Extended existing local Node/SQLite admin rather than replacing working commerce. Added private persisted customer/admin support conversations, unread cursors, idempotent sends, bounded paging/rate, open/resolved inbox. Dashboard now exposes paid/awaiting/custom/support and14-day orders; tracking/history/version conflicts added to admin orders.

## Evidence and fixes
33 server tests, type/lint/build, store commerce, Studio and two-context support browser journeys passed. Review caught incremental polling gap risk; after cursor now fetches successive bounded pages. Screenshots caught generic dialog CSS precedence; scoped support sizing fixed. All tests used temporary DBs; backup made before work.

## Decision
Keep loopback local runtime for user review. No fake SePay payments or invented support presence. Retained API/UI3001/5173, recorded PIDs in work/local-runtime.json. Production integration remains subsequent configured work. AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
