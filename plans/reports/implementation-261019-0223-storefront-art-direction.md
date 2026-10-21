# NẾP — sửa mockup, bố cục, scroll và hover

Status: DONE. Local only, không sửa dữ liệu/schema hay deploy.

## Chẩn đoán

Không phải toàn bộ ScrollTrigger ngừng hoạt động: baseline browser1440 xác nhận reduce=false, hero chỉ scale1→1.054 và y0→32.8px khi cuộn650px. Chuyển động khó nhận biết, SVG phẳng, chữ NẾP lớn thành phần trang trí rỗng và hover200ms/hardshadow6px tạo cảm giác cứng. Evidence work/inspect-old-motion.py.

## Thay đổi

- Bỏ NẾP oversized và các nhãn/sticker thừa. Art direction ivory/ink/olive, headline Be Vietnam Pro + Loraitalic đầy đủ dấu Việt, CTA charcoal mềm.
- Cotton mockup trước/sau từ built-in image_gen (generation + background extraction), giữ alpha và đường cổ/vai/gấu/nếp vải. Asset cuối public/images/nep-cotton-front-v2.webp và nep-cotton-back-v2.webp; prompt/provenance tại data/shirt-mockup-manifest.json. Không coi là ảnh hàng sản xuất thật.
- Shared renderer dùng cùng mask/texture/tọa độ in cho storefront, Studio và private SVG; font và raster đều tự chứa. Artwork export vẫn chỉ nội dung in. Hai ảnh phôi trong admin thay cùng mockup.
- Một cảnh GSAP pin chính: phôi → hiện chữ → quay mặt sau; cuộn ngược đảo lại. Hero parallax rõ; ảnh editorial parallax nhẹ; đường viền/bộ sưu tập có chuyển động riêng. CSS một đường chỉ thở chậm ở hero. Không ghi scroll/mouse liên tục vào Reactstate.
- Hover bỏ jump/bóng cứng, arrow/link/image chuyển có easing320–900ms. Reduced-motion hiển thị áo đã in tĩnh, không pin/ambient.

## Verification

- npm run build và npm run lint: PASS. Không cảnh báo bundle; custom-core212.76KBminified chứa hai ảnh +font, tải cùng home/Studio.
- npm test:16/16PASS, chạy với renderer mới. Ownership/escape/CSP, snapshotcolor, giá/quote/tồn/idempotency giữ nguyên.
- npm run test:motion: PASS bánh xe thật375/768/1440,3ảnh khác nhau, opacityblank→printed, rotation180/copy3, đảo ngược, pin stable, không overflow/clippedgarment, hoverkhôngshadow, SPAđiStudio dọnpin rồi vềhome đúng1pin, reducedmotionstatic.
- npm run test:e2e: PASS storefrontlegacy/guestmerge/COD/bankpending/address/admin/reset và quote/stockregressions,4viewport.
- npm run test:studio: PASS drag/undo/redo/rotate/layers/upload/twofaces/save/reopen/cart/COD/adminpricing/artwork và375/768/1440; DB/API tạm đã dọn.
- Render-check home + Studio cuối:0errors/0warnings mỗi trang tại375×812,768×1024,1440×900. Reports work/render-polish-home-final và work/render-polish-studio-final.
- Xem ảnh thật ở3trạng thái scroll. Bắt được và sửa gridmin-content ép áo580px vào cột372px ởtablet: dùng minmax(0,fr), flex và min-width0; test đo cả boundingbox vì overflow-xclip che được lỗi khỏiscrollWidth. Lượt renderđầu24contrastwarnings4.37:1 đã sửa bằng mutedcục bộ đậm hơn.
- Source review nội bộ: mask/garment nguồncompiletrusted, không mởremotehref; layerescaping/uploadpolicy giữ nguyên; timeline trong matchMedia được revert khi unmount; fontsready callback cóliveguard. Không thay auth/payment/cartcontracts. Không có reviewer độc lập ở lượt này.

## Visual critique

| Mục | Điểm/2 | Evidence |
|---|---|---|
| Brief |2|Áo cotton thay silhouette, bỏ khối chữ NẾP; warm/tactile/editorial|
| Hierarchy |2|Một CTA chính cạnh chiếc áo, scene3bước rõ|
| Spacing |2|Gutter/sectionrhythm nhất quán, ít nhãn|
| Alignment |2|Bố cục chia cột và pin; tabletkhông cắt áo|
| Type |2|BeVietnamPro/Lora Việt, tương phản display/body|
| Color |2|Ivory/ink/olive, không blocklime lớn|
| Depth/shape |1|Mockupshadow + heroarch vẫn là lựa chọn có thể cần chỉnh theo tasteuser|
| States |2|Hovermềm, swatches/facebuttons, editorflow giữ phản hồi|
| Responsive |2|3viewport, boundinggarment và nooverflowverified|
| Slop tells |2|Không fauxsocialproof/featurecards/brandwordfiller|
| Copy |2|Nội dung specificcustomshop, không metrics giả|
| Craft |1|Mockup2D, artwork chưa uốn theo nếp như mô phỏngvải3D|

22/24 là tự đánh giá để tìm thiếu sót, không thay xác nhận thẩm mỹ của người dùng. Không mục dưới1. Ba cải thiện yếu nhất: modelmaterial, ý nghĩascroll vàhoverphysics đã đổi; giới hạn2D giữ được ghi rõ.

## Runtime / outputs

Một runtime npmrun dev: runner27448/API8584/UI26520, ports3001/5173. Record authority work/local-runtime.json; npmstop dừng đúng chủ. TestAPI3002/3003 không còn lắng nghe. Screenshots outputs/nep-home-v2-{375,768,1440}.png, nep-custom-home-{375,768,1440}.png (full), nep-studio-{375,768,1440}.png. Ảnh fullpageđã tải/giải mã ảnh lazytrước capture.

Unresolved questions: none for requested local revision; visual taste remains for user review.
