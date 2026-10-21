# Code Review Summary

## Scope

- Focus: final voucher discovery/picker source and focused tests; no Git metadata/base diff available.
- Backend: `server/promotions.mjs`, `server/promotion-validation.mjs`, `server/checkout-promotions.mjs`, route registration, quote/order callers.
- Frontend: checkout promotion types, quote/promotion hooks, picker/coupon/page integration, Dialog safety, admin visibility controls.
- Contract/tests: voucher section in `docs/local-api-contract.md`, focused SQLite/PostgreSQL discovery tests, browser report.
- Review lens: money correctness, authentication/privacy, stale recommendations, async/context isolation, private-code comparison, form submission safety, accessibility, query efficiency and atomicity.

## Overall Assessment

Pre-Landing Review: No issues found.

Implementation matches the accepted contract. The authenticated discovery route derives subtotal and quantity through the existing server quote, reuses the same eligibility and integer-discount policy as manual codes, projects the exact public DTO, and omits private/legacy, inactive and expired codes. Recommendation uses actual capped/subtotal-bounded VND savings and deterministic expiry/code ties; only an eligible positive discount becomes `bestCode`.

The order path remains authoritative and atomic: discovery reserves nothing, explicit picker selection requests a fresh server quote, and order creation recomputes and compares the quote before coupon redemption. Existing quota, first-order, minimum quantity and minimum subtotal behavior remains shared.

Frontend async handling is coherent. Promotion requests abort and serialize, state is tagged to the cart/account/pricing context, stale responses are hidden during render, selection completions cannot close or write an error into a changed/reopened picker, and account changes remount guarded checkout state. The picker trusts server order/ranking, keeps a higher-saving private code applied without suggesting an inferior public code, and uses explicit non-submit buttons outside the parent form portal.

## Critical Issues

None.

## High Priority

None.

## Medium Priority

None.

## Low Priority

None.

## Edge Cases Checked

- Delayed response after cart/account/pricing context change.
- Stale public offer disabled after discovery but before apply/order.
- Private manually entered code saving more than the public recommendation.
- Percentage flooring, caps, fixed discounts and subtotal ceiling.
- Future, expired, inactive, exhausted, first-order, subtotal and quantity conditions.
- Zero-discount eligible offer excluded from `bestCode`.
- Legacy/new `showAtCheckout` default false and strict opt-in.
- Public DTO excludes promotion IDs, live usage counts, internal fields and private codes.
- Picker close/select controls cannot submit the checkout form.
- Native modal Escape, focus containment/return and mobile overflow behavior.
- One bulk eligibility preload; no per-promotion DB calls.

## Verification

- `node --test --test-concurrency=1 tests/server/checkout-promotions.test.mjs tests/server/checkout-promotions-postgres.test.mjs`: 7/7 passed.
- Scoped ESLint across reviewed checkout, Dialog and admin promotion files: passed, no output.
- Lead-provided final evidence: full server suite 82/82 passed; typecheck and global lint passed; real SQLite/Edge voucher browser journey passed.
- Coverage percentages: not collected.

## Plan Follow-up

- Backend discovery/shared eligibility: review-complete.
- Frontend picker/admin visibility/context safety: review-complete.
- Full verification: lead evidence complete except production build was still running when this review closed.
- Deployment/live smoke: outside this review scope and remains with the controller.

## Limitations

- Workspace has no `.git` directory, so changed-line/LOC diff metrics and base-revision regression comparison were unavailable. Review used the explicitly assigned final files, contract and focused tests.

## Unresolved Questions

None.
