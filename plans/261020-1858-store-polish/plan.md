# Store polish and transactional email

Status: completed; production release verified
Outcome: smoother auth, confirmed passwords, real email verification/receipts/status updates, direct admin image upload/link input, popup support plus history, natural Vietnamese copy; verified release on existing VPS.
Constraints: preserve customer data/admins/current orders; private SQL backup before live writes; no simulated mail success; provider domain/key entered privately; retain safe local preview; no SePay changes.
Non-goals: marketing emails, new payment provider, broad redesign, arbitrary webpage scraping.

## Phases / acceptance
- [x] Auth: Up/Down moves between fields without hijacking ordinary text caret/composition; Tab/Enter remain native; confirmation on register/reset; show-password controls and errors accessible.
- [x] Email: configured Resend domain sender, one-use expiring verification/reset links; resend limits; transactional durable outbox, idempotent order receipts/progress; provider failures preserve committed orders; admin status and truthful UI.
- [x] Media: admin upload validated raster persisted in SQL, stable public photo URL; direct HTTPS links and bounded safe Pinterest import; preview/order/remove, meaningful errors.
- [x] Chat/copy: in-place popup, full account history, focus/Escape/mobile/drafts; natural Vietnamese storefront/auth/footer copy and clear instructions.
- [x] Focused tests then regression/lint/type/build, security review, backup, isolated release and public browser verification.

Ownership: product_media worker owns media module/editor/tests; support_copy worker owns popup/conversation/home copy; transactional_email worker owns email/auth/order server modules/tests; controller owns auth UI/account/checkout integration/index/types/deploy/docs and review. No overlapping worker file edits.
Dependency resolved: sender SPF/DKIM verified and key entered privately; provider accepted setup email, live mail configured. User confirmed the setup email arrived in the inbox on20/10/2026 at21:52 Asia/Saigon; sending and recipient receipt verified. Evidence: ../reports/implementation-261020-1858-store-polish.md.
