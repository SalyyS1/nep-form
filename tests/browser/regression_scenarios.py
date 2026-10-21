from playwright.sync_api import expect

def verify_cart_and_price_conflicts(driver, admin_page, proxy, base, api_base):
    admin = driver.request.new_context(base_url=api_base)
    response = admin.post('/api/auth/login', data={'email':'admin@nepform.local','password':'Nepform@2026!'})
    assert response.ok
    customer_context = driver.chromium.launch(channel='msedge', headless=True)
    context = customer_context.new_context(viewport={'width':1440,'height':1000})
    context.route('**/api/**', proxy)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(base + '/cua-hang')
        page.locator('.product-image').first.click()
        page.get_by_role('button', name='S', exact=True).click()
        page.get_by_role('button', name='Thêm vào giỏ hàng', exact=True).click()
        product = admin.get('/api/admin').json()['products'][0]
        changed = {**product, 'expectedVersion':product['version'], 'variants':[{**v, 'stock':0 if v['size']=='S' else v['stock']} for v in product['variants']]}
        assert admin.patch('/api/admin/products/' + product['id'], data=changed).ok
        page.goto(base + '/gio-hang')
        page.get_by_role('link', name='Đăng nhập để đặt hàng').click()
        page.get_by_role('button', name='Khách mua hàng', exact=True).click()
        page.wait_for_url('**/gio-hang')
        expect(page.locator('.pending-cart-panel')).to_be_visible()
        expect(page.locator('.pending-cart-panel')).to_contain_text('Tạm hết hàng')
        assert page.evaluate("fetch('/api/bootstrap').then(r=>r.json()).then(d=>d.user.email)") == 'khach@nepform.local'
        page.reload()
        expect(page.locator('.pending-cart-panel')).to_be_visible()
        page.locator('.pending-cart-panel .icon-button').click()
        expect(page.locator('.pending-cart-panel')).to_have_count(0)
        assert page.evaluate("JSON.parse(localStorage.getItem('nep-form-guest-cart')).length") == 0

        product = admin.get('/api/admin').json()['products'][0]
        restored = {**product, 'expectedVersion':product['version'], 'variants':[{**v, 'stock':2 if v['size']=='S' else v['stock']} for v in product['variants']]}
        assert admin.patch('/api/admin/products/' + product['id'], data=restored).ok
        admin_page.goto(base + '/quan-tri/san-pham')
        admin_page.locator('.admin-product-table .admin-text-button').first.click()
        editor = admin_page.get_by_role('dialog')
        editor.get_by_label('Giá bán (đ)', exact=True).fill('349000')
        page.goto(base + '/cua-hang')
        page.locator('.product-image').first.click()
        page.get_by_role('button', name='S', exact=True).click()
        page.get_by_role('button', name='Thêm vào giỏ hàng', exact=True).click()
        page.goto(base + '/thanh-toan')
        expect(page.get_by_role('button', name='Xác nhận đặt hàng')).to_be_visible()
        before_count = len(admin.get('/api/admin').json()['orders'])
        assert admin.patch('/api/admin/settings', data={'shippingFee':65000}).ok
        page.get_by_role('button', name='Xác nhận đặt hàng').click()
        expect(page.locator('.error-text')).to_contain_text('vừa thay đổi')
        expect(page.locator('.checkout-summary')).to_contain_text('65.000')
        assert len(admin.get('/api/admin').json()['orders']) == before_count
        page.get_by_role('button', name='Xác nhận đặt hàng').click()
        page.wait_for_url('**/don-hang/**')
        expect(page.get_by_role('heading', name='Cảm ơn bạn đã chọn Nếp.')).to_be_visible()
        editor.get_by_role('button', name='Lưu thay đổi', exact=True).click()
        expect(editor.locator('.admin-error')).to_contain_text('vừa thay đổi')
        current = admin.get('/api/admin').json()['products'][0]
        assert current['price'] == product['price']
        assert next(v['stock'] for v in current['variants'] if v['size']=='S') == 1
        admin_page.keyboard.press('Escape')
        assert not errors, errors
        print('PASS regressions: failed guest merge stays visible after login/reload; changed quote requires reconfirmation; stale admin stock save rejected.')
    finally:
        context.close()
        customer_context.close()
        admin.dispose()
