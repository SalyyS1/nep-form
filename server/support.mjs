import { requireUser } from './auth.mjs';
import { digest, fail, integer, publicUser, string } from './common.mjs';

const messages = async (store, threadId) => await store.list('support-message', threadId);
export async function supportSummary(store, thread) {
  const all = await messages(store, thread.id);
  return { ...thread, customer: publicUser(await store.get('user', thread.userId)),
    lastMessage: all.at(-1)?.text.slice(0, 160) ?? '',
    adminUnread: all.filter(m => m.senderRole === 'customer' && m.sequence > thread.adminRead).length,
    customerUnread: all.filter(m => m.senderRole === 'admin' && m.sequence > thread.customerRead).length };
}
async function readMessages(store, thread, params) {
  if (!thread) return { thread: null, messages: [], hasMore: false };
  if (params.has('after')) {
    const after = integer(Number(params.get('after')), 'Mốc tin nhắn', 0, Number.MAX_SAFE_INTEGER);
    const newer = (await messages(store, thread.id)).filter(m => m.sequence > after);
    return { thread: await supportSummary(store, thread), messages: newer.slice(0, 50), hasNewer: newer.length > 50, hasMore: false };
  }
  const before = params.has('before') ? integer(Number(params.get('before')), 'Mốc tin nhắn', 1, Number.MAX_SAFE_INTEGER) : Infinity;
  const all = (await messages(store, thread.id)).filter(m => m.sequence < before);
  return { thread: await supportSummary(store, thread), messages: all.slice(-50), hasMore: all.length > 50 };
}
async function sendMessage(store, user, threadId, body) {
  const text = string(body.text, 'Tin nhắn', 2000);
  const requestId = string(body.requestId, 'Mã gửi tin', 100);
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) fail(400, 'Mã gửi tin không hợp lệ.');
  return await store.transaction(async () => {
    let thread = await store.get('support-thread', threadId);
    if (!thread) {
      if (user.role === 'admin') fail(404, 'Không tìm thấy hội thoại.', 'NOT_FOUND');
      thread = { id: threadId, userId: user.id, status: 'open', sequence: 0, adminRead: 0, customerRead: 0, version: 1, createdAt: new Date().toISOString() };
    }
    const messageId = digest(`${threadId}:${user.id}:${requestId}`);
    const existing = await store.get('support-message', messageId);
    if (existing) {
      if (existing.text !== text) fail(409, 'Mã gửi tin đã dùng cho nội dung khác.', 'MESSAGE_CONFLICT');
      return { message: existing, thread: await supportSummary(store, thread) };
    }
    const now = Date.now();
    const recent = (await messages(store, threadId)).filter(m => m.senderId === user.id && Date.parse(m.createdAt) > now - 60000);
    if (recent.length >= 20) fail(429, 'Bạn gửi hơi nhanh. Vui lòng đợi một phút rồi thử lại.', 'MESSAGE_RATE_LIMIT');
    const message = { id: messageId, sequence: thread.sequence + 1, senderId: user.id, senderRole: user.role, text, createdAt: new Date(now).toISOString() };
    const next = { ...thread, sequence: message.sequence, status: 'open', version: thread.version + 1, updatedAt: message.createdAt };
    await store.put('support-message', message, threadId);
    await store.put('support-thread', next, thread.userId);
    return { message, thread: await supportSummary(store, next) };
  });
}
export async function supportRoute({ store, user, path, method, body, request }) {
  const admin = path.startsWith('/api/admin/support');
  if (!admin && !/^\/api\/support(?:\/|$)/.test(path)) return undefined;
  if (admin && !/^\/api\/admin\/support(?:\/|$)/.test(path)) return undefined;
  requireUser(user, admin);
  const params = new URL(request.url, 'http://local').searchParams;
  if (admin && method === 'GET' && path === '/api/admin/support') {
    const query = (params.get('q') ?? '').toLocaleLowerCase('vi');
    const status = params.get('status') ?? 'all';
    if (!['all', 'open', 'resolved', 'unread'].includes(status)) fail(400, 'Bộ lọc không hợp lệ.');
    const page = integer(Number(params.get('page') ?? 1), 'Trang', 1, 1000000);
    const threads = (await Promise.all((await store.list('support-thread')).map(t => supportSummary(store, t)))).filter(t =>
      `${t.customer.name} ${t.customer.email} ${t.lastMessage}`.toLocaleLowerCase('vi').includes(query) &&
      (status === 'all' || (status === 'unread' ? t.adminUnread > 0 : t.status === status)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { threads: threads.slice((page - 1) * 20, page * 20), total: threads.length, page };
  }
  const handle = async () => {
    const match = admin ? path.match(/^\/api\/admin\/support\/([^/]+)(?:\/(messages|read))?$/) : path.match(/^\/api\/support(?:\/(messages|read))?$/);
    if (!match) return undefined;
    const threadId = admin ? match[1] : user.id;
    const action = admin ? match[2] : match[1];
    const thread = await store.get('support-thread', threadId);
    if (admin && !thread) fail(404, 'Không tìm thấy hội thoại.', 'NOT_FOUND');
    if (method === 'GET' && !action) return { thread: thread ? await supportSummary(store, thread) : null };
    if (method === 'GET' && action === 'messages') return await readMessages(store, thread, params);
    if (method === 'POST' && action === 'messages') return await sendMessage(store, user, threadId, body);
    if (method === 'PATCH' && action === 'read') {
      if (!thread) fail(404, 'Không tìm thấy hội thoại.', 'NOT_FOUND');
      const sequence = integer(body.sequence, 'Mốc đã đọc', 0, thread.sequence);
      const key = admin ? 'adminRead' : 'customerRead';
      if (sequence > thread[key]) await store.put('support-thread', { ...thread, [key]: sequence }, thread.userId);
      return { ok: true };
    }
    if (admin && method === 'PATCH' && !action) {
      if (!['open', 'resolved'].includes(body.status)) fail(400, 'Trạng thái không hợp lệ.');
      if (body.expectedVersion !== thread.version) fail(409, 'Hội thoại vừa thay đổi. Hãy tải lại.', 'THREAD_CHANGED');
      const next = { ...thread, status: body.status, version: thread.version + 1 };
      await store.transaction(async () => {
        await store.put('support-thread', next, thread.userId);
        await store.audit(user, 'support.status', { id: threadId, status: body.status });
      });
      return { thread: await supportSummary(store, next) };
    }
    return undefined;
  };
  return method === 'GET' ? handle() : store.transaction(handle);
}
