---
phase: 6
title: "Kiểm thử, triển khai miễn phí và bàn giao"
status: pending
priority: P1
effort: "8–12 giờ"
dependencies: [5]
---

# Giai đoạn 6: Kiểm thử, triển khai miễn phí và bàn giao

## Mục tiêu

Chứng minh toàn bộ luồng và có đường vận hành thật trên gói miễn phí, giữ rõ dependency tài khoản/SMTP/SePay.

## Files dự kiến — tạo mới / sửa

- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/tests/e2e/storefront-to-admin.spec.ts — test từ mua tới xử lý đơn.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/tests/integration/payment-concurrency.test.ts — stress giao dịch hẹp.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/scripts/backup-store-data.ps1 — backup DB và hướng dẫn storage.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/docs/deployment-guide.md — Pages/Supabase/auth/SMTP/rollback.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/docs/launch-checklist.md — kiểm tra mở bán và giới hạn miễn phí.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/docs/shop-operations.md — hoàn thiện bàn giao.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/package.json — scripts nghiệm thu đã thực thi.

## Các bước

1. Chạy toàn bộ test liên quan; lint/typecheck/build; rà role/RLS/RPC và secret leakage. Review tập trung hợp đồng tiền/kho/quyền.
2. Kiểm tra mobile/tablet/desktop, dấu tiếng Việt, bàn phím, loading/error/empty/out-of-stock, refresh URL sâu.
3. Test chính sách privacy/đổi trả/giao hàng hiển thị đúng nội dung chủ shop cung cấp; không xuất bản lời hứa mẫu.
4. Tạo tài khoản/dịch vụ free trong phạm vi được người dùng cho phép tại giai đoạn triển khai; không mua domain hoặc bật paid plan.
5. Deploy dist lên Pages; cấu hình Supabase project region gần khách nếu có, Auth callback/SMTP và Storage.
6. Test Mode nối webhook HTTPS thực. Không gửi secret trong chat/source; xác minh auth trên deployment thật.
7. Chạy backup, restore thử vào DB riêng; đối chiếu số bản ghi và ảnh. Bản backup chứa dữ liệu riêng phải bảo vệ, không commit.
8. Xóa/ẩn hàng demo trên live, nhập tối thiểu một sản phẩm thật, giá/tồn/phí ship/chính sách đã chốt.
9. Chủ shop tự thực hiện giao dịch ngân hàng nhỏ để xác minh live; ghi kết quả đã nhận/đúng đơn; không tự chuyển tiền thay họ.
10. Kiểm thử đơn COD riêng, admin xác nhận/giao/thu tiền; đảm bảo SMTP tới khách ngoài team.
11. Hướng dẫn theo dõi quota/DB pause, giao dịch không khớp, backup, đổi giá/tồn, tắt bán khi lỗi.
12. Dừng mọi dev server/test runner do phiên tạo; ghi URL/config cần thiết vào docs, không ghi token.

## Checklist nghiệm thu

- [ ] Tests, lint, typecheck và build pass.
- [ ] Mobile + accessibility + đường dẫn sâu được kiểm tra.
- [ ] Free hosting deployment và callback/SMTP hoạt động.
- [ ] SePay Test Mode và live smoke có bằng chứng tách biệt.
- [ ] Backup/restore + rollback rehearsal.
- [ ] Hàng thật và thông tin vận hành thay demo.
- [ ] Bàn giao admin và cấu hình, dừng tiến trình tạm.

## Lệnh kiểm chứng dự kiến

npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:e2e
npm run build

Chỉ chạy trên test DB có guard. Không dùng supabase db reset với linked/live project. Không xem lệnh được viết trong plan là bằng chứng đã test.

## Điều kiện mở bán

Tất cả gate về auth/email/quyền/kho/COD/SePay/backup phải pass. Nếu tài khoản SePay/SMTP chưa có, có thể bàn giao ứng dụng local/staging hoạt động nhưng phải ghi chưa sẵn sàng nhận đơn thật. Không đánh dấu toàn dự án hoàn thành mở bán khi còn gate này.

## Rủi ro / rollback

Free quotas không có bảo đảm uptime như hạ tầng trả phí. Nếu nhu cầu vượt free, báo bằng số liệu rồi đề xuất lựa chọn; không tự tính phí. Rollback Pages về bản trước; DB có đơn mới thì forward-fix, không restore đè. Dừng nhận đơn mới khi lỗi nghiệp vụ tiền/kho để xử lý đơn đang chờ.
