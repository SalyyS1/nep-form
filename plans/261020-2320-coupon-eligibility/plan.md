# One-use, first-order and quantity coupon rules

Status: complete.
Outcome: admin configures easy one-use presets, first-order-only eligibility and minimum total item count; server enforces at quote and order; tested and deployed existingVPS.
Accepted policy: global one-use uses usageLimit1; per-customer one-use uses perUserLimit1. First order means no prior noncancelled order (pending/unpaid included). Cancellation returns eligibility/usage under existing policy. Combo counts summedquantity, including identical products and custom shirts; user confirmed. Conditions combine with existing amount/date/quota rules, one code perorder, shippingexcluded and sale stacking unchanged.
Constraints: server-derived eligibility, atomic order lock, immutable snapshots/idempotency; backwards-compatible legacy fields. No newlivecodes/prices/orders, noSQLDDL, preserve real sessions and environments; private backup beforedeploy.
Non-goals: couponwallet, free-shipping offers, percategoryproductsets or automatic multiplecombo tiers.

- [x] Backend validation/eligibility/defaults; SQLite/PG race/rollback/legacy tests.
- [x] Admin presets/newconditions/list, checkout restriction details.
- [x] Integrated browser failure/success/firstpurchase/cancel paths; lint/build/fullserver tests and independentreview.
- [x] Backup/artifactscan/existingVPSdeploy/publicread-only smoke; docs/report/cleanup.

Ownership: backendworker promotions/validation/tests; adminworker editor/list/style; controller types/quoteintegration/checkoutdisplay/deploy/docs; browserworker isolated3015 journey. No overlaps.

Focused backend14/14 pass including2 actualPostgreSQL/PGlite cases; adminlint/typecheck and mainlint/build pass. Runtime archive prepared/staged locally pending broadtests, browser andreview.

Final full server suite74/74 pass (125.9s), integrated browserpass includingrealCOD/stale rollback/customcount, source reviewclosed/noissues, lint/buildpass. Artifactmatchesfinalruntime andprivatebackupcomplete.

Liveauthenticatedread-only smoke passes newcontrols/presets/admin/mobile; healthproduction. Release20261020-1629-coupon-eligibility-db009367 active; priorrelease retained. Allownedprocessesstopped. [Delivery report](../reports/implementation-261020-2320-coupon-eligibility.md).
