"""Read-only local-font picker/draft/export verification; never writes live accounts/DB."""
from pathlib import Path
import tempfile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:5173'


def run():
    with sync_playwright() as driver, tempfile.TemporaryDirectory(prefix='nep-font-picker-') as directory:
        browser = driver.chromium.launch(channel='msedge', headless=True)
        try:
            context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
            page = context.new_page(); errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(BASE + '/thiet-ke')
            page.get_by_role('tab', name='Hình', exact=True).click()
            composer = page.get_by_role('region', name='Tự thêm chữ')
            composer.get_by_label('Chữ muốn in').fill('Nếp riêng, chất mình.')
            composer.get_by_role('button', name='Phông chữ mới', exact=True).click()
            options = composer.locator('.font-picker-option')
            expect(options).to_have_count(17)  # 15 bundled + two backward-compatible system families.
            expect(composer.locator('.font-picker-sample').first).to_have_text('Nếp riêng, chất mình.')
            composer.get_by_role('button', name='Viết tay', exact=True).click()
            expect(options).to_have_count(4)
            sample = composer.get_by_role('button', name='Chọn phông Pacifico', exact=True).locator('.font-picker-sample')
            assert sample.evaluate('e => getComputedStyle(e).fontFamily') == 'nep-builtin-pacifico'
            page.evaluate('document.fonts.ready')
            assert page.evaluate('[...document.fonts].some(font => font.family === "nep-builtin-pacifico" && font.status === "loaded")')
            composer.get_by_role('button', name='Chọn phông Pacifico', exact=True).click()
            composer.get_by_role('button', name='Thêm chữ này lên áo').click()
            expect(page.locator('.studio-font-status')).to_have_count(0)
            page.wait_for_timeout(650)
            design = page.evaluate("JSON.parse(localStorage.getItem('nep-studio-draft-v1'))")
            assert design['faces']['front']['layers'][0]['fontFamily'] == 'builtin:pacifico'
            assert not design.get('fonts')
            page.reload()
            expect(page.locator('.studio-font-status')).to_have_count(0)
            page.get_by_role('button', name='Xem trước hai mặt').click()
            with page.expect_download() as download:
                page.get_by_role('button', name='Tải SVG mặt trước').click()
            target = Path(directory) / 'pacifico.svg'; download.value.save_as(target)
            svg = target.read_text(encoding='utf-8')
            assert '@font-face{font-family:nep-builtin-pacifico' in svg
            assert '@font-face{font-family:nep-builtin-bangers' not in svg
            page.get_by_role('button', name='Tiếp tục thiết kế').click()
            page.locator('.studio-layer-row').first.click()
            page.get_by_role('button', name='Kiểu chữ', exact=True).click()
            inspector = page.locator('.studio-layer-inspector')
            inspector.get_by_label('Tìm phông chữ').fill('Bangers')
            inspector.get_by_role('button', name='Chọn phông Bangers').click()
            expect(page.locator('.studio-font-status')).to_have_count(0)
            for width in [375,768,1440]:
                page.set_viewport_size({'width':width,'height':1000})
                if width < 600:
                    page.get_by_role('button', name='1. Thêm thiết kế').click()
                page.get_by_role('tab', name='Hình', exact=True).click()
                composer.get_by_role('button', name='Phông chữ mới', exact=True).click()
                composer.get_by_role('button', name='Nổi bật', exact=True).click()
                composer.get_by_role('button', name='Chọn phông Bangers').scroll_into_view_if_needed()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                assert composer.locator('.font-picker-panel').evaluate('e => e.scrollWidth <= e.clientWidth + 1')
                page.screenshot(path=str(ROOT / f'outputs/nep-font-library-{width}.png'))
                composer.get_by_role('button', name='Phông chữ mới', exact=True).click()
            assert not errors, errors
            context.close()
            print('PASS: 15 built-in fonts, live Vietnamese samples, grouping/search, actual font load, select/edit/draft reload/self-contained SVG; no upload quota; 375/768/1440. No live DB writes.')
        finally:
            browser.close()


if __name__ == '__main__':
    run()
