"""Real isolated support journey; temporary API data, no store database writes."""
import json
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:5173'
API = 'http://127.0.0.1:3011'
OUT = ROOT / 'work/frontend-refinement/support'


def listening(port):
    with socket.socket() as probe:
        return probe.connect_ex(('127.0.0.1', port)) == 0


def ready(url, process):
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError('Test process exited before becoming ready')
        try:
            urllib.request.urlopen(url, timeout=1).close()
            return
        except OSError:
            time.sleep(.2)
    raise RuntimeError('Test process did not become ready: ' + url)


def stop(process):
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    if listening(3011):
        raise RuntimeError('Port 3011 busy; refusing to reuse another database')
    if not listening(5173):
        raise RuntimeError('Start the project UI on port 5173 before this test')
    processes = []
    with tempfile.TemporaryDirectory(prefix='nep-support-popup-') as directory:
        try:
            database = str(Path(directory) / 'support.sqlite')
            code = "import{startServer}from'./server/index.mjs';const s=await startServer({port:3011,dbPath:" + json.dumps(database) + "});process.on('SIGTERM',()=>s.close());"
            api_process = subprocess.Popen(['node', '--input-type=module', '-e', code], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            processes.append(api_process)
            ready(API + '/api/health', api_process)
            with sync_playwright() as driver:
                browser = driver.chromium.launch(channel='msedge', headless=True)
                context = browser.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce')
                def proxy(route):
                    response = route.fetch(url=API + route.request.url.split(BASE, 1)[1])
                    route.fulfill(response=response)
                context.route('**/api/**', proxy)
                page = context.new_page()
                errors = []
                requests = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('request', lambda request: requests.append((request.method, urlparse(request.url).path)))
                page.goto(BASE + '/cua-hang?q=ao#hang-moi')
                original_url = page.url
                launcher = page.get_by_role('button', name='Chat hỗ trợ Nếp')
                launcher.click()
                chat = page.get_by_role('dialog', name='Trò chuyện cùng Nếp')
                expect(chat).to_be_visible()
                assert urlparse(page.url).path == '/cua-hang'
                expect(chat.get_by_test_id('support-popup-login')).to_be_visible()
                expect(chat.get_by_label('Email', exact=True)).to_be_focused()
                # Native modal focus is contained; Escape returns to its launcher.
                for _ in range(8):
                    page.keyboard.press('Tab')
                    # Chromium may move focus to browser chrome between native-dialog cycles.
                    assert chat.evaluate('el=>el.contains(document.activeElement)||document.activeElement===document.body')
                    expect(launcher).not_to_be_focused()
                page.keyboard.press('Escape')
                expect(chat).not_to_be_visible()
                expect(page.get_by_test_id('support-popup-login')).to_have_count(0)
                expect(launcher).to_be_focused()
                launcher.click()
                chat.get_by_label('Email', exact=True).fill('khach@nepform.local')
                chat.get_by_label('Mật khẩu', exact=True).fill('IncorrectPassword@2026')
                chat.get_by_role('button', name='Đăng nhập và trò chuyện', exact=True).click()
                expect(chat.get_by_role('alert')).to_be_visible()
                assert page.url == original_url
                page.keyboard.press('Escape')
                expect(page.get_by_test_id('support-popup-login')).to_have_count(0)
                launcher.click()
                expect(chat.get_by_label('Email', exact=True)).to_have_value('')
                expect(chat.get_by_label('Mật khẩu', exact=True)).to_have_value('')
                chat.get_by_label('Email', exact=True).fill('khach@nepform.local')
                chat.get_by_label('Mật khẩu', exact=True).fill('Nepform@2026!')
                chat.get_by_role('button', name='Đăng nhập và trò chuyện', exact=True).click()
                composer = chat.get_by_label('Nội dung tin nhắn')
                expect(composer).to_be_focused()
                assert page.url == original_url, 'Inline login navigated away from the shop'
                expect(chat.get_by_text('Bạn cần tư vấn mẫu in, size áo hay đơn hàng?', exact=False)).to_be_visible()
                composer.fill('Mình muốn chọn size cho áo in hình.')
                page.keyboard.press('Escape')
                expect(launcher).to_be_focused()
                count = requests.count(('GET','/api/support/messages'))
                page.wait_for_timeout(4500)
                assert requests.count(('GET','/api/support/messages')) == count, 'Closed conversation still polls messages'
                launcher.click()
                expect(composer).to_have_value('Mình muốn chọn size cho áo in hình.')
                count = requests.count(('GET','/api/support'))
                page.wait_for_timeout(4500)
                assert requests.count(('GET','/api/support')) == count, 'Open popup duplicates badge requests'
                # A hidden tab must not fetch messages or mark them read.
                page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
                count = len(requests)
                page.wait_for_timeout(4500)
                hidden_support_requests = [request for request in requests[count:] if request[1].startswith('/api/support')]
                assert not hidden_support_requests, ('Hidden tab keeps polling support', hidden_support_requests)
                page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
                def fail_send(route):
                    if route.request.method == 'POST':
                        route.abort('connectionfailed')
                    else:
                        route.fallback()
                page.route('**/api/support/messages', fail_send)
                chat.get_by_role('button', name='Gửi tin nhắn', exact=True).click()
                expect(chat.get_by_role('alert')).to_contain_text('Tin chưa gửi được.')
                expect(composer).to_have_value('Mình muốn chọn size cho áo in hình.')
                page.unroute('**/api/support/messages', fail_send)
                page.wait_for_timeout(4500)
                expect(chat.get_by_role('alert')).to_contain_text('Tin chưa gửi được.')
                chat.get_by_role('button', name='Gửi tin nhắn', exact=True).click()
                expect(chat.locator('[data-message]')).to_have_count(1)
                expect(composer).to_have_value('')
                assert page.url == original_url, 'Customer popup send navigated away'
                # A second session answers through the admin popup on the current shop page.
                admin_context = browser.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce')
                admin_context.route('**/api/**', proxy)
                assert admin_context.request.post(API + '/api/auth/login', data={'email':'admin@nepform.local','password':'Nepform@2026!'}).ok
                admin = admin_context.new_page()
                admin.on('pageerror', lambda error: errors.append(str(error)))
                admin_requests = []
                admin.on('request', lambda request: admin_requests.append((request.method, urlparse(request.url).path)))
                admin.goto(BASE + '/cua-hang?q=ao#hang-moi')
                admin_url = admin.url
                admin.get_by_role('button', name='Chat hỗ trợ Nếp').click()
                inbox = admin.get_by_role('dialog', name='Hộp thư hỗ trợ')
                expect(inbox.get_by_test_id('support-popup-thread')).to_have_count(1)
                inbox.get_by_test_id('support-popup-thread').click()
                admin_composer = inbox.get_by_label('Nội dung tin nhắn')
                expect(admin_composer).to_be_focused()
                expect(inbox.locator('[data-message]')).to_have_count(1)
                admin_composer.fill('Nếp sẽ tư vấn size và vị trí in cho bạn ngay tại đây.')
                inbox.get_by_role('button', name='Gửi tin nhắn', exact=True).click()
                expect(chat.locator('[data-message]')).to_have_count(2, timeout=10000)
                assert admin.url == admin_url, 'Admin popup reply navigated away'
                admin_composer.fill('Bản nháp của quản trị')
                inbox.get_by_role('button', name='Danh sách hội thoại', exact=True).click()
                count = sum(path.endswith('/messages') for _, path in admin_requests)
                admin.wait_for_timeout(4500)
                assert sum(path.endswith('/messages') for _, path in admin_requests) == count, 'Inactive admin detail keeps polling'
                inbox.get_by_test_id('support-popup-thread').click()
                expect(admin_composer).to_have_value('Bản nháp của quản trị')
                admin.wait_for_load_state('networkidle')
                admin.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
                count = len(admin_requests)
                admin.wait_for_timeout(4500)
                hidden_admin_requests = [request for request in admin_requests[count:] if '/support' in request[1]]
                assert not hidden_admin_requests, ('Hidden admin popup keeps polling or marking read', hidden_admin_requests)
                admin.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
                for width,height in [(1440,900),(768,900),(375,812),(320,667)]:
                    admin.set_viewport_size({'width':width,'height':height})
                    expect(inbox.get_by_role('button', name='Gửi tin nhắn', exact=True)).to_be_in_viewport()
                    box = inbox.bounding_box()
                    assert box['x'] >= 0 and box['y'] >= 0 and box['x'] + box['width'] <= width + 1 and box['y'] + box['height'] <= height + 1, box
                    admin.screenshot(path=str(OUT / f'admin-popup-{width}.png'))
                inbox.get_by_role('button', name='Đóng', exact=True).click()
                count = len(admin_requests)
                admin.wait_for_timeout(4500)
                assert not [request for request in admin_requests[count:] if '/support' in request[1]], 'Closed admin popup keeps polling'
                admin_context.close()
                for width,height in [(375,812),(320,667),(768,900)]:
                    page.set_viewport_size({'width':width,'height':height})
                    expect(chat.get_by_role('button', name='Gửi tin nhắn', exact=True)).to_be_in_viewport()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    box = chat.bounding_box()
                    assert box['x'] >= 0 and box['y'] >= 0 and box['x'] + box['width'] <= width + 1 and box['y'] + box['height'] <= height + 1, box
                    page.screenshot(path=str(OUT / f'customer-popup-{width}.png'))
                chat.get_by_role('link', name='Xem lịch sử trong tài khoản').click()
                page.wait_for_url('**/tai-khoan/ho-tro')
                expect(page.locator('.support-launcher')).to_have_count(0)
                expect(page.get_by_label('Nội dung tin nhắn')).to_be_visible()
                expect(page.locator('[data-message]')).to_have_count(2)
                count = requests.count(('GET','/api/support'))
                page.wait_for_timeout(4500)
                assert requests.count(('GET','/api/support')) == count, 'History page duplicates badge requests'
                assert page.evaluate("async()=>{const response=await fetch('/api/auth/logout',{method:'POST'});return response.ok}")
                page.goto(BASE + '/dang-nhap')
                expect(page.get_by_label('Email', exact=True)).to_have_count(1)
                expect(page.get_by_test_id('support-popup-login')).to_have_count(0)
                assert not errors, errors
                browser.close()
                print('PASS: inline guest login/error/focus; customer/admin popup send without navigation; saved drafts, real history, polling/read pause, 320/375/768/1440 sizing')
        finally:
            for process in reversed(processes):
                stop(process)


if __name__ == '__main__':
    run()
