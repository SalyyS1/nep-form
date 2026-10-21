# Login route and tab session repair

Status: DONE · 20/10/2026.

User reported login requested on an external admin link in a new tab; same exact HTTPS host, old tab remains signed in after F5. Fresh live tests preserved auth on new tab/reload/external link, so a server-wide lost session was not established. Confirmed separate UI faults: authenticated `/dang-nhap?tiep=...` still rendered the login form, and tabs held stale auth snapshots after another tab logged in/out.

## Repair and boundaries

- Authenticated login route continues to its valid internal destination. Explicit account switching remains available and preserves the intended admin route; guest-cart merge finishes before navigation.
- Auth transitions notify other tabs with a value-free invalidation signal. Focus/visibility/pageshow reconcile from the real API; HttpOnly cookie and server role checks remain authoritative. Protected forms remount only when identity changes.
- Late bootstrap responses cannot replace newer data. Background refresh waits behind an explicit foreground refresh; background network failure preserves the existing UI and Studio draft.
- Password reset refreshes/broadcasts revoked auth before returning to login, preventing stale automatic entry to account UI.
- Server cookie policy, seven-day session lifetime, session records, database and role permissions unchanged. No global logout or password reset of real users.

Sources: `src/lib/store-context.tsx`, `src/features/account/auth-page.tsx`, `src/app.tsx`. Existing browser account-switch callers updated to use the explicit switch route.

## Evidence

The new isolated regression failed before the fix: API bootstrap reported admin, but the authenticated login URL remained on its form and timed out waiting for the intended admin route. Final full suite passes; [browser report](tester-261020-2255-session-navigation.md) records real SQLite API, multi-tab login/logout/switch, customer401/403 boundaries, deferred stale response, foreground-vs-background failure race, reset/new-password login, offline Studio DOM preservation and mobile checks. No JavaScript errors; screenshot inspected.

Focused server auth/proxy/email checks12/12 pass. Final ESLint and TypeScript/Vite production build pass. An initial control-character regex lint error was corrected before final gates. Hosted built SPA with real PostgreSQL/PGlite and HTTPS passes Secure/HttpOnly login, admin, Studio, support and mobile. Broad legacy browser scripts were not rerun; their explicit switch links were reconciled, not their unrelated historical selectors.

Independent source review found the reset-state and foreground/background races during implementation. Both repaired and reviewed closed; deterministic browser cases confirm closure.

## Production

Live: https://nepform.salyyy.tech. Release `/opt/nep-form/releases/20261020-1612-sessions-27e15dd4`; SHA256 `27e15dd46b7d05e8b087e4a03c4a87ce0ce6801e53f9c80bcbcaba0b36cc475f`.

Private Supabase backup taken before deployment (`work/backups/postgres-1792512653342-b0466602.json`, ignored). Runtime archive allowlist/secret scan passed; private environment unchanged. Remote checksum, Linux dependencies, DB/mail configuration, Nginx syntax and HTTPS production health pass. Service remains private loopback3101; only shop service/vhost affected. Disk1.5GB free; unrelated data untouched.

Public browser signed in before deployment, then confirmed the same account and unchanged cookie after service restart, old-tab reload, fresh admin tab and authenticated-login redirect. That run subsequently hit a test-fixture error: synthetic external HTML omitted charset while its link locator expected Vietnamese. Changed the synthetic link to ASCII and reran navigation checks without redeploying: all pass, including external target-blank, explicit switch, mobile, no JS errors. Only the probe's own session was revoked on exit. Boolean evidence `work/vps-session-browser-verification.json`; release metadata `work/vps-session-release.json`.

Previous discount-aware release retained at `/opt/nep-form/releases/20261020-1545-discounts-f5b85dd4`; private config/vhost backup `/opt/nep-form/backups/20261020-1612-sessions-27e15dd4/`. Follow [deployment guide](../../docs/deployment-guide.md) for scoped rollback; no database restore needed for this UI repair.

Owned Vite and isolated APIs stopped; ports5173/3014/3008/8443 closed. No production accounts/orders/prices/promotions created or altered by probes.

Remaining limit: the user's original direct-new-tab failure did not reproduce with a fresh browser context; verified stale-state defects are fixed and deployed. A surviving problem in the user's existing browser would require its specific request/profile evidence, rather than guessing at or weakening cookies.

Unresolved questions: none pending.
