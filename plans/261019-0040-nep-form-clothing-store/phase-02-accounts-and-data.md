---
phase: 2
title: "Tài khoản, dữ liệu và phân quyền"
status: pending
priority: P1
effort: "10–14 giờ"
dependencies: [1]
---

# Giai đoạn 2: Tài khoản, dữ liệu và phân quyền

## Mục tiêu

Tài khoản email/mật khẩu và lớp dữ liệu đúng quyền. Hợp đồng dữ liệu ở [kiến trúc](./architecture-and-operations.md). Đăng ký chưa xác thực không được đặt đơn.

## Files dự kiến — tạo mới

- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/config.toml — Auth/Functions/local.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/migrations/<timestamp>_create_store_schema.sql — bảng và constraints.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/migrations/<timestamp>_secure_store_access.sql — RLS/grants.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/features/auth/ — login/register/verify/recovery/session.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/features/account/ — hồ sơ người dùng.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/supabase/functions/_shared/authorize.ts — kiểm tra user/admin.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/scripts/bootstrap-admin.ts — cấp role có chủ đích.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/tests/integration/access-control.test.ts — quyền theo vai trò.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/docs/data-and-access.md — schema/role/ownership.

Tên migration dùng timestamp thực khi tạo, không dùng phase ID.

## Các bước

1. Dựng Supabase local/test riêng. Trước mọi thay đổi schema/data trên DB đã có dữ liệu, backup và xác nhận restore route; không reset DB live.
2. Tạo schema/constraints/index theo kiến trúc, foreign key phù hợp với snapshot đơn hàng; không cascade xóa lịch sử đơn khi xóa catalog.
3. Bật RLS tất cả bảng public và storage. Kiểm tra quyền anon/user A/user B/admin bằng truy vấn trực tiếp.
4. Role admin trong bảng riêng được backend quản lý; public signup chỉ có customer. Không tin role trong user_metadata hoặc UI route guard.
5. Dựng đăng ký, email verification, login/logout, quên/đặt lại mật khẩu; lỗi tiếng Việt, không tiết lộ email có tồn tại hay không.
6. Redirect sau login chỉ path nội bộ được cho phép. Dọn cache dữ liệu riêng khi logout/đổi account.
7. Chuẩn bị email template Việt và custom SMTP. Test thật tối thiểu hai mailbox ngoài team; cấu hình Gmail SMTP chỉ khi account hỗ trợ và giao thư ổn.
8. Thêm CAPTCHA/rate limit phù hợp cho auth; không hạ bảo mật chỉ để gửi email qua mặc định Supabase.

## Checklist

- [ ] Schema/RLS/grants và unique constraints được kiểm thử.
- [ ] Auth flow đầy đủ và callback đúng domain.
- [ ] Admin bootstrap bảo mật, không credential mặc định.
- [ ] SMTP external-email proof hoặc dependency cấu hình được ghi rõ.

## Kiểm chứng

- npm run test:integration -- access-control.
- Đăng ký → email thật → đăng nhập → quên mật khẩu → đổi mật khẩu → đăng xuất.
- Truy vấn REST/RPC bằng A không đọc/sửa B, không cấp admin, không tạo paid/order trực tiếp.
- Secret/SMTP password không có trong build/browser/network response/log.

## Rủi ro / rollback

SMTP không gửi được → giữ launch gate, sửa cấu hình hoặc chọn provider miễn phí đủ điều kiện; không bỏ xác thực/khôi phục. Migration lỗi → áp dụng rollback có backup và tương thích data; không restore đè khi đã phát sinh đơn. Chỉ thực thi script cấp admin khi có account chủ shop xác định.
