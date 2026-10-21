# Commerce, Studio and media security audit

Status: DONE

Scope: local source review and isolated SQLite/HTTP regression tests. Read development rules and docs/local-api-contract.md. Root README absent (controller confirmed). Applied security-auditor skill. No live database, private environment, external provider or remote attack traffic used.

## Confirmed finding and fix

Authenticated persistent resource abuse: Studio accepted arbitrarily many immutable designs with up to 2 MiB source rasters plus 1 MiB source fonts each; cart/custom cart and saved addresses had no active record bound. Individual request caps did not constrain accumulated storage or account bootstrap/checkout work.

- Added server/customer-resource-limits.mjs: one compact persisted allowance record per account, shared by successful design saves and custom cart adds. At most 30 accepted writes per hour and 20 MiB normalized serialized project JSON per 24 hours. Windows begin with the first accepted write and renew independently at expiry. Returns 429 STUDIO_WRITE_LIMIT with an integer retryAfter; controller integrated Retry-After response header.
- Consume allowance under the existing design/cart transaction. Validation, stock, cart-capacity and persistence failures leave allowance/artwork/cart unchanged. Concurrent requests share database serialization. Persisted state survives restart.
- Bound active cart to 50 lines across regular/custom routes and saved addresses to 20. Existing entries remain editable/removable; adding quantity to an existing regular line remains allowed. New entries fail 409 CART_LINE_LIMIT/ADDRESS_LIMIT. Address saving failure at checkout rolls back inventory/order/cart changes.
- Retained all historical immutable designs and order snapshots. No lifetime design cap or data deletion.

Files changed: server/customer-resource-limits.mjs, server/custom.mjs, server/cart-and-addresses.mjs, tests/server/customer-resource-limits.test.mjs, tests/server/customer-resource-limits-postgres.test.mjs. Controller owns docs/local-api-contract.md and server/index.mjs integration.

## Verified controls / nonissues

- Cart/address owner lookup and order/design owner-or-admin checks prevent cross-account reads/writes. Foreign private records return 404. Project userId, body paymentStatus, totals, price and custom design IDs do not grant authority.
- Checkout recomputes sale/custom/coupon pricing and verifies accepted quote; attacker totals are ignored/rejected. Only explicit admin order update marks payment paid. Bank orders remain pending. Coupon policy retained: identical units count individually; first order excludes cancelled orders only; discovery requires explicit showAtCheckout true.
- Aggregate variant stock is checked across distinct custom lines under the same transaction as deduction. Idempotency protects retries; customer/admin cancellation restores inventory and coupon usage once.
- Saved designs are immutable and private. SVG dynamic content is escaped or allowlisted; fonts use generated safe family names, rasters use canonical validated data URLs. SVG responses retain sandbox CSP. No arbitrary remote SVG, script, CSS family/path or image source accepted.
- Product image upload/import requires admin. Uploaded images are fully decoded and normalized to public WebP, independent of private customer artwork.
- Pinterest importer restricts HTTPS hosts, rejects credentials/custom ports/private/reserved/mixed IPv4 DNS answers, pins validated socket address and rechecks redirects. Response bytes, redirects, DNS/HTTPS time and image dimensions are bounded. No arbitrary URL proxy found.
- Product/admin/promotion validation explicitly projects stored fields; no user-accessible mass-assignment or payment/inventory bypass found.

## Verification

`node --test tests/server/customer-resource-limits.test.mjs`: 5 passed. Includes anonymous/invalid/stock-failed request accounting, actual normalized byte charging, hostile body metadata, atomic competing final hourly writes, persistence across restart, independent window renewal, daily byte exhaustion, transaction rollback, Retry-After, competing final cart/address slots, existing entry edits/removal and checkout rollback.

`node --test tests/server/customer-resource-limits-postgres.test.mjs`: 1 passed. Actual PostgreSQL engine through PGlite and production store adapter verifies atomic budget/artwork rollback, two competing final-slot transactions, integer Retry-After, on-disk close/reopen persistence, account isolation and independent window renewal.

`node --test --test-concurrency=1 tests/server/custom-studio.test.mjs tests/server/custom-fonts.test.mjs tests/server/order-inventory.test.mjs tests/server/product-media.test.mjs tests/server/promotion-eligibility.test.mjs tests/server/discount-checkout.test.mjs tests/server/api-isolation.test.mjs`: 32 passed.

All test servers/processes closed through harness cleanup. Tests use temporary data only. Workspace has no .git; no git diff/commit possible.

Read-only review of controller's server/security-headers.mjs, server/index.mjs and tests/server/security-http.test.mjs found no actionable issue: required Studio assets remain allowed; production CSP limits script execution, framing, form/base/object targets; private SVG retains stricter sandbox; untyped driver error codes remain private; Retry-After requires a positive safe integer.

## Limits

The write quotas bound accepted per-account resource growth; they do not promise immunity to arbitrary request floods, distributed accounts, or long-term cumulative history growth. Failed raster/font validations still perform bounded parsing before transactional accounting; existing pixel/source/container limits remain the per-request defense. No live deployment/real PostgreSQL/VPS/network-provider penetration test was run by this worker. Controller owns broad verification and operational deployment decisions.

Unresolved questions: none.
