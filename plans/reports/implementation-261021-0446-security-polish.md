# Security and Vietnamese copy delivery

Status: shop changes COMPLETE · 21/10/2026. Owner confirmed shop-only scope and explicitly retained other-project VPS services unchanged. Credential rotation remains a separately coordinated owner action. No claim of universal vulnerability removal.

## Scope and threat model

Review covered authentication/session/reset/verification, support ownership, commerce/pricing/coupons/inventory/payment authority, private design/font/SVG handling, media upload/Pinterest import, HTTP/static/origin/proxy controls, SQL access, dependencies, release secrets and Vietnamese customer/admin copy. Protected assets and boundaries are recorded in [plan](../261021-0446-security-polish/plan.md). Root README/AGENTS files absent; supplied AGENTS/development rules applied. Workspace lacks Git metadata; no base diff or commit available.

## Confirmed findings and fixes

| Finding | Assessment | Change/evidence |
|---|---|---|
| Unbounded authenticated design persistence/cart/address growth | Medium resource abuse | Persisted per-account Studio budget, transaction-safe rollback/races/restart;50 cart lines/20 saved addresses. Existing immutable history retained. |
| Pages could be framed; no script CSP on built SPA | Medium framing risk / defense in depth for script injection | Production CSP, frame-ancestors none, X-Frame-Options DENY; allowed assets match actual Studio needs. Browser runs normal app/font flows and proves injected inline script does not execute. No pre-existing XSS exploit established. |
| Unexpected backend exceptions exposed internal driver codes | Low information disclosure | Unhandled errors now return only generic message/INTERNAL_ERROR. HTTP regression proves driver code/detail absent. |
| Nginx advertised version | Low hardening | Shop vhost server_tokens off, verified live response. No global Nginx changes. |

[Security headers](../../server/security-headers.mjs), [HTTP integration](../../server/index.mjs), [resource policy](../../server/customer-resource-limits.mjs), [API contract](../../docs/local-api-contract.md#security-boundaries-and-resource-limits) own exact behavior. Studio save/custom-cart share30 accepted writes/hour and20MiB normalized project JSON/24h, with Retry-After. No successful write is charged twice for the same transaction; aborted writes consume nothing. These are anti-abuse budgets, not storage deletion or an unlimited-history guarantee.

Polished23 frontend files: plain Vietnamese auth/account/support/status wording; truthful hosted/local price/payment notices; customer-visible admin order notes clearly labeled; hidden coupon wording explains anyone knowing an eligible code may use it. No invented delivery timeline/refund policy. Exact prior labels Hiện tại thanh toán/Giá áo custom retained. [Copy report](copy-261021-0446-security-polish.md).

## Verified controls and nonissues

- No confirmed auth, role-assignment, token replay, support IDOR, payment authority or stock/coupon bypass in inspected code. Added forged-authority/support metadata, reset replay/expiry and all-session revocation regressions. Password hashes, hashed random tokens, Secure/HttpOnly/Lax sessions and encrypted transactional outbox retained. [Auth evidence](security-auth-261021-0446-security-polish.md).
- Owner/admin checks, quote recomputation, atomic aggregate inventory/coupon usage, immutable private designs, SVG escaping/sandbox and bounded font/raster parsing hold. Pinterest hosts/redirects/DNS/public IPv4/socket pinning and decode/time/size limits verified. [Business evidence](security-business-261021-0446-security-polish.md).
- SQL statements bind values; dynamic query fragments are fixed internal strings. Static serving stays under built dist, rejects hidden/traversal paths; hosted cannot use demo SQLite credentials. Client redirects and React text rendering show no verified open redirect or HTML injection in scope. Math.random occurrences are UI identifiers/auth-refresh signals, not credentials.
- Source secret-pattern scan144 files returned no findings; release scan also compared configured secret values in memory without printing them. Private env/work/database/backups excluded from archive. Local demo password strings are intentional and fail on hosted backend; not hosted credentials.
- npm audit returned0 known vulnerabilities across299 dependency entries at review time. This is a registry result, not proof dependencies have no undiscovered defects.

## Verification

- Full npm test:92/92 passed, no failures/skips,121.326s. Includes real PostgreSQL/PGlite quota race/rollback/reopen plus existing business/auth/media/discount/email checks.
- Global ESLint and final TypeScript/Vite production build passed. Existing dotenv NODE_ENV warning remains nonfatal.
- Four isolated Edge journeys passed: account/email/media, support popup/mobile/hidden polling, voucher selection/real COD, Studio/edit/save/cart/order/admin artwork. [Browser report](browser-261021-0446-security-polish.md).
- Built production SPA over local HTTPS with actual PostgreSQL passed auth/admin/Studio/chat/mobile/local-font checks, no unexpected CSP errors and inline-script blocking. [Hosted test](../../tests/browser/hosted-postgres.spec.py).
- Independent business reviewer checked controller security headers/error handling; controller reviewed new budget and transaction placement. Auth/copy review found no additional proven exploitable paths. No weakening of tests: changed exact-copy selectors matched source; hidden-tab chat test was narrowed from all network requests to all support requests after diagnostics proved unrelated bootstrap reconciliation.

## Deployment and rollback

Live https://nepform.salyyy.tech; release `/opt/nep-form/releases/20261020-2159-security-polish-f142d650`.

SHA256 `f142d65003d8c2b7c152a7d4aab9dbb3de2736c5ff73811e108b1da9ab3329ba`.

Private Supabase backup before deploy: ignored `work/backups/postgres-1792533496471-0234423b.json`. Allowlist/secret scan, final archive/source match, remote checksum, Linux production dependencies, DB/mail config, Nginx syntax and verified HTTPS health passed. Private environment/queue keys/session policy retained; no schema changes, live data deletion, live order/email or promotion edits.

Public smoke verified response security headers/hidden Nginx version, final HTML/entry bundle hashes, anonymous denial, authenticated discovery/admin defaults/controls, mobile admin/storefront and no JavaScript errors or business writes. Probe cart empty: discovery correctly returns CART_EMPTY; full customer checkout exercised only isolated fixtures. Probe session revoked. Ignored evidence `work/vps-security-polish-release.json` and `work/vps-security-polish-browser-verification.json`.

Previous release `/opt/nep-form/releases/20261020-1711-voucher-picker-90df5917` and private config/vhost backup `/opt/nep-form/backups/20261020-2159-security-polish-f142d650/` retained. Roll back code/vhost together only if necessary; previous code removes these protections. Keep current DB; never restore an old backup over new orders. [Deployment owner](../../docs/deployment-guide.md#vận-hành-bảo-mật).

Owned Vite PID24036 and all fixture/browser processes stopped; no listeners5173/3003/3008/3011/3012/3016/8443. Shop remains unprivileged, loopback3101, strict systemd filesystem/no-new-privileges, environment600 root-only. VPS free disk1.1GB/97%used: monitor; no other-project cleanup.

## Remaining risks / owner actions

1. Other-project viber-postgres/redis publish5432/6379 on0.0.0.0/IPv6; UFW inactive, DOCKER-USER has no filtering rules. Host evidence confirms publication; provider firewall/external auth not tested. Shop uses Supabase, so these are outside shop runtime. Owner subsequently answered “Giữ nguyên, chỉ vá website NẾP FORM”: no changes to those services or shared firewall; no pending implementation under this task. Docker-published traffic can bypass UFW: [official Docker docs](https://docs.docker.com/engine/network/packet-filtering-firewalls/). This observed exposure remains outside the confirmed scope, not a repaired finding.
2. Root SSH still accepts passwords. Credentials/provider keys previously shared in conversation should be rotated using private configuration/provider dashboards, with replacement access tested first. This run did not rotate keys/passwords or disable shared VPS access. Keep MAIL_QUEUE_KEY stable when changing Resend API key. Do not send replacement secrets in chat.
3. Auth throttling is per instance; expired session rows are not automatically purged. Design budgets are per account and do not prevent distributed accounts, generic request floods or indefinite historical growth. Bounded image/font decoding happens before final write accounting. No stress/DDoS simulation, external penetration test or full OS/package audit performed.

CSP configuration rationale follows [MDN CSP guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP); inline styles remain required by editor geometry, but inline/eval scripts are not allowed.

Unresolved questions: none within confirmed scope. Credential rotation requires separate owner dashboard/access coordination.
