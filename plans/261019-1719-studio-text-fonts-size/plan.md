---
title: "Thêm chữ/phông riêng và gợi ý size áo"
status: completed
created: 2026-10-19
---

# Outcome

User xác nhận cả ô nhập chữ và tải phông riêng dưới sticker; thêm tư vấn size từ chiều cao/cân nặng, áp dụng vào áo đang chọn. Local hiện hữu, không deploy hay sửa schema/bulk dữ liệu.

## Design / scope

Product register, giữ cream/ink/olive và font UI. Composer chữ ngay dưới grid sticker, dùng lại trong tab Chữ; uploadphông và preview, file font nhúng theo design để đơn/admin không rơi về font mặc định. Không thêm AI. Gợi ý size tham khảo từ bảng demo đang có, không dùng BMI; kiểm tra phạm vi, size đang bán và stock màu đã chọn. Không tự chọn size hết hàng hoặc gợi ý XL cho số đo ngoài bảng.

- [x] Composer chữ + chọn phông/màu và tải TTF/OTF/WOFF/WOFF2.
- [x] Validate font, lưu/font render private SVG/draft/undo cùng project, tương thích project cũ.
- [x] Gợi ý height/weight ở Studio và sản phẩm áo, dùng chung chart và nút Áp dụng.
- [x] Tests font validation/lifecycle, size boundaries/stock, browser text-font-size flow, build/lint/render mobile.
- [x] Docs/review và runtime local được giữ sau khi backup/restart.

Evidence: [implementation report](../reports/implementation-261019-1719-studio-text-fonts-size.md).

## Contract

DesignProject.fonts?:{id,name,dataUrl}[], max3; mỗi font≤512KiB, tổng≤1MiB. Layer.fontFamily nhận thêm custom:{id} có trong project; CSS family chỉ từ ID an toàn. Custom POST body max5MB để đủ2MBảnh+1MBfont/base64. Fontkit parse header/cmap/glyph layout trước persistence, không remote font URLs; SVG preview/artwork nhúngfont. Không lưu số đo cơ thể vào account/đơn; chỉ state khi mở dialog.
