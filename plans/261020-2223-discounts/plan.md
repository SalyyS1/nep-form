# Product sales and coupon discounts

Status: complete
Outcome: configurable product sale prices and one checkout coupon, admin management, correct custom-shirt pricing, immutable discounted orders/email, tested and deployed on existing VPS.
Accepted policy: sale affects garment/blank price only; custom printing fees unchanged. Coupon stacks on after-sale goods/custom subtotal, excludes shipping. Each order uses one code, bounded percentage/fixed amount, optional cap/min/date/global/per-user limits. Cancellation releases use once. No seeded live promotions.
Constraints: preserve existing prices/orders/admins; no fake payments; validate server-side, compare accepted quote, serialize quota/stock/order/idempotency together; backup before production writes/deploy. No new provider or SQL DDL needed with existing records.
Non-goals: stacked multiple codes, auto marketing campaigns, changing SePay, automatic refunds.

- [x] Shared sale calculation/product validation; all storefront/cart/custom price surfaces consistent.
- [x] Coupon admin API/UI, dates Vietnam, constraints/versioning/usage.
- [x] Server quote/redeem/order/cancel integration; checkout apply/remove and stale quote confirmation; totals in order/admin/email.
- [x] Unit/integration/races/PG and browser checks; independent review; backup/release/rollback/public smoke/docs.

Ownership: backend worker promotions module/tests; storefront worker product/cart/studio price presentation; admin worker sale editor/promotion screens/navigation. Controller shared/types, product validation/server quote/order/checkout/email/admin-cancel integration, review/tests/deploy/docs. No overlap.


Verification evidence: 67/67 server tests passed, including two PostgreSQL lifecycle/race/backup cases; lint/typecheck/build pass. Isolated discount browser passes admin sale/coupon, apply/remove, persisted totals and invalidation recovery. Hosted HTTPS/PostgreSQL browser passes Secure/HttpOnly auth, admin, Studio, support and mobile. Independent review blocker (invisible removal after coupon invalidation) fixed and closure verified. Live release activated; public authenticated smoke passes without changing products/promotions. Pre-release backup comparison confirms active product prices unchanged; owned test processes stopped.

Delivery: [implementation report](../reports/implementation-261020-2223-discounts.md). No unresolved questions.
