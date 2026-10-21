---
phase: 4
title: "Checkout, tồn kho và SePay"
status: pending
priority: P1
effort: "16–24 giờ"
dependencies: [3]
---

# Giai đoạn 4: Checkout, tồn kho và SePay

## Mục tiêu

Đặt đơn COD/chuyển khoản có transaction, snapshot, giữ hàng và đối soát đúng. Đây là phần rủi ro cao nhất; tiêu chuẩn nằm trong [hợp đồng giao dịch](./architecture-and-operations.md).

## Files dự kiến — tạo mới / sửa

- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/features/checkout/ — địa chỉ, review tổng, payment choice.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/features/orders/ — kết quả/lịch sử/detail/payment polling.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/functions/create-order/index.ts — server tạo đơn.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/functions/cancel-order/index.ts — hủy trong quyền.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/functions/sepay-webhook/index.ts — kiểm tra và nhận webhook.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/functions/_shared/sepay-signature.ts — raw-body HMAC.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/migrations/<timestamp>_add_order_payment_transactions.sql — RPC transaction.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/migrations/<timestamp>_schedule_reservation_expiry.sql — cleanup có khóa.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/config.toml — sửa auth riêng endpoint webhook.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/tests/integration/order-payment.test.ts — cạnh tranh/giao dịch.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/tests/e2e/checkout.spec.ts — hành trình đầy đủ.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/docs/sepay-setup.md — config/đối soát/test/live.

## Các bước

1. Tạo quote server và kiểm tra lại trước commit. Giá/ship thay đổi thì yêu cầu người mua xem lại; không thu theo giá client.
2. Transaction khóa giỏ/kiểm tra phiên bản, tạo order/items/address snapshot/payment intent/reservation; idempotency unique và kiểm tra payload hash. Giảm/xóa đúng dòng đã đặt trong cùng transaction; thất bại giữ nguyên giỏ, không xóa hàng thêm từ tab khác.
3. Lock biến thể cùng thứ tự, không available âm; xử lý hai khách mua món cuối.
4. COD và transfer theo state machine; viết expiry job có idempotency, cleanup tại checkout làm dự phòng.
5. Snapshot địa chỉ của đơn tách khỏi sổ. Không sửa payment amount/code của đơn đang có QR; thay đổi cần đơn mới hoặc admin giải quyết có audit.
6. Tạo QR từ tài khoản shop, amount và code đã lưu. Hiện thông tin copy được, timer từ expires_at server.
7. Endpoint webhook: riêng endpoint bỏ Supabase JWT gateway; HMAC trên raw body, timestamp window, validate schema/account/direction/code/amount, rồi RPC nguyên tử.
8. Xử lý duplicate, thiếu/thừa tiền, thiếu mã, trả hai lần, đến muộn và DB failure đúng hợp đồng; chỉ trả success sau khi dữ liệu được commit.
9. Poll owner-scoped order status mỗi khoảng 5–10 giây khi tab mở; backoff, dừng khi kết thúc. Client không tự set paid.
10. Tài liệu SePay: Test Mode, tài khoản nhận, mã thanh toán, HMAC, endpoint HTTPS, retry, giới hạn Free, đối soát và live smoke test.

## Checklist

- [ ] Tạo đơn/retry/quote/tồn kho và snapshot chạy đúng.
- [ ] COD có vòng đời thu tiền riêng.
- [ ] QR và webhook Test Mode đã xác minh.
- [ ] Ngoại lệ đối soát không gây paid giả.
- [ ] Expiry và callback concurrent không làm tăng/giảm tồn lặp.

## Kiểm chứng bắt buộc

- npm run test:integration -- order-payment; npm run test:e2e -- checkout.
- Race 20 request mua variant chỉ còn 1: tối đa 1 đơn giữ hàng thành công.
- Cùng checkout key gửi 5 lần chỉ 1 đơn; key cùng nhưng body khác bị từ chối.
- Cùng webhook gửi tuần tự và đồng thời 5 lần: 1 event, 1 lần chuyển paid, 1 lần phân bổ.
- Chữ ký sai/thiếu hoặc timestamp cũ; sai tài khoản/tiền ra/code/amount; không tự paid.
- Event lưu lỗi hoặc update order lỗi → transaction rollback; retry sau sửa lỗi xử lý được.
- Tiền đến đúng hạn/thiếu/thừa/trùng/đến sau hủy hoặc expiry đều có kết quả xác định.
- Address A sửa sau đặt → order vẫn giữ địa chỉ snapshot; user B không đọc trạng thái đơn A.
- Test thật trên staging với SePay Test Mode; không giả lập nút trả tiền thành công làm nghiệm thu.

## Rủi ro / rollback

Callback mất do backend lỗi → retry SePay, xem bảng event và đối soát Dashboard. Timeout/mức miễn phí chặn dịch vụ → tắt nhận đơn/QR mới, xử lý các đơn đã tạo; không đánh dấu đã trả để giải quyết lỗi. Khi rollback code, giữ endpoint và schema tương thích với đơn đang chờ.
