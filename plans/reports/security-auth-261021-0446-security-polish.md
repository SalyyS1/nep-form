# Auth, email and support security review

Status: DONE

Scope: `server/auth.mjs`, `common.mjs`, `auth-rate-limit.mjs`, `email-service.mjs`, `email-transport.mjs`, `email-templates.mjs`, `support.mjs`; relevant store interfaces, HTTP integration, API contract and tests. README absent, as confirmed by controller. Development rules and `ak-security` skill read.

Threat boundary: anonymous users can register/log in and request email tokens; customers own sessions and one support conversation; administrators can read/respond to support. Protect credentials, account authority, token links, private messages and provider credentials. Local demo/reset-link behavior explicitly preserved. No private environment reads, live DB changes, external provider calls, real email or deployment.

## Confirmed findings

No confirmed security flaw in delegated auth/email/support modules. No production implementation changes justified. Existing controls verified through source and isolated tests:

- Registration derives role/verification/password hash on the server; supplied authority is ignored. Public user/support DTOs exclude password hashes.
- Sessions use random 256-bit values, hashed persistence, explicit expiry and HttpOnly/SameSite=Lax cookies; production adds Secure. Every login/register issues a fresh session. Malformed cookies are hashed/missed without decoding or exceptions.
- Reset and verification tokens are random, hashed, expiring, email-bound and one-use under serialized SQL transactions. Password reset revokes every session. Failed confirmation/expired reset changes no password/session state.
- Configured/production reset responses never reveal token links. Local unconfigured mail links remain an intentional loopback demo feature.
- Outbox payloads use authenticated encryption with an independent key. Worker leases, deduplication, retry horizon and token cancellation preserve delivery integrity. Provider endpoint fixed; redirects blocked; exceptions sanitized.
- Support thread/sender ownership derives from session. Customer paths cannot address other customers; admin paths enforce role. Injected senderRole/senderId/userId/threadId are ignored. Stored send limits, retry deduplication, read cursors and status versions preserved.
- Auth proxy IP trust restricted to explicitly trusted loopback sockets; forged public X-Real-IP ignored. Existing account/peer throttling preserved.

## Changes and evidence

- Added `tests/server/auth-security.test.mjs`: forged registration authority, private hash omission, distinct sessions, all-session revocation, invalid confirmation safety, reset replay, simultaneous reset races, expired reset safety and old/new password behavior.
- Extended `tests/server/support.test.mjs`: forged support sender/thread/owner metadata cannot affect persisted authority; summary excludes password hash.
- Narrow check: `node --test tests/server/auth-security.test.mjs` — 2/2 pass.
- Relevant suite: `node --test tests/server/auth-security.test.mjs tests/server/auth-proxy-limit.test.mjs tests/server/email-verification.test.mjs tests/server/support.test.mjs tests/server/api-isolation.test.mjs` — 19/19 pass, no skips/failures.
- Fixtures use in-memory SQLite or test-helper temporary databases; email transport captures locally. HTTP tests close their servers through existing cleanup.

## Nonissues and limitations

- Unknown-account login returns more quickly than a known account with a wrong password, but account existence is already intentionally disclosed by public registration (`EMAIL_EXISTS`); no additional protected information or demonstrated privilege impact. No speculative password hashing change.
- Sessions expire correctly for authorization; expired rows are not automatically pruned. This is an operational retention/storage limitation, with no proven account-access bypass. No new active-session policy imposed.
- Throttling remains best effort per instance, as documented. Distributed throttling and live TLS/proxy deployment verification outside delegated scope.
- Reset concurrency exercised with SQLite serialization; PostgreSQL also serializes mutations through its global write lock, inspected in source. No live PostgreSQL instance used by this worker.
- No evergreen documentation change: product behavior unchanged. Findings/verification retained here as a stateful review record.

Unresolved questions: none.
