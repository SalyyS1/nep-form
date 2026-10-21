import { checkPassword, digest, email, fail, hashPassword, id, password, publicUser, string, token } from './common.mjs';
import { emailService } from './email-service.mjs';

export async function currentUser(store, request) {
  const raw = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('nep_session='))?.slice(12);
  if (!raw) return null;
  const session = await store.get('session', digest(raw));
  if (!session || session.expiresAt <= Date.now()) return null;
  return await store.get('user', session.userId);
}
export function requireUser(user, admin = false) {
  if (!user) fail(401, 'Vui lòng đăng nhập.', 'UNAUTHORIZED');
  if (admin && user.role !== 'admin') fail(403, 'Bạn không có quyền truy cập.', 'FORBIDDEN');
  return user;
}
async function sessionCookie(store, response, user, config) {
  const raw = token();
  await store.put('session', { id: digest(raw), userId: user.id, expiresAt: Date.now() + 7 * 86400000 }, user.id);
  response.setHeader('Set-Cookie', `nep_session=${raw}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${config.production ? '; Secure' : ''}`);
}
async function findUser(store, address) {
  const row = await store.findIdentity(address);
  return row ? await store.get('user', row.user_id) : null;
}
export async function authRoute(ctx) {
  const { store, path, method, body, response, request, config } = ctx;
  if (method !== 'POST' || !path.startsWith('/api/auth/')) return undefined;
  const mail = ctx.mail ?? emailService({ store, config, env: {} });
  return store.transaction(async () => {
    if (path === '/api/auth/verify-email') {
      await mail.verify(string(body.token, 'Mã xác minh', 200));
      return { ok: true };
    }
    if (path === '/api/auth/resend-verification') {
      requireUser(ctx.user);
      return await mail.enqueueVerification(ctx.user, { resend: true });
    }
    if (path === '/api/auth/login') {
      const found = await findUser(store, email(body.email));
      if (!found || !checkPassword(body.password, found.passwordHash)) fail(401, 'Email hoặc mật khẩu chưa đúng.', 'UNAUTHORIZED');
      await sessionCookie(store, response, found, config);
      return { user: publicUser(found) };
    }
    if (path === '/api/auth/register') {
      const normalized = email(body.email);
      const name = string(body.name, 'Tên', 100);
      if (body.confirmPassword !== undefined && body.confirmPassword !== body.password) fail(400, 'Mật khẩu xác nhận không khớp.', 'PASSWORD_CONFIRMATION_MISMATCH');
      const secret = hashPassword(password(body.password));
      const created = await store.transaction(async () => {
        if (await findUser(store, normalized)) fail(409, 'Email đã được sử dụng.', 'EMAIL_EXISTS');
        const record = { id: id(), name, email: normalized, role: 'customer', emailVerified: false, passwordHash: secret };
        await store.put('user', record);
        await store.addIdentity(normalized, record.id);
        return record;
      });
      const verification = !config.production || mail.configured ? await mail.enqueueVerification(created) : { queued: false };
      await sessionCookie(store, response, created, config);
      return { user: publicUser(created), ...verification };
    }
    if (path === '/api/auth/logout') {
      const raw = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('nep_session='))?.slice(12);
      if (raw) await store.remove('session', digest(raw));
      response.setHeader('Set-Cookie', `nep_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.production ? '; Secure' : ''}`);
      return { ok: true };
    }
    if (path === '/api/auth/request-reset') {
      if (config.production && !mail.configured) fail(503, 'Khôi phục mật khẩu qua email chưa được cấu hình. Vui lòng liên hệ cửa hàng.', 'EMAIL_NOT_CONFIGURED');
      const found = await findUser(store, email(body.email));
      if (!found) return { ok: true };
      const reset = await mail.enqueueReset(found);
      return { ok: true, ...(!config.production && !mail.configured ? reset : {}) };
    }
    if (path === '/api/auth/reset-password') {
      if (body.confirmPassword !== undefined && body.confirmPassword !== body.password) fail(400, 'Mật khẩu xác nhận không khớp.', 'PASSWORD_CONFIRMATION_MISMATCH');
      const reset = await store.get('reset', digest(string(body.token, 'Mã khôi phục', 200)));
      if (!reset || reset.expiresAt <= Date.now()) fail(400, 'Liên kết đã hết hạn hoặc đã sử dụng.', 'RESET_INVALID');
      const secret = hashPassword(password(body.password));
      await store.transaction(async () => {
        const account = await store.get('user', reset.userId);
        if (!account || (reset.email && reset.email !== account.email)) fail(400, 'Liên kết đã hết hạn hoặc đã sử dụng.', 'RESET_INVALID');
        await store.put('user', { ...account, passwordHash: secret });
        await store.remove('reset', reset.id);
        for (const session of await store.list('session', account.id)) await store.remove('session', session.id);
      });
      return { ok: true };
    }
    return undefined;
  });
}
