# Coupon backend

Status: DONE

- Added `server/promotions.mjs`, `server/promotion-validation.mjs`, and `tests/server/promotions.test.mjs`.
- Admin list/create/update validates code uniqueness, optimistic versions, bounded amounts, nullable restrictions, ISO dates, authorization; usage counts derive from unreleased historical records.
- `quoteCoupon(store, code, userId, subtotal, now?)` calculates an immutable order snapshot with exact integer percentages. Missing code returns zero discount.
- `redeemCoupon(store, coupon, userId, orderId, now?)` rechecks active window and current quotas. Same order retry never consumes another use.
- `releaseCoupon(store, order)` marks usage released once, preserving promotion IDs and purchased snapshots.
- Order owner must call quote/redemption within its store transaction; cancellation owner calls release within its transaction. Existing global store locks serialize uniqueness/quota updates.
- Validation: `node --test tests/server/promotions.test.mjs` passed 7/7. Covers exact money, date boundaries, invalid admin values, stale updates, concurrent code collision/redemption, per-user limits, retry/release, transaction rollback, and historical snapshots.
- Applied `ak-backend-development` guidance; no new dependencies or external services.

Unresolved questions: none.
