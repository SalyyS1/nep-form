from pathlib import Path
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:5173'
API = 'http://127.0.0.1:3013'
SHOTS = ROOT / 'work' / 'discount-browser'
CODE = 'BROWSER15'


def no_page_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Page overflows horizontally'


def screenshot(page, name):
    page.evaluate('window.scrollTo(0, 0)')
    page.screenshot(path=str(SHOTS / name), full_page=True, animations='disabled')


def login(context, email):
    response = context.request.post(API + '/api/auth/login', data={'email': email, 'password': 'Nepform@2026!'})
    assert response.status == 200


def run_browser(driver):
    browser = driver.chromium.launch(channel='msedge', headless=True)
    errors = []
    try:
        def new_context():
            context = browser.new_context(viewport={'width': 1440, 'height': 1000})
            def proxy(route):
                response = route.fetch(url=API + route.request.url.split(BASE, 1)[1])
                route.fulfill(response=response)
            context.route('**/api/**', proxy)
            return context

        admin = new_context()
        login(admin, 'admin@nepform.local')
        page = admin.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '/quan-tri/san-pham')
        page.get_by_role('button', name='Sửa Áo kiểm thử khuyến mãi', exact=True).click()
        editor = page.get_by_role('dialog', name='Chỉnh sửa sản phẩm', exact=True)
        editor.get_by_label('Giá SALE (đ)').fill('200000')
        editor.get_by_role('button', name='Lưu thay đổi', exact=True).click()
        expect(editor).not_to_be_visible()
        persisted = admin.request.get(API + '/api/admin').json()['products'][0]
        assert persisted['price'] == 250000 and persisted['salePrice'] == 200000
        page.goto(BASE + '/quan-tri/khuyen-mai')
        page.get_by_role('button', name='Tạo mã giảm giá', exact=True).click()
        editor = page.get_by_role('dialog', name='Tạo mã giảm giá', exact=True)
        editor.get_by_label('Mã giảm giá').fill(CODE.lower())
        editor.get_by_label('Tên chương trình', exact=True).fill('Ưu đãi trình duyệt')
        editor.get_by_label('Phần trăm giảm (%)', exact=True).fill('15')
        editor.get_by_label('Tiền hàng tối thiểu (đ)').fill('150000')
        editor.get_by_label('Giảm tối đa (đ)').fill('20000')
        editor.get_by_label('Tổng lượt sử dụng').fill('10')
        editor.get_by_label('Lượt dùng mỗi khách').fill('3')
        editor.get_by_role('button', name='Tạo mã giảm giá', exact=True).click()
        expect(editor).not_to_be_visible()
        expect(page.get_by_role('button', name=CODE, exact=True)).to_be_visible()
        promotion = admin.request.get(API + '/api/admin/promotions').json()['promotions'][0]
        assert [promotion['code'], promotion['value'], promotion['maxDiscount'], promotion['minSubtotal']] == [CODE, 15, 20000, 150000]
        SHOTS.mkdir(parents=True, exist_ok=True)
        screenshot(page, 'admin-promotions-desktop.png')
        page.set_viewport_size({'width': 390, 'height': 844})
        no_page_overflow(page)
        page.get_by_role('button', name='Sửa mã ' + CODE, exact=True).click()
        editor = page.get_by_role('dialog', name='Chỉnh sửa ' + CODE, exact=True)
        expect(editor.get_by_label('Hình thức giảm')).to_be_visible()
        editor.get_by_label('Hình thức giảm').select_option('fixed')
        expect(editor.get_by_label('Số tiền giảm (đ)', exact=True)).to_be_visible()
        assert editor.evaluate('(element) => element.scrollWidth <= element.clientWidth + 1'), 'Mobile coupon editor overflows'
        screenshot(page, 'admin-promotion-mobile.png')
        editor.get_by_role('button', name='Đóng cửa sổ', exact=True).click()

        customer = new_context()
        login(customer, 'khach@nepform.local')
        page = customer.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '/san-pham/ao-kiem-thu-khuyen-mai')
        expect(page.get_by_label('Giá ưu đãi', exact=True)).to_contain_text('200.000')
        expect(page.locator('del[aria-label="Giá gốc"]')).to_contain_text('250.000')
        page.get_by_role('button', name='M', exact=True).click()
        page.get_by_role('button', name='Thêm vào giỏ hàng', exact=True).click()
        expect(page.get_by_role('button', name='Đã thêm vào giỏ', exact=True)).to_be_visible()
        page.goto(BASE + '/thanh-toan')
        submit = page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)
        expect(submit).to_be_enabled()
        summary = page.locator('.checkout-summary')
        expect(summary.locator('.summary-total strong')).to_contain_text('230.000')
        coupon = page.get_by_role('region', name='Mã giảm giá', exact=True)
        coupon.get_by_placeholder('Nhập mã giảm giá', exact=True).fill('DOES-NOT-EXIST')
        coupon.get_by_role('button', name='Áp dụng', exact=True).click()
        expect(coupon.get_by_role('alert')).to_contain_text('Không tìm thấy mã giảm giá')
        expect(summary.locator('.summary-total strong')).to_contain_text('230.000')
        coupon.get_by_placeholder('Nhập mã giảm giá', exact=True).fill(CODE.lower())
        coupon.get_by_role('button', name='Áp dụng', exact=True).click()
        expect(coupon.locator('.applied-coupon')).to_contain_text(CODE)
        expect(summary.locator('.summary-discount strong')).to_contain_text('20.000')
        expect(summary.locator('.summary-total strong')).to_contain_text('210.000')
        coupon.get_by_role('button', name='Bỏ mã giảm giá', exact=True).click()
        expect(coupon.locator('.applied-coupon')).not_to_be_visible()
        expect(summary.locator('.summary-total strong')).to_contain_text('230.000')
        coupon.get_by_placeholder('Nhập mã giảm giá', exact=True).fill(CODE)
        coupon.get_by_role('button', name='Áp dụng', exact=True).click()
        expect(summary.locator('.summary-total strong')).to_contain_text('210.000')
        for label, value in [('Họ tên người nhận', 'Khách kiểm thử'), ('Số điện thoại', '0901234567'), ('Tỉnh / Thành phố', 'TP. Hồ Chí Minh'), ('Phường / Xã', 'Bến Thành'), ('Địa chỉ chi tiết', '12 Đường kiểm thử')]:
            page.get_by_label(label, exact=True).fill(value)
        page.set_viewport_size({'width': 390, 'height': 844})
        no_page_overflow(page)
        screenshot(page, 'checkout-mobile.png')
        submit.click()
        page.wait_for_url(re.compile(r'.*/don-hang/[^?]+\?moi=1'))
        expect(page.get_by_role('heading', name='Cảm ơn bạn đã chọn Nếp.', exact=True)).to_be_visible()
        orders = customer.request.get(API + '/api/bootstrap').json()['orders']
        assert len(orders) == 1
        first = orders[0]
        assert [first['items'][0]['unitPrice'], first['subtotal'], first['discount'], first['shipping'], first['total']] == [200000, 200000, 20000, 30000, 210000]
        assert first['coupon']['code'] == CODE and first['paymentMethod'] == 'cod'
        expect(page.locator('.order-totals .summary-discount')).to_contain_text(CODE)

        assert customer.request.post(API + '/api/cart', data={'productId': 'discount-shirt', 'size': 'M', 'color': 'Kem', 'quantity': 1}).status == 200
        page.goto(BASE + '/thanh-toan')
        coupon = page.get_by_role('region', name='Mã giảm giá', exact=True)
        expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_enabled()
        coupon.get_by_placeholder('Nhập mã giảm giá', exact=True).fill(CODE)
        coupon.get_by_role('button', name='Áp dụng', exact=True).click()
        expect(coupon.locator('.applied-coupon')).to_contain_text(CODE)
        latest = admin.request.get(API + '/api/admin/promotions').json()['promotions'][0]
        assert admin.request.patch(API + '/api/admin/promotions/' + latest['id'], data={'expectedVersion': latest['version'], 'isActive': False}).status == 200
        with page.expect_response(lambda response: response.url.endswith('/api/orders') and response.request.method == 'POST') as rejected:
            page.get_by_role('button', name='Xác nhận đặt hàng', exact=True).click()
        assert rejected.value.status == 409 and rejected.value.json()['code'] == 'COUPON_INACTIVE'
        expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_disabled()
        expect(coupon.get_by_role('button', name='Bỏ mã giảm giá', exact=True)).to_be_visible()
        unchanged = customer.request.get(API + '/api/bootstrap').json()
        assert len(unchanged['orders']) == 1 and len(unchanged['cart']) == 1
        assert unchanged['products'][0]['stock'] == 19
        screenshot(page, 'checkout-invalidated-coupon-mobile.png')
        coupon.get_by_role('button', name='Bỏ mã giảm giá', exact=True).click()
        expect(coupon.locator('.applied-coupon')).not_to_be_visible()
        expect(page.locator('.checkout-summary .summary-total strong')).to_contain_text('230.000')
        expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_enabled()
        assert len(customer.request.get(API + '/api/bootstrap').json()['orders']) == 1, 'Removing a coupon must not submit an order'
        page.get_by_role('button', name='Xác nhận đặt hàng', exact=True).click()
        page.wait_for_url(re.compile(r'.*/don-hang/[^?]+\?moi=1'))
        final_orders = customer.request.get(API + '/api/bootstrap').json()['orders']
        assert len(final_orders) == 2
        second = next(order for order in final_orders if order['id'] != first['id'])
        assert second['discount'] == 0 and second['total'] == 230000 and 'coupon' not in second
        assert next(order for order in final_orders if order['id'] == first['id'])['total'] == 210000
        assert not errors, errors
    finally:
        browser.close()


def run():
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1', 3013)) != 0, 'Isolated fixture port 3013 busy'
    with tempfile.TemporaryDirectory(prefix='nep-discount-browser-') as directory:
        environment = {**os.environ, 'NEP_DISCOUNT_DB': str(Path(directory) / 'store.sqlite')}
        with (Path(directory) / 'api.log').open('wb') as log:
            process = subprocess.Popen(['node', 'tests/server/discount-browser-api.mjs'], cwd=ROOT, env=environment, stdout=log, stderr=log)
            try:
                for _ in range(100):
                    assert process.poll() is None, 'Isolated discount API exited'
                    try:
                        urllib.request.urlopen(API + '/api/health', timeout=1).close()
                        break
                    except OSError:
                        time.sleep(.2)
                else:
                    raise AssertionError('Isolated discount API not ready')
                with sync_playwright() as driver:
                    run_browser(driver)
                print('PASS admin sale/coupon, mobile promotion editor/checkout, invalid/apply/remove, persisted COD discounts, invalidated-coupon safe recovery; isolated SQLite API')
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)


if __name__ == '__main__':
    run()
