# Coupon eligibility backend

Status: DONE

Changed `server/promotions.mjs`, `server/promotion-validation.mjs`, `tests/server/promotions.test.mjs`; added `tests/server/promotion-eligibility.test.mjs` and `tests/server/promotion-eligibility-postgres.test.mjs`.

- Added strict `firstOrderOnly` boolean, default false; `minQuantity` integer 1–10000, default 1. PATCH retains omitted eligibility fields; existing optimistic versions apply. Legacy admin lists expose safe defaults without database migration.
- `quoteCoupon(store, code, userId, subtotal, now = new Date(), quantity = 1)` preserves existing arguments. Uses total server-quoted units. Vietnamese errors identify first-order restriction or required/current/missing quantity.
- Any noncancelled order blocks first-only eligibility, including pending/unpaid and legacy orders. Quote and redemption recheck history inside existing caller transaction/write lock. Different codes share the same customer history. Cancelled orders are ignored; existing release remains once only.
- Coupon snapshots include only enabled first-order/quantity restrictions. Ordinary old snapshots stay unchanged. Redemption rejects changed restriction snapshots. Existing `usageLimit: 1` / `perUserLimit: 1` remain the one-use modes.

Verification:

- `node --test --test-concurrency=1 tests/server/promotions.test.mjs tests/server/promotion-eligibility.test.mjs`: 12 passed.
- `node --test --test-concurrency=1 tests/server/promotion-eligibility-postgres.test.mjs`: 2 passed.
- Coverage: strict API validation, legacy defaults/orders, omitted PATCH/stale versions, 3 identical shirts, custom2 + regular1, forged flags/quantity, stale quantity with full records/idempotency rollback, retries, unpaid normal first order, once-only cancellation, immutable snapshots, restart.
- PostgreSQL/PGlite actual engine fixtures prove transaction races without relying on cart clearing: different first-only codes for one customer accept exactly one; normal order committed first prevents first-only redemption and writes no failed order/use. Tests do not use external databases/providers. All fixture servers/pools closed; directories removed.
- `git diff --check` unavailable: workspace has no Git metadata. No files outside assigned scope changed except this requested report. Controller owns documentation, quote caller, UI/types, overall regression suite and final review.

Decision: a first-only order committed before an ordinary order remains valid; the later ordinary order is allowed. If ordinary order commits first, the first-only order rejects. Eligibility-only edits need no total reconfirmation while buyer remains eligible and price is unchanged; accepted order snapshots preserve actual current restrictions.

Unresolved questions: none.
