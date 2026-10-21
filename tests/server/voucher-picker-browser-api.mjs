import { dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { startServer } from '../../server/index.mjs';

const dbPath = process.env.NEP_VOUCHER_DB;
if (!dbPath) throw new Error('Isolated voucher fixture database path required.');
const catalogPath = join(dirname(dbPath), 'catalog.json');
await writeFile(catalogPath, JSON.stringify([{
  id: 'voucher-shirt', slug: 'ao-kiem-thu-voucher', name: 'Áo kiểm thử voucher',
  category: 'ao-thun', categoryLabel: 'Áo thun', price: 200000,
  description: 'Áo riêng cho kiểm thử chọn ưu đãi.', material: 'Cotton', fit: 'Relaxed',
  images: ['/images/ao-thun-kem-co-tron.webp'], colors: [{ name: 'Kem', hex: '#eee9db' }], sizes: ['M'],
  stock: 40, featured: true, isActive: true, isDemo: true,
  variants: [{ id: 'voucher-shirt-kem-m', color: 'Kem', size: 'M', stock: 40 }],
}]));
const server = await startServer({
  dbPath, catalogPath, port: 3016, host: '127.0.0.1', production: false,
  appOrigin: 'http://127.0.0.1:5173', mailEnv: {},
});
// Deliberately retain the old record shape: discovery must never publish it implicitly.
await server.store.put('promotion', {
  id: 'legacy-private-voucher', code: 'LEGACYPRIVATE', label: 'Mã riêng trước cập nhật',
  type: 'fixed', value: 150000, minSubtotal: 0, maxDiscount: null,
  startsAt: null, endsAt: null, usageLimit: null, perUserLimit: null,
  isActive: true, version: 1,
});
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close());
