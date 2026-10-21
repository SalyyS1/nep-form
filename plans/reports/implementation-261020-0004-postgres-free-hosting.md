# PostgreSQL + free hosting preparation

Status: DONE_WITH_CONCERNS — implementation tested; external Supabase/Render project not connected.

## Delivered
- Existing rules ported to async storage, preserved local SQLite/data. PostgreSQL via pg.Pool with verified TLS, private schema/constraints/indexes and same-client transactions. Row lock serializes small-shop writes across connections.
- Idempotent catalog/settings initialization, explicit first-admin bootstrap without demo users; private app-namespace JSON backup and empty-target-only restore.
- Hosted Node serves built SPA/assets and /api on provider PORT. Exact HTTPS API origin, cross-site mutations denied but external GET navigation allowed, Secure cookies, auth rate limits and no public reset links. Hosted bank disabled until configured.
- render.yaml, environment template, Vietnamese deployment guide and shareable SQL/how-to. Supabase used for PostgreSQL; Node auth retained (no false Supabase Auth/RLS/Edge Functions claim).

## Verification
- npm test35/35 PASS (33 existing +2 PostgreSQL/hosting); latest focused PG run PASS after final corrections.
- typecheck/lint/build PASS. Local store-local/admin-support/custom-studio browser suites PASS on isolated databases.
- Hosted browser PASS: actual dist through local HTTPS termination, PostgreSQL-backed API, Secure/HttpOnly login, hidden demo UI, admin/Studio/chat/mobile. No Vite API substitution.
- Actual backup JSON written/read/restored into separate empty PG engine; records/identities/idempotency match, nonempty restore rejected. Init rerun, transaction rollback, stale versions, private artwork, chat and restart persistence verified.
- PGlite is actual PostgreSQL engine via WASM with single connection lease; live provider TCP/TLS/quota not tested without user project credentials.
- Inline code review repaired stale profile writes restoring older password hashes, static404 JSON content-type, overbroad external navigation filtering and pool ownership on failed initialization. Focused regression assertions added. Hosted browser initially used nonexistent CSS selector; corrected to actual accessible region.
- Documentation local links checked. Shareable SQL copied byte-for-byte after detecting newline normalization in the initial text copy. Official provider docs verified Free limits; stale skill reference Render90-day expiry rejected in favor of official30-day expiry.

## Data and runtime
Backup work/backups/store-before-postgres-20261020-0014.sqlite; source preimage work/pre-postgres/. No live data reset/schema migration, no cloud writes or public deploy. Tests use temporary DBs.
One retained local runtime: runner30596/API24388:3001/UI23624:5173, exec session60081. Health ok/local, frontend200. Temporary test ports closed.
Docs: docs/deployment-guide.md, docs/setup-guide.md, docs/local-api-contract.md. Outputs: huong-dan-database-hosting.txt, postgresql-setup.sql. No commit/push.

## Remaining external setup / limitations
- User must create/select Supabase or compatible PostgreSQL project and Render account/repo; privately enter DATABASE_URL, APP_ORIGIN and bootstrap admin, then init/deploy/verify live URL. No secrets requested in chat.
- Free cold start/inactivity pause and quotas apply; not an always-on production SLA. Uploaded design assets count against DB quota.
- JSON domain snapshots/coarse write lock retained for small-shop correctness; backup covers app namespace, not unrelated Supabase schemas/storage.
- SePay/email unconfigured; hosted flows disabled/honest. No artificial keepalive.
- Unresolved: target user-owned project/account (optional account question unanswered during preparation).
