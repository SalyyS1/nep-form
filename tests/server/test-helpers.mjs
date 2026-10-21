import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { startServer } from '../../server/index.mjs';

export const product = {
  id: 'shirt', slug: 'test-shirt', name: 'Áo kiểm thử', category: 'ao', categoryLabel: 'Áo', price: 250000,
  description: 'Sản phẩm dùng trong test riêng biệt.', material: 'Cotton', fit: 'Relaxed', images: ['/images/test.webp'],
  colors: [{ name: 'Trắng', hex: '#ffffff' }], sizes: ['M'], stock: 3, featured: true, isActive: true, isDemo: true,
  variants: [{ id: 'shirt-m-white', size: 'M', color: 'Trắng', stock: 3 }],
};
export const address = { recipient: 'Người nhận', phone: '0901234567', province: 'TP. Hồ Chí Minh', ward: 'Bến Thành', line1: '12 Đường mẫu', isDefault: true };
export const cart = quantity => ({ productId: 'shirt', size: 'M', color: 'Trắng', quantity });
export async function setup(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'nep-api-'));
  const catalogPath = join(directory, 'catalog.json');
  if (!options.noCatalog) await writeFile(catalogPath, JSON.stringify([product]));
  const dbPath = join(directory, 'test.sqlite');
  let server = await startServer({ dbPath, catalogPath, port: 0, onError: error => console.error(error) });
  const client = () => {
    let cookie = '';
    const request = async (path, method = 'GET', body, headers = {}) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      return { status: response.status, data: await response.json(), headers: response.headers };
    };
    return request;
  };
  t.after(async () => { server.close(); await once(server, 'close'); await rm(directory, { recursive: true, force: true }); });
  return {
    client, directory, catalogPath, dbPath,
    restart: async () => { server.close(); await once(server, 'close'); server = await startServer({ dbPath, catalogPath, port: 0 }); },
  };
}
export async function register(request, email) {
  return request('/api/auth/register', 'POST', { email, password: 'Customer@2026!', name: 'Khách test' });
}
export async function adminLogin(request) {
  return request('/api/auth/login', 'POST', { email: 'admin@nepform.local', password: 'Nepform@2026!' });
}
export async function expectedQuote(request) {
  const { data } = await request('/api/bootstrap');
  const items = data.cart.map(item => ({ productId: item.productId, size: item.size, color: item.color, quantity: item.quantity, unitPrice: data.products.find(product => product.id === item.productId).price }));
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { subtotal, shipping: data.settings.shippingFee, total: subtotal + data.settings.shippingFee, items };
}
