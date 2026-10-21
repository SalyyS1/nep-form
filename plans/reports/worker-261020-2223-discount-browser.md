# Discount browser regression

Status: DONE

Owned files: `tests/server/discount-browser-api.mjs`, `tests/browser/discounts.spec.py`.

- Added isolated SQLite API fixture on port 3013 with one temporary catalog product and disabled outbound mail. Browser `/api` calls proxy to that fixture; existing Vite port 5173 is reused.
- Verified admin UI saves a 250,000đ product's 200,000đ SALE price and creates a 15% coupon with a 20,000đ cap, minimum subtotal, and usage limits.
- Verified storefront original-price strikeout, invalid-code error, apply/remove totals, 390px checkout and promotion editor layouts, COD order persistence, and coupon snapshot display.
- Verified deactivating an applied coupon rejects checkout without changing orders/cart/stock. Coupon remains removable when its refreshed quote fails. Removing it fetches a fresh couponless quote without submitting; customer then manually places a 230,000đ order. Prior discounted order remains 210,000đ.
- Validation: `python tests/browser/discounts.spec.py` passed after correcting one test selector for a select label containing option text. No app changes required in this subtask.
- Screenshots: `work/discount-browser/admin-promotions-desktop.png`, `admin-promotion-mobile.png`, `checkout-mobile.png`, `checkout-invalidated-coupon-mobile.png`.
- Browser and isolated API terminated through `finally`; fixture database removed. Vite PID 31576 remains running.

Unresolved questions: none.
