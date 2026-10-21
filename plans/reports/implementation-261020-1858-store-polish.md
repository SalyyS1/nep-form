# Store polish delivery

Status: DONE
Live: https://nepform.salyyy.tech
Release: /opt/nep-form/releases/20261020-polish-ff15a2c7
Artifact SHA256: ff15a2c71ca7e52f1cc6a09aec4c93d490f63c1a4e27d190128c484af903f12f

## Delivered

- Auth Up/Down field navigation with native Tab/Enter/IME preserved; accessible password visibility; mandatory matching repeated passwords in registration/reset UI, supplied API mismatches rejected. Optional API confirmation intentionally preserves older clients; repeated entry prevents customer typos, not an additional authentication factor.
- Hashed, expiring, email-bound one-use verification/reset; persisted resend cooldown, checkout verification gate when mail configured, truthful disabled/local behavior. Transactional outbox for order receipt/cancel/status/payment/tracking; encrypted independent stable queue key, leases/backoff/provider dedupe23h horizon, sanitized failures and terminal unreadable payload. Admin counts distinguish provider acceptance from delivery.
- Admin raster upload/normalization/public SQL persistence; HTTPS direct image links, tightly bounded safe Pinterest import; preview, cover/reorder/remove, error and saving locks. Customer artwork remains private; no filesystem upload loss across releases.
- In-place support popup, draft preservation, focus/Escape/mobile, no closed/hidden/duplicate polling; full /tai-khoan/ho-tro history. Vietnamese auth/home/footer/about/help copy refreshed, stale local-only storefront text removed; no invented return/refund guarantees.

## Verification

Full npm test suite before review fixes:50/50 PASS. Final affected review checks:12/12 PASS (10 mail incl key rotation,2 proxy identity). Scoped media/admin tests9/9 PASS. Typecheck/lint/build PASS; existing Vite NODE_ENV dotenv warning does not prevent production output.

Browser: account-polish PASS on isolated SQL with capture-only real queued mail, token verification, checkout gate, history, admin file upload/cover/save/public bytes and mail status. support-popup PASS real isolated sends/retry/history/focus/drafts/mobile. Hosted HTTPS/PGlite browser PASS preserving existing dashboard/Studio/support contract. No real customer/order fixtures added to production.

Independent review found shared proxy-auth limiter bucket and provider-key-derived queue encryption. Both fixed and independently reverified, no remaining concrete blocker. Explicit TRUST_PROXY_LOOPBACK only accepts valid X-Real-IP from loopback; Nginx overwrites header. Invalid/non-proxy spoofing rejected. MAIL_QUEUE_KEY is independent and required for configured production mail; wrong-key failures terminal without provider calls. Access logs omit query strings and token pages use no-referrer.

## Production

User-provided Resend key saved only in ignored private .env and VPS environment. Domain sending SPF/DKIM verified; unrelated Receiving record pending does not block outbound mail. One setup email accepted by provider to owner-designated initial admin address; user confirmed inbox arrival on20/10/2026 at21:52 Asia/Saigon. No key/recipient/password/token value in reports.

Fresh private Supabase backup before release. Minimal6.04MiB artifact excludes dotenv/localDB/backups/node_modules; public build checked against configured secret values. Dedicated release installed Linux dependencies; real SQL check and private mail validation PASS. Prior code/environment/vhost retained under private VPS backups; code symlink switched and only nep-form restarted/Nginx reloaded after nginx -t. No DDL or bulk data updates. Service remains loopback3101, production HTTPS health200, mail configured/verificationRequired true. Disk1.7GiB free.

Public browser final PASS: keyboard focus, password mismatch rejected before any registration request, popup stays in page, admin email status, image controls, Studio,375px auth layout, no JS exceptions, logout revokes test session. Evidence contains booleans only: work/vps-polish-browser-verification.json. No public test registrations or product mutations. Deployment paths/log/key rotation/rollback guidance updated in docs/deployment-guide.md; API behavior in docs/local-api-contract.md.

## Limits / unresolved

Setup email provider acceptance and recipient inbox arrival both verified; user confirmation recorded. This receipt covers the setup email, not a guarantee for every future recipient. No delivered/bounced webhook yet. SePay remains unconfigured/disabled. Mail queue scans historical generic records; database-backed photo retention and volume need monitoring before significant growth. These do not block requested small-shop rollout.
