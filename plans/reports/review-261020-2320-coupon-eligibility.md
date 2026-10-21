# Code review: coupon eligibility

Status: DONE

## Scope

- Reviewed `server/promotions.mjs`, `server/promotion-validation.mjs`, `server/checkout-quote.mjs`, `server/orders.mjs` for auth, money, compatibility, and transaction ordering.
- Reviewed `src/lib/types.ts`, promotion admin UI/styles, checkout coupon display, focused SQLite/PostgreSQL eligibility tests, existing promotion tests, plan, and coupon contract.
- Workspace has no Git metadata, so review used current files rather than a baseline diff. No tests run; controller owns the integrated run.

## Assessment

Pre-landing review: no issues found.

No blocking implementation defect found. Admin routes require an administrator; checkout derives subtotal and summed quantity from server cart state; discount excludes shipping; integer percent math avoids floating-point drift. Order creation re-quotes inside the write transaction before stock, coupon-use, order, idempotency, and cart writes. First-order and quota checks therefore share the order commit boundary. Cancellation releases usage and changes order state in the same transaction.

Legacy promotions default to `firstOrderOnly: false` and `minQuantity: 1`; snapshots omit default eligibility fields, preserving old coupon shapes. Legacy orders without status block first-order eligibility, while cancelled orders do not. A normal order committed before a first-order redemption correctly invalidates it; a normal order committed after a first-order order remains allowed by the accepted policy.

Tests cover forged client eligibility fields, stale cart quantity with full record/idempotency snapshots, unchanged stock/quota on rejection, same-shirt and custom quantity totals, first-order races, pending/unpaid orders, cancellation release once, idempotent retries, restart persistence, and SQLite/PostgreSQL behavior.

The initial documentation gap was resolved during review. `docs/local-api-contract.md` now records the false/1 legacy defaults, pending/unpaid/cancelled first-order policy, summed quantity including custom units, reuse of existing quota fields, server authority/locking, snapshots, and focused tests. `docs/setup-guide.md` documents the matching admin workflow and presets.

## Checklist result

- Concurrency: order/redeem/cancel paths checked; serialized transaction boundary and rollback assertions present.
- Error boundaries: eligibility failures propagate as typed 4xx responses; transaction rollback prevents partial writes.
- API compatibility: omitted new fields retain false/1 defaults; old undiscounted orders and default coupon snapshots remain readable.
- Input validation: boolean is strict; quantity is an integer 1–10,000; coupon codes and limits remain validated server-side.
- Auth/authz: admin promotion endpoints require admin; quote/order require authenticated user; cancellation checks ownership.
- Query efficiency: first-order lookup is owner-scoped; existing coupon-use scans remain unchanged.
- Data exposure: no new secret, PII, stack, or internal-state exposure found.
- UI: presets map to existing `usageLimit=1` or `perUserLimit=1` and clear the opposing limit; manual changes fall back to custom; checkout displays active eligibility restrictions.

## Unresolved questions

None.
