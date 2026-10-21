import { dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { startServer } from '../../server/index.mjs';

const dbPath = process.env.NEP_ELIGIBILITY_DB;
if (!dbPath) throw new Error('Isolated eligibility fixture database path required.');
const catalogPath = join(dirname(dbPath), 'catalog.json');
const shirt = {
  id: 'eligibility-shirt', slug: 'ao-kiem-thu-dieu-kien', name: 'Áo kiểm thử điều kiện',
  category: 'ao-thun', categoryLabel: 'Áo thun', price: 200000,
  description: 'Áo dành riêng cho kiểm thử điều kiện khuyến mãi.', material: 'Cotton', fit: 'Relaxed',
  images: ['/images/ao-thun-kem-co-tron.webp'], colors: [{ name: 'Kem', hex: '#eee9db' }], sizes: ['M'],
  stock: 40, featured: true, isActive: true, isDemo: true,
  variants: [{ id: 'eligibility-shirt-kem-m', color: 'Kem', size: 'M', stock: 40 }],
};
await writeFile(catalogPath, JSON.stringify([shirt, {
  ...shirt, id: 'eligibility-blank', slug: 'phoi-kiem-thu-dieu-kien', name: 'Phôi kiểm thử điều kiện',
  isCustomBase: true, variants: [{ id: 'eligibility-blank-kem-m', color: 'Kem', size: 'M', stock: 40 }],
}]));
const server = await startServer({
  dbPath, catalogPath, port: 3015, host: '127.0.0.1', production: false,
  appOrigin: 'http://127.0.0.1:5173', mailEnv: {},
});
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close());
