# Transactional email delivery

Status: DONE_WITH_CONCERNS

Implemented real Resend HTTP transport, Vietnamese plain/escaped HTML templates, email verification, password-reset delivery, transactional order outbox and bounded background processing. No provider calls, production database writes or credential reads performed by this worker.

## Files owned and changed

- `server/email-service.mjs`: configuration, encrypted outbox, hashed token lifecycle, leasing, bounded retry, worker lifecycle, safe status counts.
- `server/email-transport.mjs`: native fetch to fixed Resend endpoint, 15-second timeout, redirect rejection, provider idempotency key, sanitized failures.
- `server/email-templates.mjs`: verification/reset and order receipt/status/payment/carrier/tracking messages; order links and payment state match persisted snapshots.
- `server/auth.mjs`: register verification, authenticated resend, one-use verification endpoint, configured reset email, conditional password confirmation validation, reset email binding.
- `server/auth-rate-limit.mjs`: verification and resend included in hosted authentication limits.
- `server/common.mjs`: public `emailVerified` boolean; admins remain verified.
- `server/orders.mjs`: configured checkout verification gate, same-transaction receipt/cancellation enqueue, unchanged idempotent retry result.
- `server/admin.mjs`: same-transaction order change enqueue, safe email status counts; media worker integration import and validation call added as coordinated.
- `tests/server/email-verification.test.mjs`: eight isolated SQLite tests; injected test transport only.

## Integration contract

Create `emailService({store,config,env:options.mailEnv??process.env,transport:options.mailTransport})`; pass as `ctx.mail`. Configuration requires `MAIL_ENABLED=true`, nonempty `RESEND_API_KEY`, and valid `MAIL_FROM`. Main controls environment and provider setup. Hosted absolute links derive from `config.appOrigin`; local default is localhost:5173.

Bootstrap exposes `email:{configured:mail.configured,verificationRequired:mail.configured}`. `publicUser` exposes `emailVerified`; admins always true, old customer records without the flag false. Login remains available; checkout checks configured mail and customer verification.

`startEmailWorker(mail)` returns `{stop(),get finished()}`. Call `stop()` then await `finished` before closing store. Disabled mail starts no timer. Worker uses unref timer and sends outside the database transaction.

Auth POST endpoints: `verify-email {token}` => `{ok:true}`; `resend-verification` requires session => `{queued:true}` or `{alreadyVerified:true}`; cooldown => 429 `EMAIL_COOLDOWN`. Register response includes queue result. Local disabled mail may return `verificationUrl` or `resetUrl` with `localOnly:true`. Hosted responses never return raw token URLs. Hosted unconfigured resend/reset => 503 `EMAIL_NOT_CONFIGURED`; registration remains usable without mail.

`GET /api/admin/email-status` requires admin and returns only `{configured,pending,failed,sent}`. Sent means provider acceptance, not delivery confirmation.

Token records store SHA-256 digest, owner, exact email and expiration. Queued payloads encrypted AES-256-GCM using SHA-256 of provider key; accepted/cancelled payload removed. Verification expires after 24 hours, reset after 30 minutes, resend cooldown persisted for 60 seconds. Provider retry event IDs stable; attempts limited to eight including crash recovery, retries prohibited at 23 hours after initial attempt (inside Resend 24-hour dedupe retention).

## Verification

- `node --test tests/server/email-verification.test.mjs`: 8 passed. Token expiry, replay race, email binding, hash/encrypted storage, resend authentication/cooldown, local/hosted response privacy, reset confirmation, failure sanitization/backoff/idempotency horizon, atomic order outbox/cancellation/rollback, provider failures preserving committed order/stock, concurrent leases, retry cap, HTML/header escaping, fixed endpoint/redirect behavior.
- `node --test --test-concurrency=1 tests/server/api-isolation.test.mjs tests/server/order-inventory.test.mjs tests/server/admin-operations.test.mjs tests/server/postgres-hosting.test.mjs`: 9 passed, including hosted PostgreSQL fixture.

## Operational concerns

- Rotating `RESEND_API_KEY` changes encryption key for pending jobs. Drain queue before rotation; prior ciphertext retained but cannot decrypt with replacement key. Fresh verification/reset requests recover account mail. Existing orders remain stored regardless.
- Generic record store currently lists all email jobs for worker claim/status. Large mail volumes require indexed queue reads and an explicit retention policy; current change avoids unowned storage/schema changes.
- No live delivery claim. Main separately owns real domain/provider readiness, deployment configuration and any explicit delivery validation.

Official references: [Send Email](https://resend.com/docs/api-reference/emails/send-email), [Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

Unresolved questions: none blocking implementation.
