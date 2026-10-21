# Yêu cầu và định hướng NẾP FORM

Ngày chốt phỏng vấn: 19/10/2026, Asia/Saigon. Một shop unisex mở bán thử nghiệm.

## Quyết định từ người dùng

| Nội dung | Đã chốt |
|---|---|
| Mô hình | Một shop, một admin panel chung |
| Sản phẩm | Quần áo unisex; giao người thực hiện đặt tên thương hiệu |
| Giao diện | Trắng/kem, chữ đen, ảnh lớn, bố cục gọn |
| Ngôn ngữ | Tiếng Việt, font có dấu chuẩn |
| Mục tiêu | Mở bán thử nghiệm với đơn thật |
| Tài khoản | Email/mật khẩu; bắt buộc đăng nhập trước đặt hàng |
| Thanh toán | Tiền mặt khi nhận hàng (COD), chuyển khoản qua SePay |
| Địa chỉ | Lưu theo account; chọn hoặc đổi trong checkout |
| Vận chuyển | Admin đặt phí và cập nhật trạng thái thủ công |
| Hạ tầng | Chưa có; đề xuất miễn phí, quy mô nhỏ |
| Dữ liệu demo | Chủ động tìm ảnh/quần áo trên mạng để trình diễn |
| SePay | Chưa cấu hình; phải có hướng dẫn kết nối |
| Đầu việc hiện tại | Triển khai local để duyệt cửa hàng và admin trước; backend production/deploy sau |

## Thương hiệu được chọn làm việc

**NẾP FORM — Mặc theo cách mình.**

“Nếp” gợi chất vải; “form” gợi dáng mặc. Hai âm tiết ngắn, trung tính về giới, phù hợp wordmark đơn giản. Tên hiển thị NẾP FORM; slug kỹ thuật dự kiến nep-form-store, tùy khả dụng.

- Định vị thiết kế: đồ unisex thường ngày, gọn và dễ phối.
- Giả định để dựng demo: nhóm khách 18–30 tuổi; giá mẫu 199.000–699.000đ. Không coi đây là dữ liệu thị trường hay giá bán thật đã xác nhận.
- Giọng viết: gần gũi, ít khẩu hiệu, mô tả rõ phom/size/chất liệu khi có dữ liệu.
- Tiêu đề trang chủ: “Mặc theo cách mình.”
- Phụ đề: “Những lựa chọn unisex cho tủ đồ mỗi ngày.”
- Nút chính: “Khám phá sản phẩm”; checkout: “Đặt hàng”, “Chuyển khoản”.
- Không tự dựng đánh giá, số đơn đã bán, chứng nhận vải hoặc khan hiếm.

Các tên cân nhắc: “Nếp Mới” thiên về sự mới mẻ nhưng dễ liên tưởng thương hiệu khác; “NẾP” ngắn nhưng khó phân biệt; “NẾP FORM” làm rõ ngữ cảnh thời trang nên được chọn. Tra cứu sơ bộ thấy Nepform được dùng bởi một dịch vụ chăm sóc sức khỏe ở Pháp; chưa kiểm tra độc quyền nhãn hiệu/tên miền. Đây là tên làm việc cho bản thử nghiệm, không phải xác nhận pháp lý hay cam kết hiệu quả marketing.

## Thiết kế cụ thể

| Thành phần | Quyết định |
|---|---|
| Nền chính | Trắng ngà #F7F5F0, vùng sản phẩm trắng #FFFFFF |
| Chữ và đường viền | Đen #20201E, xám #696963, viền #DEDCD5 |
| Điểm nhấn | Olive trầm #566046, dùng tiết chế |
| Font | Be Vietnam Pro, tự lưu file font có giấy phép; test đủ dấu |
| Hình ảnh | Ảnh dọc 3:4, nền tương đối đồng nhất; hero một ảnh lớn |
| Khung nội dung | Tối đa khoảng 1280 px; khoảng cách nhất quán |
| Thẻ sản phẩm | Ảnh, tên, giá, màu; đường nét phẳng, bo nhẹ |
| Mobile | 2 cột sản phẩm, bộ lọc dạng panel, nút mua dễ chạm |
| Desktop | 4 cột sản phẩm, thanh tìm kiếm và danh mục rõ |
| Chuyển động | Nhẹ, ngắn; tôn trọng reduced-motion |
| Trợ năng | Focus rõ, label thực, bàn phím dùng được, tương phản WCAG AA |

Cụ thể hóa yêu cầu “đừng AI”: ưu tiên ảnh hàng và thông tin mua; tránh gradient tím/xanh, kính mờ, khối thẻ trang trí, chữ cực lớn chiếm cả màn hình, hiệu ứng lấn sản phẩm. Mỗi trang có trạng thái tải, rỗng, lỗi, hết hàng và thông báo thao tác bằng tiếng Việt.

## Trang và hành trình khách hàng

1. Trang chủ: hero, danh mục, sản phẩm mới, bộ sưu tập theo phối màu/phom.
2. Cửa hàng: tìm theo tên, lọc loại/size/màu/khoảng giá/còn hàng, sắp xếp, phân trang.
3. Chi tiết: ảnh thật, giá, chọn size và màu bắt buộc, tình trạng tồn, bảng size và mô tả.
4. Giỏ hàng: sửa số lượng/xóa; tổng tiền tạm tính; hàng hết hoặc đổi giá được báo rõ.
5. Đăng ký/đăng nhập/xác thực email/quên mật khẩu. Trở lại checkout sau đăng nhập.
6. Tài khoản: thông tin cá nhân, sổ địa chỉ, địa chỉ mặc định, đơn đã mua.
7. Checkout: người nhận, điện thoại, địa chỉ, ghi chú, phí ship, COD/SePay, tổng cuối.
8. Trang chuyển khoản: QR, ngân hàng/người nhận, số tiền, nội dung, hạn thanh toán, trạng thái.
9. Kết quả và chi tiết đơn: dòng thời gian đơn, thanh toán, giao hàng; không dùng URL kết quả làm bằng chứng đã trả tiền.
10. Trang liên hệ/chính sách giao hàng/đổi trả/quyền riêng tư: nội dung thật do chủ shop hoàn thiện trước mở bán, không bịa thời hạn cam kết.

## Địa chỉ

Mỗi account có nhiều địa chỉ, tối đa một mặc định. Checkout tự chọn mặc định, cho chọn địa chỉ khác hoặc nhập địa chỉ mới. Checkbox “Lưu địa chỉ này” và “Đặt làm mặc định” là lựa chọn riêng; thay địa chỉ cho đơn không âm thầm ghi đè sổ địa chỉ.

Lưu snapshot người nhận/điện thoại/địa chỉ trên đơn. Sửa hoặc xóa địa chỉ trong tài khoản về sau không thay đơn đã đặt. Dùng tỉnh/thành, phường/xã và địa chỉ chi tiết; không bắt buộc quận/huyện theo một bộ dữ liệu cũ. Nếu chưa có dữ liệu địa giới kiểm chứng thì cho nhập văn bản có validation, không chặn khách vì danh mục địa giới sai.

## Phạm vi admin

- Tổng quan: đơn mới, đơn cần xử lý, doanh thu tiền đã nhận, hàng sắp hết; số liệu tính từ dữ liệu thật.
- Sản phẩm/danh mục: tạo/sửa/ẩn, ảnh tải lên, size/màu/SKU/giá/tồn kho, sản phẩm mẫu/đang bán.
- Đơn: tìm/lọc/xem chi tiết, xác nhận, đóng gói, giao, hoàn tất, hủy; mã vận đơn nhập tay nếu có.
- Thanh toán: phân biệt COD/chuyển khoản, chờ/đã nhận/cần đối soát/hoàn tiền; ghi nhận COD khi đã thu.
- Khách: thông tin và lịch sử đơn trong phạm vi phục vụ bán hàng; không xem mật khẩu.
- Cấu hình: phí ship cố định, bật/tắt checkout hoặc chuyển khoản, thông tin shop/liên hệ.
- Nhật ký: người thao tác, hành động và thời gian; các điều chỉnh tồn và thanh toán có lý do.

## Hàng mẫu và ảnh

Dự kiến 24 sản phẩm mẫu: áo thun, sơ mi, hoodie/sweater, quần dài, quần short, áo khoác. Mỗi sản phẩm có 2–3 ảnh nếu tìm được ảnh cùng món; không ghép ảnh các món khác nhau để giả làm các góc chụp.

Ưu tiên Pexels/Unsplash với nguồn và giấy phép ghi trong manifest, không lấy watermark hay ảnh sản phẩm từ shop khác rồi nhận là hàng của NẾP FORM. Chọn ảnh trong giai đoạn triển khai; phiên này mới xác minh nguồn. Tên, giá và tồn mẫu được đánh dấu demo, chỉ dùng ở local/staging. Production chặn mua sản phẩm demo; admin nhập hàng thực tế để mở bán.

## Tiêu chí chấp nhận sản phẩm

Khách mới tìm được sản phẩm, chọn biến thể, đăng ký/đăng nhập, chọn hoặc đổi địa chỉ, đặt COD hoặc chuyển khoản, rồi nhìn thấy đơn của mình. Admin nhìn thấy đúng đơn và cập nhật được vòng đời giao hàng. Giao diện đồng bộ tiếng Việt trên điện thoại và máy tính; các lỗi thanh toán không gây mất đơn hoặc xác nhận nhầm.
