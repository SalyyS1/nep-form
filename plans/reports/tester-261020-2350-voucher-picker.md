# Voucher picker browser verification

Status: DONE

Outcome: `python tests/browser/voucher-picker.spec.py` passed against Vite 5173 and isolated SQLite API 3016, headless Microsoft Edge, desktop 1440×1000 and mobile 390×844. No application JavaScript errors observed.

## Verified behavior

- Admin: legacy records missing visibility remain private; new checkbox defaults unchecked; explicitly checked visibility saves and reopens checked.
- Discovery: public fixed 60,000₫ beats 80% capped at 20,000₫. Private/manual, inactive and expired codes stay absent. First-order, minimum quantity, minimum subtotal, customer quota and future-start failures display reasons and disabled actions.
- Controls: opening, selecting, closing via close button/Escape, and manual Enter emit no order POST. Close restores trigger focus. Native modal retains keyboard focus; mobile document and dialog avoid horizontal overflow.
- Manual private code saves 150,000₫ and remains applied when picker opens/closes, despite the public recommendation saving less.
- Real quote application updates checkout discount/total. Admin disabling an offer while picker is open produces authoritative 409, visible modal error and refreshed offers; replacement selection succeeds.
- Cart refresh from one to two units updates recommendation from fixed 60,000₫ to 25% / 100,000₫. A deliberately delayed real response for the older cart cannot overwrite the newer recommendation.
- Applied SCALE25 survives as the retained code after a deliberately aborted quote refresh for a changed cart, while the unavailable quote disables ordering. The picker correctly enables applying that same eligible code again; the real retry restores subtotal 600,000₫ and discount 150,000₫. Restoring the two-unit cart refreshes back to 100,000₫ discount before COD submission.
- Aborted discovery request shows retry; retry succeeds. Explicitly hiding all public offers through admin APIs produces the empty state.
- Listing/applying does not reserve uses. Actual COD submit persists subtotal 400,000₫, discount 100,000₫, shipping 30,000₫, total 330,000₫, selected SCALE25 and unpaid status. Exactly one order POST occurs in the observed browser flow; SCALE25 usedCount becomes one and unused FIXED60 remains zero.

## Files and evidence

- [Browser test](../../tests/browser/voucher-picker.spec.py)
- [Isolated fixture](../../tests/server/voucher-picker-browser-api.mjs)
- [Desktop screenshot](../../work/voucher-picker-browser/picker-desktop-conditions.png)
- [Mobile screenshot](../../work/voucher-picker-browser/picker-mobile-390.png)

Fixture uses `NEP_VOUCHER_DB`, temporary catalog/database and `mailEnv: {}`. All responses derive from real application APIs; delayed/error interception never synthesizes quote or promotion data. Fixture process terminated and temporary directory removed. Parent-owned Vite left running.

Initial attempts exposed test-input issues only: Python's six-digit timestamp fraction exceeded existing API precision; picker shared Dialog uses close label “Đóng”, whereas admin editor uses “Đóng cửa sổ”. Both corrected in test before passing run.

Final complete journey rerun passed after adding the failed-refresh/same-code-reapply regression and the UI's final quote-derived selected-state fix.

No live services, real orders, provider credentials or external email used. Scope excludes cross-browser validation, full accessibility audit and performance measurement.

Unresolved questions: none.
