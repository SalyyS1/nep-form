# Frontend copy and privacy review

Status: DONE_WITH_CONCERNS

## Result

Polished Vietnamese across authentication, account, cart, checkout, Studio, support, storefront and admin. Kept brand, prices, business policies and existing admin labels `Hiện tại thanh toán` / `Giá áo custom`.

- Replaced figurative operational messages with direct language: `Đăng nhập xong rồi. Mình tiếp tục nhé!` → `Đã đăng nhập.`; `Đúng email, đúng bạn.` → `Email đã được xác minh.`
- Home instructions now describe adding text/images, choosing colors, viewing both sides and ordering. Kept the existing hero headline and visual layout.
- Local-only pricing labels appear only in local mode. Hosted checkout no longer says it is a local preview or claims SePay is connected. Bank instructions ask customers to contact the shop; local mode explicitly says not to transfer real money.
- Local verification notice explains that no email is sent and provides a local test link. Verification success no longer promises email delivery.
- Admin order note is labeled `Ghi chú hiển thị với khách`; support composer explains that customers can read admin replies.
- Promotion help says hidden codes remain usable by anyone who knows them and meets conditions; it no longer calls hidden codes private.
- Kept demo size-chart warning because the underlying chart is still demo data.

## Frontend security observations

- Auth return-path guard already rejects protocol-relative/external paths, backslashes, control characters and authentication loops. No change needed.
- Chat, customer details, order notes and admin strings use React text rendering. No `dangerouslySetInnerHTML` or `srcDoc` sinks found in scoped frontend search.
- Design preview/artwork URLs encode design IDs. Downloads use authenticated same-origin fetch and object URLs.
- Auth guard remounts account/admin routes by user ID; admin support remounts conversations by selected thread. No cross-account stale view issue established.
- Uploaded font CSS validates font IDs and strict base64 data URLs before interpolation (`shared/custom-fonts.mjs`, inspected only).
- Product external-image links require HTTPS and reject URL credentials. Server-side import/network enforcement remains under backend review; frontend URL checks are not a server security boundary.
- No independently verified frontend exploit requiring a new contract or behavioral patch was found. Visibility warnings fixed real ambiguity but are not access-control changes.

## Changed files

All files below are relative to project root:

- `src/app.tsx`
- `src/components/store-layout.tsx`
- `src/features/account/auth-page.tsx`
- `src/features/account/account-page.tsx`
- `src/features/account/email-verification-notice.tsx`
- `src/features/account/verify-email-page.tsx`
- `src/features/account/my-designs.tsx`
- `src/features/checkout/cart-page.tsx`
- `src/features/checkout/checkout-page.tsx`
- `src/features/checkout/order-page.tsx`
- `src/features/admin/admin-page.tsx`
- `src/features/admin/admin-custom-pricing.tsx`
- `src/features/admin/admin-settings.tsx`
- `src/features/admin/admin-email-status.tsx`
- `src/features/admin/admin-orders.tsx`
- `src/features/admin/admin-support.tsx`
- `src/features/admin/promotion-editor.tsx`
- `src/features/studio/studio-page.tsx`
- `src/features/studio/studio-text-composer.tsx`
- `src/features/support/support-conversation.tsx`
- `src/features/storefront/home-page.tsx`
- `src/features/storefront/info-page.tsx`
- `src/features/storefront/product-page.tsx`

## Changed headings / selector notes

- Login/register: `Đăng nhập.` / `Tạo tài khoản.` (formerly `Mừng bạn trở lại.` / `Làm quen với Nếp.`).
- Reset dialog: `Đặt lại mật khẩu` (formerly `Tìm lại mật khẩu`).
- Verification success: `Email đã được xác minh.` (formerly `Đúng email, đúng bạn.`).
- Checkout: `Thanh toán` (formerly `Gửi đến bạn`).
- Admin dashboard: `Tổng quan cửa hàng` (formerly `Một ngày mới, thật gọn.`).
- Admin order textarea: `Ghi chú hiển thị với khách` (formerly `Ghi chú đơn hàng`).
- Studio preview dialog: `Xem trước hai mặt áo` (formerly `Một chiếc áo, rất bạn.`).
- Studio price section: `Giá áo & phí in` (formerly `Từng ý tưởng, rõ giá.`).
- Cart empty: `Giỏ hàng chưa có sản phẩm.`
- Saved designs empty: `Bạn chưa lưu thiết kế nào.`
- Order list empty: `Bạn chưa có đơn hàng.`
- Error route: `Không tìm thấy trang này.`
- Primary purchase/save action labels, auth form labels, Studio controls, `Hiện tại thanh toán`, `Giá áo custom` and support send labels remain unchanged.

## Verification

- Scoped ESLint across affected frontend directories: passed.
- Final ESLint for the four last admin text edits: passed.
- Standalone `npm run typecheck`: passed, exit 0.
- No browser, live API/database writes or server processes started by this worker.
- Git diff checks unavailable because this workspace is not a Git repository; failure was tooling context, not a lint/type error.
- Browser regression and build delegated to controller to avoid duplicate broad runs. Controller notified of changed accessible headings.

## Remaining

Browser regression should account for changed wording. Backend security review is separate. No unresolved product questions.
