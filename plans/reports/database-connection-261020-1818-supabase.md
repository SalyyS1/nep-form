# Supabase connection preparation

Status: DONE

User supplied public API configuration, direct URI and subsequently the exact Session pooler endpoint. Stored connection settings in ignored private .env, using URL serialization to encode reserved password characters. No credential values printed into reports or console output. User chose initial admin email; generated random32-character password saved only in private .env. APP_ORIGIN remains unset pending actual hosted URL.

Direct connection failed before authentication: no IPv4 address; IPv6 TCP probe ENETUNREACH. Exact user-provided Session pooler is reachable. Initial verified TLS failed SELF_SIGNED_CERT_IN_CHAIN; resolved using Supabase root CA from official HTTPS download, whose URL was verified against official Dashboard source. Certificate/hostname verification remains enabled.

Confirmed shop namespace absent, saved empty preimage under private work/backups before DDL. Ran npm run db:init: schema,26 catalog products, one real admin created. npm run db:check passed. Saved post-init private backup before login test. Safe rerun leaves record snapshots identical. Live Supabase HTTP smoke: health, guest bootstrap, unauthenticated admin rejection, admin login/dashboard, Secure/HttpOnly cookie, logout/session revocation passed. Full before/after records identical; no residual test session/data. Evidence: work/supabase-verification.json contains only boolean/count results, no credentials or identity values.

Local process reconciliation: previously recorded runtime PIDs no longer exist and ports3001/5173 have no listener. No owned orphan processes found; unrelated Node processes left untouched. Temporary smoke server/pool closed in finally. Local SQLite unchanged.

Deployment guide updated with verified CA route and Render PG_CA_FILE instructions; public CA copied to outputs for deployment. No app source changes; broad test reruns unnecessary after live focused checks pass.

Unresolved: Render destination/repository and actual APP_ORIGIN, SePay and email service remain unconfigured. Official reference: https://supabase.com/docs/guides/database/connecting-to-postgres
