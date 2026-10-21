"""Real homepage fonts, dual garment previews, pause policy and responsive cleanup."""
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from urllib.parse import unquote
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:5173'
API = 'http://127.0.0.1:3013'
OUT = ROOT / 'work/autoplay-showcase/motion'
WIDTHS = [] if '--reduced-only' in sys.argv else [int(value) for value in sys.argv[1:]] or [375, 768, 1440]


def release_interaction(page):
    page.mouse.move(0, 0)
    page.evaluate('document.activeElement?.blur()')


def scroll_to(page, locator):
    locator.evaluate("el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-90,behavior:'instant'})")
    release_interaction(page)


def ribbon_x(track):
    return track.evaluate('el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41')


def hover_center(page, locator):
    box = locator.bounding_box()
    page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)


def verify_ribbon(page, evidence):
    ribbon = page.locator('.home-type-ribbon')
    scroll_to(page, ribbon)
    expect(ribbon).to_have_attribute('data-playing', 'true')
    groups = ribbon.locator('.home-type-group')
    expect(groups).to_have_count(2)
    expect(groups.nth(1)).to_have_attribute('aria-hidden', 'true')
    specimens = groups.first.locator('.home-type-specimen')
    expect(specimens).to_have_count(15)
    page.evaluate('document.fonts.ready')
    fonts = specimens.evaluate_all('''els=>els.map(el=>({id:el.dataset.font,
      family:getComputedStyle(el.querySelector('.home-type-word')).fontFamily,
      loaded:document.fonts.check('16px '+getComputedStyle(el.querySelector('.home-type-word')).fontFamily),
      text:el.querySelector('.home-type-word').textContent}))''')
    assert len({font['family'] for font in fonts}) == 15 and all(font['loaded'] for font in fonts), fonts
    assert all(font['text'] == 'Nét riêng của bạn.' for font in fonts)
    track = ribbon.locator('.home-type-track')
    hover_center(page, ribbon.locator('.home-type-window'))
    expect(ribbon).to_have_attribute('data-playing', 'true')
    first = ribbon_x(track)
    page.wait_for_timeout(400)
    second = ribbon_x(track)
    assert second < first - 1, ('Move left without scrolling under a stationary pointer', first, second)
    page.mouse.wheel(0, 80)
    page.wait_for_timeout(400)
    third = ribbon_x(track)
    assert third < second - 1, ('Keep moving while scrolling', second, third)
    ribbon.get_by_role('button', name='Dừng dải phông chữ', exact=True).click()
    release_interaction(page)
    expect(ribbon).to_have_attribute('data-playing', 'false')
    paused = ribbon_x(track)
    page.wait_for_timeout(400)
    assert abs(ribbon_x(track) - paused) < .1
    ribbon.get_by_role('button', name='Chạy dải phông chữ', exact=True).click()
    expect(ribbon).to_have_attribute('data-playing', 'true')
    resumed = ribbon_x(track)
    page.wait_for_timeout(400)
    assert ribbon_x(track) < resumed - 1, 'Explicit Play must resume under retained pointer and focus'
    release_interaction(page)
    expect(ribbon).to_have_attribute('data-playing', 'true')
    page.screenshot(path=str(OUT / f"fonts-{page.viewport_size['width']}.png"))
    evidence['fonts'] = fonts


def verify_showcase(page, evidence):
    showcase = page.locator('.home-design-showcase')
    scroll_to(page, showcase)
    expect(showcase).to_have_attribute('data-playing', 'true')
    expect(showcase.locator('.home-design-selectors button')).to_have_count(0)
    expect(showcase.locator('.home-design-progress button')).to_have_count(0)
    expect(showcase.locator('.home-design-scene')).to_have_count(6)
    active = showcase.locator('.home-design-scene.is-active')
    hover_center(page, showcase.locator('.home-design-stage'))
    expect(showcase).to_have_attribute('data-playing', 'true')
    fronts, backs = active.locator('.home-design-front img'), active.locator('.home-design-back img')
    for image in [fronts, backs]:
        expect(image).to_be_in_viewport(ratio=.95)
        assert image.evaluate('el=>el.complete&&el.naturalWidth>0')
    front_box, back_box = fronts.bounding_box(), backs.bounding_box()
    assert front_box['x'] + front_box['width'] <= back_box['x'] + 1, (front_box, back_box)
    heading = showcase.locator('.home-design-heading').bounding_box()
    if page.viewport_size['width'] >= 1024:
        assert heading['x'] + heading['width'] <= front_box['x'] + 1, (heading, front_box)
        assert min(heading['y'] + heading['height'], front_box['y'] + front_box['height']) > max(heading['y'], front_box['y']), (heading, front_box)
        assert min(heading['y'] + heading['height'], back_box['y'] + back_box['height']) > max(heading['y'], back_box['y']), (heading, back_box)
    initial = showcase.get_attribute('data-template')
    ids, source_pairs = [initial], []
    started = time.monotonic()
    for change in range(6):
        current = showcase.get_attribute('data-template')
        pair = [unquote(image.get_attribute('src').split(',', 1)[1]) for image in [fronts, backs]]
        assert all('<svg' in source and '<image' in source and ('<path' in source or '<text' in source) for source in pair)
        assert pair[0] != pair[1], 'Front/back must use distinct garment renderer output'
        source_pairs.append(pair)
        page.wait_for_function("old=>{const el=document.querySelector('.home-design-showcase');return el&&el.dataset.template!==old}", arg=current, timeout=5000)
        if change == 0:
            evidence['firstAutomaticChangeSeconds'] = round(time.monotonic() - started, 3)
            page.wait_for_timeout(150)
            opacities = showcase.locator('.home-design-scene').evaluate_all('els=>els.map(el=>Number(getComputedStyle(el).opacity))')
            assert sum(0 < value < 1 for value in opacities) == 2, ('Two scenes must crossfade', opacities)
        ids.append(showcase.get_attribute('data-template'))
        expect(showcase).to_have_attribute('data-playing', 'true')
    expected = ['own', 'retro-slow', 'afterhours', 'cat-day', 'wildflower', 'weekend']
    assert set(ids) == set(expected) and len(set(ids[:-1])) == 6 and ids[0] == ids[-1], ids
    assert len({pair[0] for pair in source_pairs}) == 6
    showcase.get_by_role('button', name='Dừng đổi mẫu áo', exact=True).click()
    selected = showcase.get_attribute('data-template')
    page.wait_for_timeout(4200)
    assert showcase.get_attribute('data-template') == selected
    expect(showcase).to_have_attribute('data-playing', 'false')
    showcase.get_by_role('button', name='Tự động đổi mẫu áo', exact=True).click()
    expect(showcase).to_have_attribute('data-playing', 'true')
    selected = showcase.get_attribute('data-template')
    page.wait_for_function("old=>{const el=document.querySelector('.home-design-showcase');return el&&el.dataset.template!==old}", arg=selected, timeout=5000)
    page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
    expect(showcase).to_have_attribute('data-playing', 'false')
    selected = showcase.get_attribute('data-template')
    page.wait_for_timeout(4200)
    assert showcase.get_attribute('data-template') == selected
    page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
    expect(showcase).to_have_attribute('data-playing', 'true')
    page.screenshot(path=str(OUT / f"two-faces-{page.viewport_size['width']}.png"))
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    expect(showcase).to_have_attribute('data-playing', 'false')
    selected = showcase.get_attribute('data-template')
    page.wait_for_timeout(4200)
    assert showcase.get_attribute('data-template') == selected
    assert page.locator('.pin-spacer').count() == 0
    evidence['templates'] = ids


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1', 3013)) != 0, 'Isolated fixture port 3013 busy'
    evidence = []
    with tempfile.TemporaryDirectory(prefix='nep-home-motion-') as directory:
        code = "import{startServer}from'./server/index.mjs';const s=await startServer({port:3013,dbPath:" + json.dumps(str(Path(directory)/'motion.sqlite')) + "});process.on('SIGTERM',()=>s.close());"
        process = subprocess.Popen(['node', '--input-type=module', '-e', code], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for _ in range(100):
                assert process.poll() is None, 'Isolated motion API exited'
                try: urllib.request.urlopen(API + '/api/health', timeout=1).close(); break
                except OSError: time.sleep(.2)
            else: raise AssertionError('Isolated motion API not ready')
            with sync_playwright() as driver:
                browser = driver.chromium.launch(channel='msedge', headless=True)
                try:
                    for width in WIDTHS:
                        context = browser.new_context(viewport={'width':width,'height':1000}, reduced_motion='no-preference')
                        context.route('**/api/**', lambda route: route.fulfill(response=route.fetch(url=API + route.request.url.split(BASE, 1)[1])))
                        try:
                            page = context.new_page(); errors = []
                            page.on('pageerror', lambda error: errors.append(str(error)))
                            page.goto(BASE); expect(page.locator('.custom-hero h1')).to_be_visible()
                            record = {'width':width}
                            verify_ribbon(page, record)
                            print(f'PASS ribbon {width}', flush=True)
                            verify_showcase(page, record)
                            print(f'PASS showcase {width}', flush=True)
                            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                            page.locator('.custom-primary').first.click()
                            expect(page.locator('.studio-hit-canvas')).to_be_visible()
                            expect(page.locator('.home-type-ribbon')).to_have_count(0)
                            expect(page.locator('.pin-spacer')).to_have_count(0)
                            page.locator('.studio-back').click()
                            expect(page.locator('.home-design-showcase')).to_have_count(1)
                            assert not errors, errors
                            evidence.append(record)
                        except Exception:
                            page.screenshot(path=str(OUT / f'failure-{width}.png'))
                            (OUT / f'failure-{width}.json').write_text(json.dumps({'url':page.url,'errors':errors,'body':page.locator('body').inner_text()}, ensure_ascii=False), encoding='utf-8')
                            raise
                        finally: context.close()
                    context = browser.new_context(viewport={'width':375,'height':900}, reduced_motion='reduce')
                    context.route('**/api/**', lambda route: route.fulfill(response=route.fetch(url=API + route.request.url.split(BASE, 1)[1])))
                    try:
                        page = context.new_page(); page.goto(BASE)
                        record = {'width':375,'reducedMotion':'automatic without enabling'}
                        expect(page.get_by_role('button', name='Bật chuyển động', exact=False)).to_have_count(0)
                        verify_ribbon(page, record)
                        verify_showcase(page, record)
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                        page.screenshot(path=str(OUT / 'reduced-motion-375.png'))
                        evidence.append(record)
                    except Exception:
                        page.screenshot(path=str(OUT / 'failure-reduced.png'))
                        (OUT / 'failure-reduced.json').write_text(json.dumps(page.evaluate('''()=>({
                          hidden:document.hidden,scrollY,template:document.querySelector('.home-design-showcase')?.dataset,
                          bounds:document.querySelector('.home-design-showcase')?.getBoundingClientRect().toJSON(),
                          controls:document.querySelector('.home-design-controls')?.innerText})'''),ensure_ascii=False),encoding='utf-8')
                        raise
                    finally: context.close()
                finally: browser.close()
        finally:
            process.terminate()
            try: process.wait(timeout=10)
            except subprocess.TimeoutExpired: process.kill(); process.wait(timeout=5)
    (OUT/'report.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'PASS: 15 loaded fonts keep moving under pointer; all six dual-face templates automatically loop under pointer, first change within5s; pause/hidden/offscreen; compact widths {WIDTHS}, route cleanup, automatic playback even with reduced-motion enabled.')


if __name__ == '__main__':
    run()
