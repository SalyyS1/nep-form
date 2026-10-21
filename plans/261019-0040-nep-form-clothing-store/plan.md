---
title: "NẾP FORM — Website thời trang unisex"
description: "Một shop tiếng Việt, quản trị riêng, tài khoản, giỏ hàng, địa chỉ, COD và SePay trên hạ tầng miễn phí cho mở bán thử nghiệm."
status: in-progress
priority: P1
effort: "64–96 giờ công, ước lượng sơ bộ"
tags: [feature, frontend, backend, database, auth]
blockedBy: []
blocks: []
created: 2026-10-19
---

# NẾP FORM — Kế hoạch triển khai

## Overview

Kết quả cần đạt: website bán quần áo unisex của một shop, tiếng Việt, giao diện trắng/kem tối giản, vận hành đợt bán thử có đơn thật. Theo yêu cầu tiếp theo của người dùng: triển khai local để duyệt cửa hàng và admin trước, rồi mới hoàn thiện backend production và setup deploy.

## Mốc local hiện tại

Đã tạo storefront/admin React, 24 sản phẩm và API Node/SQLite lưu dữ liệu thật trên máy. Chạy tại http://127.0.0.1:5173; hướng dẫn ở docs/setup-guide.md. Bản local có auth, giỏ, địa chỉ, đơn, COD và trạng thái chuyển khoản chờ; không giả lập đã nhận tiền SePay.

Đây là thứ tự triển khai được người dùng điều chỉnh, không thay thế kiến trúc Supabase/SePay production bên dưới. Giai đoạn 1 hoàn thành; phần giao diện của 2–5 đã có để duyệt. Các gate production vẫn giữ chưa hoàn thành đến khi thực thi và xác minh. Báo cáo: [Bàn giao local](../reports/implementation-261019-nep-form-local.md).

- Ràng buộc: ưu tiên gói miễn phí; khách phải đăng nhập khi đặt hàng; admin đặt phí ship và cập nhật giao hàng; chuyển khoản qua SePay.
- Phạm vi đủ: sản phẩm/size/màu/tồn kho, tìm/lọc, tài khoản, giỏ hàng, nhiều địa chỉ, checkout, COD, SePay, lịch sử đơn và admin.
- Ngoài phạm vi hiện tại: nhiều người bán, app di động, vận chuyển tự động, SMS OTP, mạng xã hội, voucher/tích điểm, đánh giá và hoàn tiền ngân hàng tự động.
- Tiêu chí nghiệm thu: luồng mua thật chạy xuyên suốt; phân quyền đúng; chống trùng giao dịch và bán quá tồn; đẹp trên điện thoại; có hướng dẫn vận hành/khôi phục.
- Công nghệ đề xuất: React + TypeScript + Vite + Tailwind CSS; Supabase Auth/Postgres/Storage/Edge Functions; Cloudflare Pages.
- Chọn phiên bản ổn định tương thích và khóa lockfile lúc triển khai; không tự ghi số phiên bản chưa kiểm tra.

## Hồ sơ thiết kế và hợp đồng kỹ thuật

- [Yêu cầu, thương hiệu, giao diện và các quyết định](./product-and-brand-brief.md).
- [Kiến trúc, dữ liệu, giao dịch và giới hạn miễn phí](./architecture-and-operations.md).
- [Nguồn đã kiểm tra và kết quả rà soát](./research-and-validation.md).

## Phases

| # | Giai đoạn | Phụ thuộc | Ước lượng | Trạng thái |
|---|-----------|-----------|-----------|------------|
| 1 | [Nền tảng và thiết kế](./phase-01-start.md) | — | 8–12 giờ | Completed |
| 2 | [Tài khoản và dữ liệu](./phase-02-accounts-and-data.md) | 1 | 10–14 giờ | Pending |
| 3 | [Danh mục, giỏ hàng và địa chỉ](./phase-03-catalog-cart-and-addresses.md) | 2 | 12–18 giờ | Pending |
| 4 | [Checkout, tồn kho và SePay](./phase-04-checkout-and-sepay.md) | 3 | 16–24 giờ | Pending |
| 5 | [Trang quản trị](./phase-05-admin-panel.md) | 4 | 10–16 giờ | Pending |
| 6 | [Kiểm thử và triển khai miễn phí](./phase-06-verification-and-free-deployment.md) | 5 | 8–12 giờ | Pending |

Sáu giai đoạn giữ riêng các ranh giới thiết kế, quyền truy cập, giao dịch tiền và phát hành để kiểm tra được từng phần. Đây là giờ công kỹ thuật dự kiến, chưa gồm thời gian chờ thiết lập tài khoản, ngân hàng và duyệt giao diện.

## Dependencies

Cần khi triển khai: tài khoản Cloudflare, Supabase, SePay có ngân hàng hỗ trợ, một hộp thư gửi email của shop và sản phẩm thật trước khi mở thanh toán thật. Chưa có các cấu hình này; không phải blocker của việc lập kế hoạch hoặc xây bản local.

## Success Criteria

- [ ] Hoàn thành kiểm tra giao diện 360/390/768/1440 px; mọi luồng hiển thị tiếng Việt có dấu.
- [ ] Đăng ký, xác thực email, đăng nhập, đăng xuất, khôi phục mật khẩu hoạt động với email ngoài nhóm phát triển.
- [ ] Tài khoản A không truy cập địa chỉ/đơn của B hoặc chức năng admin.
- [ ] Chọn size/màu, giữ giỏ, địa chỉ mặc định và thay địa chỉ riêng cho đơn chạy đúng.
- [ ] Đặt đơn COD và chuyển khoản; webhook hợp lệ cập nhật đúng đơn, trùng lặp không trừ tồn hai lần.
- [ ] Kiểm thử đơn cuối kho, tiền thiếu/thừa, giao dịch đến muộn và thay đổi giá vượt qua.
- [ ] Admin quản lý hàng, tồn kho, khách, phí ship, đơn, đối soát và nhật ký thao tác.
- [ ] Có bản sao lưu đã thử phục hồi, hướng dẫn cấu hình và checklist mở bán thật.

## Handoff

Chỉnh hướng kinh doanh theo người dùng: custom áo là chính, mẫu sẵn là phụ. Bản local Nếp Studio và commerce đã hoàn tất theo [kế hoạch custom](../261019-0142-custom-shirt-studio/plan.md). Backend production sau này cần bao gồm lưu artwork/private asset, bảng giá custom và design snapshot theo hợp đồng local đã kiểm chứng.

Mốc local đã được triển khai và kiểm chứng. Bước tiếp theo là tiếp nhận chỉnh sửa giao diện/luồng từ người dùng; sau khi chốt, hoàn thiện backend Supabase, SePay, SMTP và deploy. Không ghi nhận các gate production hoàn thành chỉ vì local adapter chạy được.
