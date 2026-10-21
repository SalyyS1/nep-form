import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { setup, register, adminLogin } from './test-helpers.mjs';

test('support conversations enforce ownership, persist, deduplicate retries and reopen after resolution', async t => {
  const env = await setup(t); const alice = env.client(); const bob = env.client(); const admin = env.client(); const guest = env.client();
  const { data: { user } } = await register(alice, 'support-alice@example.com');
  await register(bob, 'support-bob@example.com'); await adminLogin(admin);
  assert.equal((await guest('/api/support')).status, 401);
  assert.equal((await bob('/api/admin/support')).status, 403);
  assert.equal((await alice('/api/support')).data.thread, null);
  const payload = { text: 'Tư vấn giúp mình mẫu in mặt sau nhé <script>alert(1)</script>', requestId: 'request_first_001',
    senderId: 'forged-admin', senderRole: 'admin', userId: 'another-customer', threadId: 'another-thread' };
  const first = await alice('/api/support/messages', 'POST', payload);
  assert.equal(first.status, 200); assert.equal(first.data.thread.adminUnread, 1);
  assert.equal(first.data.message.senderId, user.id);
  assert.equal(first.data.message.senderRole, 'customer');
  assert.equal(first.data.thread.id, user.id);
  assert.equal(first.data.thread.userId, user.id);
  assert.equal(first.data.thread.customer.passwordHash, undefined);
  assert.equal((await alice('/api/support/messages', 'POST', payload)).data.message.id, first.data.message.id);
  assert.equal((await alice('/api/support/messages', 'POST', { ...payload, text: 'Khác' })).status, 409);
  assert.equal((await bob('/api/support/messages')).data.messages.length, 0);
  assert.equal((await bob(`/api/support/${user.id}/messages`)).status, 404);
  assert.equal((await bob(`/api/admin/support/${user.id}/messages`)).status, 403);
  assert.equal((await admin('/api/admin/support?status=unread')).data.total, 1);
  await admin(`/api/admin/support/${user.id}/read`, 'PATCH', { sequence: 1 });
  assert.equal((await admin('/api/admin/support?status=unread')).data.total, 0);
  const reply = await admin(`/api/admin/support/${user.id}/messages`, 'POST', { text: 'Nếp hỗ trợ bạn nè.', requestId: 'reply_request_001' });
  assert.equal(reply.data.thread.customerUnread, 1);
  // Reading an older rendered cursor must not mark a newly arrived reply read.
  await alice('/api/support/read', 'PATCH', { sequence: 1 });
  assert.equal((await alice('/api/support')).data.thread.customerUnread, 1);
  assert.equal((await alice('/api/support/read', 'PATCH', { sequence: 999 })).status, 400);
  await alice('/api/support/read', 'PATCH', { sequence: 2 });
  assert.equal((await alice('/api/support')).data.thread.customerUnread, 0);
  assert.equal((await admin(`/api/admin/support/${user.id}`, 'PATCH', { status: 'resolved', expectedVersion: 1 })).status, 409);
  assert.equal((await admin(`/api/admin/support/${user.id}`, 'PATCH', { status: 'resolved', expectedVersion: reply.data.thread.version })).status, 200);
  assert.equal((await admin('/api/admin/support?status=resolved&q=support-alice')).data.total, 1);
  await alice('/api/support/messages', 'POST', { text: 'Mình hỏi thêm nhé', requestId: 'request_second_001' });
  assert.equal((await alice('/api/support')).data.thread.status, 'open');
  await env.restart();
  assert.equal((await alice('/api/support/messages')).data.messages.length, 3);
  assert.equal((await admin('/api/admin')).data.stats.supportOpen, 1);
});

test('support rejects malformed content, rate limits persistent sends and paginates without missing messages', async t => {
  const env = await setup(t); const alice = env.client(); const admin = env.client();
  const { data: { user } } = await register(alice, 'pagination@example.com'); await adminLogin(admin);
  for (const text of ['', ' ', 'x'.repeat(2001), 123, null]) assert.equal((await alice('/api/support/messages', 'POST', { text, requestId: 'request_invalid_001' })).status, 400);
  for (let i = 0; i < 20; i++) assert.equal((await alice('/api/support/messages', 'POST', { text: `Khách ${i}`, requestId: `request_alice_${i}` })).status, 200);
  assert.equal((await alice('/api/support/messages', 'POST', { text: 'Quá nhanh', requestId: 'request_alice_21' })).status, 429);
  await env.restart();
  assert.equal((await alice('/api/support/messages', 'POST', { text: 'Vẫn quá nhanh', requestId: 'request_alice_22' })).status, 429);
  // Existing successful sends remain retryable even after reaching the limit.
  assert.equal((await alice('/api/support/messages', 'POST', { text: 'Khách 0', requestId: 'request_alice_0' })).status, 200);
  for (let i = 0; i < 20; i++) await admin(`/api/admin/support/${user.id}/messages`, 'POST', { text: `Admin ${i}`, requestId: `request_admin_${i}` });
  // Age isolated fixture messages instead of making the suite sleep for a minute.
  const fixture = new DatabaseSync(env.dbPath);
  fixture.prepare("UPDATE records SET data=json_set(data,'$.createdAt',?) WHERE kind='support-message'").run(new Date(Date.now() - 120000).toISOString());
  fixture.close();
  for (let i = 20; i < 40; i++) await alice('/api/support/messages', 'POST', { text: `Khách ${i}`, requestId: `request_alice_${i}` });
  const admin2 = env.client(); const second = await register(admin2, 'second@example.com');
  // More messages by a second customer in their own thread cannot enter this thread.
  await admin2('/api/support/messages', 'POST', { text: 'Riêng tư', requestId: 'separate_request' });
  const latest = (await alice('/api/support/messages')).data;
  assert.equal(latest.messages.length, 50); assert.equal(latest.hasMore, true);
  assert.equal(latest.messages[0].sequence, 11); assert.equal(latest.messages.at(-1).sequence, 60);
  const firstPage = (await alice(`/api/support/messages?before=${latest.messages[0].sequence}`)).data;
  assert.equal(firstPage.messages.length, 10); assert.equal(firstPage.hasMore, false);
  assert.equal(new Set([...firstPage.messages, ...latest.messages].map(m => m.id)).size, 60);
  const catchup = (await alice('/api/support/messages?after=1')).data;
  assert.equal(catchup.messages[0].sequence, 2); assert.equal(catchup.messages.at(-1).sequence, 51); assert.equal(catchup.hasNewer, true);
  assert.equal((await alice('/api/support/messages?after=51')).data.messages.length, 9);
  assert.equal((await admin(`/api/admin/support/${second.data.user.id}/messages`)).data.messages.length, 1);
  const older = (await alice('/api/support/messages?before=21')).data;
  assert.equal(older.messages.length, 20); assert.equal(older.hasMore, false);
  assert.equal(older.messages.at(-1).sequence, 20);
});
