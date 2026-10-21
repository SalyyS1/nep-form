---
phase: 3
title: "Danh mục, giỏ hàng và sổ địa chỉ"
status: pending
priority: P1
effort: "12–18 giờ"
dependencies: [2]
---

# Giai đoạn 3: Danh mục, giỏ hàng và sổ địa chỉ

## Mục tiêu

Khách chọn được đúng biến thể và chuẩn bị đơn bằng dữ liệu thật từ DB, giỏ được giữ theo account.

## Files dự kiến — tạo mới

- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/features/catalog/ — list/search/filter/detail/variant picker.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/features/cart/ — giỏ local trước login và giỏ account.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/features/addresses/ — sổ địa chỉ và default selector.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/lib/format-vnd.ts — tiền VND.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/migrations/<timestamp>_add_cart_address_operations.sql — merge cart/set-default atomic.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/scripts/seed-demo-catalog.ts — chỉ local/staging, không phá dữ liệu sẵn có.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/data/demo-image-manifest.json — URL ảnh/tác giả/license/ngày lấy.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/public/images/demo/ — ảnh mẫu tối ưu và được phép sử dụng.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/tests/e2e/catalog-cart-addresses.spec.ts — hành trình người mua.

## Các bước

1. Tìm và chọn ảnh Pexels/Unsplash đúng giấy phép, lưu nguồn từng ảnh. Chuẩn bị 24 sản phẩm demo với loại hàng đa dạng.
2. Thiết kế seed idempotent, chỉ cập nhật dữ liệu có tag demo; guard chặn chạy vào live. Không tự dựng thương hiệu thật/chứng nhận/đánh giá.
3. Dựng danh mục/tìm kiếm có normalize dấu cơ bản, filter và sort trong URL, phân trang. Public chỉ đọc published và dữ liệu public.
4. Chi tiết bắt chọn size/màu; hiển thị availability, ảnh hợp với món hàng, hướng dẫn size có nguồn hoặc ghi mẫu.
5. Giỏ account lưu DB; giỏ trước đăng nhập lưu localStorage chỉ product/variant/quantity, không địa chỉ/token nghiệp vụ.
6. Khi login merge giỏ đúng một lần; quantity cộng có giới hạn hợp lệ, báo hàng hết/ẩn/đổi giá. Logout dọn cache account.
7. Sổ địa chỉ CRUD, mặc định unique atomic. Validation tên/điện thoại/địa chỉ, không khóa vào bộ quận/huyện lỗi thời.
8. Chuẩn bị form checkout chọn địa chỉ khác hoặc nhập riêng; lưu sổ địa chỉ chỉ khi checkbox được bật.

## Checklist

- [ ] Catalog + tìm/lọc/biến thể/pagination chạy từ DB.
- [ ] Giỏ persist/merge và lỗi hết hàng/đổi giá xử lý đúng.
- [ ] Nhiều địa chỉ/default/sửa riêng đơn tách biệt.
- [ ] Manifest ảnh và seed demo có guard.

## Kiểm chứng

- npm run test -- cart; npm run test:e2e -- catalog-cart-addresses.
- Chọn sai/hết size không thêm được; sửa số lượng vượt tồn được báo.
- Refresh/đăng xuất/đổi account không lộ giỏ hoặc địa chỉ người trước.
- Hai request đặt địa chỉ mặc định đồng thời vẫn chỉ còn một default.
- Khi network lỗi, không hiện “Đã lưu” giả và không mất input.

## Rủi ro / rollback

Ảnh hỏng link → dùng bản tải hợp lệ đã lưu và placeholder lỗi trung tính. Không đủ góc chụp cùng món → dùng số ảnh thật có sẵn. Seed chạy sai môi trường → guard chặn trước ghi; backup khi thay bulk dữ liệu đã tồn tại. Không xóa sản phẩm có lịch sử đơn.
