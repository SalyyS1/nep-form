from pathlib import Path
import json
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:5173'
API = 'http://127.0.0.1:3007'
sys.stdout.reconfigure(encoding='utf-8')


def run():
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', 3007)) == 0:
            raise RuntimeError('Port 3007 busy; refusing to reuse another database')
    with tempfile.TemporaryDirectory(prefix='nep-admin-support-') as directory:
        database = str(Path(directory) / 'support.sqlite')
        code = "import{startServer}from'./server/index.mjs';const s=await startServer({port:3007,dbPath:" + json.dumps(database) + "});process.on('SIGTERM',()=>s.close());"
        process = subprocess.Popen(['node', '--input-type=module', '-e', code], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        try:
            for _ in range(60):
                if process.poll() is not None:
                    raise RuntimeError(process.stderr.read().decode(errors='replace'))
                try:
                    urllib.request.urlopen(API + '/api/health', timeout=1).close()
                    break
                except OSError:
                    time.sleep(.2)
            else:
                raise RuntimeError('Isolated API failed to start')
            with sync_playwright() as driver:
                browser = driver.chromium.launch(channel='msedge', headless=True)
                contexts = [browser.new_context(viewport={'width': 1440, 'height': 1000}) for _ in range(2)]
                errors = []
                for context in contexts:
                    def proxy(route):
                        response = route.fetch(url=API + route.request.url.split(BASE, 1)[1])
                        route.fulfill(response=response)
                    context.route('**/api/**', proxy)
                customer, admin = [context.new_page() for context in contexts]
                for page in [customer, admin]:
                    page.on('pageerror', lambda error: errors.append(str(error)))
                customer.goto(BASE + '/dang-nhap')
                customer.get_by_role('button', name='Khách mua hàng', exact=True).click()
                customer.wait_for_url('**/tai-khoan')
                # Prepare an order through the real API; checkout itself has its own browser journey.
                order = customer.evaluate('''async () => {
                    const call = async (path, body) => {
                      const r = await fetch('/api' + path, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {});
                      const data = await r.json(); if (!r.ok) throw new Error(data.error); return data;
                    };
                    let b = await call('/bootstrap');
                    const p = b.products.find(p => !p.isCustomBase && p.variants.some(v => v.stock > 0));
                    const v = p.variants.find(v => v.stock > 0);
                    await call('/cart', {productId:p.id,size:v.size,color:v.color,quantity:1});
                    b = await call('/bootstrap');
                    const items = b.cart.map(i => ({productId:i.productId,size:i.size,color:i.color,quantity:i.quantity,unitPrice:b.products.find(p=>p.id===i.productId).price}));
                    const subtotal = items.reduce((s,i)=>s+i.unitPrice*i.quantity,0);
                    return (await call('/orders', {paymentMethod:'cod',idempotencyKey:crypto.randomUUID(),address:{recipient:'Khách demo',phone:'0900000000',province:'TP. Hồ Chí Minh',ward:'Bến Thành',line1:'Địa chỉ kiểm thử'},expectedQuote:{subtotal,shipping:b.settings.shippingFee,total:subtotal+b.settings.shippingFee,items}})).order;
                }''')
                expect(customer.get_by_role('button', name='Chat hỗ trợ Nếp')).to_be_visible()
                customer.get_by_role('button', name='Chat hỗ trợ Nếp').click()
                chat = customer.get_by_role('dialog', name='Trò chuyện cùng Nếp')
                expect(chat.get_by_text('Bạn cần tư vấn mẫu in, size áo hay đơn hàng?', exact=False)).to_be_visible()
                chat.get_by_label('Nội dung tin nhắn').fill('Mình muốn in logo mặt trước và chữ cong sau áo, Nếp tư vấn giúp mình nhé.')
                chat.get_by_role('button', name='Gửi tin nhắn', exact=True).click()
                expect(chat.locator('[data-message]')).to_have_count(1)
                admin.goto(BASE + '/dang-nhap')
                admin.get_by_role('button', name='Quản trị cửa hàng', exact=True).click()
                admin.wait_for_url('**/quan-tri')
                expect(admin.get_by_text('1 hội thoại', exact=True)).to_be_visible()
                admin.goto(BASE + '/quan-tri/ho-tro')
                expect(admin.locator('.admin-thread')).to_have_count(1)
                expect(admin.locator('.admin-thread>b')).to_have_text('1')
                admin.locator('.admin-thread').click()
                expect(admin.locator('[data-message]')).to_have_count(1)
                admin.get_by_label('Nội dung tin nhắn').fill('Được bạn nhé! Nếp sẽ kiểm tra logo, gợi ý khổ in và báo phí trước khi sản xuất.')
                admin.get_by_role('button', name='Gửi tin nhắn', exact=True).click()
                expect(chat.locator('[data-message]')).to_have_count(2, timeout=10000)
                expect(admin.locator('.admin-thread>b')).to_have_count(0, timeout=10000)
                admin.get_by_role('button', name='Đánh dấu đã xử lý', exact=True).click()
                expect(admin.locator('.support-state')).to_have_text('Đã xử lý')
                expect(chat.locator('.support-state')).to_have_text('Đã xử lý', timeout=10000)
                chat.get_by_label('Nội dung tin nhắn').fill('Mình gửi thêm ý tưởng: dòng chữ “Mặc điều mình thích” bằng font Việt nha.')
                chat.get_by_role('button', name='Gửi tin nhắn', exact=True).click()
                expect(admin.locator('.support-state')).to_have_text('Đang hỗ trợ', timeout=10000)
                expect(admin.locator('[data-message]')).to_have_count(3)
                admin.reload()
                admin.locator('.admin-thread').click()
                expect(admin.locator('[data-message]')).to_have_count(3)
                out = ROOT / 'outputs'
                out.mkdir(exist_ok=True)
                admin.screenshot(path=str(out / 'nep-admin-support-1440.png'), full_page=True)
                customer.screenshot(path=str(out / 'nep-customer-chat.png'))
                for width in [768, 375]:
                    admin.set_viewport_size({'width': width, 'height': 1000})
                    expect(admin.get_by_label('Nội dung tin nhắn')).to_be_visible()
                    assert admin.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'admin overflow at {width}'
                    admin.screenshot(path=str(out / f'nep-admin-support-{width}.png'), full_page=True)
                    customer.set_viewport_size({'width': width, 'height': 812})
                    expect(chat.get_by_role('button', name='Gửi tin nhắn', exact=True)).to_be_in_viewport()
                    if width == 375:
                        admin.get_by_role('button', name='Danh sách hội thoại').click()
                        expect(admin.locator('.admin-thread')).to_be_visible()
                        admin.locator('.admin-thread').click()
                        expect(admin.get_by_label('Nội dung tin nhắn')).to_be_visible()
                admin.set_viewport_size({'width':1440,'height':1000})
                chat.get_by_role('button', name='Đóng', exact=True).click()
                admin.get_by_label('Nội dung tin nhắn').fill('Bạn có thể xem mã vận đơn trong trang chi tiết đơn hàng nhé.')
                admin.get_by_role('button', name='Gửi tin nhắn', exact=True).click()
                expect(customer.locator('.support-launcher>b')).to_have_text('1', timeout=15000)
                customer.get_by_role('button', name='Chat hỗ trợ Nếp').click()
                expect(chat.locator('[data-message]')).to_have_count(4)
                expect(customer.locator('.support-launcher>b')).to_have_count(0, timeout=10000)
                admin.goto(BASE + '/quan-tri/don-hang')
                admin.get_by_role('button', name=order['code'], exact=True).click()
                detail = admin.get_by_role('dialog')
                detail.get_by_label('Đơn vị vận chuyển', exact=True).fill('Nếp giao hàng')
                detail.get_by_label('Mã vận đơn', exact=True).fill('NEP-DEMO-001')
                detail.get_by_label('Trạng thái đơn', exact=True).select_option('confirmed')
                detail.get_by_role('button', name='Lưu thay đổi', exact=True).click()
                expect(detail.get_by_text('Đã cập nhật đơn hàng.', exact=True)).to_be_visible()
                expect(detail.locator('.admin-order-history').get_by_text('Cập nhật đơn hàng · Đã xác nhận · Chưa thu tiền')).to_be_visible()
                chat.get_by_role('button', name='Đóng', exact=True).click()
                customer.goto(BASE + '/don-hang/' + order['id'])
                expect(customer.locator('.order-note').get_by_text('Mã vận đơn: NEP-DEMO-001', exact=False)).to_be_visible()
                admin.goto(BASE + '/quan-tri/nhat-ky')
                expect(admin.get_by_role('heading', name='Nhật ký hoạt động')).to_be_visible()
                expect(admin.locator('.admin-audit-event')).to_have_count(2)
                admin.goto(BASE + '/quan-tri')
                expect(admin.get_by_role('heading', name='Nhịp cửa hàng · 14 ngày')).to_be_visible()
                expect(admin.locator('.admin-chart-day')).to_have_count(14)
                admin.screenshot(path=str(out / 'nep-admin-dashboard.png'), full_page=True)
                assert not errors, errors
                browser.close()
                print('PASS customer/admin support, polling/read/resolve/reopen/persistence, audit/dashboard, 375/768/1440')
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


if __name__ == '__main__':
    run()
