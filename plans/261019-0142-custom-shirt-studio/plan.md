---
title: "NẾP Studio — custom áo và chuyển động"
description: "Bản local custom-first, editor 2D hai mặt, giá cấu hình, thiết kế xuyên suốt giỏ và đơn."
status: completed
priority: P1
effort: ""
tags: []
created: 2026-10-19
---

# custom-shirt-studio

## Overview

Chuyển NẾP FORM thành shop custom áo; giữ cửa hàng mẫu sẵn. Triển khai local trước, chưa deploy hay kết nối SePay thật. Thiết kế 2D chữ/icon/ảnh tải lên, hai mặt áo, giá demo cấu hình được; thiết kế đi theo giỏ và đơn. Dữ liệu SQLite đã sao lưu tại work/backups/store-before-custom-261019.sqlite.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Studio kéo thả, lớp, undo/redo, mặt trước/sau, preview, lưu | P1 |
| 2 | Giá server, giỏ, đơn và admin xem file thiết kế | P1 |
| 3 | Trang chủ custom-first, scroll zoom, hover và nền nếp vải động | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Studio và giao diện chuyển động](./phase-01-start.md) | Completed |
| 2 | [Dữ liệu custom và luồng mua](./phase-02-custom-commerce.md) | Completed |
| 3 | [Kiểm thử và bàn giao local](./phase-03-verification.md) | Completed |

## Success Criteria

- [x] Chữ/icon/ảnh thật chỉnh được; lưu và mở lại, thêm giỏ và đặt đơn giữ đúng thiết kế/giá.
- [x] Giá không tin client; kiểm tra quyền, upload và tồn kho tổng qua nhiều thiết kế.
- [x] Admin cấu hình phụ phí, xem hai mặt và tải artwork.
- [x] Responsive 375/768/1440, reduced motion, build/lint/test/e2e chạy qua.

## Design brief

Register: Brand (home), Product (Studio).
Scene: Khách Việt thiết kế áo unisex trên điện thoại/laptop, thao tác rõ, vui sáng tạo.
Direction: Editorial cream/ink, điểm xanh chanh nhẹ, đường gấp vải gợi tên NẾP.
Color: Restrained; bg #f7f5f0, text #20201e, accent #d6ee72.
Type: Be Vietnam Pro, tương phản bằng trọng lượng và cỡ chữ, đủ dấu Việt.
Signature: Một áo trống thành áo riêng; đường nếp chuyển động và bung ra khi cuộn.
Dials: variance 7, motion 7 (home) / 3 (editor), density 3 / 6.

## Contracts and ownership

Root owns shared/custom-types.ts, shared/custom-core.mjs + .d.mts, src/features/studio/**, src/app.tsx, src/main.tsx, src/lib/types.ts.
Backend worker owns server/**, tests/server/custom*.mjs, data custom seeds, public/images/custom*.svg.
Motion worker owns home-page.tsx, store-layout.tsx, catalog-page.tsx, styles/custom-home.css only.
Commerce worker owns checkout/**, account/account-page.tsx, account/my-designs.tsx, admin/**, lib/store-context.tsx, styles/custom-commerce.css.
Full contract in studio-contract.md. No public deploy, AI generation, embroidery, 3D or live payment in this local revision.

Kết quả/checks: [Báo cáo local custom](../reports/implementation-261019-nep-custom-studio.md). Hướng dẫn vận hành: [setup-guide](../../docs/setup-guide.md). Production tiếp tục theo kế hoạch gốc sau khi người dùng chốt giao diện.

<!-- slug: custom-shirt-studio -->
