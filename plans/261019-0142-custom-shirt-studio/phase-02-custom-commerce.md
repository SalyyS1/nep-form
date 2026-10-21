---
title: "Dữ liệu custom và luồng mua"
status: completed
---

# Custom commerce

Backend giữ SQLite loopback hiện hữu. Thêm hai phôi qua marker seed, immutable design records, snapshot màu/giá khi đặt, metadata paging, giá server và aggregate stock cho cùng biến thể. Ranh giới tại server/custom*.mjs và các route cart/orders/quote; hợp đồng cuối tại studio-contract.md.

- [x] Auth owner/admin cho project/preview/artwork; PNG/JPEG/WebP full decode với Sharp, 2MB ảnh và16MP/8192px/singleframe, chặn SVG/URL.
- [x] Async decode trước transaction; đọc lại sale/stock khi commit, idempotency và hoàn tồn giữ nguyên.
- [x] Giỏ/checkout/order/admin hiển thị thiết kế, hai mặt, phí; quote gắn designId.
- [x] Account thư viện metadata12/page; fetch full project khi mở.
- [x] Admin giá optimistic version; cart reprices nhưng order snapshot giữ nguyên.

Validation:16 server tests, custom browser flow và regression mua hàng cũ. Dữ liệu thật không dùng cho test; các DB tạm được dọn sau khi kết thúc. Rollback mã cần dừng server và khôi phục backup work/backups/store-before-custom-261019.sqlite nếu cần hủy cả dữ liệu custom; không tự làm rollback/xóa dữ liệu người dùng.
