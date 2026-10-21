# Voucher picker UI

Status: DONE

Implemented checkout picker with server-ranked eligible and unavailable sections, complete amount/cap/subtotal/quantity/first-order/schedule/quota conditions, exact current VND savings, scoped best-offer badge, selected indicator, and explicit application. Manual entry/removable applied chip retained. Private applied codes with greater savings suppress the inline public suggestion.

Added independent GET `/checkout/promotions` hook: refresh on cart/account/pricing context and each opening, abort/serial guards, stale-context response hiding, obsolete-retry rejection, and a 15-second timeout. Apply failures stay inside the dialog and refresh offers; old apply completions cannot close or write errors into another context or reopened picker. Native Dialog is portaled outside checkout form; every new button has explicit `type="button"`. Mobile list scrolls within dialog.

Admin now includes `Hiện tại thanh toán`, defaults false for new/legacy promotions, explains private manual codes remain usable, persists flag alongside existing fields, and displays public/private list badges.

Files: checkout-coupon.tsx/css; new voucher-picker.tsx/css and use-checkout-promotions.ts; promotion-editor.tsx; admin-promotions.tsx/css.

Validation: final targeted ESLint passed with no warnings after moving scalar-ref cleanup into stable callbacks. TypeScript check passed after async guards. Browser journey passed per voucher_picker_browser/main; final callback-only cleanup preserves behavior. No server started. Git diff unavailable because workspace has no Git repository.

Coordination: main owns DTOs, checkout context integration, shared Dialog button fix, docs, backend, full verification and deployment. Browser peer received exact labels/card accessible names and freeze notice.

Follow-up: picker selected code now comes from the valid quote coupon rather than the retained removable code. An invalid or failed quote no longer falsely marks a card applied or prevents retrying the same eligible code. Targeted checkout-coupon ESLint passed; browser peer notified for regression coverage.

Unresolved questions: none.
