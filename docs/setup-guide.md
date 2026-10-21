# Chạy NẾP FORM trên máy

Đưa lên hosting/PostgreSQL: xem [hướng dẫn triển khai](deployment-guide.md).
Source GitHub riêng tư và những file giữ ngoài Git: xem [hướng dẫn quản lý source](source-control.md).

## Địa chỉ

- Cửa hàng: http://127.0.0.1:5173
- Quản trị: http://127.0.0.1:5173/quan-tri
- Nếp Studio: http://127.0.0.1:5173/thiet-ke
- Chat hỗ trợ (admin): http://127.0.0.1:5173/quan-tri/ho-tro
- Nhật ký vận hành: http://127.0.0.1:5173/quan-tri/nhat-ky
- Bảng giá custom: http://127.0.0.1:5173/quan-tri/gia-custom
- API: http://127.0.0.1:3001/api/health

Node 24.12+ và npm đã có trên máy ở phiên triển khai. Không cần Docker, Supabase, tên miền hoặc khóa SePay cho bản local này.

## Bật và tắt

Mở terminal trong thư mục dự án rồi chạy:

```powershell
npm install
npm run dev
```

Sau lần cài đầu, chỉ cần npm run dev. Lệnh khởi động API trước, rồi Vite; chỉ bind 127.0.0.1. Cổng đã dùng thì báo lỗi, không tự nhảy cổng hoặc nhân đôi server.

Tắt bằng Ctrl+C tại terminal đang chạy, hoặc từ terminal khác trong đúng dự án:

```powershell
npm stop
```

Runtime record tại work/local-runtime.json ghi runner/API/UI PID. Script stop kiểm tra command line trước khi dừng để tránh nhầm PID đã được hệ điều hành tái sử dụng.

## Tài khoản trải nghiệm local

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Chủ shop | admin@nepform.local | Nepform@2026! |
| Khách hàng | khach@nepform.local | Nepform@2026! |

Trang đăng nhập có hai nút dùng thử tương ứng. Có thể đăng ký tài khoản mới; mật khẩu được hash, session lưu bằng cookie HttpOnly. Đây là tài khoản công khai dành riêng bản local, không mang sang môi trường mở bán thật.

## Những gì lưu trên máy

SQLite tại work/local-data/store.sqlite chứa tài khoản, session, giỏ, địa chỉ, sản phẩm, đơn, thiết kế và cấu hình. Catalog chỉ seed lần đầu; sửa ở admin rồi khởi động lại vẫn giữ thay đổi. Bản custom bổ sung hai phôi áo qua seed có dấu phiên bản, giữ nguyên 24 mẫu sẵn. Ảnh và font phục vụ từ public/ để không lệ thuộc hotlink.

Trước khi thay schema hoặc cập nhật/xóa dữ liệu hàng loạt: dừng API và sao chép store.sqlite sang thư mục backup riêng. Không xóa DB để chạy lại kiểm thử. Các test tạo DB tạm tách biệt.

## Luồng nên xem

1. Trang chủ → Tự thiết kế áo → thêm mẫu/chữ/hình/ảnh → kéo, đổi màu, xoay → chuyển mặt trước/sau → xem trước.
2. Lưu thiết kế hoặc thêm áo vào giỏ; đăng nhập nếu chưa có tài khoản. Bản nháp giữ trên trình duyệt. Thiết kế đã lưu nằm ở Tài khoản → Thiết kế của tôi.
3. Giỏ → checkout → chọn/nhập địa chỉ → đặt COD; thiết kế hai mặt và giá đi theo đơn. Hai áo cùng size/màu có thiết kế khác vẫn là hai dòng riêng.
4. Admin → Giá custom để đổi phí chữ/hình/ảnh, vùng in, lớp thêm. Giá phôi chỉnh ở Sản phẩm. Admin → Đơn hàng → xem thiết kế & chi phí → tải artwork SVG.
5. Mẫu có sẵn → sản phẩm → chọn size → thêm giỏ; vẫn mua chung với áo custom.
6. Thử chuyển khoản: đơn ở trạng thái chờ, trang hướng dẫn hiển thị SePay chưa kết nối; không có QR/tài khoản ngân hàng giả.

Studio là công cụ 2D cho in chữ/logo/ảnh, chưa có AI tạo ảnh hay mô phỏng 3D. Mỗi mặt tối đa 20 lớp; ảnh PNG/JPEG/WebP được thu gọn trên trình duyệt; tổng ảnh trong thiết kế tối đa 2 MB. Server giải mã kiểm tra ảnh, không nhận SVG hay URL bên ngoài. Màu và kích thước in thực tế cần shop xác nhận. SVG export chứa font Việt nhúng; chưa phải file đã chuyển chữ thành đường vector hay hồ sơ màu máy in. Giá hiện tại là demo.

Tab Mẫu có24 mẫu thiết kế nhiều lớp; tab Hình có48 sticker vector. Cả hai có tìm kiếm, lọc6 phong cách Tối giản/Đường phố/Retro/Dễ thương/Thiên nhiên/Du lịch và nút xem thêm. Chọn mẫu → xem trên phôi áo đang chọn hoặc chỉ hình in → sửa nhanh từng dòng chữ/bảng màu → Dùng mẫu này. Nếu mặt áo đã có lớp, chọn Thêm vào mặt đang xem để giữ lớp cũ, hoặc Thay thiết kế mặt này để thay riêng mặt đó; mặt còn lại giữ nguyên. Hoàn tác trả lại toàn bộ trạng thái trước khi áp dụng. Giới hạn20 lớp/mặt vẫn được kiểm tra, không xóa bớt lớp âm thầm. Sau khi áp dụng, từng lớp vẫn đổi phông/màu, kéo/xoay/ẩn/xóa được; phụ phí cập nhật theo lớp đang hiện.

Tab Hình có ô nhập chữ ngay dưới sticker: nhập nội dung, chọn phông/màu, xem thử rồi thêm lên mặt áo đang chọn. Tab Chữ cũng có công cụ này. Có sẵn15 phông Việt: mở Phông chữ mới để xem từng phông bằng nội dung đang nhập, tìm tên hoặc lọc Hiện đại/Nổi bật/Cổ điển/Viết tay. Khi sửa lớp, mở Kiểu chữ để chọn theo cùng danh sách xem trước. Phông có sẵn không tính vào giới hạn phông tự tải; chỉ dữ liệu SVG của phông đang dùng mới tải theo thiết kế.

Chọn một lớp chữ → Hiệu ứng chữ trong bảng Chỉnh lớp: Thẳng/Cong lên/Cong xuống và độ cong; bật Viền chữ để chọn màu/độ dày; bật Đổ bóng chữ để chỉnh màu, độ đậm, độ mờ, lệch ngang/dọc. Thanh kéo có ô nhập số chính xác. Trên điện thoại, mở tab2 hoặc chọn lớp từ danh sách để xem bảng chỉnh. Áo và preview hai mặt cập nhật ngay; mỗi dòng uốn riêng. Đặt lại hiệu ứng chỉ xóa hiệu ứng của lớp chữ đang chọn, vẫn giữ nội dung/phông/màu chữ. Hoàn tác, nhân bản, khóa lớp, bản nháp, lưu, đặt hàng và SVG đều giữ hiệu ứng. Viền/bóng không tạo lớp/phụ phí mới; thiết kế cũ không có hiệu ứng giữ cách vẽ cũ.

Nút Tải phông chữ vẫn nhận TTF/OTF/WOFF/WOFF2, tối đa 512 KB/file, 3 phông và tổng 1 MB/thiết kế. Phông đi cùng bản nháp, thiết kế đã lưu và SVG của đơn/admin; chọn lại được trong Kiểu chữ khi sửa lớp. Server kiểm tra cấu trúc file phông. Dùng phông có quyền sử dụng và đủ dấu Việt.

Nút Chưa biết chọn size? nằm dưới các size trong Studio và trang sản phẩm áo. Nhập chiều cao (cm), cân nặng (kg), xem gợi ý rồi bấm chọn size. Bảng hiện tại là demo S–XL; ngoài phạm vi sẽ báo cần tư vấn, hết size ở màu đang chọn thì không cho áp dụng. Studio trừ cả số lượng phôi đã có trong giỏ. Số đo chỉ ở hộp thoại, không lưu vào tài khoản/đơn; đóng hộp thoại sẽ xóa. Thay bảng tại shared/size-guide.mjs theo số đo nhà cung cấp trước khi dùng bán thật.

Phụ phí mỗi mặt = phí loại nội dung cao nhất trên mặt đó + phí khổ in + phí lớp từ lớp thứ hai. Mặt trống không thu phí. Giỏ cập nhật bảng giá hiện hành; giá và thiết kế của đơn đã đặt giữ nguyên. Thư viện thiết kế tải từng trang 12 bản, không kéo toàn bộ ảnh gốc khi mở danh sách.

Khôi phục mật khẩu ở bản local trả liên kết thử ngay trong hộp thoại; không tuyên bố đã gửi email. Email xác thực/SMTP sẽ được nối ở bước backend production.

## Kiểm chứng mã

```powershell
npm run typecheck
npm run lint
npm run build
npm test
npm run test:e2e
npm run test:support
npm run test:studio
npm run test:assistance
npm run test:fonts
npm run test:library
npm run test:text-effects
npm run test:motion
```

E2E cần cửa hàng đang chạy ở 5173, Python và Playwright đã cài trên máy. Test cửa hàng khởi động API riêng ở 3002, Studio ở 3003, đều dùng DB tạm; nếu cổng đã dùng thì từ chối chạy. Không sửa DB đang dùng để duyệt giao diện. Khi thay font nguồn, chạy npm run generate:custom-fonts để cập nhật font nhúng trong SVG.

Test assistance dùng API/DB tạm ở 3004: thêm chữ dưới sticker, file phông lỗi/hợp lệ, undo/redo, lưu/mở lại và SVG, gợi ý size, số đo ngoài bảng, size hết hàng và bố cục 375/768/1440.

Test fonts chỉ đọc API local và thao tác bản nháp trong browser riêng, kiểm tra mẫu phông/filter/search/áp dụng/mở lại/SVG; không sửa DB live. Phông có sẵn, nguồn và giấy phép tại data/studio-font-manifest.json. Sau khi đổi file WOFF2 nguồn, chạy npm run generate:builtin-fonts để cập nhật CSS và module nhúng SVG theo từng phông. Script chuẩn bị font nguồn scripts/prepare-studio-fonts.py cần Python fontTools/Brotli; chỉ dành cho thay thư viện, không cần khi chạy web. Các file phông đã được đóng gói sẵn, sử dụng local không cần Google Fonts.

Test library dùng API3005/DB tạm: phân loại/tìm kiếm/xem thêm, chỉnh nhanh, thêm/thay/hoàn tác riêng từng mặt, chặn vượt20 lớp, lưu/mở lại, bố cục375/768/1440. Sticker nguyên bản ở shared/sticker-paths.mjs và shared/sticker-catalog.mjs; mẫu nhiều lớp ở shared/design-template-catalog.mjs. Không tải ảnh từ Canva hay hotlink asset ngoài.

Test text-effects dùng API3006/DB tạm và Chromium: so sánh ảnh áo thật khi cong lên/xuống/viền/bóng, multiline, reset/undo/lock/duplicate, phối sticker, lưu/mở lại và SVG;375/768/1440. Kiểm thử server kiểm tra dữ liệu hiệu ứng, bảo toàn artwork đơn sau restart và ảnh raster viền/bóng. Sharp/librsvg hiện không vẽ textPath; phần chữ cong kiểm tra bằng trình duyệt, không dùng Sharp để raster hóa SVG chữ cong. SVG vẫn chứa chữ/phông, chưa chuyển thành đường vector; shop cần kiểm tra phần mềm in thực tế.

Test motion `python tests/browser/home-motion.spec.py` dùng Vite5173 và API3013/SQLite tạm:15 font chạy trái cả khi giữ chuột trên dải, hai mặt áo tự chạy đủ vòng6 mẫu không cần bấm chọn, crossfade, bố cục tiêu đề/cặp áo cùng hàng ở desktop, dừng/chạy, tab ẩn/ngoài màn hình và route cleanup ở375/768/1440. Dải font và áo tự chạy ngay cả khi hệ thống bật reduced-motion, không cần bấm bật; vẫn kiểm tra tạm dừng/chạy tiếp. Ảnh/evidence nằm trong work/autoplay-showcase/motion. Mô tả ảnh minh họa custom và nguồn font tại docs/design-guidelines.md.

## Quản trị và hỗ trợ khách

Dashboard dùng dữ liệu thật: tiền đã ghi nhận thanh toán (loại đơn hủy), tiền đang chờ thu, số đơn cần đối soát, đơn có custom và hội thoại đang mở. Biểu đồ14 ngày theo ngày đặt/múi giờ Việt Nam; tiền trên tooltip là tiền hiện đã thu của nhóm đơn đó, không phải sổ thu tiền theo ngày giao dịch. Các thẻ dẫn tới danh sách quản lý. Nút làm mới ở góc trên tải lại số liệu.

Admin → Đơn hàng: cập nhật trạng thái, ghi nhận tiền thủ công, đơn vị vận chuyển/mã vận đơn. Khách thấy mã trong trang chi tiết đơn. Form gửi phiên bản đã mở; nếu đơn thay đổi ở nơi khác, server trả409 và form yêu cầu dùng dữ liệu mới trước khi sửa tiếp. Lịch sử riêng của đơn tải từ API, không bị giới hạn bởi200 sự kiện trên trang Nhật ký. Đổi trạng thái vận chuyển không tự xác nhận COD đã thu.

Khách bấm **Hỏi Nếp** ở góc dưới cửa hàng và nhắn ngay trong popup; nếu chưa đăng nhập, điền email/mật khẩu ngay tại đó. Admin dùng cùng nút để chọn hội thoại và trả lời trong popup, hoặc mở trang quản trị khi cần hộp thư đầy đủ. Không bắt chuyển trang để nhắn. Admin → Hỗ trợ khách hàng: tìm tên/email/nội dung tin gần nhất, lọc tất cả/chưa đọc/đang hỗ trợ/đã xử lý, chọn hội thoại và trả lời. Đánh dấu đã xử lý đóng việc tư vấn; tin mới tự mở lại. Mỗi tài khoản khách có một hội thoại; mọi admin dùng chung hộp thư và mốc đã đọc.

Chat tự lấy tin mới mỗi4 giây khi cửa sổ đang mở; số tin chưa đọc trên nút Hỏi Nếp kiểm tra mỗi10 giây. Không hiển thị giả trạng thái online hay cam kết trả lời ngay. Tab ẩn tạm dừng tải tin. Tin nhắn là văn bản thuần, tối đa2000 ký tự,20 tin/phút/người/hội thoại; lỗi gửi giữ nội dung để thử lại cùng mã gửi, không nhân đôi tin. Có nút xem tin trước theo từng50 tin. Chưa có đính kèm, chatbot AI hay push/email khi đóng trang. Hội thoại và mốc đã đọc lưu trong database đang dùng (SQLite local/PostgreSQL hosted), không mất khi khởi động lại.

Test support dùng API3007/DB tạm, hai phiên khách/admin riêng: gửi/nhận, unread khi đóng/mở chat, đóng/mở lại, lịch sử sau reload, mã vận đơn, nhật ký/dashboard và375/768/1440. Không tạo tin hoặc đơn trong DB đang dùng để xem.

## Bước tiếp theo

Runtime đã hỗ trợ PostgreSQL và cấu hình Render, có lệnh init/check/backup/restore và chế độ hosted tách demo. Làm theo [hướng dẫn triển khai](deployment-guide.md) để tạo project và nhập cấu hình riêng. Supabase Auth/Edge Functions trong kế hoạch ban đầu chưa được triển khai; auth hiện vẫn chạy trên Node. SePay/email và vận hành production tiếp tục cần cấu hình/kiểm chứng thực tế.


## Tài khoản, email và ảnh mới

Form đăng ký/đặt lại mật khẩu cần nhập lại mật khẩu; dùng Tab hoặc phím lên/xuống để chuyển ô. Bản local không tự đọc cấu hình mail trong `.env` khi chạy `npm run dev`; thư xác minh/đổi mật khẩu có liên kết thử được ghi rõ, không giả lập gửi thư. Gửi thật và điều kiện xác minh checkout xem [hướng dẫn triển khai](deployment-guide.md). Không dùng khóa thật cho test browser: các fixture capture thư trong thư mục tạm.

Khách mở chat ngay tại trang bằng nút hỗ trợ, lịch sử đầy đủ ở `/tai-khoan/ho-tro`. Admin sửa sản phẩm có thể tải ảnh từ thiết bị hoặc thêm link, xem trước và đổi ảnh bìa. Ảnh đăng lên là ảnh công khai; thiết kế riêng của khách giữ quyền truy cập cũ.


## Giá sale và mã giảm giá

Admin → Sản phẩm → Chỉnh sửa: nhập giá SALE thấp hơn giá gốc, có thể hẹn bắt đầu/kết thúc theo giờ Việt Nam. Để trống ngày để áp dụng ngay; xóa giá sale để trở về giá gốc. Sale của áo custom chỉ giảm tiền áo, không giảm phụ phí in.

Admin → Khuyến mãi: tạo mã giảm theo % hoặc số tiền; tùy chọn đơn tối thiểu, mức giảm tối đa (mã %), thời hạn, tổng lượt và lượt mỗi khách. Để trống giới hạn nghĩa là không giới hạn; tắt “Cho phép sử dụng mã” để ngừng mã. Lượt đã dùng không tính các đơn đã hủy. Mỗi đơn dùng một mã, áp dụng tiếp sau sale, không giảm phí giao hàng. Đơn đã đặt giữ nguyên giá và ưu đãi kể cả khi sửa/xóa sale hoặc tắt mã.

Trong form mã, **Cách giới hạn lượt dùng** có ba lựa chọn: tùy chỉnh, một lượt cho cả mã hoặc mỗi khách một lượt. Chọn **Chỉ dành cho đơn đầu tiên** để giới hạn khách chưa có đơn nào chưa hủy; đơn đang chờ/chưa thanh toán vẫn tính là đã đặt. Nhập **Số món tối thiểu** để làm mã combo, ví dụ 3: mua ba áo giống nhau cũng đủ, áo custom được tính theo số lượng. Có thể kết hợp các điều kiện với mức tiền tối thiểu, thời hạn và mức giảm hiện có. Hủy đơn trả lại lượt/điều kiện đơn đầu theo chính sách trên; không tự hoàn tiền ngân hàng.

Tích **Hiện tại thanh toán** trên mã muốn công khai cho khách chọn. Mã cũ và mã mới chưa tích đều giữ chế độ nhập tay; không có thao tác tự bật mã sau cập nhật. Tắt riêng ô này chỉ ẩn khỏi danh sách, không vô hiệu hóa mã cho người đã biết mã.

Tại thanh toán, khách mở **Chọn mã giảm giá** để xem điều kiện, số tiền giảm theo giỏ hiện tại và lý do chưa dùng được. Mã gợi ý được so theo tiền giảm thực tế sau mức trần; khách chủ động chọn, mỗi đơn vẫn một mã. Mã chưa bắt đầu có thể hiện kèm thời gian chờ; mã đã tắt/hết hạn không xuất hiện. Lượt dùng chưa được giữ chỗ khi xem danh sách, nên cần kiểm tra lại khi áp dụng/đặt đơn.

Khách nhập mã tại trang Thanh toán, bấm Áp dụng và xem tổng trước khi đặt; có thể bỏ mã. Nếu giá/mã thay đổi, cần xem lại tổng và tự xác nhận lần nữa. Không có mã mẫu tự bật trên website.

Kiểm thử: `node --test tests/server/promotions.test.mjs tests/server/discount-checkout.test.mjs tests/server/discount-postgres.test.mjs`. Browser: khi Vite5173 đang chạy, `python tests/browser/discounts.spec.py` tự tạo API3013/DB tạm, không chỉnh shop đang dùng.

Kiểm thử hộp chọn mã: `python tests/browser/voucher-picker.spec.py` dùng Vite5173 và API3016/SQLite tạm; không dùng dữ liệu shop đang bán.


## Giữ phiên giữa các tab

Đăng nhập còn hiệu lực thì mở lại đường dẫn quản trị trong cùng trình duyệt/hồ sơ sẽ dùng phiên hiện tại. Trang đăng nhập tự tiếp tục tới đích đã chọn; muốn đổi tài khoản, dùng **Chuyển tài khoản** ở thông báo quyền truy cập. Các tab cập nhật trạng thái khi đăng nhập/đăng xuất/đổi mật khẩu hoặc quay lại tab. Cookie vẫn do máy chủ kiểm tra; trình duyệt/hồ sơ riêng không tự chia sẻ phiên.

Nguồn xử lý: [store-context.tsx](../src/lib/store-context.tsx), [auth-page.tsx](../src/features/account/auth-page.tsx). Kiểm thử `python tests/browser/session-navigation.spec.py` dùng Vite5173 và API3014/SQLite tạm; không dùng cookie/database đang bán hàng.

## Giới hạn lưu dữ liệu

Mỗi tài khoản có tối đa50 dòng sản phẩm trong giỏ và20 địa chỉ đã lưu. Khi đầy, khách vẫn sửa/xóa được mục cũ. Ở thanh toán, có thể dùng địa chỉ mới cho một đơn mà không tích lưu lại.

Lưu thiết kế và thêm áo tự thiết kế vào giỏ dùng chung giới hạn30 lần/giờ, tối đa20MiB dữ liệu thiết kế/ngày. Khi chạm giới hạn, website báo để khách thử lại sau; thiết kế và đơn đã lưu được giữ nguyên. Chi tiết cách tính và kiểm thử ở [hợp đồng API](local-api-contract.md#security-boundaries-and-resource-limits).


