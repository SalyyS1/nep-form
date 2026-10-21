import { dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { startServer } from '../../server/index.mjs';

const dbPath = process.env.NEP_DISCOUNT_DB;
if (!dbPath) throw new Error('Isolated discount fixture database path required.');
const catalogPath = join(dirname(dbPath), 'catalog.json');
await writeFile(catalogPath, JSON.stringify([{
  id: 'discount-shirt', slug: 'ao-kiem-thu-khuyen-mai', name: 'Áo kiểm thử khuyến mãi',
  category: 'ao-thun', categoryLabel: 'Áo thun', price: 250000,
  description: 'Áo dành riêng cho kiểm thử giá SALE và mã giảm giá.', material: 'Cotton', fit: 'Relaxed',
  images: ['/images/ao-thun-kem-co-tron.webp'], colors: [{ name: 'Kem', hex: '#eee9db' }], sizes: ['M'],
  stock: 20, featured: true, isActive: true, isDemo: true,
  variants: [{ id: 'discount-shirt-kem-m', color: 'Kem', size: 'M', stock: 20 }],
}]));
const server = await startServer({
  dbPath, catalogPath, port: 3013, host: '127.0.0.1', production: false,
  appOrigin: 'http://127.0.0.1:5173', mailEnv: {},
});
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close());
