---
phase: 5
title: "Trang quản trị và vận hành đơn"
status: pending
priority: P1
effort: "10–16 giờ"
dependencies: [4]
---

# Giai đoạn 5: Trang quản trị và vận hành đơn

## Mục tiêu

Chủ shop quản lý catalog, khách, phí vận chuyển, đơn và tiền trong một panel tiếng Việt, có kiểm tra quyền ở server.

## Files dự kiến — tạo mới

- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/features/admin/ — overview/catalog/inventory/orders/customers/settings.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/functions/admin-order-action/index.ts — state transitions, COD, refund evidence.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/functions/admin-product-action/index.ts — CRUD/stock adjustment.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/migrations/<timestamp>_add_admin_operations.sql — transitions/audit/aggregates.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/tests/integration/admin-actions.test.ts — role/stock/status.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/tests/e2e/admin-panel.spec.ts — quản trị xuyên suốt.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/docs/shop-operations.md — quy trình quản trị.

## Các bước

1. Admin shell sidebar/bảng có search/filter/pagination. Trên mobile bảng chuyển sang thông tin đọc được.
2. CRUD sản phẩm/danh mục/biến thể và ảnh; kiểm tra mime/kích thước, alt text, upload Storage đúng quyền; xóa ảnh cũ chỉ khi không còn tham chiếu.
3. Điều chỉnh kho có delta/lý do/audit; không cho on_hand thấp hơn reserved; transaction chống cập nhật chồng.
4. Danh sách đơn, trạng thái và lịch sử chi tiết; optimistic concurrency bằng version và transition hợp lệ.
5. Xác nhận/đóng gói/giao/giao xong/hủy/nhận trả, có trường mã vận đơn thủ công. Không tự chuyển delivered thành paid cho COD.
6. Ghi nhận COD đã thu; bank events cần review có dữ kiện tối thiểu và quy trình đối soát. Xác nhận thủ công phải có lý do/chứng cứ, không cho áp một event vào hai đơn.
7. Hoàn tiền làm ngoài ngân hàng; ghi refund_pending/refunded bằng chứng thực. Chỉ nhập lại kho sau hàng thực sự quay về.
8. Cấu hình ship cố định, thông tin liên hệ, bật/tắt checkout/transfer. Đổi phí không đổi snapshot đơn cũ.
9. Dashboard tính tiền đã nhận tách khỏi tổng đơn chưa trả; loại doanh thu hoàn tiền đúng định nghĩa. Không đưa mẫu vào số liệu live.
10. Khách hàng chỉ thông tin cần thiết và lịch sử đơn; không mở tính năng export dữ liệu cá nhân không được yêu cầu.

## Checklist

- [ ] CRUD/catalog/ảnh/tồn kho và audit.
- [ ] Đơn/COD/đối soát/hoàn tiền thủ công có trạng thái rõ.
- [ ] Phí ship/công tắc checkout và thông tin shop.
- [ ] Dashboard dữ liệu thật, không tính đơn chờ là tiền thu.

## Kiểm chứng

- npm run test:integration -- admin-actions; npm run test:e2e -- admin-panel.
- Customer gọi trực tiếp function/RPC admin bị 403 hoặc deny; sửa role metadata không bypass.
- Hai admin update cùng version: request sau conflict, không ghi đè âm thầm.
- Hủy/nhập trả lặp không nhân đôi tồn; xác nhận COD lặp không nhân đôi tiền.
- Admin thay ship/giá sau khi đặt không đổi số tiền và địa chỉ trên đơn cũ.

## Rủi ro / rollback

Admin nhập sai → form xác nhận thao tác có tác động tồn/tiền, lịch sử rõ và cơ chế điều chỉnh có audit. Upload lỗi → không tạo ảnh rỗng hoặc xóa ảnh đang dùng. Thay đổi order đã shipping ngoài state machine bị chặn.
