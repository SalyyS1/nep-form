import { addressFields, fail, id, integer, string } from './common.mjs';
import { requireUser } from './auth.mjs';
import { ADDRESS_LIMIT, requireCartCapacity } from './customer-resource-limits.mjs';

export async function owned(store, kind, recordId, userId) {
  const record = (await store.list(kind, userId)).find(item => item.id === recordId);
  if (!record) fail(404, 'Không tìm thấy dữ liệu.', 'NOT_FOUND');
  return record;
}
export async function availableVariant(store, productId, size, color) {
  const product = await store.get('product', productId);
  const variant = product?.variants.find(item => item.size === size && item.color === color);
  if (!product?.isActive || !variant) fail(409, 'Sản phẩm hoặc phân loại không còn bán.', 'OUT_OF_STOCK');
  return { product, variant };
}
export async function saveAddress(store, userId, input, addressId = id()) {
  const address = addressFields(input, addressId);
  const list = await store.list('address', userId);
  if (list.length >= ADDRESS_LIMIT && !list.some(item => item.id === addressId)) fail(409, 'Tối đa 20 địa chỉ đã lưu. Vui lòng sửa hoặc xóa địa chỉ hiện có.', 'ADDRESS_LIMIT');
  if (!list.length) address.isDefault = true;
  if (address.isDefault) for (const current of list) {
    if (current.id !== addressId && current.isDefault) await store.put('address', { ...current, isDefault: false }, userId);
  }
  await store.put('address', address, userId);
  // An account with addresses always has exactly one default.
  const after = await store.list('address', userId);
  if (!after.some(item => item.isDefault)) await store.put('address', { ...after[0], isDefault: true }, userId);
  return address;
}
async function addCart(store, userId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Sản phẩm trong giỏ không hợp lệ.');
  const quantity = integer(input.quantity, 'Số lượng', 1, 99);
  const productId = string(input.productId, 'Sản phẩm', 100);
  const size = string(input.size, 'Kích thước', 50);
  const color = string(input.color, 'Màu', 100);
  const { product, variant } = await availableVariant(store, productId, size, color);
  if (product.isCustomBase || input.custom !== undefined) fail(400, 'Vui lòng thêm áo thiết kế từ Studio.', 'CUSTOM_DESIGN_REQUIRED');
  const cart = await store.list('cart', userId);
  const current = cart.find(item => item.productId === productId && item.size === size && item.color === color);
  requireCartCapacity(cart, Boolean(current));
  const next = (current?.quantity ?? 0) + quantity;
  if (next > variant.stock || next > 99) fail(409, 'Số lượng vượt quá tồn kho.', 'OUT_OF_STOCK');
  await store.put('cart', { id: current?.id ?? id(), productId, size, color, quantity: next }, userId);
}
export async function customerRoute(ctx) {
  const { path, method, store, user, body } = ctx;
  if (!/^\/api\/(account|cart|addresses)(\/|$)/.test(path)) return undefined;
  requireUser(user);
  return store.transaction(async () => {
    if (method === 'PATCH' && path === '/api/account') {
      // Authentication happened before acquiring the write lock. Preserve a password
      // reset or role update that committed while this request was waiting.
      const current = await store.get('user', user.id);
      if (!current) fail(404, 'Không tìm thấy tài khoản.', 'NOT_FOUND');
      await store.put('user', { ...current, name: string(body.name, 'Tên', 100) });
      return { ok: true };
    }
    if (method === 'POST' && path === '/api/cart') {
      await store.transaction(async () => await addCart(store, user.id, body));
      return { ok: true };
    }
    if (method === 'POST' && path === '/api/cart/merge') {
      if (!Array.isArray(body.items) || body.items.length > 100) fail(400, 'Giỏ hàng không hợp lệ.');
      await store.transaction(async () => { for (const item of body.items) await addCart(store, user.id, item); });
      return { ok: true };
    }
    const cartId = path.match(/^\/api\/cart\/([^/]+)$/)?.[1];
    if (cartId && ['PATCH', 'DELETE'].includes(method)) {
      const current = await owned(store, 'cart', cartId, user.id);
      if (method === 'DELETE') await store.remove('cart', current.id);
      else {
        const quantity = integer(body.quantity, 'Số lượng', 1, 99);
        const { variant } = await availableVariant(store, current.productId, current.size, current.color);
        const otherQuantity = (await store.list('cart', user.id)).filter(item => item.id !== current.id && item.productId === current.productId && item.size === current.size && item.color === current.color).reduce((sum, item) => sum + item.quantity, 0);
        if (quantity + otherQuantity > variant.stock) fail(409, 'Số lượng vượt quá tồn kho.', 'OUT_OF_STOCK');
        await store.put('cart', { ...current, quantity }, user.id);
      }
      return { ok: true };
    }
    if (method === 'POST' && path === '/api/addresses') {
      await store.transaction(async () => await saveAddress(store, user.id, body));
      return { ok: true };
    }
    const addressId = path.match(/^\/api\/addresses\/([^/]+)$/)?.[1];
    if (addressId && ['PATCH', 'DELETE'].includes(method)) {
      const current = await owned(store, 'address', addressId, user.id);
      await store.transaction(async () => {
        if (method === 'PATCH') await saveAddress(store, user.id, { ...current, ...body }, addressId);
        else {
          await store.remove('address', addressId);
          const rest = await store.list('address', user.id);
          if (current.isDefault && rest.length) await store.put('address', { ...rest[0], isDefault: true }, user.id);
        }
      });
      return { ok: true };
    }
    return undefined;
  });
}
