# Nguồn và rà soát kế hoạch

Kiểm tra ngày 19/10/2026 theo Asia/Saigon. Các giới hạn dịch vụ có thể thay đổi; kiểm tra lại trước deploy.

## Nguồn chính

| Nội dung | Nguồn và kết luận dùng trong thiết kế |
|---|---|
| Cloudflare Free | [Pages limits](https://developers.cloudflare.com/pages/platform/limits/): 500 builds/tháng, 20.000 files, 25 MiB/file |
| Static hosting | [Pages routing](https://developers.cloudflare.com/pages/functions/routing/): static requests miễn phí; function requests có quota riêng |
| Supabase Free | [Pricing](https://supabase.com/pricing): 500 MB DB, 1 GB Storage, 5 GB egress và 5 GB cached, pause sau 1 tuần inactive; Free không có automatic backup |
| Email thực | [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp): default SMTP chỉ gửi địa chỉ team, không phù hợp production; custom SMTP là dependency thật |
| Google SMTP | [Supabase troubleshooting](https://supabase.com/docs/guides/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y): có cấu hình Google SMTP, vẫn cần kiểm tra tài khoản/port/deliverability |
| App Password | [Google Account Help](https://support.google.com/accounts/answer/185833): yêu cầu 2FA và không khả dụng cho mọi loại tài khoản |
| Edge auth | [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth): phân biệt user JWT, key dịch vụ, webhook bên ngoài |
| Webhook JWT config | [Function configuration](https://supabase.com/docs/guides/functions/function-configuration): tắt JWT riêng endpoint webhook, xác thực provider trong handler |
| SePay cấu hình | [Tạo webhook](https://developer.sepay.vn/vi/sepay-webhooks/tao-webhook): HTTPS production, tiền vào, chọn account, retry, cấu hình mã |
| SePay chữ ký | [Xác thực](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc): HMAC-SHA256, timestamp và raw body; window 5 phút trong ví dụ chính thức |
| SePay chống trùng | [Tích hợp webhook](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook): transaction ID và phản hồi success; app cần bảo đảm atomic riêng |
| SePay thử nghiệm | [Test Mode webhook](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/tao-webhook): môi trường kiểm thử trước live |
| QR | [Công cụ QR chính thức](https://qr.sepay.vn/qr-abbank.html): bank/account/amount/des; kiểm tra endpoint hiện hành cho ngân hàng được chọn khi triển khai |
| Chi phí thanh toán | [Bảng giá SePay](https://sepay.vn/bang-gia.html): Free 50 giao dịch/tháng; có tính phí vượt, không gọi là không giới hạn |
| Font Việt | [Be Vietnam Pro](https://github.com/bettergui/BeVietnamPro): thiết kế có xử lý dấu tiếng Việt; lưu giấy phép font khi đóng gói |
| Ảnh demo | [Pexels license](https://www.pexels.com/license/) và [Unsplash license](https://unsplash.com/license): nguồn ảnh được phép dùng theo điều kiện; chọn từng ảnh và lưu manifest ở phase 3 |
| Tên thương hiệu | [Nepform](https://www.nepform.com/): có tên cùng cách viết trong ngành chăm sóc sức khỏe tại Pháp; chưa xác minh nhãn hiệu/domain cho shop |

Không sao chép hướng dẫn thanh toán cũ bằng PHP/MySQL vào kiến trúc Supabase. Endpoint và kiểm tra chữ ký dùng đúng sản phẩm SePay Bank Webhooks; không nhầm với IPN của SePay Gateway.

## Bằng chứng workspace

- Thư mục dự án lúc đầu chỉ có work/ và outputs/, không có README.md hoặc source để tái sử dụng.
- Các rule được nhắc dưới .Codex/rules không tồn tại tại đường dẫn đó; đã đọc .claude/rules/development-rules.md và áp dụng hướng dẫn AGENTS do người dùng cung cấp.
- Đã đọc ak-brainstorm, ak-plan, ak-design, ak-copywriting và ak-journal; không tìm thấy skill tên chính xác ak-marketing trong catalog. Dùng các capability marketing/brand có sẵn cho yêu cầu đặt tên.
- Mọi file source trong phase là đường dẫn dự kiến tạo mới; chưa có implementation để kiểm tra API/hàm trong source.
- CLI ak plan đã scaffold trước khi điền nội dung; schema plan validate hợp lệ. Tên thư mục đã chuẩn hóa về ngày/giờ phiên Asia/Saigon.

## Validation Log — 7 câu hỏi đã trả lời

1. Một shop, một trang quản trị.
2. Unisex; giao người thực hiện đặt tên, áp dụng skill marketing.
3. Phong cách tối giản trắng/kem, chữ đen, ảnh lớn.
4. Bán thật, chưa cấu hình SePay.
5. Bắt buộc đăng nhập khi đặt hàng.
6. Admin đặt phí và cập nhật giao hàng thủ công.
7. Chưa có hạ tầng; ưu tiên miễn phí cho mở bán thử nghiệm.

Các quyết định này đã đưa vào brief, kiến trúc và cả sáu phase. Không cần lặp lại câu hỏi trước khi tạo ứng dụng local.

## Rà soát nội bộ theo bốn góc nhìn

Đây là tự rà soát kế hoạch, không phải báo cáo của reviewer độc lập và không phải kiểm thử ứng dụng.

| Góc nhìn | Phát hiện / quyết định đưa vào plan |
|---|---|
| Giả định | Hosting Free không đồng nghĩa không giới hạn; tách phí SePay/email/backup, có quota và pause |
| Bảo mật | Không tin UI role hoặc publishable key là user; backend/RLS/RPC kiểm tra quyền, secret không vào VITE_* |
| Lỗi vận hành | Webhook retry/timeout/expiry/cancel và hai người mua món cuối dùng transaction/unique/lock |
| Phạm vi | Đủ tính năng người dùng yêu cầu; không tự thêm marketplace, vận chuyển API, voucher, đánh giá hoặc app |

## Whole-plan consistency sweep

- Một stack: React/Vite + Supabase + Pages, không còn server Next.js/VPS được coi là phương án triển khai chính.
- Một hợp đồng thanh toán: Bank Webhooks HMAC; production và test tách; không dùng client callback xác nhận tiền.
- Stock: reservation → allocation đúng một lần; hủy/hoàn hàng theo trạng thái vật lý, COD tiền riêng trạng thái giao.
- Address: sổ địa chỉ riêng và order snapshot; thay default không làm đổi đơn cũ.
- Email: custom SMTP được nêu trong kiến trúc, phase auth và launch gate.
- Free: không cam kết 0đ khi vượt quota; không tự nâng gói.
- Demo: có nguồn ảnh/seed thật cho trình diễn, chặn nhận đơn thật cho sản phẩm demo.
- Các lệnh npm là scripts sẽ tạo và chạy khi triển khai; chưa có kết quả test code.

Kiểm chứng artifact đã thực thi: 10 tài liệu, 6 phase, 28 công việc triển khai chưa làm; không còn template rỗng hoặc liên kết nội bộ hỏng. CLI validate pass. Bản HTML đã mở bằng Edge headless ở 360/390/768/1440 px: không tràn ngang, không lỗi JavaScript; menu 10 mục và 6 phase mở rộng hoạt động. Trình duyệt kiểm tra đã đóng.

## Giả định được chọn để tiến hành

Thương hiệu NẾP FORM; 24 sản phẩm demo; khách demo 18–30; giá mẫu 199.000–699.000đ; chuyển khoản giữ hàng 15 phút; COD chờ admin tối đa 24 giờ; phí ship cấu hình cố định. Đây là default đề xuất, có thể thay trước mở bán và không phải dữ liệu thị trường hay quyết định người dùng đã trả lời riêng.

## Phụ thuộc trước mở bán

- Tài khoản shop trên Cloudflare/Supabase/SePay; ngân hàng nhận hỗ trợ và secret nhập trực tiếp vào dịch vụ.
- Hộp thư shop có SMTP dùng được và email thực tới khách ngoài team.
- Hàng thật, giá/tồn/phí ship, liên hệ/chính sách thật và admin đầu tiên.
- Kiểm tra khả dụng subdomain và rà tên thương hiệu trước khi đầu tư dài hạn.
- Xác minh giới hạn SePay ở tài khoản thực; một live smoke test do chủ shop thực hiện.

Các mục này không ngăn hoàn thành plan. Chưa có câu hỏi sản phẩm bắt buộc nào còn chờ người dùng ở bước này.
