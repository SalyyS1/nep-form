---
title: "Studio và giao diện chuyển động"
status: completed
---

# Studio và giao diện chuyển động

## Overview

Custom là hướng kinh doanh chính. Thiết kế giữ cream/ink và font Việt, thêm điểm xanh chanh và nếp vải động gợi tên NẾP. Studio 2D có lớp chữ/hình/ảnh, kéo/resize/xoay, mặt trước/sau, undo/redo, mẫu nhanh, bản nháp và xem trước.

## Requirements

- [x] Điều khiển thật, layer/z-order/lock/hide, SVG xuất tự chứa font.
- [x] Homepage custom-first, đổi màu/hai mặt, scroll zoom, hover, nền động; reduced-motion tĩnh.

## Implementation Steps

1. Shared renderer/pricing ở shared/custom-core.mjs; kiểu dữ liệu shared/custom-types.ts.
2. Editor ở src/features/studio, route /thiet-ke; home/nav/catalog cập nhật riêng.
3. CSS motion có cleanup; nội dung hiển thị khi animation không chạy.

## Todo

- [x] Kiểm tra 375/768/1440, hover/overlay/lỗi và font Việt.
- [x] Browser xác minh drag/undo/redo/rotate/clone/hide/lock/delete/upload/front-back.

## Success Criteria

Render-check trang chủ và Studio đều 0 errors/0 warnings ở ba viewport. Motion thực tế và reduced-motion qua browser. Xem báo cáo nghiệm thu và ảnh trong outputs.
