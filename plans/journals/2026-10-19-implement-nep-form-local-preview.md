---
title: Implement NEP FORM local preview
date: 2026-10-19
summary: "Hoàn thiện bản local để duyệt cửa hàng/admin, kiểm thử luồng và giữ server chạy."
---

# Implement NEP FORM local preview

Đã triển khai mốc NẾP FORM local theo chỉ đạo duyệt frontend/admin trước backend production.
React/Vite trên127.0.0.1:5173 và Node/SQLite API3001 lưu dữ liệu thật. Có24 sản phẩm mẫu, auth, giỏ, địa chỉ, checkout/COD/bank pending và5 trang quản trị.
Review phát hiện và đã sửa stale inventory edit, checkout đổi tổng tiền và guest cart merge fail. API10/10, lint/type/build, E2E +4 viewport pass; render-check storefront0error0warning.
Đã thử stop/restart; giữ một phiên local chạy để người dùng duyệt. Bước sau: chỉnh giao diện theo phản hồi rồi làm Supabase/SePay/SMTP/production deployment.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
