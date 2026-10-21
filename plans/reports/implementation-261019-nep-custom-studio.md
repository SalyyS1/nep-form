# NẾP Studio local — bàn giao

Status: DONE. Phạm vi local theo yêu cầu; không deploy public, chưa kết nối SePay thật.

## Kết quả

Shop chuyển sang custom-first, giữ24 mẫu sẵn và thêm2phôi. Trang chủ có nếp vải/nền động, NẾP unfolding, scroll zoom/reveal, hover, đổi màu/xem hai mặt. Reduced-motion tĩnh. Nếp Studio có template/chữ/icon/ảnh tải lên, kéo/resize/xoay, căn giữa, màu/font/opacity, lớp/ẩn/khóa/z-order/nhân bản/xóa, undo/redo, hai mặt/khổ in/size/màu/phom, preview2D và xuất SVG tự chứa font Việt.

Thiết kế anonymous giữ draft trên máy; lưu/add yêu cầu login. Account có thư viện phân trang. Giỏ tính giá server, các thiết kế cùng variant giữ dòng riêng; checkout/order/admin giữ snapshotthiết kế/giá/màu. Admin chỉnh bảng giá và tải artwork. COD/chuyển khoản chờ giữ đúng trạng thái bản local.

## Kiểm chứng cuối

- npm run build: pass, entry286.34KB; tách lazy home/Studio/admin, không còn cảnh báo chunk500KB.
- npm run lint: pass; build bao gồm TypeScript.
- npm test:16/16 pass. Bao gồm rasterfull decode PNG/JPEG/WebP, malformed/dimensions/budget, ownership, pricing version/stale quote, immutable snapshots, designpagination, concurrentdecode/cartstock, idempotency/cancel.
- npm run test:e2e: pass, guestmerge/COD/bankpending/reset/địa chỉ/admin và regressionstalequote/stock; viewport360/375/768/1440.
- npm run test:studio: pass; text/drag/undo/redo/rotate/clone/hide/lock/delete/upload/frontback/SVG/draftlogin/save/reopen/cart/COD/adminpricing/artwork;375/768/1440.
- Home render-check final:0errors/0warnings ở375/768/1440, tại work/render-custom-home/final-check. Interaction suite kiểm tra thực tế hover/scroll/color/faces/menu/search/reducedmotion và catalog.
- Studio render-check final:0errors/0warnings cùng3viewport, work/render-custom-studio-final/render-report.json. Empty/layer/overlay/error trải qua browserflows. Browser captures trong outputs/nep-studio-{375,768,1440}.png, outputs/nep-custom-home-{375,768,1440}.png.

## Review và sửa

Reviewer riêng phát hiện5điểm đã sửa: JPEG/WebP signature-only → Sharp full decode16MP/8192px/singlepage trước transaction; mutable drag ref → capture local trước updater; tồn UI → trừ tổng siblingcart; listprojectảnh lớn → SQLmetadata pagination; nhãn phí lặp → labelmột lần. Rereview xác nhận cả5đã sửa. APIlist là endpoint mới trong revision này, chưa có consumer bên ngoài; docs và studio-contract đã ghi rõ response metadata cuối, nội bộ đãmigrate/test. Không có lý do giữ response cũ chưa từng bàn giao.

Browser còn phát hiện labeltextarea không exact vì textnằmtronglabel (thêmaria-label), nativeartifactdownload bị canceled qua interception (fetchauthenticatedBlob+error), hover bịGSAPtransform giữ (clearProps), reduced-motion specificity trên NẾP (sửa CSS). Ảnh editorial trống trongfullpagecapture là lazyloadartifact; scroll/decode xác nhậnảnhthật và chụp lại outputs.

Rubric: home23/24 và Studio23/24. Mỗi mục2 trừ typography1 vì nhãn phụ nhỏ để giữ mậtđộthao tác; nội dung chính/nút44px rõ và checker không cảnhbáo. Studio mạnh ở phân cấp ba vùng, contrast/nềngiấy, tabmobile và phản hồi trạng thái. Ba cải thiện từ lần đầu: touch44px trênmobile, accessible names, SVGfontnhúng. Khôngmục dưới1.

## Vận hành và giới hạn

Runtime giữ cho người dùng: npm run dev, runner16336/API28468/UI13200, ports3001/5173, rootdựán. Recordmachine-owned: work/local-runtime.json; dùng npm stop đểdừng. TestAPI3002/3003 và browserworkers đãkết thúc, không trùngserver. Dữ liệu live giữ nguyên; backup trướcseed ở work/backups/store-before-custom-261019.sqlite.

Preview2D/SVG chưa phải mô phỏng màu in/3D hoặc artworkđãoutlined/CMYK. Bảnggiá demo cấu hình được. Bướcproduction theo plan gốc sau khi chốtUI; hiện chưa deploy/SePay/SMTP thật. Hướngdẫn tại docs/setup-guide.md; API tại docs/local-api-contract.md; thiết kế tại docs/design-guidelines.md.

Unresolved questions: none for this local scope.
