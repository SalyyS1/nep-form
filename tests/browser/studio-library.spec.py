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
API = 'http://127.0.0.1:3005'
sys.stdout.reconfigure(encoding='utf-8')


def draft(page):
    page.wait_for_timeout(600)
    return page.evaluate("JSON.parse(localStorage.getItem('nep-studio-draft-v1'))")


def run():
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1',3005)) == 0:
            raise RuntimeError('Port3005 already used; refusing duplicate API')
    with tempfile.TemporaryDirectory(prefix='nep-library-') as directory:
        code="import{startServer}from'./server/index.mjs';const s=await startServer({port:3005,dbPath:"+json.dumps(str(Path(directory)/'test.sqlite'))+"});process.on('SIGTERM',()=>s.close());"
        process=subprocess.Popen(['node','--input-type=module','-e',code],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        try:
            for _ in range(60):
                if process.poll() is not None:
                    raise RuntimeError(process.stderr.read().decode(errors='replace'))
                try:
                    urllib.request.urlopen(API+'/api/health',timeout=1).close();break
                except OSError:
                    time.sleep(.2)
            with sync_playwright() as driver:
                browser=driver.chromium.launch(channel='msedge',headless=True)
                context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
                context.route('**/api/**',lambda route:route.fulfill(response=route.fetch(url=API+route.request.url.split(BASE,1)[1])))
                page=context.new_page();errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.goto(BASE+'/thiet-ke')
                expect(page.locator('.studio-template-card')).to_have_count(8)
                page.get_by_role('button',name='Retro',exact=True).click()
                expect(page.locator('.studio-template-card')).to_have_count(4)
                page.get_by_role('button',name='Chậm một nhịp',exact=True).click()
                dialog=page.get_by_role('dialog')
                expect(dialog).to_be_visible()
                dialog.get_by_label('Dòng chữ 1',exact=True).fill('Nếp ngày mới')
                dialog.get_by_role('button',name='Bảng màu Olive',exact=True).click()
                expect(dialog.get_by_role('button',name='Bảng màu Olive')).to_have_attribute('aria-pressed','true')
                dialog.get_by_role('button',name='Hình in',exact=True).click()
                assert dialog.locator('img').evaluate('img=>img.complete&&img.naturalWidth>0')
                dialog.get_by_role('button',name='Dùng mẫu này',exact=True).click()
                first=draft(page)
                assert len(first['faces']['front']['layers'])==4 and not first['faces']['back']['layers']
                assert next(layer for layer in first['faces']['front']['layers'] if layer['kind']=='text')['text']=='Nếp ngày mới'
                assert all(layer['fill'] in ['#4f5a40','#9a482e'] for layer in first['faces']['front']['layers'])
                page.get_by_role('button',name='Hoàn tác',exact=True).click()
                assert not draft(page)['faces']['front']['layers']
                page.get_by_role('button',name='Làm lại',exact=True).click()
                assert len(draft(page)['faces']['front']['layers'])==4
                page.get_by_role('button',name='Vui theo cách mình',exact=True).click()
                page.get_by_role('dialog').get_by_role('button',name='Đóng',exact=True).focus()
                page.keyboard.press('Delete')
                assert len(draft(page)['faces']['front']['layers'])==4, 'Modal keyboard must not edit underlying layers'
                page.get_by_role('button',name='Thêm vào mặt trước',exact=True).click()
                assert len(draft(page)['faces']['front']['layers'])>4
                page.get_by_role('button',name='Hoàn tác',exact=True).click()
                assert len(draft(page)['faces']['front']['layers'])==4
                page.get_by_role('button',name='Mặt sau',exact=True).click()
                page.get_by_role('button',name='Du lịch',exact=True).click()
                page.get_by_role('button',name='Lên núi thôi',exact=True).click()
                page.get_by_role('button',name='Dùng mẫu này',exact=True).click()
                expect(page.get_by_label('Màu in',exact=True)).to_be_visible()
                page.get_by_label('Màu in',exact=True).fill('#112233')
                second=draft(page)
                assert len(second['faces']['front']['layers'])==4 and len(second['faces']['back']['layers'])==5
                assert second['faces']['back']['layers'][0]['fill']=='#112233'
                page.get_by_role('button',name='Mặt trước',exact=True).click()
                page.get_by_role('tab',name='Hình',exact=True).click()
                expect(page.locator('.studio-sticker-gallery>button:not(.studio-library-more)')).to_have_count(12)
                page.get_by_role('button',name='Xem thêm 12 sticker',exact=True).click()
                expect(page.locator('.studio-sticker-gallery>button:not(.studio-library-more)')).to_have_count(24)
                page.get_by_label('Tìm sticker').fill('khong-co-sticker-nay')
                expect(page.locator('.studio-library-empty')).to_contain_text('Chưa có sticker')
                page.get_by_label('Tìm sticker').fill('buom')
                expect(page.get_by_role('button',name='Bươm bướm',exact=True)).to_be_visible()
                page.get_by_label('Tìm sticker').fill('')
                page.get_by_role('button',name='Dễ thương',exact=True).click()
                expect(page.locator('.studio-sticker-gallery>button:not(.studio-library-more)')).to_have_count(8)
                page.get_by_role('button',name='Mèo nhỏ',exact=True).click()
                for _ in range(14):
                    page.get_by_role('button',name='Trái tim',exact=True).click()
                assert len(draft(page)['faces']['front']['layers'])==19
                page.get_by_role('tab',name='Mẫu',exact=True).click()
                page.get_by_role('button',name='Tối giản',exact=True).click()
                page.get_by_role('button',name='Tuyên ngôn riêng',exact=True).click()
                page.get_by_role('button',name='Thêm vào mặt trước',exact=True).click()
                expect(page.get_by_role('dialog').get_by_role('alert')).to_contain_text('tối đa 20 lớp')
                assert len(draft(page)['faces']['front']['layers'])==19
                page.get_by_role('button',name='Thay thiết kế mặt này',exact=True).click()
                assert len(draft(page)['faces']['front']['layers'])==2
                page.get_by_role('button',name='Hoàn tác',exact=True).click()
                assert len(draft(page)['faces']['front']['layers'])==19
                assert len(draft(page)['faces']['back']['layers'])==5
                page.get_by_role('button',name='Làm lại',exact=True).click()
                page.get_by_role('button',name='Lưu thiết kế',exact=True).click()
                page.wait_for_url('**/dang-nhap?*')
                page.get_by_role('button',name='Khách mua hàng',exact=True).click()
                page.wait_for_url('**/thiet-ke')
                page.get_by_role('button',name='Lưu thiết kế',exact=True).click()
                expect(page.locator('.toast-stack')).to_contain_text('Đã lưu vào Thiết kế của tôi.')
                page.goto(BASE+'/tai-khoan/thiet-ke')
                page.get_by_role('link',name='Mở thiết kế',exact=True).click()
                page.wait_for_url('**/thiet-ke?ban-thiet-ke=*')
                expect(page.locator('.toast-stack')).to_contain_text('Đã mở thiết kế đã lưu.')
                assert draft(page)['faces']['back']['layers'][0]['shape']=='compass'
                for width in [375,768,1440]:
                    page.set_viewport_size({'width':width,'height':1000})
                    if width<600:
                        page.get_by_role('button',name='1. Thêm thiết kế').click()
                    page.get_by_role('tab',name='Mẫu',exact=True).click()
                    page.get_by_role('button',name='Retro',exact=True).click()
                    page.get_by_role('button',name='Chậm một nhịp',exact=True).scroll_into_view_if_needed()
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    page.screenshot(path=str(ROOT/f'outputs/nep-template-library-{width}.png'))
                    page.get_by_role('button',name='Chậm một nhịp',exact=True).click()
                    dialog=page.get_by_role('dialog')
                    expect(dialog).to_be_visible()
                    assert dialog.evaluate('el=>el.scrollWidth<=el.clientWidth+1')
                    page.screenshot(path=str(ROOT/f'outputs/nep-template-preview-{width}.png'))
                    dialog.get_by_role('button',name='Đóng',exact=True).click()
                    page.get_by_role('tab',name='Hình',exact=True).click()
                    page.get_by_role('button',name='Thiên nhiên',exact=True).click()
                    page.get_by_role('button',name='Bươm bướm',exact=True).scroll_into_view_if_needed()
                    page.screenshot(path=str(ROOT/f'outputs/nep-sticker-library-{width}.png'))
                assert not errors,errors
                context.close();browser.close()
                print('PASS: templates/stickers styles/search/load-more, live quick text/palette/preview, append/replace/undo/per-face/20-layer limit, edit/save/reopen,375/768/1440; isolated DB3005.')
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill();process.wait(timeout=5)


if __name__=='__main__':
    run()
