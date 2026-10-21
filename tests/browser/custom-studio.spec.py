from pathlib import Path
import base64
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
TEST_API = 'http://127.0.0.1:3003'
sys.stdout.reconfigure(encoding='utf-8')


def draft(page):
    page.wait_for_timeout(650)
    return page.evaluate("JSON.parse(localStorage.getItem('nep-studio-draft-v1'))")


def run():
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', 3003)) == 0:
            raise RuntimeError('Port 3003 already used; refusing duplicate API')
    with tempfile.TemporaryDirectory(prefix='nep-studio-browser-') as directory:
        code = "import{startServer}from'./server/index.mjs';const s=await startServer({port:3003,dbPath:" + json.dumps(str(Path(directory) / 'test.sqlite')) + "});process.on('SIGTERM',()=>s.close());"
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
            with sync_playwright() as driver:
                browser = driver.chromium.launch(channel='msedge', headless=True)
                context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
                def proxy(route):
                    response = route.fetch(url=TEST_API + route.request.url.split(BASE, 1)[1])
                    route.fulfill(response=response)
                context.route('**/api/**', proxy)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(BASE + '/thiet-ke')
                expect(page.get_by_role('heading', name='Áo của bạn.', exact=True)).to_be_visible()
                page.get_by_role('button', name='Tuyên ngôn riêng').click()
                page.get_by_role('button', name='Dùng mẫu này', exact=True).click()
                page.get_by_label('Nội dung chữ', exact=True).fill('NẾP CỦA TÔI')
                page.get_by_label('Tên thiết kế', exact=True).fill('Bản sắc Việt')
                before = draft(page)['faces']['front']['layers'][0]
                box = page.locator('.studio-hit-canvas>g>g').first.bounding_box()
                page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2)
                page.mouse.down()
                page.mouse.move(box['x'] + box['width']/2 + 30, box['y'] + box['height']/2 + 30, steps=6)
                page.mouse.up()
                moved = draft(page)['faces']['front']['layers'][0]
                assert moved['y'] != before['y'], (before, moved)
                page.get_by_role('button', name='Hoàn tác', exact=True).click()
                assert draft(page)['faces']['front']['layers'][0]['y'] == before['y']
                page.get_by_role('button', name='Làm lại', exact=True).click()
                assert draft(page)['faces']['front']['layers'][0]['y'] == moved['y']
                page.get_by_label('Xoay · độ', exact=True).fill('15')
                page.get_by_role('button', name='Nhân bản lớp').click()
                expect(page.locator('.studio-layer-row')).to_have_count(3)
                page.get_by_role('button', name='Ẩn lớp', exact=True).click()
                assert draft(page)['faces']['front']['layers'][-1]['hidden']
                page.get_by_role('button', name='Hiện lớp', exact=True).click()
                page.get_by_role('button', name='Khóa lớp', exact=True).click()
                expect(page.get_by_label('Nội dung chữ', exact=True)).to_be_disabled()
                page.get_by_role('button', name='Mở khóa lớp', exact=True).click()
                page.get_by_role('button', name='Xóa lớp', exact=True).click()
                expect(page.locator('.studio-layer-row')).to_have_count(2)
                page.get_by_role('tab', name='Tải lên', exact=True).click()
                png = base64.b64decode(page.evaluate("(()=>{const c=document.createElement('canvas');c.width=100;c.height=60;const x=c.getContext('2d');x.fillStyle='#4f5a40';x.fillRect(10,10,80,40);return c.toDataURL('image/png').split(',')[1]})()"))
                page.get_by_label('Tải logo hoặc ảnh').set_input_files({'name':'logo.png','mimeType':'image/png','buffer':png})
                expect(page.locator('.studio-layer-row')).to_have_count(3)
                page.get_by_role('button', name='Mặt sau', exact=True).click()
                page.get_by_role('tab', name='Hình', exact=True).click()
                page.get_by_role('button', name='Trái tim', exact=True).click()
                expect(page.locator('.studio-layer-row')).to_have_count(1)
                page.get_by_role('button', name='Xem trước hai mặt', exact=True).click()
                dialog = page.get_by_role('dialog')
                expect(dialog).to_be_visible()
                expect(dialog.locator('img')).to_have_count(2)
                assert dialog.locator('img').evaluate_all('(images)=>images.every(image=>image.complete&&image.naturalWidth>0)')
                with page.expect_download() as download:
                    dialog.get_by_role('button', name='Tải SVG mặt sau').click()
                target = Path(directory) / 'artwork.svg'
                download.value.save_as(target)
                assert '@font-face' in target.read_text(encoding='utf-8')
                dialog.get_by_role('button', name='Tiếp tục thiết kế').click()
                page.get_by_role('button', name='Lưu thiết kế', exact=True).click()
                page.wait_for_url('**/dang-nhap?*')
                page.get_by_role('button', name='Khách mua hàng', exact=True).click()
                page.wait_for_url('**/thiet-ke')
                expect(page.get_by_label('Tên thiết kế')).to_have_value('Bản sắc Việt')
                assert draft(page)['faces']['front']['layers'][0]['text'] == 'NẾP CỦA TÔI'
                page.get_by_role('button', name='Lưu thiết kế', exact=True).click()
                expect(page.locator('.toast-stack')).to_contain_text('Đã lưu vào Thiết kế của tôi.')
                page.goto(BASE + '/tai-khoan/thiet-ke')
                expect(page.locator('.saved-design-card')).to_have_count(1)
                page.get_by_role('link', name='Mở thiết kế', exact=True).click()
                page.wait_for_url('**/thiet-ke?ban-thiet-ke=*')
                expect(page.get_by_label('Tên thiết kế')).to_have_value('Bản sắc Việt')
                page.get_by_role('button', name='Mặt trước', exact=True).click()
                for width in [375,768,1440]:
                    page.set_viewport_size({'width':width,'height':1000})
                    page.evaluate('document.fonts.ready')
                    metrics = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                    assert metrics['scroll'] <= width+1, (width,metrics)
                    page.screenshot(path=str(ROOT / f'outputs/nep-studio-{width}.png'),full_page=False)
                page.set_viewport_size({'width':1440,'height':1000})
                page.get_by_role('button', name='Thêm áo vào giỏ', exact=True).click()
                page.wait_for_url('**/gio-hang')
                expect(page.locator('.custom-design-tag')).to_contain_text('Bản sắc Việt')
                expect(page.locator('.cart-item .custom-thumbnails img')).to_have_count(2)
                page.get_by_role('button', name='Xem thiết kế & chi phí').click()
                expect(page.get_by_role('dialog').locator('.custom-price-lines')).to_contain_text('Phụ phí in')
                page.get_by_role('dialog').get_by_role('button',name='Đóng',exact=True).click()
                page.get_by_role('link', name='Tiến hành thanh toán').click()
                page.wait_for_url('**/thanh-toan')
                page.get_by_label('Họ tên người nhận').fill('Khách custom')
                page.get_by_label('Số điện thoại',exact=True).fill('0900000004')
                page.get_by_label('Tỉnh / Thành phố').fill('TP. Hồ Chí Minh')
                page.get_by_label('Phường / Xã').fill('Phường Nếp')
                page.get_by_label('Địa chỉ chi tiết').fill('04 Đường sáng tạo')
                page.get_by_role('button', name='Xem thiết kế & chi phí').click()
                page.get_by_role('dialog').get_by_role('button',name='Đóng',exact=True).click()
                assert '/thanh-toan' in page.url, 'Preview close must not submit checkout'
                page.get_by_role('button',name='Xác nhận đặt hàng',exact=True).click()
                page.wait_for_url('**/don-hang/**')
                expect(page.locator('.custom-design-tag')).to_contain_text('Bản sắc Việt')
                page.reload()
                expect(page.locator('.custom-thumbnails img:visible')).to_have_count(2)
                page.goto(BASE + '/dang-nhap?doi-tai-khoan=1')
                page.get_by_role('button',name='Quản trị cửa hàng',exact=True).click()
                page.wait_for_url('**/quan-tri')
                page.goto(BASE + '/quan-tri/gia-custom')
                page.get_by_label('Chữ',exact=True).fill('40000')
                page.get_by_role('button',name='Lưu bảng giá',exact=True).click()
                expect(page.locator('.admin-success')).to_contain_text('Đã lưu bảng giá. Giỏ hàng dùng giá mới; đơn đã đặt giữ nguyên giá.')
                page.goto(BASE + '/quan-tri/don-hang')
                page.locator('.admin-orders-table .admin-text-button').first.click()
                admin_dialog = page.get_by_role('dialog')
                expect(admin_dialog.locator('.custom-thumbnails img:visible')).to_have_count(2)
                admin_dialog.get_by_role('button',name='Xem thiết kế & chi phí').click()
                details = page.locator('.custom-preview-dialog[open]')
                with page.expect_download() as download:
                    details.get_by_role('link',name='Tải artwork mặt trước').click()
                artwork = Path(directory)/'admin-artwork.svg'
                download.value.save_as(artwork)
                assert 'NẾP CỦA TÔI' in artwork.read_text(encoding='utf-8')
                assert not errors, errors
                context.close(); browser.close()
                print('PASS: Studio text/drag/undo/redo/rotate/duplicate/hide/lock/delete/upload/two faces/SVG export/draft login/save/reopen/custom cart/COD/admin pricing/artwork; 375/768/1440 layouts; isolated DB.')
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill(); process.wait(timeout=5)


if __name__ == '__main__':
    run()
