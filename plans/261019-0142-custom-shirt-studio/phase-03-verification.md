---
title: "Kiểm thử và bàn giao local"
status: completed
---

# Local verification

- [x] Build/type/lint, server16/16, browser cửa hàng cũ và Studio.
- [x] Render-check375/768/1440 cho home/Studio; không overflow, lỗi runtime hay cảnh báo cuối.
- [x] Review riêng và sửa upload decode, capture undo ref, tổng tồn UI, list metadata, nhãn giá.
- [x] File artwork tải qua authenticated fetch/Blob và báo lỗi; SVG chứa font Việt.
- [x] Hướng dẫn setup/API/design cập nhật; một runtime local được giữ cho người dùng duyệt.

Không có deploy internet hay xác nhận nhận tiền SePay. Preview2D và SVG còn cần xác nhận màu/in thực tế trước production. Mọi kiểm thử dùng database tách biệt, giữ dữ liệu live và backup.
