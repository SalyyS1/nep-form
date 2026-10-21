---
phase: 1
title: "Nền tảng và thiết kế"
status: completed
priority: P1
effort: "8–12 giờ"
dependencies: []
---

# Giai đoạn 1: Nền tảng và thiết kế

## Mục tiêu và bối cảnh

Dựng nền ứng dụng và ngôn ngữ thiết kế theo [brief](./product-and-brand-brief.md). Mốc này đã triển khai local theo yêu cầu mới; tài liệu setup phản ánh mã hiện tại.

## Files dự kiến — tạo mới

- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/package.json — scripts và dependency khóa phiên bản.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/app.tsx — route public/account/admin.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/styles/theme.css — token, typography và responsive.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/components/store-layout.tsx — header/footer/navigation.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/src/lib/api.ts — HTTP client tới local adapter.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/scripts/dev-local.mjs — API và Vite ở cổng cố định, SPA fallback local.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/docs/design-guidelines.md — quyết định giao diện.
- C:/Users/Salyyy/Documents/Codex/2026-10-19/t/docs/setup-guide.md — lệnh chạy/config không chứa secret.

## Các bước

1. Kiểm tra công cụ hiện có và phiên bản ổn định tương thích. Khởi tạo React/TypeScript/Vite, Tailwind, routing và lint. Kiểm thử API bằng Node test runner, browser bằng Playwright có trên máy.
2. Chốt scripts npm: dev, stop, build, lint, typecheck, test, test:integration, test:e2e. Integration/E2E dùng SQLite tạm, không sửa DB đang duyệt.
3. Dựng palette, Be Vietnam Pro có đủ font weights, nút/form/dialog và trạng thái trợ năng. Có LICENSE font kèm nguồn.
4. Dựng trang chủ, danh sách và chi tiết ở mức design bằng dữ liệu seed demo có nhãn rõ. Không xây số liệu bán hàng giả.
5. Thể hiện layout desktop/mobile và admin shell. Tiền định dạng vi-VN/VND; ngày hiển thị Asia/Ho_Chi_Minh.
6. Kiểm tra route refresh trong local Vite; cấu hình cache/header Pages chuyển sang giai đoạn deploy theo thứ tự mới.
7. Tạo .env.example chỉ tên biến/rỗng và .gitignore; không ghi secret.
8. Review thiết kế với tiêu chí trong brief trước mở rộng toàn bộ màn hình.

## Checklist

- [x] Nền dự án và scripts được tạo.
- [x] Tokens/font/layout và component form xong.
- [x] Bản đầu trang chủ/danh mục/chi tiết được xem trên mobile/desktop.
- [x] Tài liệu setup và design khớp mã.

## Kiểm chứng

Các lệnh dưới đây đã pass trong phiên triển khai local; bằng chứng trong báo cáo bàn giao:
- npm run lint; npm run typecheck; npm run build.
- Kiểm tra ảnh chụp viewport 360/390/768/1440; không tràn ngang, không lỗi dấu.
- Điều hướng bằng bàn phím; nút chính >=44px khi phù hợp; focus và error label rõ.
- Refresh URL sâu như /san-pham/ao-thun-kem-co-tron không trả 404 ở local; route trên Pages sẽ kiểm tra khi triển khai host.

## Rủi ro / rollback

Ảnh không đồng bộ → thay trong cùng hướng chụp, không thêm hiệu ứng để che ảnh kém. Dependency không tương thích → pin bộ ổn định đã build được. Nếu dev server đã chạy, xác định owner và reuse; port cố định 5173; ghi PID và dừng tiến trình do mình tạo khi xong.
