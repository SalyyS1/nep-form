# Bàn giao NẾP FORM local

Status: DONE cho mốc duyệt giao diện local. Kế hoạch production vẫn in-progress.

## Kết quả

- Cửa hàng React/TypeScript/Vite/Tailwind với trang chủ, catalog, tìm/lọc/size, sản phẩm, giỏ, checkout và đơn.
- Account đăng ký/đăng nhập/đăng xuất, liên kết reset local, profile, nhiều địa chỉ/default và snapshot địa chỉ đơn.
- Admin tổng quan, sản phẩm/biến thể/tồn, đơn/trạng thái/tiền, khách, phí ship và công tắc nhận đơn.
- Node HTTP + SQLite thật, scrypt password hash, session HttpOnly, ownership/admin checks, transaction stock/idempotency/cancel.
- 24 sản phẩm mẫu, 96 biến thể, 26 ảnh Pexels tối ưu và font Be Vietnam Pro đủ dấu, toàn bộ phục vụ local.
- Cửa hàng 127.0.0.1:5173, API 127.0.0.1:3001. Runtime PID ghi trong work/local-runtime.json; chỉ một phiên đang chạy được giữ để người dùng duyệt.

## Kiểm chứng thực thi

- npm run typecheck: pass.
- npm run lint: pass, 0 lỗi.
- npm run build: pass, client bundle khoảng 104 KB gzip, admin lazy chunk khoảng 10 KB gzip.
- npm test: 10/10 pass; DB test tạm, không reset DB đang dùng.
- npm run test:e2e: pass — guest cart/login merge, COD, address snapshot, admin order/product/settings, đăng ký, bank pending, hủy, reset password.
- Browser regressions: merge lỗi vẫn giữ hàng chờ nhìn thấy sau đăng nhập/reload; quote đổi phải xác nhận lại; editor cũ không ghi đè stock mới.
- Layout actual-loaded tại 360/375/768/1440: không tràn ngang, không runtime error; kiểm tra storefront/account/admin.
- Frontend render-check trang chủ tại 375/768/1440: 0 errors, 0 warnings sau sửa overflow, contrast và touch targets.
- npm stop: kiểm tra lệnh PID và dừng tiến trình do dự án tạo; cổng 3001/5173 đã được xác nhận đóng rồi khởi động lại bằng npm run dev.

## Review độc lập và sửa lỗi

Reviewer kiểm tra source và tái hiện trên DB tạm. Ba finding đã sửa:

1. Stale product editor phục hồi stock đã bán → version/expectedVersion + 409, version tăng khi bán/hoàn tồn.
2. Price/ship thay đổi khi checkout mở → expectedQuote so sánh item/quantity/unit price/ship, 409 và refresh để khách xác nhận lại.
3. Guest merge thất bại sau login → auth vẫn hoàn tất, giỏ chờ hiển thị và chỉnh/xóa/thử lại được; không ẩn hoặc xóa lựa chọn.

API, UI và regression tests đã cập nhật cùng contract docs/local-api-contract.md.

## Rà soát giao diện

Storefront rubric 22/24: brief, hierarchy, spacing, alignment, typography, color, shape, responsive, anti-slop và craft đạt 2; states và content đạt 1 do còn một số thông báo local và thông số demo cần chốt khi mở bán. Đã trực tiếp xem ảnh chụp cửa hàng/admin desktop/mobile. Ba mục yếu ban đầu đã cải thiện: hero tràn ngang, chữ trắng trên nền ảnh sáng, đích chạm nhỏ.

## Phạm vi còn lại theo chỉ đạo người dùng

Tiếp nhận chỉnh sửa giao diện/luồng trước. Sau đó: Supabase/RLS, SMTP/email verification thực, reservation expiry, upload ảnh thay URL, SePay HMAC/Test/Live, backup/restore production, hạ tầng miễn phí và cấu hình deploy. Local bank order giữ pending; không QR/tài khoản ngân hàng giả và không tự nhận paid.

Không có commit/push/deploy internet. Không cần người dùng cung cấp secret ở bước duyệt local. Không có câu hỏi bắt buộc còn treo cho mốc này.
