# Coupon eligibility delivery

Status: COMPLETE · 20/10/2026.

## Result

Admin can select one use globally or one per customer using existing usage limits, restrict codes to first orders, and require a minimum summed quantity. User explicitly chose total units: three identical shirts count3; custom quantities included. Conditions combine with current dates/minimum spend/percentage caps and sale stacking; shipping remains excluded.

First-order policy: no previous noncancelled order, including pending/unpaid. Cancelling returns eligibility and usage once. This is account-based, not household/person detection. Legacy promotion fields default false/1, legacy orders count toward purchase history, and accepted coupon snapshots remain immutable. No SQL DDL, live promotion seeding or price changes.

Implementation owners: server promotion validation/policy, checkout's server-side quantity sum, shared JSON types, admin editor/list/styles and applied coupon details. Exact files/tests linked in [contract](../../docs/local-api-contract.md#product-sales-and-checkout-coupons) and [usage guide](../../docs/setup-guide.md#giá-sale-và-mã-giảm-giá).

## Verification

- Focused backend14/14: unit policy plus SQLite HTTP and actual PostgreSQL/PGlite lifecycle/races. Includes forged client flags/counts,3 identical units, mixed custom+ordinary units, stale-cart full rollback, normal pending order invalidating first-purchase quote, cancellation/restart/snapshots, different-code first-order serialization.
- Full `npm test`:74/74 passed,125.9s; no skipped or failed cases. Existing auth, inventory, custom artwork, email, discounts, PostgreSQL, media and support checks included.
- Targeted admin typecheck/lint and final main ESLint/TypeScript/Vite production build passed. Existing dotenv NODE_ENV warning does not prevent build.
- Real isolated browser passes admin presets/save/edit/list/mobile,2-unit refusal→3 identical units accepted, COD total600,000−60,000+30,000=570,000đ, pending-order first-code refusal, cancellation/reuse once, stale quantity refusal with unchanged stock/cart/orders/usage, custom3 units and ordinary-code compatibility. Screenshots visually inspected. [Browser evidence](tester-261020-2320-coupon-eligibility.md).
- Independent [review](review-261020-2320-coupon-eligibility.md) closed with no remaining issues. Initial docs gap corrected during review. One browser selector ambiguity was fixed in the test by selecting the numeric spinbutton; no product workaround.

## Deployment

Live: https://nepform.salyyy.tech; release `/opt/nep-form/releases/20261020-1629-coupon-eligibility-db009367`.

SHA256 `db0093674a59a5c36063c4a2e1a453398d7d0a0a20d0e5dacabaefd942dcfb9d`.

Private Supabase backup completed before deploy (`work/backups/postgres-1792513798232-c63353f3.json`, ignored). Runtime allowlist and configured-secret scan passed; archive matched final runtime source. Remote checksum, Linux dependency install, database/mail configuration, Nginx syntax and HTTPS production health pass. Environment/session policy unchanged; service remains private loopback3101. Only shop service/vhost touched; other VPS apps unchanged.

Public authenticated smoke passes promotion API, new condition controls and both preset mappings without saving, existing sale editor, mobile admin/storefront and no JavaScript errors. No product/promotion writes; only probe session created/revoked. Evidence metadata: ignored `work/vps-coupon-eligibility-browser-verification.json`, `work/vps-coupon-eligibility-release.json`.

Previous release `/opt/nep-form/releases/20261020-1612-sessions-27e15dd4` retained; private backups under `/opt/nep-form/backups/20261020-1629-coupon-eligibility-db009367/`. Before rolling back to code without new eligibility, pause checkout or disable affected codes: older code understands discount amounts but ignores these restrictions. Prefer forward repair; never restore old DB over current orders. Route owned by [deployment guide](../../docs/deployment-guide.md).

Owned fixture browser/API and Vite stopped; ports5173/3015 closed. VPS free disk1.3GB (96%used); no unrelated cleanup performed. Current SePay setup unchanged.

Unresolved questions: none.
