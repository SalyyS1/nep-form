# PostgreSQL and free hosting preparation

Status: completed (code/setup preparation; cloud project not connected)
Outcome: app runs against real PostgreSQL as well as preserved local SQLite; reproducible SQL init/backup and deployment config for free hosting.
Constraints: preserve data and all storefront/admin/chat/custom contracts; no public demo admin/reset tokens on hosted mode; external credentials entered privately, no cloud project/account assumed. Back up before writes.
Non-goals: buy domain/service, publish without a configured destination, rewrite to Supabase Auth/Edge Functions, connect unconfigured SePay.

## Plan
1. Async storage interface; PostgreSQL schema (private namespace, constraints/indexes), transaction isolation for existing single-writer invariants, existing SQLite compatibility.
2. SQL migration/init and catalog/admin bootstrap, backup/restore scripts; no destructive overwrite. PostgreSQL exercised with embedded real PostgreSQL engine and existing HTTP flows.
3. Hosted Node serves built SPA/public assets on provider PORT; fail closed on missing DB/origin, secure cookies, no demo seeds/local reset links, environment config and Render blueprint.
4. Verified current free hosting comparison (Supabase/Render; Neon compatible alternative), Vietnamese setup/deploy/rollback guide, tests/build/local restart.

## Acceptance / todo
- [x] Existing33 server tests and focused PostgreSQL integration (auth/cart/orders/stock/idempotency/admin/custom/chat/restart/rollback).
- [x] SQL init rerunnable, backup/restore tested into empty isolated DB; existing local DB untouched.
- [x] Hosted smoke test serves SPA/assets/API, blocks unsafe origins and private files, no default/demo accounts or reset token leakage.
- [x] Config/docs usable without secrets in source or chat; clearly identify cloud setup still needing user account.
- [x] One retained local runtime; temporary processes closed.

Architecture: PostgreSQL retains current bounded JSON domain records plus relational identities/idempotency constraints in private schema; no public Supabase Data API grants. Auth/order validations stay server-side. Async ports preserve behavior rather than introducing a second set of business rules. Serialize mutation transactions with a Postgres row lock (small single-shop workload); document scale limits.

Evidence: ../reports/implementation-261020-0004-postgres-free-hosting.md. External project configuration remains necessary; no cloud database or public URL is claimed.
