# Backend quản trị và chat hỗ trợ

Status: completed

Outcome: quản trị vận hành shop custom bằng dữ liệu SQLite thật; khách chat trong website, admin xử lý trong hộp thư riêng.
Constraints: giữ React/Node/SQLite local, dữ liệu hiện tại, quyền owner/admin, giá/kho/order snapshots; backup trước thay đổi DB. Chưa public deploy hay nối SePay/SMTP khi chưa có cấu hình.

## Phases
1. Backend: hội thoại/tin nhắn riêng theo tài khoản, phân trang, unread cursor, gửi idempotent, giới hạn tin; dashboard thống kê thật, lịch sử và mã vận đơn.
2. UI: chat khách ở storefront, hộp thư admin tìm/lọc/chưa đọc/đóng mở, dashboard vận hành và nhật ký, đơn có vận chuyển/lịch sử.
3. Verify: HTTP isolation/persistence/unread/idempotency, dashboard/order invariants; hành trình khách-admin với DB tạm; type/lint/build; docs.

## Acceptance
- Khách không xem/gửi/đánh dấu đọc hội thoại của người khác; khách không gọi admin.
- Tin và trạng thái giữ sau restart; đọc theo cursor không mất tin mới; retry không gửi trùng; phản hồi hiển thị khi poll, không giả online.
- Admin tìm/lọc, trả lời, đánh dấu đã xử lý/mở lại; tin khách mới tự mở lại.
- Dashboard doanh thu chỉ tiền đã nhận, tách tiền chờ/đơn hủy/custom, kho và hỗ trợ cần xử lý; nhật ký thật.
- Sản phẩm/kho/khách/cấu hình/bảng giá custom và artwork hiện có tiếp tục hoạt động.
- Đơn có mã vận đơn, lịch sử thay đổi và phát hiện form admin cũ khi gửi expectedVersion.
- Không lỗi UI ở375/768/1440; kiểm thử không sửa DB đang xem.

## Non-goals
AI chatbot, đính kèm file chat, thông báo email/push, đổi nền tảng, hosted deploy, tích hợp ngân hàng chưa cấu hình.

## Todo
- [x] Backend + tests
- [x] UI + browser verification
- [x] Review + gates + docs

Verification:33/33 server tests; typecheck/lint/build; store-local, custom-studio, admin-support browser journeys PASS. Evidence/report: ../reports/implementation-261019-2026-admin-support.md.
