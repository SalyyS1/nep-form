from pathlib import Path
import json
import socket
import sys
import subprocess
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect
from regression_scenarios import verify_cart_and_price_conflicts

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://127.0.0.1:5173'
TEST_API = 'http://127.0.0.1:3002'

def run():
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1',3002)) == 0:
            raise RuntimeError('Port 3002 is already used; isolated browser tests refuse to reuse it')
    with tempfile.TemporaryDirectory(prefix='nep-form-browser-') as directory:
        database = str(Path(directory) / 'browser.sqlite')
        code = "import{startServer}from'./server/index.mjs';const s=await startServer({port:3002,dbPath:" + json.dumps(database) + "});process.on('SIGTERM',()=>s.close());"
        process = subprocess.Popen(['node', '--input-type=module', '-e', code], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        try:
            for _ in range(60):
                if process.poll() is not None:
                    raise RuntimeError(process.stderr.read().decode(errors='replace'))
                try:
                    urllib.request.urlopen(TEST_API + '/api/health', timeout=1).close()
                    break
                except OSError:
                    time.sleep(.2)
            else:
                raise RuntimeError('Isolated browser API did not start')
            with sync_playwright() as driver:
                browser = driver.chromium.launch(channel='msedge', headless=True)
                context = browser.new_context(viewport={'width':1440,'height':1000})
                def proxy(route):
                    path = route.request.url.split(BASE,1)[1]
                    response = route.fetch(url=TEST_API + path)
                    route.fulfill(response=response)
                context.route('**/api/**', proxy)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(BASE)
                expect(page.get_by_role('heading', name='Mặc một điều rất riêng.')).to_be_visible()
                expect(page.locator('.product-card')).to_have_count(4)
                page.goto(BASE + '/cua-hang')
                expect(page.locator('.product-card')).to_have_count(12)
                page.locator('.product-image').first.click()
                expect(page.locator('.product-detail-copy h1')).to_be_visible()
                page.get_by_role('button', name='M', exact=True).click()
                page.get_by_role('button', name='Thêm vào giỏ hàng', exact=True).click()
                page.goto(BASE + '/gio-hang')
                expect(page.locator('.cart-item')).to_have_count(1)
                page.get_by_role('link', name='Đăng nhập để đặt hàng').click()
                page.get_by_role('button', name='Khách mua hàng', exact=True).click()
                page.wait_for_url('**/thanh-toan')
                expect(page.locator('.checkout-item')).to_have_count(1)
                if page.get_by_label('Họ tên người nhận').is_visible():
                    page.get_by_label('Họ tên người nhận').fill('Khách kiểm thử local')
                    page.get_by_label('Số điện thoại', exact=True).fill('0900000000')
                    page.get_by_label('Tỉnh / Thành phố').fill('TP. Hồ Chí Minh')
                    page.get_by_label('Phường / Xã').fill('Phường thử nghiệm')
                    page.get_by_label('Địa chỉ chi tiết').fill('01 Đường trải nghiệm')
                page.get_by_role('button', name='Xác nhận đặt hàng').click()
                page.wait_for_url('**/don-hang/**')
                expect(page.get_by_role('heading', name='Cảm ơn bạn đã chọn Nếp.')).to_be_visible()
                expect(page.get_by_text('Chưa thu tiền', exact=True)).to_be_visible()
                order_url = page.url
                page.reload()
                expect(page.get_by_role('heading', name='Sản phẩm của bạn')).to_be_visible()
                page.goto(BASE + '/tai-khoan/dia-chi')
                expect(page.locator('.address-card')).to_have_count(1)
                page.get_by_role('button', name='Thêm địa chỉ', exact=True).click()
                dialog = page.get_by_role('dialog')
                dialog.get_by_label('Họ tên người nhận').fill('Người nhận khác')
                dialog.get_by_label('Số điện thoại', exact=True).fill('0900000001')
                dialog.get_by_label('Tỉnh / Thành phố').fill('Hà Nội')
                dialog.get_by_label('Phường / Xã').fill('Phường mới')
                dialog.get_by_label('Địa chỉ chi tiết').fill('02 Đường mới')
                dialog.get_by_role('button', name='Lưu địa chỉ', exact=True).click()
                expect(page.locator('.address-card')).to_have_count(2)
                page.goto(order_url)
                expect(page.get_by_text('01 Đường trải nghiệm', exact=False)).to_be_visible()
                page.goto(BASE + '/tai-khoan')
                page.get_by_role('button', name='Đăng xuất', exact=True).click()
                page.goto(BASE + '/dang-nhap?doi-tai-khoan=1')
                page.get_by_role('button', name='Quản trị cửa hàng', exact=True).click()
                page.wait_for_url('**/quan-tri')
                expect(page.get_by_role('heading', name='Một ngày mới, thật gọn.')).to_be_visible()
                page.goto(BASE + '/quan-tri/don-hang')
                expect(page.locator('.admin-orders-table tbody tr')).to_have_count(1)
                page.locator('.admin-orders-table .admin-text-button').first.click()
                admin_dialog = page.get_by_role('dialog')
                admin_dialog.get_by_label('Trạng thái đơn', exact=True).select_option('confirmed')
                admin_dialog.get_by_role('button', name='Lưu thay đổi', exact=True).click()
                expect(admin_dialog.get_by_text('Đã cập nhật đơn hàng.', exact=True)).to_be_visible()
                page.keyboard.press('Escape')
                page.goto(BASE + '/quan-tri/cai-dat')
                expect(page.get_by_role('heading', name='Cài đặt cửa hàng')).to_be_visible()
                page.get_by_role('spinbutton').fill('45000')
                page.get_by_role('button', name='Lưu cài đặt', exact=True).click()
                expect(page.get_by_text('Đã lưu cấu hình cửa hàng.', exact=True)).to_be_visible()
                page.goto(BASE + '/quan-tri/san-pham')
                expect(page.locator('.admin-product-table tbody tr')).to_have_count(26)
                page.locator('.admin-product-table .admin-text-button').first.click()
                editor = page.get_by_role('dialog')
                editor.get_by_label('Giá bán (đ)', exact=True).fill('259000')
                editor.get_by_role('button', name='Lưu thay đổi', exact=True).click()
                expect(page.get_by_role('dialog')).to_have_count(0)
                expect(page.locator('.admin-product-table tbody tr').first).to_contain_text('259.000')
                page.goto(BASE + '/dang-ky')
                page.get_by_label('Tên của bạn', exact=True).fill('Người dùng mới')
                page.get_by_label('Email', exact=True).fill('browser-test@nepform.local')
                page.get_by_label('Mật khẩu', exact=True).fill('LocalTest2026!')
                page.get_by_role('button', name='Tạo tài khoản', exact=True).click()
                page.wait_for_url('**/tai-khoan')
                page.goto(BASE + '/cua-hang')
                page.locator('.product-image').first.click()
                page.get_by_role('button', name='S', exact=True).click()
                page.get_by_role('button', name='Thêm vào giỏ hàng', exact=True).click()
                page.goto(BASE + '/thanh-toan')
                page.get_by_label('Họ tên người nhận').fill('Người dùng mới')
                page.get_by_label('Số điện thoại', exact=True).fill('0900000002')
                page.get_by_label('Tỉnh / Thành phố').fill('Đà Nẵng')
                page.get_by_label('Phường / Xã').fill('Phường trải nghiệm')
                page.get_by_label('Địa chỉ chi tiết').fill('03 Đường thử nghiệm')
                page.locator('input[value="bank"]').check()
                expect(page.locator('.checkout-summary')).to_contain_text('45.000')
                page.get_by_role('button', name='Xác nhận đặt hàng').click()
                page.wait_for_url('**/don-hang/**')
                expect(page.get_by_text('Chờ thanh toán', exact=True)).to_be_visible()
                expect(page.locator('.qr-placeholder')).to_contain_text('khi kết nối SePay')
                page.get_by_role('button', name='Hủy đơn hàng', exact=True).click()
                page.get_by_role('dialog').get_by_role('button', name='Xác nhận hủy', exact=True).click()
                expect(page.locator('.order-detail-heading')).to_contain_text('Đã hủy')
                page.goto(BASE + '/tai-khoan')
                page.get_by_role('button', name='Đăng xuất', exact=True).click()
                page.goto(BASE + '/dang-nhap')
                page.get_by_role('button', name='Quên mật khẩu?', exact=True).click()
                reset = page.get_by_role('dialog')
                reset.get_by_label('Email tài khoản').fill('browser-test@nepform.local')
                reset.get_by_role('button', name='Tạo liên kết đặt lại').click()
                reset.get_by_role('link', name='Mở liên kết đặt lại mật khẩu (local)').click()
                page.wait_for_url('**/dat-lai-mat-khau?token=*')
                page.get_by_label('Mật khẩu mới').fill('LocalChanged2026!')
                page.get_by_role('button', name='Lưu mật khẩu mới').click()
                page.wait_for_url('**/dang-nhap')
                page.get_by_label('Email', exact=True).fill('browser-test@nepform.local')
                page.get_by_label('Mật khẩu', exact=True).fill('LocalChanged2026!')
                page.get_by_role('button', name='Đăng nhập', exact=True).click()
                page.wait_for_url('**/tai-khoan')
                page.goto(BASE + '/dang-nhap?doi-tai-khoan=1')
                page.get_by_role('button', name='Quản trị cửa hàng', exact=True).click()
                page.wait_for_url('**/quan-tri')
                verify_cart_and_price_conflicts(driver, page, proxy, BASE, TEST_API)
                for width in [360,375,768,1440]:
                    page.set_viewport_size({'width':width,'height':1000})
                    for path in ['/', '/cua-hang', '/gio-hang', '/tai-khoan', '/quan-tri', '/quan-tri/san-pham', '/quan-tri/don-hang', '/quan-tri/cai-dat']:
                        page.goto(BASE + path)
                        if path.startswith('/quan-tri'):
                            expect(page.locator('.admin-page-title h1')).to_be_visible()
                        elif path == '/':
                            expect(page.locator('.custom-hero h1')).to_be_visible()
                        elif path == '/cua-hang':
                            expect(page.locator('.product-card')).to_have_count(12)
                        elif path == '/gio-hang':
                            expect(page.locator('.cart-page h1')).to_be_visible()
                        else:
                            expect(page.locator('.account-heading h1')).to_be_visible()
                        page.evaluate('document.fonts.ready')
                        page.wait_for_timeout(100)
                        metrics = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                        assert metrics['scroll'] <= width + 1, (width,path,metrics)
                        if path in ['/', '/quan-tri'] and width in [375,1440]:
                            target = ROOT / f'outputs/nep-form-{ "cua-hang" if path == "/" else "quan-tri" }-{width}.png'
                            page.screenshot(path=str(target),full_page=False)
                assert not errors, errors
                browser.close()
                print('PASS: guest cart -> login merge -> COD -> address snapshot -> admin order/product/settings; registration -> bank pending -> cancel -> local password reset; 4 fully-loaded viewport layouts; no runtime errors. Test DB isolated.')
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)

if __name__ == '__main__':
    run()
