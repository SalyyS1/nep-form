# Triển khai NẾP FORM

## VPS đang sử dụng

Đích triển khai do chủ shop chọn: VPS `103.74.100.46`, website [nepform.salyyy.tech](https://nepform.salyyy.tech); Supabase tiếp tục giữ PostgreSQL. Render bên dưới là phương án thay thế. VPS đã có website khác, vì vậy chỉ quản lý service `nep-form` và vhost của shop; không thay Node hệ thống hay cấu hình chung của Nginx.

Để kiểm tra/chẩn đoán, SSH vào đúng VPS bằng quyền quản trị do chủ máy cung cấp. Thông tin truy cập giữ riêng trong máy hoặc kho mật khẩu của chủ shop; không lưu trong source/docs. Shop chạy dưới tài khoản hệ thống riêng, bản chạy tại `/opt/nep-form/current`; dùng `readlink -f /opt/nep-form/current` để tìm release thực tế. Cấu hình service được sở hữu bởi [systemd unit](../deploy/vps/nep-form.service); environment riêng tại `/etc/nep-form/app.env`, certificate Supabase tại `/etc/nep-form/supabase-ca.crt`. Không dùng lệnh dump environment khi chia sẻ log. Mật khẩu admin ban đầu chỉ có trong `.env` riêng trên máy của chủ shop, không được chuyển sang environment của VPS.

Tuyến truy cập: HTTPS tên miền → Nginx → backend loopback. [Cấu hình HTTPS](../deploy/vps/nepform-https.conf) và [cấu hình chờ chứng chỉ](../deploy/vps/nepform-http.conf) là các file sở hữu tuyến này. Backend dùng `HOST`/`PORT` từ environment; không mở cổng backend ra Internet.

DNS thuộc bảng quản lý của `salyyy.tech`: tạo A record tên `nepform`, giá trị IP VPS nêu trên; không thêm AAAA sai đích. Khi chưa có DNS/HTTPS, trang HTTP chỉ hiện thông báo chờ, không nhận đăng nhập. Kiểm tra DNS bằng `getent ahostsv4 nepform.salyyy.tech` trên VPS. Sau khi DNS công cộng trỏ đúng, chạy `bash /opt/nep-form/current/deploy/vps/enable-https.sh` bằng quyền quản trị; [script HTTPS](../deploy/vps/enable-https.sh) sở hữu việc cấp/gia hạn certificate và chỉ reload Nginx sau kiểm tra cấu hình. Nếu không xác minh được tên miền, dừng ở bước này và kiểm tra lại DNS; không tắt TLS để đưa đăng nhập lên HTTP.

Kiểm tra vận hành:

```sh
systemctl is-active nep-form nginx
curl --fail https://nepform.salyyy.tech/api/health
systemctl is-enabled certbot.timer
journalctl -u nep-form --since '15 minutes ago' -n 80 --no-pager
tail -n 50 /var/log/nginx/nep-form-error.log
```

Chỉ đọc log của shop trong cửa sổ cần chẩn đoán; che dữ liệu khách trước khi gửi ra ngoài. Health phải báo production, sau đó kiểm tra trang `/thiet-ke`, đăng nhập và `/quan-tri`; upload/build thành công chưa đủ để xác nhận website đã online.

Cập nhật code: build frontend trên máy phát triển để giảm tải VPS; chỉ chuyển artifact cần chạy, cài dependencies production cho Linux bằng Node24 riêng, tạo release mới dưới `/opt/nep-form/releases/`. Giữ environment ngoài release và không chuyển `.env`, database local hay backup vào archive source. Chạy kiểm tra DB, đổi symlink `current`, restart riêng `nep-form` rồi kiểm tra health. Giữ release trước đến khi kiểm tra xong. Theo dõi `df -h /`: VPS còn ít dung lượng; không tự dọn dữ liệu của ứng dụng khác.

Rollback code dùng release trước đã xác minh: đổi `current` về release đó và restart riêng service. Lần triển khai đầu chưa có release trước; để rút triển khai, stop riêng `nep-form`, bỏ liên kết vhost `nepform.salyyy.tech` rồi kiểm tra/reload Nginx. Không khôi phục DB cũ để rollback giao diện. Sao lưu Supabase theo phần bên dưới trước thay đổi schema/dữ liệu; cấu hình Nginx của shop trước bật HTTPS được giữ trong `/opt/nep-form/backups/`.

Kết quả triển khai, HTTPS và kiểm tra trình duyệt thực tế được ghi ở [báo cáo VPS](../plans/reports/deployment-261020-1840-vps.md).

## Chọn hạ tầng

Nếu không sử dụng VPS, phương án miễn phí cho bản mở bán thử là **Render Free chạy website + Node API, Supabase Free lưu PostgreSQL**. Frontend và API chung một tên miền để giữ cookie đăng nhập và đường dẫn `/api` hiện tại. Không cần mua tên miền; dùng địa chỉ `onrender.com` của dịch vụ.

Backend có xử lý ảnh/phông bằng Node; vì vậy bản này giữ runtime hiện có, không chuyển sang Supabase Edge Functions. Supabase được dùng làm PostgreSQL riêng; tài khoản cửa hàng vẫn do backend hiện tại quản lý, không phải Supabase Auth. Cloudflare Pages chỉ phù hợp nếu tách frontend và cấu hình thêm tuyến API.

| Dịch vụ | Vai trò / giới hạn đáng chú ý |
|---|---|
| [Render Free](https://render.com/docs/free) | Website/API; ngủ sau15 phút không hoạt động, lần mở lại có thể đợi khoảng1 phút. Filesystem không bền, không đặt SQLite hay file khách tải lên ở đây.750 giờ miễn phí/workspace/tháng. |
| [Supabase Free](https://supabase.com/pricing) | PostgreSQL500 MB; có thể pause sau1 tuần ít hoạt động. Không có backup tự động ở gói Free. |
| [Neon Free](https://neon.com/pricing) | Có thể thay Supabase vì app dùng PostgreSQL chuẩn; kiểm tra quota hiện hành khi tạo project. Cấu hình qua cùng DATABASE_URL. |

Các giới hạn miễn phí có thể thay đổi; kiểm tra Dashboard trước khi chọn gói. Phương án này phù hợp chạy thử, không bảo đảm luôn phản hồi ngay. Không chọn Render Free Postgres làm DB lâu dài: [database miễn phí của Render hết hạn sau30 ngày](https://render.com/docs/free).

Ảnh/font tĩnh demo nằm trong bản build. Ảnh/phông khách tải trong thiết kế hiện được lưu cùng bản thiết kế riêng trong PostgreSQL; chúng tính vào quota database, chưa sử dụng Supabase Storage. Theo dõi dung lượng khi có nhiều thiết kế ảnh lớn.

## Tạo database Supabase

1. Đăng ký/đăng nhập [Supabase](https://supabase.com/dashboard), tạo organization/project thuộc **Free**; chọn Singapore nếu có. Tự đặt mật khẩu database và lưu riêng.
2. Vào project → **Connect → Session pooler**. Lấy URI PostgreSQL theo hướng dẫn [kết nối Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres). Session pooler phù hợp backend Node chạy lâu và mạng IPv4; lấy đúng host/user/port từ Dashboard, không tự đoán.
3. Thay phần mật khẩu bằng mật khẩu database đã percent-encode các ký tự đặc biệt. URI này là **DATABASE_URL**, chỉ nhập vào `.env` riêng trên máy hoặc Environment của Render. Không đưa vào `VITE_*`, GitHub hay chat.
4. Pooler Supabase đã kiểm tra cần root CA riêng. Tải certificate từ Dashboard → Database Settings → SSL Configuration → Download certificate, hoặc [nguồn certificate chính thức](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). Đặt đường dẫn file bằng `PG_CA_FILE`; không tắt kiểm tra certificate để bỏ qua lỗi. Cấu hình tải certificate của Dashboard nằm trong [source Supabase](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json).

Máy hiện tại đã lưu CA trong `work/certificates/supabase-prod-ca-2021.crt` và cấu hình `.env` riêng. Bản certificate công khai để mang sang hosting nằm ở `outputs/supabase-prod-ca-2021.crt`; đây không phải khóa bí mật. Khi lên Render, thêm certificate bằng Secret File và đặt `PG_CA_FILE` bằng đường dẫn Render hiển thị, hoặc đưa bản certificate công khai vào repo rồi đặt `PG_CA_FILE=outputs/supabase-prod-ca-2021.crt`. Không dùng đường dẫn `work/` trên Render vì thư mục này được loại khỏi Git.

Schema được sở hữu bởi [migration SQL](../database/migrations/001-store.sql); thao tác khởi tạo nằm trong [database CLI](../scripts/database-cli.mjs). Có thể xem SQL trước khi thực hiện; không có DROP/reset database.

Schema `nep_store` là riêng cho backend. Không thêm schema này vào Exposed Schemas của Supabase Data API, không cấp quyền cho `anon`/`authenticated`; trình duyệt chỉ đi qua API của shop. Dùng đúng project shop cho database, không trỏ vào project chứa dữ liệu khác.

## Khởi tạo từ máy của bạn

Trong thư mục dự án, sao chép `.env.example` thành `.env` và tự điền các giá trị riêng. `.env` đã được loại khỏi Git. Danh sách biến và ý nghĩa nằm trong [.env.example](../.env.example).

Đặt `DATABASE_URL`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (ít nhất12 ký tự, tự đặt mới), và nếu cần `SHOP_CONTACT_EMAIL`. `APP_ORIGIN` sẽ là địa chỉ HTTPS thực tế của website khi deploy.

```powershell
npm install
npm run db:init
npm run db:check
```

`db:init` dùng SQL và catalog đã đóng gói; tạo tài khoản chủ shop do bạn cung cấp. Chạy lại giữ dữ liệu và mật khẩu hiện tại. Sau khi tạo admin thành công có thể xóa các biến `BOOTSTRAP_ADMIN_*`; lần khởi động tiếp không cần chúng khi đã có admin. Không mang tài khoản demo local sang DB online.

Database SQLite đang dùng để xem local không bị chuyển/xóa tự động. Chạy `npm run dev` vẫn dùng dữ liệu local nếu bạn không đặt `DATABASE_URL` trong môi trường shell; các lệnh cloud đọc `.env` riêng. Chưa có bước tự động nhập tài khoản/đơn local vào cloud.

Trong Supabase SQL Editor có thể kiểm tra số bản ghi mà không xuất dữ liệu riêng:

```sql
select kind, count(*) from nep_store.records group by kind order by kind;
select version, applied_at from nep_store.migrations order by version;
```

## Đưa website lên Render

1. Tạo repository GitHub riêng tư chứa source dự án. Giữ `.gitignore`; không tải `.env`, `work/`, backup hoặc file database lên repo. Không chỉ tải thư mục `dist`: backend cần source `server/`, `shared/`, `data/` và assets.
2. Đăng nhập [Render Dashboard](https://dashboard.render.com), kết nối đúng repo/branch. Có thể tạo **Blueprint** từ [render.yaml](../render.yaml), hoặc tạo **Web Service → Node → Free**, region Singapore.
3. Cấu hình build/start/health/env được sở hữu bởi `render.yaml`. Với cách tạo Web Service thủ công, dùng Build `npm ci --include=dev && npm run build`, Start `npm run db:init && npm start`, Health `/api/health`, Node24.
4. Trong **Environment**, đặt `NODE_ENV=production`, `DATABASE_URL`, `PG_CA_FILE` theo bước certificate ở trên, và `APP_ORIGIN` bằng URL HTTPS mà Render cấp (không có đường dẫn). Nếu database chưa có admin, thêm các biến bootstrap riêng. Không đặt PORT cố định: app nhận PORT do Render cấp.
5. Nếu chưa biết URL lúc điền Environment, lấy URL ở màn hình dịch vụ sau khi tạo, sửa `APP_ORIGIN` rồi deploy lại. Dịch vụ chủ động báo lỗi khi thiếu cấu hình; không tự dùng DB local.
6. Chờ deploy hoàn tất. Mở `/api/health`, kết quả phải có `ok:true`, `mode:production`. Vào `/dang-nhap` đăng nhập bằng admin tự đặt; giao diện hosted không có nút tài khoản demo.
7. Kiểm tra `/quan-tri`, `/thiet-ke`, đặt một đơn COD thử với tài khoản khách riêng, gửi chat và trả lời từ admin. Refresh URL con để kiểm tra SPA. Kiểm tra Console/Network; không đánh dấu deploy thành công nếu chỉ build thành công.

Source of truth cho URL/revision/log: Render → đúng Web Service → Events/Logs. Quyền cần: chủ project Render và quyền đọc repo được kết nối. Khi đổi domain, cập nhật APP_ORIGIN tương ứng trước khi kiểm tra login/checkout. Không dùng tài khoản/project mặc định khác khi thiếu quyền.

## Sao lưu và khôi phục

Dùng cùng DATABASE_URL trong `.env` riêng trên máy; trước khi thay schema/dữ liệu hàng loạt hoặc khi đã có đơn, chạy `npm run db:backup`. Công cụ sao lưu dữ liệu của schema `nep_store`, không phải dump toàn bộ project Supabase; ghi file riêng dưới `work/backups/`, không in nội dung dữ liệu/khóa kết nối ra màn hình. Bản sao có thông tin khách và hash mật khẩu: giữ trong nơi lưu riêng, không gửi Git/chat. Bản sao trên filesystem Render không bền; tải/chạy backup từ máy riêng trước khi thao tác.

Khôi phục vào project/database trống, không ghi đè shop đang có đơn: đổi DATABASE_URL sang **đích khôi phục**, rồi chạy `npm run db:restore -- DUONG_DAN_FILE_BACKUP.json`, sau đó `npm run db:check`. Công cụ từ chối đích có dữ liệu. Giữ source cũ và DB nguồn cho tới khi kiểm tra được số bản ghi, đăng nhập, đơn và thiết kế ở đích mới.

Rollback code: Render → Events → phiên bản trước → rollback/manual deploy, rồi kiểm tra health và đơn mới nhất. Không restore DB cũ đè DB hiện tại để rollback giao diện: có thể mất đơn vừa tạo. Nếu lỗi nghiêm trọng, tạm tắt nhận đơn trong admin trong khi sửa.

## Phạm vi đã chuẩn bị

SQL/runtime/config được kiểm tra với PostgreSQL engine nhúng PGlite và browser HTTPS cục bộ; kết nối thực tế Supabase, tài khoản admin và catalog đã được xác minh. Trạng thái website trên VPS và các kiểm tra công khai nằm trong báo cáo VPS được liên kết ở trên. SQLite local giữ nguyên. Các test/command nằm trong [package.json](../package.json): `test:postgres` và `test:hosted`; test HTTPS cần Python Playwright và cryptography.

SePay chưa cấu hình nên chuyển khoản vẫn tắt; COD dùng được. Email giao dịch dùng Resend theo cấu hình bên dưới; không dùng SMTP của Supabase cho auth Node.

Kiến trúc khóa ghi hiện ưu tiên tính đúng cho một shop nhỏ; khi mở rộng nhiều đơn đồng thời, cần chuyển sang bảng nghiệp vụ và khóa theo biến thể thay vì tăng số instance tùy ý. Chủ sở hữu implementation: [Postgres store](../server/postgres-store.mjs), [schema](../database/migrations/001-store.sql), [runtime](../server/runtime-config.mjs), [maintenance](../server/postgres-maintenance.mjs).


## Email tên miền và ảnh sản phẩm

Dịch vụ gửi mail đã chọn là Resend, domain `salyyy.tech`, người gửi `NẾP FORM <hello@salyyy.tech>`. Đăng nhập đúng tài khoản Resend do chủ shop quản lý → Domains → domain này để kiểm tra SPF/DKIM gửi thư; không cần bật Receiving để gửi thư giao dịch. Resend không tự tạo một hộp thư đọc mail cho địa chỉ người gửi. Khóa có quyền gửi được giữ riêng trong `.env` trên máy và `/etc/nep-form/app.env` trên VPS; không chép khóa vào source, VITE_* hay log.

Các biến cấu hình được sở hữu bởi [.env.example](../.env.example) và [email service](../server/email-service.mjs). `MAIL_QUEUE_KEY` là khóa ngẫu nhiên riêng cho thư đang chờ, tối thiểu32 ký tự; giữ nguyên khi đổi `RESEND_API_KEY`. Mất/đổi nhầm queue key khiến thư cũ không giải mã được và chuyển sang lỗi `PAYLOAD_UNREADABLE`; không khôi phục toàn database để chữa lỗi gửi thư. Giữ bản sao khóa riêng, đối chiếu cấu hình rồi yêu cầu lại thư xác minh/đặt mật khẩu nếu cần. Không tắt gửi mail để lách điều kiện xác minh checkout.

Để kiểm tra: admin → Cài đặt → Email của cửa hàng cho biết kết nối và số thư chờ/lỗi/dịch vụ đã nhận. Khi cần chẩn đoán một thư cụ thể, dùng Resend → Emails → tìm đúng thời gian/người nhận và xem sự kiện accepted/delivered/bounced; không đưa toàn bộ hộp thư hay địa chỉ khách vào báo cáo. Website chỉ biết provider đã nhận yêu cầu, chưa có webhook xác nhận delivered. Chưa nhận thư thì kiểm tra cả mục thư rác và trạng thái DNS/quota Resend. [Hướng dẫn domain](https://resend.com/docs/dashboard/domains/introduction) và [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys) là nguồn của nhà cung cấp.

Bật/tắt cấu hình qua environment riêng và restart riêng `nep-form` bằng quyền quản trị VPS; xác nhận `/api/bootstrap` có email.configured/verificationRequired đúng và thử luồng tài khoản. Không gửi mail thử tới khách ngoài phạm vi được chủ shop chỉ định. Dịch vụ này chỉ gửi xác minh/đổi mật khẩu/xác nhận và cập nhật đơn, không có đăng ký quảng cáo. Nginx của shop ghi access log theo `$uri`, bỏ query token; các trang token dùng no-referrer.

Ảnh admin tải lên lưu cùng SQL, không nằm trên filesystem release; rollback code không làm mất ảnh. Ảnh sản phẩm công khai, thiết kế khách vẫn có quyền truy cập riêng. Theo dõi dung lượng Supabase khi tải nhiều ảnh. [Media API](../server/product-media.mjs) sở hữu giới hạn ảnh; [picker](../src/features/admin/product-image-picker.tsx) cho tải file/link/Pinterest và đặt ảnh bìa. Chưa có thao tác xóa vĩnh viễn file rời: gỡ ảnh khỏi sản phẩm không xóa ảnh của đơn cũ.

Bản cập nhật được xác minh ở [báo cáo hoàn thiện cửa hàng](../plans/reports/implementation-261020-1858-store-polish.md).


## Vận hành giảm giá

Website có hai chỗ cấu hình: **Quản trị → Sản phẩm → Chỉnh sửa → Giá SALE** và [**Quản trị → Khuyến mãi**](https://nepform.salyyy.tech/quan-tri/khuyen-mai). Ngày giờ nhập theo Việt Nam. Hướng dẫn sử dụng và cách cộng sale/mã nằm trong [setup-guide.md](setup-guide.md#giá-sale-và-mã-giảm-giá); hợp đồng và kiểm thử ở [local-api-contract.md](local-api-contract.md#product-sales-and-checkout-coupons).

Ưu đãi và lượt dùng lưu trong PostgreSQL hiện tại, dùng cùng backup/restore; không cần chạy SQL thủ công hay thêm schema khi cập nhật tính năng. Không khởi tạo sẵn mã hoặc sửa giá đang bán. Đơn đã đặt giữ giá/ưu đãi lúc chốt; tắt mã chỉ ngừng áp dụng cho lần đặt tiếp theo. Hủy đơn hoàn lượt dùng một lần, không tự hoàn tiền ngân hàng.

Kết quả bản cập nhật và release/rollback được ghi trong [báo cáo giảm giá](../plans/reports/implementation-261020-2223-discounts.md). Giữ cấu hình email/database hiện tại khi deploy; không thay queue key. Không rollback về code cũ không biết sale/coupon trong khi ưu đãi còn bật: tạm dừng nhận đơn trước, sửa tiến thay vì để giá và tổng hiển thị khác nhau. Không restore DB cũ để rollback code.


Bản sửa nhận diện phiên giữa các tab được xác minh ở [báo cáo phiên đăng nhập](../plans/reports/implementation-261020-2255-session-navigation.md); hướng dẫn chuyển tài khoản nằm trong [setup guide](setup-guide.md#giữ-phiên-giữa-các-tab).


Mã đơn đầu/combo và thiết lập một lượt dùng được xác minh ở [báo cáo điều kiện khuyến mãi](../plans/reports/implementation-261020-2320-coupon-eligibility.md). Nếu rollback về code chưa hỗ trợ các điều kiện này, tạm dừng checkout hoặc tắt mã liên quan trước; code cũ có thể giảm tiền mà bỏ qua điều kiện mới. Giữ database hiện tại.

Danh sách mã tại thanh toán được xác minh ở [báo cáo chọn mã](../plans/reports/implementation-261020-2350-voucher-picker.md). Admin phải bật **Hiện tại thanh toán** cho từng mã muốn công khai; bản cập nhật giữ mã cũ ở chế độ nhập tay. Rollback về bản điều kiện khuyến mãi trước đó chỉ bỏ danh sách/gợi ý, vẫn giữ chính sách mã hiện có và database.

## Vận hành bảo mật

Bản vá, kiểm chứng và các rủi ro còn cần chủ máy xử lý được ghi trong [báo cáo bảo mật21/10](../plans/reports/implementation-261021-0446-security-polish.md).

Dải font/hai mặt áo tự đổi mẫu và chat tại popup được kiểm chứng ở [báo cáo giao diện21/10](../plans/reports/implementation-261021-0535-frontend-refinement.md). Luồng popup dùng API/quyền tài khoản hiện có, không đổi khóa hoặc chính sách truy cập. Kiểm tra lại trang chủ và popup sau deploy bên cạnh health/admin.

Bản sửa tiếp theo bỏ tự dừng khi rê chuột, chuyển mẫu mỗi3,8 giây và đặt tiêu đề/cặp áo cùng hàng ở desktop. Release, rollback và kiểm tra thực tế giữ chuột trên khối nằm trong [báo cáo showcase tự chạy](../plans/reports/implementation-261021-0607-autoplay-showcase.md). Theo yêu cầu tiếp theo của chủ shop, hai phần tự chạy cả khi bật reduced-motion; không cần nút bật. Bản cập nhật và kiểm tra được ghi tại [báo cáo tự chạy mặc định](../plans/reports/implementation-261021-1306-auto-default.md).

Chính sách trình duyệt do [security headers](../server/security-headers.mjs) sở hữu; production chặn nhúng trang và script không được phép, giữ khả năng hiển thị ảnh/phông của Studio. Kiểm tra cả đăng nhập, thiết kế và chat sau khi thay CSP; không nới `script-src` để bỏ qua lỗi. [Kiểm thử HTTPS](../tests/browser/hosted-postgres.spec.py) xác minh app/font hoạt động và script inline bị chặn. Giới hạn lưu thiết kế/giỏ/địa chỉ nằm trong [hợp đồng API](local-api-contract.md#security-boundaries-and-resource-limits), không cần SQL DDL.

Đợt rà soát21/10/2026 thấy các container dự án khác publish PostgreSQL5432/Redis6379 trên mọi địa chỉ, UFW inactive và DOCKER-USER chưa có quy tắc. Shop dùng Supabase và không cần các cổng này. Chủ máy đã chọn **“Giữ nguyên, chỉ vá website NẾP FORM”**: giữ nguyên các container/cổng đó và firewall chung; không coi chúng là hạng mục đang chờ thực hiện của shop. Nếu sau này chủ máy yêu cầu thay đổi riêng, cần xác định phụ thuộc và nhu cầu truy cập trước. Không chỉ bật UFW rồi coi Docker đã được bảo vệ: [Docker xử lý cổng publish trước UFW](https://docs.docker.com/engine/network/packet-filtering-firewalls/).

SSH hiện cho root đăng nhập mật khẩu. Thông tin đăng nhập/API/database từng chia sẻ trong trao đổi nên được thay qua dashboard/kho cấu hình riêng; không gửi khóa mới qua chat. Khi thay khóa Resend giữ nguyên MAIL_QUEUE_KEY; khi thay mật khẩu SQL cập nhật đồng bộ cấu hình riêng và kiểm tra kết nối trước khi restart shop. Với SSH, kiểm tra khóa mới trong phiên thứ hai trước khi tắt cách truy cập cũ để tránh tự khóa máy. Không đưa token/URI/mật khẩu vào báo cáo.
