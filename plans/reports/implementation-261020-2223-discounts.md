# Product sales and coupons

Status: COMPLETE · 20/10/2026 · NẾP FORM.

## Delivered

- Product SALE price/schedule, strikeout/badges, effective-price filtering, cart/checkout/Studio/admin price consistency. Custom sale affects garment only, preserving print fees.
- Admin **Khuyến mãi**: percentage/fixed codes, minimum, percentage cap, Vietnam schedule, global/per-customer limits, enable/disable, search/status and optimistic versions.
- Authoritative checkout apply/remove quote; one coupon after sale, shipping excluded. Order transaction owns stock, quota, quote comparison, idempotency, snapshots and mail outbox. Cancellation returns quota once.
- Discount/code shown on customer/admin orders and transactional email. Legacy orders remain compatible; no SQL DDL or production promotion seeding.

Independent review found one checkout blocker: when an applied coupon became invalid, clearing its quote also hid removal. Fixed by preserving the applied-code control separately from the valid quote. Reviewer verified closure; real browser regression proves rejected submit leaves data intact, removal retrieves a fresh quote, and the customer manually confirms again.

## Verification

- Server suite: 67/67 passed. Includes SQLite checkout and PostgreSQL/PGlite lifecycle, last-use/per-customer concurrency, idempotency, cancellation, stale-quote rollback, snapshots/restart and backup restoration with old orders.
- Lint, typecheck and production build passed. Vite reports the existing `.env` NODE_ENV warning; production output builds successfully.
- Isolated browser: admin saves 250,000→200,000đ sale; creates capped coupon; customer tests invalid/apply/remove code, COD snapshot totals, invalidation recovery and mobile layout. See [browser report](worker-261020-2223-discount-browser.md).
- Built SPA over HTTPS with PostgreSQL: Secure/HttpOnly login, hidden demo UI, admin, Studio, support and mobile passed.
- Browser screenshots visually checked. No JavaScript errors. Production archive allowlist and configured-secret scan passed.

## Live deployment

Website: https://nepform.salyyy.tech. Release: `/opt/nep-form/releases/20261020-1545-discounts-f5b85dd4`.

Archive SHA256: `f5b85dd45faef417e11df4edc2ae0974468284e771420dfcbe045806e0111a1c`.

Private Supabase backup completed before deployment; retained under ignored `work/backups/`. Current environment/email keys unchanged. Archive verified remotely, production Linux dependencies installed, database/mail configuration checked, Nginx syntax passed. Only shop service/vhost restarted/reloaded. Loopback3101 remains private; HTTPS health reports production; shop/Nginx active.

Authenticated public browser verifies promotion API/editor, sale editor, mobile admin/storefront, no JavaScript errors and revokes its session afterward. It submits no product/promotion changes and creates no test orders/accounts. All active product price/sale fields equal the pre-release backup. Evidence metadata: ignored `work/vps-discount-browser-verification.json` and `work/vps-discount-release.json`.

Previous release retained: `/opt/nep-form/releases/20261020-polish-ff15a2c7`; private config/vhost backups under `/opt/nep-form/backups/20261020-1545-discounts-f5b85dd4/`. If rollback is necessary after real discounts are enabled, pause checkout first: older code does not understand coupon/sale totals. Prefer a forward fix; never restore an old database over live orders. Operating route: [deployment guide](../../docs/deployment-guide.md).

All owned browser/API/Vite processes stopped; test ports5173/3013/3008/8443 closed. Unrelated local/VPS applications untouched. VPS disk has1.6GB free; no unrelated cleanup performed.

## Limits

Idle storefront pages do not tick at sale boundaries; authoritative checkout revalidates before placing and requests confirmation if the amount changed. No real promotion or live order was created for testing. SePay remains in its existing unconfigured state.

Unresolved questions: none.
