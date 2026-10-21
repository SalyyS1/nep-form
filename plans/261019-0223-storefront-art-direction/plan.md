---
title: "Sửa art direction và scroll NẾP"
status: completed
created: 2026-10-19
---

# Outcome

Theo phản hồi người dùng: áo SVG phẳng/xấu, không cảm nhận scroll animation, chữ NẾP giữa trang xấu, hover cứng và giao diện có cảm giác generator. Sửa storefront và chất lượng preview áo, giữ editor/data/cart/payment contracts. Không deploy hoặc sửa DB.

## Design brief

Register: Brand home, Product preview.
Scene: Người mua áo custom Việt dùng điện thoại/laptop, muốn thấy chất liệu và thao tác có phản hồi tự nhiên.
Direction: Fashion atelier/editorial, nền ivory sạch, ảnh vải có nếp thật, ít khối trang trí, chữ lớn có chủ đích.
Color: Restrained, bg #f7f5f0, ink #20201e, olive #4f5a40; lime giảm còn điểm nhấn nhỏ.
Type: Be Vietnam Pro; chữ thường mềm, tương phản bằng cỡ/weight, đủ dấu Việt.
Signature: Cuộn để chiếc áo từ phôi thành thiết kế; brand thể hiện qua sản phẩm và chỉ may, bỏ NẾP cỡ lớn.
Dials: variance7, motion8 ở một cảnh cuộn chính, density3.

## Tasks

- [x] Chẩn đoán scroll/reduced motion/hover trên browser trước sửa.
- [x] Mockup vải có cổ/dày/nếp/bóng, đồng nhất home/Studio/private preview.
- [x] Trang chủ tái bố cục; bỏ oversized NẾP, thay bằng cảnh scroll có thay đổi rõ/đảo chiều.
- [x] Hover easing mềm, bỏ hard shadow/jump; sửa nhịp ảnh/chữ.
- [x] Browser375/768/1440, scrollwheel intermediate captures, reduced-motion, mobile/editor, build/lint/server contracts.
- [x] Docs/review/report; giữ đúng một runtime local.

## Acceptance

Cuộn thật thể hiện ít nhất3trạng thái sản phẩm khác nhau, không scroll-jacking; mọi CTA hoạt động; reduced-motion có bố cục tĩnh đầy đủ. Mockup trước/sau dễ phân biệt và chữ vẫn giữ đúng vị trí in. Không yêu cầu user xác nhận lại scope đã nêu.

Evidence: [Báo cáo sửa art direction](../reports/implementation-261019-0223-storefront-art-direction.md). Tests/browser/home-motion.spec.py kiểm tra wheel, chiều ngược và SPA cleanup; kiểm tra mua hàng/Studio dùng DB tạm. Bản local tiếp tục ở5173, không thay đổi dữ liệu live.
