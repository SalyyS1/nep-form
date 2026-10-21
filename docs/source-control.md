# Source GitHub riêng tư

Repository: [SalyyS1/nep-form](https://github.com/SalyyS1/nep-form), nhánh `main`. Chỉ cấp quyền cho người cần làm dự án; giữ chế độ Private.

Source gồm frontend, backend, schema SQL, catalog demo, ảnh/phông kèm giấy phép, scripts, test và tài liệu. Cài Node24.12+ thuộc nhánh24, chạy `npm ci`, rồi `npm run dev` để xem local. Xem [setup guide](setup-guide.md) và [deployment guide](deployment-guide.md) cho cấu hình thực tế.

`.env.example` chỉ là mẫu, không chứa khóa. `.env`, thư mục `work/`, database, backup, khóa riêng, ảnh chụp trong `outputs/`, `node_modules/` và bản build `dist/` không đưa lên Git. Dữ liệu khách/đơn/chat tiếp tục ở database riêng; repo không phải bản sao lưu dữ liệu bán hàng.

Trước mỗi lần push, kiểm tra `git diff --cached`, chạy kiểm tra phù hợp và quét secret trên phần được commit. Không dùng `git add -f` cho file bị bỏ qua. Không đưa token vào URL remote hoặc log; dùng GitHub CLI/credential manager đã đăng nhập. Khóa cấu hình được giữ riêng trên máy/VPS theo deployment guide.

GitHub lưu source; một lần push không tự triển khai lên VPS. Lịch sử repo bắt đầu từ lần nhập source hiện tại, không chứa lịch sử thao tác hoặc file vận hành riêng trước đó.
