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
API = 'http://127.0.0.1:3015'
SHOTS = ROOT / 'work' / 'promotion-eligibility-browser'
CODE = 'FIRSTTHREE'
ADDRESS = {'recipient': 'Khách điều kiện', 'phone': '0901234567', 'province': 'TP. Hồ Chí Minh', 'ward': 'Bến Thành', 'line1': '12 Đường kiểm thử'}


def checked(response, status=200):
    assert response.status == status, (response.status, response.text())
    return response.json()


def bootstrap(context):
    return checked(context.request.get(API + '/api/bootstrap'))


def promotions(context):
    return {p['code']: p for p in checked(context.request.get(API + '/api/admin/promotions'))['promotions']}


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Page overflows horizontally'


def shot(page, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / name), full_page=True, animations='disabled')


def apply(page, code):
    coupon = page.get_by_role('region', name='Mã giảm giá', exact=True)
    coupon.get_by_placeholder('Nhập mã giảm giá', exact=True).fill(code)
    with page.expect_response(lambda r: r.url.endswith('/api/checkout/quote') and r.request.method == 'POST') as result:
        coupon.get_by_role('button', name='Áp dụng', exact=True).click()
    return coupon, result.value


def admin_creation(page, code, preset='custom', restricted=False):
    page.get_by_role('button', name='Tạo mã giảm giá', exact=True).click()
    editor = page.get_by_role('dialog', name='Tạo mã giảm giá', exact=True)
    editor.get_by_label('Mã giảm giá').fill(code.lower())
    editor.get_by_label('Tên chương trình', exact=True).fill('Điều kiện ' + code)
    editor.get_by_label('Phần trăm giảm (%)', exact=True).fill('10')
    expect(editor.get_by_label('Chỉ dành cho đơn đầu tiên', exact=True)).not_to_be_checked()
    expect(editor.get_by_label('Số món tối thiểu')).to_have_value('1')
    editor.get_by_label('Cách giới hạn lượt dùng').select_option(preset)
    if restricted:
        editor.get_by_label('Chỉ dành cho đơn đầu tiên', exact=True).check()
        editor.get_by_label('Số món tối thiểu').fill('3')
        editor.get_by_role('spinbutton', name=re.compile('^Tổng lượt sử dụng')).fill('10')
        editor.get_by_role('spinbutton', name=re.compile('^Lượt dùng mỗi khách')).fill('3')
    editor.get_by_role('button', name='Tạo mã giảm giá', exact=True).click()
    expect(editor).not_to_be_visible()
    expect(page.get_by_role('button', name=code, exact=True)).to_be_visible()


def run_browser(driver):
    browser = driver.chromium.launch(channel='msedge', headless=True)
    errors = []
    try:
        def context(email=None, register=False):
            result = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            def proxy(route):
                response = route.fetch(url=API + route.request.url.split(BASE, 1)[1])
                route.fulfill(response=response)
            result.route('**/api/**', proxy)
            if email:
                endpoint = '/api/auth/register' if register else '/api/auth/login'
                checked(result.request.post(API + endpoint, data={'email': email, 'password': 'Nepform@2026!', 'name': 'Khách điều kiện'}))
            return result

        admin = context('admin@nepform.local')
        page = admin.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '/quan-tri/khuyen-mai')
        admin_creation(page, 'GLOBALONCE', 'global-once')
        admin_creation(page, 'CUSTOMERONCE', 'customer-once')
        admin_creation(page, CODE, restricted=True)
        saved = promotions(admin)
        assert [saved['GLOBALONCE']['usageLimit'], saved['GLOBALONCE']['perUserLimit']] == [1, None]
        assert [saved['CUSTOMERONCE']['usageLimit'], saved['CUSTOMERONCE']['perUserLimit']] == [None, 1]
        assert [saved[CODE]['firstOrderOnly'], saved[CODE]['minQuantity'], saved[CODE]['usageLimit'], saved[CODE]['perUserLimit']] == [True, 3, 10, 3]
        row = page.get_by_role('row').filter(has=page.get_by_role('button', name=CODE, exact=True))
        expect(row).to_contain_text('Chỉ đơn đầu tiên')
        expect(row).to_contain_text('Từ 3 món')
        shot(page, 'admin-conditions-desktop.png')
        page.set_viewport_size({'width': 390, 'height': 844})
        no_overflow(page)
        page.get_by_role('button', name='Sửa mã ' + CODE, exact=True).click()
        editor = page.get_by_role('dialog', name='Chỉnh sửa ' + CODE, exact=True)
        expect(editor.get_by_label('Chỉ dành cho đơn đầu tiên', exact=True)).to_be_checked()
        expect(editor.get_by_label('Số món tối thiểu')).to_have_value('3')
        expect(editor.get_by_label('Cách giới hạn lượt dùng')).to_have_value('custom')
        assert editor.evaluate('(element) => element.scrollWidth <= element.clientWidth + 1'), 'Mobile promotion editor overflows'
        editor.get_by_label('Tên chương trình', exact=True).fill('Đơn đầu tiên từ ba món')
        shot(page, 'admin-conditions-mobile.png')
        editor.get_by_role('button', name='Lưu thay đổi', exact=True).click()
        expect(editor).not_to_be_visible()
        assert promotions(admin)[CODE]['label'] == 'Đơn đầu tiên từ ba món'
        for code, preset in [('GLOBALONCE', 'global-once'), ('CUSTOMERONCE', 'customer-once')]:
            page.get_by_role('button', name='Sửa mã ' + code, exact=True).click()
            editor = page.get_by_role('dialog', name='Chỉnh sửa ' + code, exact=True)
            expect(editor.get_by_label('Cách giới hạn lượt dùng')).to_have_value(preset)
            editor.get_by_role('button', name='Đóng cửa sổ', exact=True).click()

        # Omitting the new fields preserves ordinary coupon behavior and defaults.
        legacy = checked(admin.request.post(API + '/api/admin/promotions', data={'code': 'ORDINARY', 'label': 'Mã thông thường', 'type': 'fixed', 'value': 10000}))
        assert [legacy['firstOrderOnly'], legacy['minQuantity']] == [False, 1]
        buyer = context('khach@nepform.local')
        page = buyer.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '/san-pham/ao-kiem-thu-dieu-kien')
        page.get_by_role('button', name='M', exact=True).click()
        page.get_by_role('button', name='Tăng số lượng', exact=True).click()
        page.get_by_role('button', name='Thêm vào giỏ hàng', exact=True).click()
        expect(page.get_by_role('button', name='Đã thêm vào giỏ', exact=True)).to_be_visible()
        page.goto(BASE + '/thanh-toan')
        coupon, response = apply(page, CODE)
        assert response.status == 409 and response.json()['code'] == 'COUPON_MIN_QUANTITY'
        expect(coupon.get_by_role('alert')).to_contain_text('ít nhất 3 sản phẩm')
        expect(coupon.locator('.applied-coupon')).not_to_be_visible()
        page.goto(BASE + '/gio-hang')
        page.get_by_role('button', name='Tăng số lượng', exact=True).click()
        expect(page.locator('.cart-item .quantity span')).to_have_text('3')
        page.get_by_role('link', name='Tiến hành thanh toán', exact=True).click()
        coupon, response = apply(page, CODE.lower())
        assert response.status == 200
        expect(coupon.locator('.applied-coupon')).to_contain_text('Dành cho đơn đầu tiên · Từ 3 món')
        expect(page.locator('.checkout-summary .summary-discount strong')).to_contain_text('60.000')
        for label, value in [('Họ tên người nhận', ADDRESS['recipient']), ('Số điện thoại', ADDRESS['phone']), ('Tỉnh / Thành phố', ADDRESS['province']), ('Phường / Xã', ADDRESS['ward']), ('Địa chỉ chi tiết', ADDRESS['line1'])]:
            page.get_by_label(label, exact=True).fill(value)
        page.set_viewport_size({'width': 390, 'height': 844})
        no_overflow(page)
        shot(page, 'checkout-first-three-mobile.png')
        page.get_by_role('button', name='Xác nhận đặt hàng', exact=True).click()
        page.wait_for_url(re.compile(r'.*/don-hang/[^?]+\?moi=1'))
        first = bootstrap(buyer)['orders'][0]
        assert [first['items'][0]['quantity'], first['subtotal'], first['discount'], first['total'], first['paymentMethod'], first['paymentStatus']] == [3, 600000, 60000, 570000, 'cod', 'unpaid']
        assert first['coupon']['firstOrderOnly'] is True and first['coupon']['minQuantity'] == 3
        assert promotions(admin)[CODE]['usedCount'] == 1
        checked(buyer.request.post(API + '/api/cart', data={'productId': 'eligibility-shirt', 'color': 'Kem', 'size': 'M', 'quantity': 3}))
        page.goto(BASE + '/thanh-toan')
        coupon, response = apply(page, CODE)
        assert response.status == 409 and response.json()['code'] == 'COUPON_FIRST_ORDER_ONLY'
        expect(coupon.get_by_role('alert')).to_contain_text('đơn hàng đầu tiên')
        ordinary = checked(buyer.request.post(API + '/api/checkout/quote', data={'couponCode': 'ORDINARY'}))['quote']
        assert ordinary['discount'] == 10000, 'Ordinary coupon must remain available after a pending order'
        page.goto(BASE + '/don-hang/' + first['id'])
        page.get_by_role('button', name='Hủy đơn hàng', exact=True).click()
        page.get_by_role('dialog').get_by_role('button', name='Xác nhận hủy', exact=True).click()
        expect(page.locator('.order-detail-heading')).to_contain_text('Đã hủy')
        checked(buyer.request.post(API + '/api/orders/' + first['id'] + '/cancel'))
        assert promotions(admin)[CODE]['usedCount'] == 0, 'Repeated cancellation must release usage once'
        page.goto(BASE + '/thanh-toan')
        coupon, response = apply(page, CODE)
        assert response.status == 200, 'Cancelled orders must not block the first-order coupon'

        # A cart changed outside this tab must fail atomically before refreshing the UI.
        cart = bootstrap(buyer)['cart'][0]
        checked(buyer.request.patch(API + '/api/cart/' + cart['id'], data={'quantity': 2}))
        with page.expect_response(lambda r: r.url.endswith('/api/orders') and r.request.method == 'POST') as rejected:
            page.get_by_role('button', name='Xác nhận đặt hàng', exact=True).click()
        assert rejected.value.status == 409 and rejected.value.json()['code'] == 'COUPON_MIN_QUANTITY'
        expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_disabled()
        expect(coupon.get_by_role('alert')).to_contain_text('ít nhất 3 sản phẩm')
        after = bootstrap(buyer)
        assert len(after['orders']) == 1 and after['orders'][0]['status'] == 'cancelled'
        assert after['cart'][0]['quantity'] == 2 and next(p for p in after['products'] if p['id'] == 'eligibility-shirt')['stock'] == 40
        assert promotions(admin)[CODE]['usedCount'] == 0
        shot(page, 'checkout-quantity-invalidated-mobile.png')
        checked(buyer.request.patch(API + '/api/cart/' + cart['id'], data={'quantity': 3}))
        page.reload()
        coupon, response = apply(page, CODE)
        assert response.status == 200
        expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_enabled()

        custom = context('custom-eligibility@example.test', register=True)
        project = {'version': 1, 'name': 'Ba áo riêng', 'productId': 'eligibility-blank', 'color': 'Kem', 'size': 'M', 'faces': {'front': {'area': 'medium', 'layers': [{'id': 'text-1', 'kind': 'text', 'text': 'Nếp', 'fontFamily': 'Be Vietnam Pro', 'fontWeight': 600, 'fill': '#20201e', 'x': 40, 'y': 50, 'width': 220, 'height': 60, 'rotation': 0, 'opacity': 1}]}, 'back': {'area': 'small', 'layers': []}}}
        checked(custom.request.post(API + '/api/custom/cart', data={'project': project, 'quantity': 3}))
        page = custom.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '/thanh-toan')
        coupon, response = apply(page, CODE)
        quote = checked(response)['quote']
        assert len(quote['items']) == 1 and quote['items'][0]['quantity'] == 3 and quote['items'][0]['custom']
        assert quote['discount'] == quote['subtotal'] // 10
        expect(coupon.locator('.applied-coupon')).to_contain_text('Từ 3 món')
        assert not errors, errors
    finally:
        browser.close()


def run():
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1', 3015)) != 0, 'Isolated fixture port 3015 busy'
    with tempfile.TemporaryDirectory(prefix='nep-eligibility-browser-') as directory:
        environment = {**os.environ, 'NEP_ELIGIBILITY_DB': str(Path(directory) / 'store.sqlite')}
        with (Path(directory) / 'api.log').open('wb') as log:
            process = subprocess.Popen(['node', 'tests/server/promotion-eligibility-browser-api.mjs'], cwd=ROOT, env=environment, stdout=log, stderr=log)
            try:
                for _ in range(100):
                    assert process.poll() is None, 'Isolated eligibility API exited'
                    try:
                        urllib.request.urlopen(API + '/api/health', timeout=1).close()
                        break
                    except OSError:
                        time.sleep(.2)
                else:
                    raise AssertionError('Isolated eligibility API not ready')
                with sync_playwright() as driver:
                    run_browser(driver)
                print('PASS usage presets; saved/edited first-order and min-quantity rules; same-shirt/custom quantity; COD snapshot; pending first-order rejection; cancellation reuse; stale quantity atomic refusal; mobile 390; ordinary coupon compatibility; isolated SQLite API')
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)


if __name__ == '__main__':
    run()
