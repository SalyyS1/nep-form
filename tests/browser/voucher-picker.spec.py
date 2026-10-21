from datetime import datetime, timedelta, timezone
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
BASE, API = 'http://127.0.0.1:5173', 'http://127.0.0.1:3016'
SHOTS = ROOT / 'work' / 'voucher-picker-browser'
ADDRESS = {'recipient': 'Khách voucher', 'phone': '0901234567', 'province': 'TP. Hồ Chí Minh', 'ward': 'Bến Thành', 'line1': '12 Đường kiểm thử'}


def checked(response, status=200):
    assert response.status == status, (response.status, response.text())
    return response.json()


def bootstrap(context):
    return checked(context.request.get(API + '/api/bootstrap'))


def saved(admin):
    return {p['code']: p for p in checked(admin.request.get(API + '/api/admin/promotions'))['promotions']}


def create(admin, code, **fields):
    return checked(admin.request.post(API + '/api/admin/promotions', data={
        'code': code, 'label': 'Ưu đãi ' + code, 'type': 'fixed', 'value': 10000,
        'showAtCheckout': True, **fields}))


def patch(admin, code, **fields):
    promotion = saved(admin)[code]
    return checked(admin.request.patch(API + '/api/admin/promotions/' + promotion['id'], data={
        'expectedVersion': promotion['version'], **fields}))


def add(context, quantity=1):
    checked(context.request.post(API + '/api/cart', data={
        'productId': 'voucher-shirt', 'size': 'M', 'color': 'Kem', 'quantity': quantity}))


def quote(context, code=''):
    return checked(context.request.post(API + '/api/checkout/quote', data={'couponCode': code}))['quote']


def open_picker(page):
    page.get_by_role('button', name='Chọn mã giảm giá', exact=True).click()
    dialog = page.get_by_role('dialog', name='Chọn mã giảm giá', exact=True)
    expect(dialog).to_be_visible()
    return dialog


def card(dialog, code):
    return dialog.get_by_role('article', name='Mã ' + code, exact=True)


def choose(page, dialog, code):
    with page.expect_response(lambda r: r.url.endswith('/api/checkout/quote') and r.request.method == 'POST') as response:
        dialog.get_by_role('button', name='Áp dụng mã ' + code, exact=True).click()
    return response.value


def shot(page, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / name), full_page=True, animations='disabled')


def admin_visibility(admin, page):
    page.goto(BASE + '/quan-tri/khuyen-mai')
    page.get_by_role('button', name='Sửa mã LEGACYPRIVATE', exact=True).click()
    editor = page.get_by_role('dialog', name='Chỉnh sửa LEGACYPRIVATE', exact=True)
    expect(editor.get_by_label('Hiện tại thanh toán', exact=True)).not_to_be_checked()
    editor.get_by_role('button', name='Đóng cửa sổ', exact=True).click()
    page.get_by_role('button', name='Tạo mã giảm giá', exact=True).click()
    editor = page.get_by_role('dialog', name='Tạo mã giảm giá', exact=True)
    expect(editor.get_by_label('Hiện tại thanh toán', exact=True)).not_to_be_checked()
    editor.get_by_label('Mã giảm giá').fill('UIVISIBLE')
    editor.get_by_label('Tên chương trình', exact=True).fill('Ưu đãi công khai từ quản trị')
    editor.get_by_label('Phần trăm giảm (%)', exact=True).fill('1')
    editor.get_by_label('Hiện tại thanh toán', exact=True).check()
    editor.get_by_role('button', name='Tạo mã giảm giá', exact=True).click()
    expect(editor).not_to_be_visible()
    assert saved(admin)['UIVISIBLE']['showAtCheckout'] is True
    page.get_by_role('button', name='Sửa mã UIVISIBLE', exact=True).click()
    editor = page.get_by_role('dialog', name='Chỉnh sửa UIVISIBLE', exact=True)
    expect(editor.get_by_label('Hiện tại thanh toán', exact=True)).to_be_checked()
    editor.get_by_role('button', name='Đóng cửa sổ', exact=True).click()


def seed_offers(admin, buyer):
    now = datetime.now(timezone.utc)
    create(admin, 'FIXED60', value=60000, usageLimit=10, perUserLimit=2)
    create(admin, 'CAPPED80', type='percent', value=80, maxDiscount=20000)
    create(admin, 'SCALE25', type='percent', value=25)
    create(admin, 'REPLACE40', value=40000)
    create(admin, 'THREESHIRT', minQuantity=3)
    create(admin, 'SPEND600', minSubtotal=600000)
    create(admin, 'FIRSTONLY', firstOrderOnly=True)
    create(admin, 'PERUSER', perUserLimit=1)
    create(admin, 'FUTURE', startsAt=(now + timedelta(days=1)).isoformat(timespec='milliseconds'), endsAt=(now + timedelta(days=2)).isoformat(timespec='milliseconds'))
    create(admin, 'INACTIVE', isActive=False)
    create(admin, 'EXPIRED', endsAt=(now - timedelta(days=1)).isoformat(timespec='milliseconds'))
    private = checked(admin.request.post(API + '/api/admin/promotions', data={
        'code': 'PRIVATE150', 'label': 'Mã riêng nhập tay', 'type': 'fixed', 'value': 150000}))
    assert private['showAtCheckout'] is False
    add(buyer)
    checked(buyer.request.post(API + '/api/orders', data={'couponCode': 'PERUSER', 'expectedQuote': quote(buyer, 'PERUSER'),
        'address': ADDRESS, 'paymentMethod': 'cod', 'idempotencyKey': 'voucher-prior-order'}))
    add(buyer)


def discovery_and_selection(admin, buyer, page):
    page.goto(BASE + '/thanh-toan')
    expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_enabled()
    order_requests = []
    page.on('request', lambda request: order_requests.append(request) if request.url.endswith('/api/orders') and request.method == 'POST' else None)
    # A valid address makes accidental outer form submits observable.
    for label, value in [('Họ tên người nhận', ADDRESS['recipient']), ('Số điện thoại', ADDRESS['phone']), ('Tỉnh / Thành phố', ADDRESS['province']), ('Phường / Xã', ADDRESS['ward']), ('Địa chỉ chi tiết', ADDRESS['line1'])]:
        field = page.get_by_label(label, exact=True)
        if field.count():
            field.fill(value)
    dialog = open_picker(page)
    expect(card(dialog, 'FIXED60').get_by_text('Giảm nhiều nhất', exact=True)).to_be_visible()
    expect(card(dialog, 'CAPPED80')).to_contain_text('20.000')
    for code in ['LEGACYPRIVATE', 'PRIVATE150', 'INACTIVE', 'EXPIRED']:
        expect(card(dialog, code)).not_to_be_visible()
    reasons = {'THREESHIRT': 'ít nhất 3 sản phẩm', 'SPEND600': 'giá trị tối thiểu',
               'FIRSTONLY': 'đơn hàng đầu tiên', 'PERUSER': 'hết lượt', 'FUTURE': 'chưa đến thời gian'}
    for code, reason in reasons.items():
        expect(card(dialog, code)).to_contain_text(reason)
        expect(card(dialog, code).get_by_role('button')).to_be_disabled()
    expect(card(dialog, 'FIXED60')).to_contain_text('10')
    expect(card(dialog, 'FIXED60')).to_contain_text('2')
    assert saved(admin)['FIXED60']['usedCount'] == 0
    shot(page, 'picker-desktop-conditions.png')
    dialog.get_by_role('button', name='Đóng', exact=True).click()
    expect(page.get_by_role('button', name='Chọn mã giảm giá', exact=True)).to_be_focused()
    dialog = open_picker(page)
    page.keyboard.press('Escape')
    expect(dialog).not_to_be_visible()
    dialog = open_picker(page)
    response = checked(choose(page, dialog, 'FIXED60'))['quote']
    assert [response['discount'], response['total']] == [60000, 170000]
    expect(dialog).not_to_be_visible()
    expect(page.locator('.checkout-summary .summary-discount')).to_contain_text('60.000')
    coupon = page.get_by_role('region', name='Mã giảm giá', exact=True)
    coupon.get_by_placeholder('Nhập mã giảm giá', exact=True).fill('private150')
    with page.expect_response(lambda r: r.url.endswith('/api/checkout/quote') and r.request.method == 'POST') as applied:
        coupon.get_by_placeholder('Nhập mã giảm giá', exact=True).press('Enter')
    assert checked(applied.value)['quote']['discount'] == 150000
    dialog = open_picker(page)
    expect(card(dialog, 'FIXED60').get_by_text('Giảm nhiều nhất', exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    expect(coupon.locator('.applied-coupon')).to_contain_text('PRIVATE150')
    expect(page.locator('.checkout-summary .summary-discount')).to_contain_text('150.000')
    assert not order_requests, 'Voucher controls submitted the order form'
    assert len(bootstrap(buyer)['orders']) == 1 and saved(admin)['FIXED60']['usedCount'] == 0
    return order_requests


def stale_offer_and_context(admin, buyer, page):
    dialog = open_picker(page)
    patch(admin, 'FIXED60', isActive=False)
    rejected = choose(page, dialog, 'FIXED60')
    assert rejected.status == 409 and rejected.json()['code'] == 'COUPON_INACTIVE'
    expect(dialog).to_be_visible()
    expect(dialog.get_by_role('alert')).to_contain_text('tạm ngừng')
    expect(card(dialog, 'FIXED60')).not_to_be_visible()
    assert checked(choose(page, dialog, 'REPLACE40'))['quote']['discount'] == 40000
    expect(dialog).not_to_be_visible()
    patch(admin, 'FIXED60', isActive=True)
    dialog = open_picker(page)
    expect(card(dialog, 'FIXED60').get_by_text('Giảm nhiều nhất', exact=True)).to_be_visible()
    page.keyboard.press('Escape')
    held = []

    def hold_old(route):
        response = route.fetch(url=API + '/api/checkout/promotions')
        if not held:
            assert response.json()['bestCode'] == 'FIXED60'
            held.append((route, response))
        else:
            route.fulfill(response=response)

    page.route('**/api/checkout/promotions', hold_old)
    dialog = open_picker(page)
    page.wait_for_function('document.querySelector("dialog[open]") !== null')
    deadline = time.monotonic() + 10
    while not held and time.monotonic() < deadline:
        page.wait_for_timeout(20)
    assert held, 'Old promotion response was never intercepted'
    item = bootstrap(buyer)['cart'][0]
    checked(buyer.request.patch(API + '/api/cart/' + item['id'], data={'quantity': 2}))
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    expect(card(dialog, 'SCALE25').get_by_text('Giảm nhiều nhất', exact=True)).to_be_visible()
    held[0][0].fulfill(response=held[0][1])
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    expect(card(dialog, 'SCALE25').get_by_text('Giảm nhiều nhất', exact=True)).to_be_visible()
    page.unroute('**/api/checkout/promotions', hold_old)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    assert dialog.evaluate('(e) => e.scrollWidth <= e.clientWidth + 1')
    page.keyboard.press('Tab')
    assert dialog.evaluate('(e) => e.contains(document.activeElement)'), 'Focus escaped the native modal'
    shot(page, 'picker-mobile-390.png')
    assert checked(choose(page, dialog, 'SCALE25'))['quote']['discount'] == 100000
    expect(dialog).not_to_be_visible()


def failed_quote_reapply(buyer, page):
    item = bootstrap(buyer)['cart'][0]
    page.route('**/api/checkout/quote', lambda route: route.abort('internetdisconnected'))
    checked(buyer.request.patch(API + '/api/cart/' + item['id'], data={'quantity': 3}))
    with page.expect_event('requestfailed', predicate=lambda request: request.url.endswith('/api/checkout/quote')):
        page.evaluate("window.dispatchEvent(new Event('focus'))")
    page.unroute('**/api/checkout/quote')
    expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_disabled()
    expect(page.locator('.applied-coupon')).to_contain_text('SCALE25')
    dialog = open_picker(page)
    # A retained code is not an applied quote after its refresh fails.
    expect(dialog.get_by_role('button', name='Đang áp dụng mã SCALE25', exact=True)).to_have_count(0)
    expect(dialog.get_by_role('button', name='Áp dụng mã SCALE25', exact=True)).to_be_enabled()
    recovered = checked(choose(page, dialog, 'SCALE25'))['quote']
    assert [recovered['subtotal'], recovered['discount']] == [600000, 150000]
    expect(dialog).not_to_be_visible()
    expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_enabled()
    checked(buyer.request.patch(API + '/api/cart/' + item['id'], data={'quantity': 2}))
    with page.expect_response(lambda response: response.url.endswith('/api/checkout/quote')) as restored:
        page.evaluate("window.dispatchEvent(new Event('focus'))")
    assert checked(restored.value)['quote']['discount'] == 100000
    expect(page.get_by_role('button', name='Xác nhận đặt hàng', exact=True)).to_be_enabled()


def network_and_empty(admin, page):
    page.route('**/api/checkout/promotions', lambda route: route.abort('internetdisconnected'))
    dialog = open_picker(page)
    expect(dialog.get_by_role('button', name='Thử tải lại', exact=True)).to_be_visible()
    page.unroute('**/api/checkout/promotions')
    dialog.get_by_role('button', name='Thử tải lại', exact=True).click()
    expect(card(dialog, 'SCALE25')).to_be_visible()
    page.keyboard.press('Escape')
    public_codes = [p['code'] for p in saved(admin).values() if p['showAtCheckout']]
    for code in public_codes:
        patch(admin, code, showAtCheckout=False)
    dialog = open_picker(page)
    expect(dialog.get_by_role('article')).to_have_count(0)
    expect(dialog).to_contain_text(re.compile('chưa có|Chưa có'))
    page.keyboard.press('Escape')
    for code in public_codes:
        patch(admin, code, showAtCheckout=True)


def run_browser(driver):
    browser = driver.chromium.launch(channel='msedge', headless=True)
    errors = []
    try:
        def context(email):
            result = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            def proxy(route):
                response = route.fetch(url=API + route.request.url.split(BASE, 1)[1])
                route.fulfill(response=response)
            result.route('**/api/**', proxy)
            checked(result.request.post(API + '/api/auth/login', data={'email': email, 'password': 'Nepform@2026!'}))
            return result

        admin, buyer = context('admin@nepform.local'), context('khach@nepform.local')
        admin_page = admin.new_page()
        admin_visibility(admin, admin_page)
        seed_offers(admin, buyer)
        page = buyer.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        order_requests = discovery_and_selection(admin, buyer, page)
        stale_offer_and_context(admin, buyer, page)
        failed_quote_reapply(buyer, page)
        network_and_empty(admin, page)
        assert not order_requests
        expect(page.locator('.applied-coupon')).to_contain_text('SCALE25')
        page.get_by_role('button', name='Xác nhận đặt hàng', exact=True).click()
        page.wait_for_url(re.compile(r'.*/don-hang/[^?]+\?moi=1'))
        order = bootstrap(buyer)['orders'][0]
        assert [order['subtotal'], order['discount'], order['total'], order['coupon']['code'], order['paymentMethod'], order['paymentStatus']] == [400000, 100000, 330000, 'SCALE25', 'cod', 'unpaid']
        assert len(order_requests) == 1 and saved(admin)['SCALE25']['usedCount'] == 1
        assert saved(admin)['FIXED60']['usedCount'] == 0
        assert not errors, errors
        print('PASS admin explicit visibility/default privacy; eligible/disabled conditions; actual savings; private manual Enter; no unintended orders; stale offer rejection; context and stale-response refresh; mobile/focus; failed-quote same-code reapply; network retry/empty; COD quote snapshot')
    finally:
        browser.close()


def run():
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1', 3016)) != 0, 'Isolated fixture port 3016 busy'
    with tempfile.TemporaryDirectory(prefix='nep-voucher-browser-') as directory:
        environment = {**os.environ, 'NEP_VOUCHER_DB': str(Path(directory) / 'store.sqlite')}
        with (Path(directory) / 'api.log').open('wb') as log:
            process = subprocess.Popen(['node', 'tests/server/voucher-picker-browser-api.mjs'], cwd=ROOT, env=environment, stdout=log, stderr=log)
            try:
                for _ in range(100):
                    assert process.poll() is None, 'Isolated voucher API exited'
                    try:
                        urllib.request.urlopen(API + '/api/health', timeout=1).close()
                        break
                    except OSError:
                        time.sleep(.2)
                else:
                    raise AssertionError('Isolated voucher API not ready')
                with sync_playwright() as driver:
                    run_browser(driver)
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)


if __name__ == '__main__':
    run()
