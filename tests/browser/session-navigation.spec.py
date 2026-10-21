from pathlib import Path
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:5173'
API = 'http://127.0.0.1:3014'
TARGET = '/quan-tri/khuyen-mai'
LOGIN = '/dang-nhap?tiep=' + TARGET
SHOTS = ROOT / 'work' / 'session-navigation'


def sign_in(page, email, password='Nepform@2026!'):
    page.get_by_label('Email', exact=True).fill(email)
    page.get_by_label('Mật khẩu', exact=True).fill(password)
    page.get_by_role('button', name='Đăng nhập', exact=True).click()


def admin_ready(page):
    expect(page).to_have_url(BASE + TARGET)
    expect(page.get_by_role('heading', name='Khuyến mãi', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Đăng nhập', exact=True)).not_to_be_visible()


def login_ready(page):
    expect(page).to_have_url(re.compile(r'.*/dang-nhap\?tiep='))
    expect(page.get_by_role('button', name='Đăng nhập', exact=True)).to_be_visible()
    expect(page.get_by_role('heading', name='Khuyến mãi', exact=True)).not_to_be_visible()


def check_reconciliation(context, page):
    held = []

    def delay_first(route):
        response = route.fetch(url=API + '/api/bootstrap')
        if not held:
            assert response.json()['user'] is None
            held.append((route, response))
            page.evaluate('window.__sessionBootstrapHeld = true')
        else:
            route.fulfill(response=response)

    # Keep a real anonymous response in flight while a newer request sees login.
    assert context.request.post(API + '/api/auth/logout').status == 200
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    login_ready(page)
    page.route('**/api/bootstrap', delay_first)
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    page.wait_for_function('window.__sessionBootstrapHeld === true')
    with page.expect_response(lambda response: response.url.endswith('/api/bootstrap')) as newer:
        sign_in(page, 'admin@nepform.local')
    assert newer.value.json()['user']['role'] == 'admin'
    with page.expect_response(lambda response: response.request == held[0][0].request):
        held[0][0].fulfill(response=held[0][1])
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    admin_ready(page)
    page.unroute('**/api/bootstrap', delay_first)

    studio = context.new_page()
    studio.goto(BASE + '/thiet-ke')
    expect(studio.get_by_role('heading', name='Áo của bạn.', exact=True)).to_be_visible()
    studio.get_by_role('button', name='Tuyên ngôn riêng', exact=True).click()
    studio.get_by_role('button', name='Dùng mẫu này', exact=True).click()
    name = studio.get_by_label('Tên thiết kế', exact=True)
    name.fill('Bản nháp giữ nguyên khi trở lại tab')
    name.evaluate("element => element.dataset.sessionMount = 'original'")
    studio.route('**/api/bootstrap', lambda route: route.abort('internetdisconnected'))
    with studio.expect_event('requestfailed', predicate=lambda request: request.url.endswith('/api/bootstrap')):
        studio.evaluate("window.dispatchEvent(new Event('focus'))")
    studio.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    expect(name).to_have_value('Bản nháp giữ nguyên khi trở lại tab')
    expect(name).to_have_attribute('data-session-mount', 'original')
    expect(studio.get_by_role('heading', name='Chưa kết nối được cửa hàng.', exact=True)).not_to_be_visible()
    studio.close()


def check_foreground_priority(context, page):
    page.goto(BASE + '/dang-nhap?doi-tai-khoan=1&tiep=' + TARGET)
    expect(page.get_by_role('button', name='Đăng nhập', exact=True)).to_be_visible()
    held = []
    requests = []

    def delay_login(route):
        requests.append(route.request)
        if not held:
            response = route.fetch(url=API + '/api/bootstrap')
            assert response.json()['user']['role'] == 'admin'
            held.append((route, response))
            page.evaluate('window.__sessionLoginHeld = true')
        else:
            route.abort('internetdisconnected')

    page.route('**/api/bootstrap', delay_login)
    sign_in(page, 'admin@nepform.local')
    page.wait_for_function('window.__sessionLoginHeld === true')
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    assert len(requests) == 1, 'Background bootstrap overtook the pending login refresh'
    with page.expect_event('requestfailed', predicate=lambda request: request.url.endswith('/api/bootstrap')):
        held[0][0].fulfill(response=held[0][1])
    admin_ready(page)
    expect(page.get_by_role('heading', name='Chưa kết nối được cửa hàng.', exact=True)).not_to_be_visible()
    page.unroute('**/api/bootstrap', delay_login)


def check_password_reset(context, page):
    result = context.request.post(API + '/api/auth/request-reset', data={'email': 'admin@nepform.local'})
    assert result.status == 200
    reset_url = urlsplit(result.json()['resetUrl'])
    reset = context.new_page()
    reset.goto(BASE + reset_url.path + '?' + reset_url.query)
    expect(reset.get_by_role('heading', name='Đặt lại mật khẩu.', exact=True)).to_be_visible()
    password = 'SessionReset@2026!'
    reset.get_by_label('Mật khẩu mới', exact=True).fill(password)
    reset.get_by_label('Nhập lại mật khẩu mới', exact=True).fill(password)
    reset.get_by_role('button', name='Lưu mật khẩu mới', exact=True).click()
    expect(reset).to_have_url(BASE + '/dang-nhap')
    expect(reset.get_by_role('button', name='Đăng nhập', exact=True)).to_be_visible()
    login_ready(page)
    assert context.request.get(API + '/api/bootstrap').json()['user'] is None
    sign_in(reset, 'admin@nepform.local', password)
    expect(reset).to_have_url(BASE + '/tai-khoan')
    expect(reset.get_by_role('textbox', name=re.compile(r'^Email'))).to_have_value('admin@nepform.local')
    admin_ready(page)


def check_tabs(context):
    page = context.new_page()
    page.goto(BASE + LOGIN)
    page.wait_for_url(BASE + TARGET, timeout=10000)
    admin_ready(page)
    page.reload()
    admin_ready(page)
    fresh = context.new_page()
    fresh.goto(BASE + TARGET)
    admin_ready(fresh)

    # A separate origin opens the real store URL; the app and API remain real.
    context.route('http://external.session.test/**', lambda route: route.fulfill(
        content_type='text/html', body=f'<a target="_blank" rel="noopener" href="{BASE + TARGET}">Open admin</a>'))
    external = context.new_page()
    external.goto('http://external.session.test/')
    with context.expect_page() as opened:
        external.get_by_role('link', name='Open admin', exact=True).click()
    admin_ready(opened.value)
    external.close()

    actor = context.new_page()
    actor.goto(BASE + '/tai-khoan')
    actor.get_by_role('button', name='Đăng xuất', exact=True).click()
    login_ready(page)
    login_ready(fresh)
    login_ready(opened.value)
    anonymous = context.request.get(API + '/api/bootstrap').json()
    assert anonymous['user'] is None and not anonymous['orders'] and not anonymous['addresses']
    denied = context.request.get(API + '/api/admin')
    assert denied.status == 401 and 'users' not in denied.json()

    # These tabs were opened before login and must react without a reload.
    actor.goto(BASE + LOGIN)
    sign_in(actor, 'admin@nepform.local')
    admin_ready(actor)
    admin_ready(page)
    admin_ready(fresh)
    admin_ready(opened.value)
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(SHOTS / 'admin-new-tab.png'), full_page=True, animations='disabled')

    actor.goto(BASE + '/dang-nhap?doi-tai-khoan=1&tiep=' + TARGET)
    expect(actor.get_by_role('button', name='Đăng nhập', exact=True)).to_be_visible()
    sign_in(actor, 'khach@nepform.local')
    expect(actor.get_by_role('heading', name='Khu vực dành cho quản trị viên.', exact=True)).to_be_visible()
    expect(page.get_by_role('heading', name='Khu vực dành cho quản trị viên.', exact=True)).to_be_visible()
    assert context.request.get(API + '/api/bootstrap').json()['user']['role'] == 'customer'
    denied = context.request.get(API + '/api/admin/promotions')
    assert denied.status == 403 and 'promotions' not in denied.json()

    customer = context.new_page()
    private_requests = []
    customer.on('request', lambda request: private_requests.append(request.url)
                if '/api/admin' in request.url else None)
    customer.goto(BASE + TARGET)
    expect(customer.get_by_role('heading', name='Khu vực dành cho quản trị viên.', exact=True)).to_be_visible()
    assert not private_requests, private_requests
    customer.get_by_role('link', name='Chuyển tài khoản', exact=True).click()
    expect(customer).to_have_url(re.compile(r'.*/dang-nhap\?.*doi-tai-khoan=1'))
    customer.set_viewport_size({'width': 390, 'height': 844})
    expect(customer.get_by_role('button', name='Đăng nhập', exact=True)).to_be_visible()
    assert customer.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile login overflows'
    customer.screenshot(path=str(SHOTS / 'switch-account-mobile.png'), full_page=True, animations='disabled')
    sign_in(customer, 'admin@nepform.local')
    admin_ready(customer)
    admin_ready(page)

    # Cookie changes outside the SPA have no storage event; focus/pageshow revalidate.
    assert context.request.post(API + '/api/auth/logout').status == 200
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    login_ready(page)
    assert context.request.post(API + '/api/auth/login', data={
        'email': 'admin@nepform.local', 'password': 'Nepform@2026!',
    }).status == 200
    page.evaluate("window.dispatchEvent(new Event('pageshow'))")
    admin_ready(page)
    check_reconciliation(context, page)
    check_foreground_priority(context, page)
    check_password_reset(context, page)


def run_browser(driver):
    browser = driver.chromium.launch(channel='msedge', headless=True)
    errors = []
    try:
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})

        def proxy(route):
            response = route.fetch(url=API + route.request.url.split(BASE, 1)[1])
            route.fulfill(response=response)

        context.route('**/api/**', proxy)
        context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
        response = context.request.post(API + '/api/auth/login', data={
            'email': 'admin@nepform.local', 'password': 'Nepform@2026!',
        })
        assert response.status == 200
        assert context.request.get(API + '/api/bootstrap').json()['user']['role'] == 'admin'
        check_tabs(context)
        assert not errors, errors
    finally:
        browser.close()


def run():
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1', 3014)) != 0, 'Isolated fixture port 3014 busy'
    with tempfile.TemporaryDirectory(prefix='nep-session-browser-') as directory:
        environment = {**os.environ, 'NEP_SESSION_DB': str(Path(directory) / 'store.sqlite')}
        with (Path(directory) / 'api.log').open('wb') as log:
            process = subprocess.Popen(['node', 'tests/server/session-browser-api.mjs'], cwd=ROOT,
                                       env=environment, stdout=log, stderr=log)
            print(f'Fixture PID={process.pid}, port=3014, worktree={ROOT}', flush=True)
            try:
                for _ in range(100):
                    assert process.poll() is None, 'Isolated session API exited'
                    try:
                        urllib.request.urlopen(API + '/api/health', timeout=1).close()
                        break
                    except OSError:
                        time.sleep(.2)
                else:
                    raise AssertionError('Isolated session API not ready')
                with sync_playwright() as driver:
                    run_browser(driver)
                print('PASS auth redirect; new/reloaded/external tabs; cross-tab login/logout; account switch/roles; focus/pageshow; stale bootstrap ignored; foreground login priority; offline Studio draft; password reset invalidation/relogin; mobile; no JS errors; isolated SQLite API')
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)


if __name__ == '__main__':
    run()
