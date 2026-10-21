from pathlib import Path
import json
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[2]
BASE='http://127.0.0.1:5173'
API='http://127.0.0.1:3006'
sys.stdout.reconfigure(encoding='utf-8')


def draft(page):
    page.wait_for_timeout(600)
    return page.evaluate("JSON.parse(localStorage.getItem('nep-studio-draft-v1'))")


def live_svg(page):
    image=page.locator('.studio-artboard>img')
    expect(image).to_be_visible()
    page.wait_for_function("(()=>{const img=document.querySelector('.studio-artboard>img');return img.complete&&img.naturalWidth>0})()")
    return urllib.parse.unquote(image.get_attribute('src').split(',',1)[1])


def run():
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1',3006))==0:
            raise RuntimeError('Port3006 already used; refusing duplicate API')
    with tempfile.TemporaryDirectory(prefix='nep-text-effects-') as directory:
        code="import{startServer}from'./server/index.mjs';const s=await startServer({port:3006,dbPath:"+json.dumps(str(Path(directory)/'test.sqlite'))+"});process.on('SIGTERM',()=>s.close());"
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
                page.get_by_role('tab',name='Chữ',exact=True).click()
                page.get_by_label('Chữ muốn in',exact=True).fill('NẾP CỦA MÌNH')
                page.get_by_role('button',name='Thêm chữ này lên áo').click()
                effects=page.get_by_role('region',name='Hiệu ứng chữ')
                assert '<textPath' not in live_svg(page)
                plain=page.locator('.studio-artboard>img').screenshot()
                effects.get_by_role('button',name='Cong lên',exact=True).click()
                effects.get_by_label('Độ cong chữ chính xác',exact=True).fill('75')
                effects.get_by_label('Độ cong chữ chính xác',exact=True).press('Tab')
                assert '<textPath' in live_svg(page)
                up=page.locator('.studio-artboard>img').screenshot()
                assert up!=plain,'Live shirt must visibly bend text'
                effects.get_by_label('Viền chữ',exact=True).check()
                effects.get_by_label('Màu viền chữ',exact=True).fill('#f7f5f0')
                effects.get_by_label('Độ dày viền chính xác',exact=True).fill('2.5')
                effects.get_by_label('Đổ bóng chữ',exact=True).check()
                effects.get_by_label('Màu bóng chữ',exact=True).fill('#9a482e')
                effects.get_by_label('Độ đậm bóng chính xác',exact=True).fill('80')
                effects.get_by_label('Độ mờ bóng chính xác',exact=True).fill('0')
                effects.get_by_label('Bóng lệch ngang',exact=True).fill('4')
                effects.get_by_label('Bóng lệch dọc',exact=True).fill('5')
                live_svg(page)
                combined=page.locator('.studio-artboard>img').screenshot()
                assert combined!=up,'Outline/shadow must visibly change shirt pixels'
                svg=live_svg(page)
                assert 'paint-order="stroke fill"' in svg and '<feDropShadow dx="4" dy="5"' in svg
                effects.get_by_role('button',name='Cong xuống',exact=True).click()
                live_svg(page)
                down=page.locator('.studio-artboard>img').screenshot()
                assert down!=combined
                saved_effects=draft(page)['faces']['front']['layers'][0]['textEffects']
                number=effects.get_by_label('Độ cong chữ chính xác',exact=True)
                number.fill('');number.press_sequentially('-40');number.press('Tab')
                expect(number).to_have_value('-40')
                assert draft(page)['faces']['front']['layers'][0]['textEffects']['curve']==-40
                effects.get_by_role('button',name='Cong xuống',exact=True).click()
                effects.get_by_role('button',name='Đặt lại hiệu ứng',exact=True).click()
                assert '<textPath' not in live_svg(page) and '<feDropShadow' not in live_svg(page)
                page.get_by_role('button',name='Hoàn tác',exact=True).click()
                assert draft(page)['faces']['front']['layers'][0]['textEffects']==saved_effects
                page.get_by_role('button',name='Khóa lớp',exact=True).click()
                expect(effects.get_by_label('Độ cong chữ chính xác',exact=True)).to_be_disabled()
                expect(effects.get_by_label('Viền chữ',exact=True)).to_be_disabled()
                expect(effects.get_by_role('button',name='Đặt lại hiệu ứng')).to_be_disabled()
                page.get_by_role('button',name='Mở khóa lớp',exact=True).click()
                page.get_by_role('button',name='Nhân bản lớp',exact=True).click()
                duplicated=draft(page)['faces']['front']['layers']
                assert len(duplicated)==2 and duplicated[0]['textEffects']==duplicated[1]['textEffects']
                assert duplicated[0]['id']!=duplicated[1]['id']
                path_ids=re.findall(r'<path id="(nep-text-[^"]+)"',live_svg(page))
                assert len(path_ids)==len(set(path_ids))==2
                page.get_by_role('button',name='Xóa lớp',exact=True).click()
                page.locator('.studio-layer-row').first.click()
                page.get_by_role('button',name='Cong lên',exact=True).click()
                page.get_by_role('tab',name='Hình',exact=True).click()
                page.get_by_role('button',name='Trái tim',exact=True).click()
                sticker=page.locator('.studio-hit-canvas>g>g').last.bounding_box()
                page.mouse.move(sticker['x']+sticker['width']/2,sticker['y']+sticker['height']/2)
                page.mouse.down();page.mouse.move(sticker['x']+sticker['width']/2,sticker['y']+sticker['height']/2+90,steps=6);page.mouse.up()
                expect(page.get_by_role('region',name='Hiệu ứng chữ')).to_have_count(0)
                page.get_by_role('button',name='Mặt sau',exact=True).click()
                page.get_by_role('tab',name='Chữ',exact=True).click()
                page.get_by_label('Chữ muốn in',exact=True).fill('CHỮ CONG\nHAI DÒNG')
                page.get_by_role('button',name='Thêm chữ này lên áo').click()
                page.get_by_role('button',name='Cong xuống',exact=True).click()
                assert live_svg(page).count('<textPath')==2
                front_effect=draft(page)['faces']['front']['layers'][0]['textEffects']
                page.reload()
                assert draft(page)['faces']['front']['layers'][0]['textEffects']==front_effect
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
                assert draft(page)['faces']['front']['layers'][0]['textEffects']==front_effect
                page.locator('.studio-layer-row').filter(has_text='NẾP CỦA MÌNH').click()
                for width in [375,768,1440]:
                    page.set_viewport_size({'width':width,'height':1000})
                    if width<600:
                        page.get_by_role('button',name='2. Chọn áo & đặt',exact=True).click()
                    effects=page.get_by_role('region',name='Hiệu ứng chữ')
                    effects.scroll_into_view_if_needed()
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    assert effects.evaluate('el=>el.scrollWidth<=el.clientWidth+1')
                    page.screenshot(path=str(ROOT/f'outputs/nep-text-effects-{width}.png'))
                page.get_by_role('button',name='Xem trước hai mặt',exact=True).click()
                dialog=page.get_by_role('dialog')
                assert dialog.locator('img').evaluate_all('(els)=>els.every(el=>el.complete&&el.naturalWidth>0)')
                with page.expect_download() as download:
                    dialog.get_by_role('button',name='Tải SVG mặt trước').click()
                target=Path(directory)/'effects.svg';download.value.save_as(target)
                artwork=target.read_text(encoding='utf-8')
                assert '<textPath' in artwork and '<feDropShadow' in artwork and 'stroke-width="5"' in artwork
                page.screenshot(path=str(ROOT/'outputs/nep-text-effects-shirt-preview.png'))
                assert not errors,errors
                context.close();browser.close()
                print('PASS: live pixels curve/outline/shadow, up/down/multiline, reset/undo/lock/duplicate-safe IDs, sticker coexistence, draft/save/reopen/SVG and375/768/1440; isolated DB3006.')
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill();process.wait(timeout=5)


if __name__=='__main__':
    run()
