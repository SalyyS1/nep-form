# Checkout voucher picker delivery

Status: COMPLETE · 21/10/2026.

## Result

Customers can open **Chọn mã giảm giá** at checkout, view eligible/unavailable public offers, full conditions, exact current savings and reasons an offer cannot apply. **Giảm nhiều nhất** ranks actual VND savings after percentage caps/subtotal rather than nominal percentages. Explicit selection obtains a new server quote; discovery reserves no uses and checkout revalidates atomically. Manual private codes and a higher-saving private applied code remain usable.

User chose admin opt-in visibility. **Hiện tại thanh toán** defaults false for legacy/new promotions, with public/private admin badges. Existing live codes were not published, seeded or edited. Public authenticated DTO excludes private codes, admin identifiers, usage counters and other customers' data. No SQL DDL or pricing-policy change.

Async guards prevent old cart/account requests and old apply completions overwriting current UI. Failed quotes retain the removable code but do not falsely mark a picker card selected or prevent retry. Dialog buttons cannot submit the parent checkout form. Usage and API owners are linked from [setup guide](../../docs/setup-guide.md#giá-sale-và-mã-giảm-giá) and [contract](../../docs/local-api-contract.md#product-sales-and-checkout-coupons).

## Verification

- Focused backend22/22 passed, including SQLite and PostgreSQL/PGlite discovery, privacy, caps/ranking/ties, eligibility and no reservation. Full `npm test`:82/82 passed, no failures/skips,327.159s.
- Global ESLint passed; final one-line valid-quote selection fix passed targeted ESLint. TypeScript/Vite production build passed after final source edit. Existing dotenv NODE_ENV warning is nonfatal.
- Final real Edge/SQLite browser journey passed desktop1440 and mobile390: admin defaults/save, conditions/reasons, best actual savings, private higher code, explicit quote selection, stale offer refusal/replacement, cart recommendation changes, delayed response rejection, network retry/empty state, focus/overflow, no accidental orders. Added failed-quote same-code retry regression passed. Final COD subtotal400,000−100,000+30,000=330,000đ, one order and one redemption. [Browser report](tester-261020-2350-voucher-picker.md); screenshots visually inspected.
- Independent [review](review-261020-2350-voucher-picker.md) found no remaining issues; focused7/7 and scoped ESLint passed. Workspace lacks Git metadata, so no base diff metrics. Initial browser timestamp/label mismatches were corrected in test inputs; no product workaround.

## Deployment

Live: https://nepform.salyyy.tech. Release `/opt/nep-form/releases/20261020-1711-voucher-picker-90df5917`.

SHA256 `90df5917743840b6d0d8062ae63036033da14d33981ade9315d82da024c2c8f9`.

Private Supabase backup completed before deployment: ignored `work/backups/postgres-1792516222896-d7aad9c0.json`. Allowlist/configured-secret scan and remote archive checksum passed. Production dependency install, SQL/mail configuration, Nginx syntax, service state and verified HTTPS health passed. Existing private environment, session policy, SQL records and other apps retained. Backend remains127.0.0.1:3101.

Public smoke verified served HTML/entry bundle hashes match the final build, anonymous discovery/admin denied, authenticated discovery and normalized visibility, new admin opt-in default and existing sale/eligibility controls, mobile admin/storefront, no JavaScript errors or product/promotion/order writes. Probe account cart was empty: live discovery correctly returned CART_EMPTY; complete customer picker/checkout was verified in the isolated browser instead of creating a live cart/order. Probe session revoked. Ignored evidence: `work/vps-voucher-picker-release.json`, `work/vps-voucher-picker-browser-verification.json`.

Previous `/opt/nep-form/releases/20261020-1629-coupon-eligibility-db009367` retained; private config/vhost backups under `/opt/nep-form/backups/20261020-1711-voucher-picker-90df5917/`. Code rollback to that release removes picker while preserving existing coupon policy; keep current DB, never restore old backup over new orders. Earlier releases may ignore eligibility: see [deployment guide](../../docs/deployment-guide.md).

Owned fixture/browser and Vite PID33100 stopped; ports3016/5173 have no listeners. VPS free disk1.2GB (96%used); no unrelated cleanup. SePay setup unchanged.

Unresolved questions: none.
