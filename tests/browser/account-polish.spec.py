from pathlib import Path
import json
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
import struct
import zlib
import urllib.request
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:5173'
API = 'http://127.0.0.1:3012'

def run():
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1',3012)) != 0, 'Isolated fixture port busy'
    with tempfile.TemporaryDirectory(prefix='nep-account-polish-') as directory:
        mailbox = Path(directory) / 'mailbox.jsonl'
        environment = {**os.environ, 'NEP_POLISH_DB':str(Path(directory)/'store.sqlite'), 'NEP_POLISH_MAILBOX':str(mailbox)}
        process = subprocess.Popen(['node','tests/server/polish-browser-api.mjs'], cwd=ROOT, env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for _ in range(100):
                assert process.poll() is None, 'Isolated API exited'
                try: urllib.request.urlopen(API+'/api/health',timeout=1).close(); break
                except OSError: time.sleep(.2)
            else: raise AssertionError('Isolated API not ready')
            with sync_playwright() as driver:
                browser=driver.chromium.launch(channel='msedge',headless=True)
                context=browser.new_context(viewport={'width':1440,'height':1000})
                def proxy(route):
                    response=route.fetch(url=API+route.request.url.split(BASE,1)[1]);route.fulfill(response=response)
                context.route('**/api/**',proxy)
                page=context.new_page(); errors=[]; registrations=[]
                page.on('pageerror',lambda error: errors.append(str(error)))
                page.on('request',lambda request: registrations.append(1) if request.url.endswith('/api/auth/register') else None)
                page.goto(BASE+'/dang-nhap')
                email=page.get_by_label('Email',exact=True);password=page.get_by_label('Mật khẩu',exact=True)
                email.focus();page.keyboard.press('ArrowDown');expect(password).to_be_focused()
                page.keyboard.press('ArrowUp');expect(email).to_be_focused()
                page.keyboard.press('Tab');expect(password).to_be_focused()
                page.goto(BASE+'/dang-ky')
                name=page.get_by_label('Tên của bạn',exact=True);email=page.get_by_label('Email',exact=True)
                password=page.get_by_label('Mật khẩu',exact=True);confirm=page.get_by_label('Nhập lại mật khẩu',exact=True)
                name.fill('Khách kiểm thử');page.keyboard.press('ArrowDown');expect(email).to_be_focused()
                email.fill('polish@example.test');page.keyboard.press('ArrowDown');expect(password).to_be_focused()
                password.fill('FixturePassword@2026');page.keyboard.press('ArrowDown');expect(confirm).to_be_focused()
                confirm.fill('DifferentPassword@2026');page.get_by_role('button',name='Tạo tài khoản',exact=True).click()
                expect(page.get_by_role('alert')).to_contain_text('Hai mật khẩu chưa giống nhau')
                expect(confirm).to_be_focused();assert not registrations
                confirm.fill('FixturePassword@2026');page.get_by_role('button',name='Tạo tài khoản',exact=True).click()
                page.wait_for_url('**/tai-khoan')
                expect(page.get_by_role('region',name='Xác minh email')).to_be_visible()
                bootstrap=context.request.get(API+'/api/bootstrap').json();assert not bootstrap['user']['emailVerified']
                product=next(p for p in bootstrap['products'] if not p.get('isCustomBase') and any(v['stock']>0 for v in p['variants']))
                variant=next(v for v in product['variants'] if v['stock']>0)
                assert context.request.post(API+'/api/cart',data={'productId':product['id'],'size':variant['size'],'color':variant['color'],'quantity':1}).status==200
                page.goto(BASE+'/thanh-toan');expect(page.get_by_role('button',name='Cần xác minh email',exact=True)).to_be_disabled()
                for _ in range(80):
                    if mailbox.exists() and mailbox.read_text(encoding='utf-8').strip():break
                    time.sleep(.2)
                payload=json.loads(mailbox.read_text(encoding='utf-8').splitlines()[0])
                link=re.search(r'http://[^\s<>]+/xac-minh-email\?token=[a-f0-9]+',payload['text']).group(0)
                page.goto(link);page.get_by_role('button',name='Xác minh email',exact=True).click()
                expect(page.get_by_role('heading',name='Email đã được xác minh.',exact=True)).to_be_visible()
                assert 'token=' not in page.url
                page.goto(BASE+'/thanh-toan');expect(page.get_by_role('button',name='Xác nhận đặt hàng',exact=True)).to_be_enabled()
                page.goto(BASE+'/tai-khoan/ho-tro');expect(page.get_by_role('heading',name='Tin nhắn với Nếp',exact=True)).to_be_visible()
                expect(page.get_by_role('log',name='Lịch sử trò chuyện')).to_be_visible()
                assert context.request.post(API+'/api/auth/logout',data={}).status==200
                assert context.request.post(API+'/api/auth/login',data={'email':'admin@nepform.local','password':'Nepform@2026!'}).status==200
                page.goto(BASE+'/quan-tri/san-pham')
                page.get_by_role('button',name='Sửa '+product['name'],exact=True).click()
                picker=page.locator('.admin-image-picker')
                def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
                png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\x00'+b'\xff\x00\x00'*2+b'\x00'+b'\xff\x00\x00'*2))+chunk(b'IEND',b'')
                count=len(product['images'])
                picker.get_by_label('Tải ảnh từ thiết bị').set_input_files({'name':'shirt-photo.png','mimeType':'image/png','buffer':png})
                expect(picker.get_by_role('status').filter(has_text='Đã tải lên 1 ảnh')).to_be_visible()
                picker.get_by_role('button',name=f'Đặt ảnh {count+1} làm ảnh bìa',exact=True).click()
                uploaded=picker.locator('img').first.get_attribute('src');assert uploaded.startswith('/api/media/')
                page.get_by_role('button',name='Lưu thay đổi',exact=True).click()
                expect(page.get_by_role('heading',name='Chỉnh sửa sản phẩm',exact=True)).not_to_be_visible()
                changed=context.request.get(API+'/api/admin').json()
                assert next(p for p in changed['products'] if p['id']==product['id'])['images'][0]==uploaded
                photo=context.request.get(API+uploaded);assert photo.status==200 and photo.headers['content-type']=='image/webp'
                page.goto(BASE+'/quan-tri/cai-dat')
                expect(page.get_by_role('heading',name='Email của cửa hàng',exact=True)).to_be_visible()
                assert not errors, errors
                browser.close()
            print('PASS auth keyboard/confirmation, queued verification/checkout, support history, admin image upload/reorder/save and mail status; isolated SQL and capture-only mail')
        finally:
            process.terminate()
            try:process.wait(timeout=10)
            except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)

if __name__=='__main__':run()
