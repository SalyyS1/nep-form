# Coupon eligibility browser verification

Status: DONE

New coverage: `tests/browser/promotion-eligibility.spec.py` and isolated API fixture `tests/server/promotion-eligibility-browser-api.mjs`.

## Results

- PASS: usage presets create global-one limits `[1, null]` and customer-one limits `[null, 1]`; reopening infers the correct preset.
- PASS: first-order checkbox defaults off, minimum quantity defaults 1; first-order + minimum 3 persist through create/edit and appear in the admin list.
- PASS: desktop admin and mobile 390px list/editor/checkout have no horizontal page overflow; mobile editor has no internal horizontal overflow.
- PASS: two identical shirts fail with `COUPON_MIN_QUANTITY`; increasing the same cart line to three qualifies. Applied coupon displays both conditions.
- PASS: actual COD order stores quantity 3, subtotal 600,000đ, discount 60,000đ, shipping 30,000đ, total 570,000đ, and `firstOrderOnly: true` / `minQuantity: 3` in the coupon snapshot.
- PASS: that pending unpaid order blocks the next first-order coupon quote. An ordinary coupon created without the new fields still works.
- PASS: customer cancellation restores eligibility and usage. Repeated cancellation keeps usage at zero.
- PASS: reducing cart quantity externally from 3 to 2 after preview makes order creation return 409; refreshed UI disables submission. Only the original cancelled order remains, cart quantity stays 2, stock stays 40, and coupon usage stays zero. Restoring quantity and fetching a valid quote enables submission again.
- PASS: three custom shirts on one custom cart line satisfy the same quantity condition with real custom pricing.
- PASS: no browser page errors.

## Commands

- `node --check tests/server/promotion-eligibility-browser-api.mjs` — exit 0.
- `python -c "import ast; from pathlib import Path; ast.parse(Path('tests/browser/promotion-eligibility.spec.py').read_text(encoding='utf-8')); print('Python syntax OK')"` — exit 0.
- `python tests/browser/promotion-eligibility.spec.py` — initial attempt exposed an ambiguous test locator; narrowed to the numeric input using its spinbutton role. Rerun exit 0, all assertions passed.
- Python socket check after completion — port 3015 closed.

Microsoft Edge headless, desktop 1440×1000 and mobile 390×844. Shared Vite 5173 reused and left running. Fixture API 3015, browser, and temporary SQLite directory cleaned up. Fixture uses `mailEnv: {}` and actual application APIs; no quote responses mocked.

Screenshots in `work/promotion-eligibility-browser/`: `admin-conditions-desktop.png`, `admin-conditions-mobile.png`, `checkout-first-three-mobile.png`, `checkout-quantity-invalidated-mobile.png`. Checkout screenshot visually inspected; both condition badges and totals visible.

Unresolved questions: none.
