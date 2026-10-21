# Session restoration across tabs and login routes

Status: complete for verified UI repair; live checks pass.
Outcome: valid sessions continue into protected links, existing account never sees a needless login form, tabs reconcile login/logout. Preserve explicit account switching and server authorization.
Constraints: no credentials in logs, no session TTL/cookie/security weakening, no logout/reset of user sessions, no account/order mutations for production tests. Existing VPS target and database preserved.
Non-goals: sharing cookies across browser profiles, changing auth provider, unrelated storefront work.

Evidence: user says exact HTTPS host, same browser/new tab, original tab stays authenticated after F5. Live fresh browser passed newtab/reload/cross-site targetblank session continuity. Live /dang-nhap?tiep=... showed form despite authenticated bootstrap. AuthPage has no signed-in redirect; StoreProvider only restores bootstrap at mount and after same-tab login/logout, so other tabs retain stale account state. Last-response-wins protection absent on overlapping bootstrap requests.

- [x] Read owning source/guide, scout cookies/DB/guard and reproduce live boundaries without changing user records.
- [x] Regression proving authenticated login-page and stale cross-tab form; choose cause-aligned fix.
- [x] Restore valid destination/explicit account switch, auth-only cross-tab signal and focus reconciliation, discard stale bootstrap responses.
- [x] Focused browser/auth tests, lint/build, independent review.
- [x] Deploy existing VPS; public same-session/newtab/external link checks; report/docs/process cleanup.

Ownership: controller app/source/deploy/docs; session_browser isolated fixture/browser/report; session_scout read-only auth trace. No overlapping edits.


Review caught and closed two regressions before deployment: password reset must refresh/broadcast revoked sessions before login-page redirect; background focus refresh must wait for foreground login bootstrap so a silent network failure cannot discard valid restored auth. Protected children keyed by user ID discard prior-account form state. Server cookie/session policy unchanged. Browser worker extending deterministic evidence; fresh live original external-link failure still not reproduced.

Delivery: [report](../reports/implementation-261020-2255-session-navigation.md). Existing public cookie survived deployment; final public reload/newtab/external/authenticated-login/switch/mobile checks pass. All owned test processes stopped. Original fresh external-link failure not reproduced; no cookie-policy change inferred.
