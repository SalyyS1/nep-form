# Voucher discovery backend

Status: DONE

Implemented `showAtCheckout` as strict boolean, default false for new/legacy admin responses. Omitted PATCH preserves existing flags and eligibility fields; version checks unchanged. Private codes remain valid manually. No live migrations or seeds.

Added `checkoutPromotionsRoute` for authenticated GET `/api/checkout/promotions`. Existing transaction computes current undiscounted checkout quote and bulk loads promotions, coupon uses and customer orders once. Explicit DTO projects customer conditions only; private, inactive and expired offers excluded. Future offers remain visible with shared quote rejection reason. Best code uses actual floor/cap/subtotal discount; deterministic expiry/code ties. Discovery writes no records and reserves no use.

Shared `quotePromotion` and `promotionEligibilityState` preserve manual quote/order policy: pending/unpaid orders prevent first-order eligibility; cancelled orders and released uses restore eligibility. Sale/custom price and quantity derive from checkout quote. No checkout/order contract changes.

## Files

- `server/promotions.mjs`
- `server/promotion-validation.mjs`
- `server/checkout-promotions.mjs`
- `tests/server/promotions.test.mjs`
- `tests/server/checkout-promotions.test.mjs`
- `tests/server/checkout-promotions-postgres.test.mjs`

## Verification

Passed 22/22 tests:

`node --test --test-concurrency=1 tests/server/promotions.test.mjs tests/server/checkout-promotions.test.mjs tests/server/checkout-promotions-postgres.test.mjs tests/server/promotion-eligibility.test.mjs tests/server/promotion-eligibility-postgres.test.mjs`

Includes isolated SQLite full record/identity/idempotency snapshots; actual PostgreSQL engine snapshot parity; all eligibility reasons matching manual quote; no writes on stale order rejection; custom fee/sale repricing; hidden-code privacy; null best for zero discount; deterministic ranking and one bulk preload/transaction.

Runtime files frozen; controller notified before full suite. Route registration, shared frontend types, UI and durable API docs owned by controller/other workers.

Unresolved questions: none.
