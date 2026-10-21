from pathlib import Path
import json
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:5173'
TEST_API = 'http://127.0.0.1:3004'
sys.stdout.reconfigure(encoding='utf-8')


def draft(page):
    page.wait_for_timeout(650)
    return page.evaluate("JSON.parse(localStorage.getItem('nep-studio-draft-v1'))")


def size_dialog(page, height, weight):
    page.get_by_role('button', name='Chưa biết chọn size?', exact=True).click()
    dialog = page.get_by_role('dialog', name='Tìm size áo của bạn')
    expect(dialog.get_by_label('Chiều cao (cm)')).to_have_value('')
    expect(dialog.get_by_label('Cân nặng (kg)')).to_have_value('')
    dialog.get_by_label('Chiều cao (cm)').fill(height)
    dialog.get_by_label('Cân nặng (kg)').fill(weight)
    return dialog


def run():
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', 3004)) == 0:
            raise RuntimeError('Port 3004 already used; refusing duplicate API')
    with tempfile.TemporaryDirectory(prefix='nep-assistance-browser-') as directory:
        code = "import{startServer}from'./server/index.mjs';const s=await startServer({port:3004,dbPath:" + json.dumps(str(Path(directory) / 'test.sqlite')) + "});process.on('SIGTERM',()=>s.close());"
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
                context.route('**/api/**', lambda route: route.fulfill(response=route.fetch(url=TEST_API + route.request.url.split(BASE, 1)[1])))
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(BASE + '/thiet-ke')
                page.get_by_role('tab', name='Hình', exact=True).click()
                composer = page.get_by_role('region', name='Tự thêm chữ')
                expect(composer).to_be_visible()
                assert composer.evaluate("e => e.previousElementSibling.classList.contains('studio-shape-grid')")
                expect(composer.get_by_role('button', name='Thêm chữ này lên áo')).to_be_disabled()
                composer.get_by_label('Chữ muốn in').fill('Nếp của riêng mình')
                composer.get_by_label('File phông chữ').set_input_files({'name':'fake.ttf','mimeType':'font/ttf','buffer':b'not a font'})
                expect(composer.get_by_role('alert')).to_contain_text('Không đọc được phông')
                composer.get_by_label('File phông chữ').set_input_files(str(ROOT / 'public/fonts/lora-italic-400.ttf'))
                expect(composer.get_by_role('button', name='Phông chữ mới', exact=True)).to_contain_text('lora-italic-400.ttf')
                page.evaluate('document.fonts.ready')
                preview_family = composer.locator('.studio-text-live-preview').evaluate('e => getComputedStyle(e).fontFamily')
                assert 'nep-custom-' in preview_family
                assert page.evaluate('(family) => document.fonts.check(`25px ${family}`, "Nếp của riêng mình")', preview_family)
                composer.get_by_role('button', name='Thêm chữ này lên áo').click()
                initial = draft(page)
                font = initial['fonts'][0]
                assert initial['faces']['front']['layers'][0]['fontFamily'] == 'custom:' + font['id']
                assert page.locator('.studio-shirt-render').count() or page.locator('.studio-canvas-wrap svg').count()
                page.get_by_role('button', name='Hoàn tác', exact=True).click()
                assert not draft(page)['faces']['front']['layers']
                page.get_by_role('button', name='Làm lại', exact=True).click()
                assert draft(page)['faces']['front']['layers'][0]['text'] == 'Nếp của riêng mình'
                dialog = size_dialog(page, '168', '58,5')
                expect(dialog.locator('.size-advisor-result-heading strong')).to_have_text('M')
                dialog.get_by_role('button', name=re.compile('size M$')).click()
                assert draft(page)['size'] == 'M'
                dialog = size_dialog(page, '0', '58')
                expect(dialog.get_by_role('status')).to_contain_text('hợp lệ')
                dialog.get_by_label('Chiều cao (cm)').fill('190')
                expect(dialog.get_by_role('status')).to_contain_text('ngoài bảng')
                expect(dialog.get_by_role('status').get_by_role('button')).to_have_count(0)
                dialog.get_by_role('button', name='Đóng', exact=True).click()
                page.reload()
                assert draft(page)['fonts'][0] == font
                assert draft(page)['faces']['front']['layers'][0]['fontFamily'] == 'custom:' + font['id']
                page.get_by_role('tab', name='Chữ', exact=True).click()
                page.get_by_role('button', name='Phông chữ mới', exact=True).click()
                expect(page.get_by_role('button', name='Chọn phông lora-italic-400.ttf', exact=True)).to_be_visible()
                page.get_by_role('button', name='Phông chữ mới', exact=True).click()
                page.get_by_role('button', name='Xem trước hai mặt').click()
                preview = page.get_by_role('dialog')
                with page.expect_download() as download:
                    preview.get_by_role('button', name='Tải SVG mặt trước').click()
                target = Path(directory) / 'custom-font.svg'
                download.value.save_as(target)
                svg = target.read_text(encoding='utf-8')
                assert font['dataUrl'] in svg and 'nep-custom-' + font['id'] in svg
                preview.get_by_role('button', name='Tiếp tục thiết kế').click()
                page.get_by_role('button', name='Lưu thiết kế', exact=True).click()
                page.wait_for_url('**/dang-nhap?*')
                page.get_by_role('button', name='Khách mua hàng', exact=True).click()
                page.wait_for_url('**/thiet-ke')
                page.get_by_role('button', name='Lưu thiết kế', exact=True).click()
                expect(page.locator('.toast-stack')).to_contain_text('Đã lưu vào Thiết kế của tôi.')
                page.goto(BASE + '/tai-khoan/thiet-ke')
                page.get_by_role('link', name='Mở thiết kế', exact=True).click()
                page.wait_for_url('**/thiet-ke?ban-thiet-ke=*')
                expect(page.locator('.toast-stack')).to_contain_text('Đã mở thiết kế đã lưu.')
                assert draft(page)['fonts'][0] == font
                for width in [375,768,1440]:
                    page.set_viewport_size({'width':width,'height':1000})
                    if width < 600:
                        page.get_by_role('button', name='2. Chọn áo & đặt', exact=True).click()
                    dialog = size_dialog(page, '168', '58')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    assert dialog.evaluate('e => e.scrollWidth <= e.clientWidth + 1')
                    page.screenshot(path=str(ROOT / f'outputs/nep-size-advisor-{width}.png'))
                    dialog.get_by_role('button', name='Đóng', exact=True).click()
                    if width < 600:
                        page.get_by_role('button', name='1. Thêm thiết kế', exact=True).click()
                    page.get_by_role('tab', name='Hình', exact=True).click()
                    page.get_by_label('Chữ muốn in').scroll_into_view_if_needed()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    page.screenshot(path=str(ROOT / f'outputs/nep-text-composer-{width}.png'))
                # Exhaust the suggested size through the real isolated API; no fabricated stock response.
                admin = driver.request.new_context(base_url=TEST_API)
                assert admin.post('/api/auth/login', data={'email':'admin@nepform.local','password':'Nepform@2026!'}).ok
                catalog = admin.get('/api/admin').json()['products']
                base = next(p for p in catalog if p['id'] == initial['productId'])
                for variant in base['variants']:
                    if variant['size'] == 'M' and variant['color'] == initial['color']:
                        variant['stock'] = 0
                assert admin.patch('/api/admin/products/' + base['id'], data={**base, 'expectedVersion':base['version']}).ok
                page.reload()
                dialog = size_dialog(page, '168', '58')
                expect(dialog.get_by_role('status')).to_contain_text('hiện hết size M')
                expect(dialog.get_by_role('button', name=re.compile('size M$'))).to_be_disabled()
                dialog.get_by_role('button', name='Đóng', exact=True).click()
                product = next(p for p in catalog if p['category'] == 'ao-thun' and not p.get('isCustomBase'))
                page.goto(BASE + '/san-pham/' + product['slug'])
                dialog = size_dialog(page, '170', '65')
                expect(dialog.locator('.size-advisor-result-heading strong')).to_have_text('L')
                dialog.get_by_role('button', name='Chọn size L').click()
                expect(page.locator('.detail-sizes button.selected')).to_have_text('L')
                assert not errors, errors
                admin.dispose(); context.close(); browser.close()
                print('PASS: composer below stickers; font upload/error, undo/redo, draft/save/reopen/SVG font preservation; height/weight validation, apply/stock; Studio/product and 375/768/1440 layouts. Isolated DB.')
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill(); process.wait(timeout=5)


if __name__ == '__main__':
    run()
