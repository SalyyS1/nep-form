from pathlib import Path
import datetime
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import ipaddress
import os
import socket
import ssl
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://127.0.0.1:8443'
sys.stdout.reconfigure(encoding='utf-8')


class Proxy(BaseHTTPRequestHandler):
    def do_GET(self):
        self.forward()

    def do_POST(self):
        self.forward()

    def do_PATCH(self):
        self.forward()

    def do_DELETE(self):
        self.forward()

    def log_message(self, *_):
        pass

    def forward(self):
        connection = http.client.HTTPConnection('127.0.0.1', 3008, timeout=30)
        try:
            content = self.rfile.read(int(self.headers.get('Content-Length', 0)))
            headers = {key: value for key, value in self.headers.items() if key.lower() not in ['connection', 'host']}
            connection.request(self.command, self.path, body=content, headers=headers)
            response = connection.getresponse()
            data = response.read()
            self.send_response(response.status)
            for key, value in response.getheaders():
                if key.lower() not in ['connection', 'transfer-encoding', 'content-length']:
                    self.send_header(key, value)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        finally:
            connection.close()


def run():
    for port in [3008, 8443]:
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1', port)) == 0:
                raise RuntimeError(f'Port {port} busy; refusing to reuse any existing process')
    with tempfile.TemporaryDirectory(prefix='nep-hosted-pg-') as directory:
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, '127.0.0.1')])
        now = datetime.datetime.now(datetime.timezone.utc)
        cert = x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now - datetime.timedelta(minutes=1)).not_valid_after(now + datetime.timedelta(hours=2)).add_extension(x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address('127.0.0.1'))]), critical=False).sign(key, hashes.SHA256())
        cert_path = Path(directory) / 'test-cert.pem'
        key_path = Path(directory) / 'test-key.pem'
        cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
        key_path.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
        tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        tls.load_cert_chain(cert_path, key_path)
        proxy = ThreadingHTTPServer(('127.0.0.1', 8443), Proxy)
        proxy.socket = tls.wrap_socket(proxy.socket, server_side=True)
        thread = threading.Thread(target=proxy.serve_forever, daemon=True)
        thread.start()
        environment = {**os.environ, 'NEP_ISOLATED_PG_DIR': str(Path(directory) / 'postgres')}
        process = subprocess.Popen(['node', 'tests/server/postgres-browser-api.mjs'], cwd=ROOT, env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        try:
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError(process.stderr.read().decode(errors='replace'))
                try:
                    urllib.request.urlopen('http://127.0.0.1:3008/api/health', timeout=1).close()
                    break
                except OSError:
                    time.sleep(.2)
            else:
                raise RuntimeError('Isolated PostgreSQL API did not start')
            with sync_playwright() as driver:
                browser = driver.chromium.launch(channel='msedge', headless=True)
                context = browser.new_context(ignore_https_errors=True, viewport={'width':1440,'height':1000}, reduced_motion='no-preference')
                page = context.new_page()
                errors = []
                policy_errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda message: policy_errors.append(message.text) if message.type == 'error' and 'content security policy' in message.text.lower() else None)
                document = page.goto(BASE + '/dang-nhap')
                assert document.headers.get('x-frame-options') == 'DENY'
                assert "frame-ancestors 'none'" in document.headers.get('content-security-policy', '')
                assert "script-src 'self'" in document.headers.get('content-security-policy', '')
                expect(page.get_by_role('heading', name='Đăng nhập.', exact=True)).to_be_visible()
                expect(page.locator('.demo-accounts')).to_have_count(0)
                expect(page.get_by_text('Trải nghiệm local', exact=True)).to_have_count(0)
                page.get_by_label('Email', exact=True).fill('owner@example.test')
                page.get_by_label('Mật khẩu', exact=True).fill('PrivatePassword@2026')
                page.get_by_role('button', name='Đăng nhập', exact=True).click()
                page.wait_for_url('**/tai-khoan')
                cookies = context.cookies()
                assert any(c['name'] == 'nep_session' and c['secure'] and c['httpOnly'] for c in cookies)
                page.goto(BASE + '/quan-tri')
                expect(page.get_by_role('heading', name='Tổng quan cửa hàng', exact=True)).to_be_visible()
                expect(page.get_by_text('Cửa hàng trực tuyến', exact=True)).to_be_visible()
                expect(page.get_by_text('Dữ liệu lưu trên máy chủ', exact=True)).to_be_visible()
                page.goto(BASE + '/thiet-ke')
                expect(page.get_by_role('region', name='Bản xem trước áo', exact=True)).to_be_visible()
                # Let asynchronous Studio font assets finish before replacing the TLS document.
                page.wait_for_load_state('networkidle')
                page.goto(BASE + '/quan-tri/ho-tro')
                expect(page.get_by_role('heading', name='Hỗ trợ khách hàng', exact=True)).to_be_visible()
                page.goto(BASE + '/')
                expect(page.locator('.home-type-group').first.locator('.home-type-specimen')).to_have_count(15)
                expect(page.get_by_role('button', name='Dừng đổi mẫu áo', exact=True)).to_be_enabled(timeout=20000)
                page.wait_for_function("Array.from(document.querySelectorAll('.home-design-scene.is-active img')).every(image => image.complete && image.naturalWidth > 0)")
                page.get_by_role('button', name='Chat hỗ trợ Nếp', exact=True).click()
                popup=page.get_by_role('dialog', name='Hộp thư hỗ trợ', exact=True)
                expect(popup.get_by_text('Chưa có tin nhắn của khách.', exact=True)).to_be_visible()
                popup.get_by_role('button', name='Đóng', exact=True).click()
                page.set_viewport_size({'width':375,'height':812})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                assert not errors, errors
                assert not policy_errors, policy_errors
                page.evaluate("document.fonts.ready")
                assert page.evaluate('document.fonts.check(\'16px "Be Vietnam Pro"\')')
                page.evaluate("const probe = document.createElement('script'); probe.textContent = 'window.inlineSecurityProbe = true'; document.body.append(probe)")
                assert page.evaluate('window.inlineSecurityProbe === undefined')
                browser.close()
                print('PASS hosted HTTPS/PostgreSQL, Secure/HttpOnly auth, admin/Studio/chat/mobile, local fonts, no unexpected CSP errors, inline script blocked; isolated DB')
        finally:
            proxy.shutdown()
            proxy.server_close()
            thread.join(timeout=5)
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


if __name__ == '__main__':
    run()
