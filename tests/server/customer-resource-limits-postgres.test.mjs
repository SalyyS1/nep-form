import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { embeddedPostgres } from './postgres-test-pool.mjs';
import { initializePostgres } from '../../server/postgres-maintenance.mjs';
import { openPostgresStore } from '../../server/postgres-store.mjs';
import { consumeStudioWrite, STUDIO_DAILY_BYTE_LIMIT } from '../../server/customer-resource-limits.mjs';

test('PostgreSQL Studio budgets serialize the last write, roll back with artwork and persist after reopen', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'nep-pg-resource-'));
  const databasePath = join(directory, 'database');
  let pool = await embeddedPostgres(databasePath);
  t.after(async () => { await pool.end(); await rm(directory, { recursive: true, force: true }); });
  await initializePostgres(pool);
  let store = await openPostgresStore({ pool });
  const now = Date.now(), userId = 'pg-budget-owner', project = { name: 'Nếp riêng' };
  const bytes = Buffer.byteLength(JSON.stringify(project));
  const original = { id: userId, hourStartedAt: now, hourWrites: 29, dayStartedAt: now, dayBytes: STUDIO_DAILY_BYTE_LIMIT - bytes };
  await store.put('studio-write-budget', original, userId);
  await assert.rejects(store.transaction(async () => {
    await consumeStudioWrite(store, userId, project, now);
    await store.put('design', { id: 'rolled-back', userId, project }, userId);
    throw new Error('Failed artwork persistence');
  }));
  assert.deepEqual(await store.get('studio-write-budget', userId), original);
  assert.equal(await store.get('design', 'rolled-back'), null);
  const results = await Promise.allSettled([0, 1].map(index => store.transaction(async () => {
    await consumeStudioWrite(store, userId, project, now);
    await store.put('design', { id: `accepted-${index}`, userId, project }, userId);
  })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejection = results.find(result => result.status === 'rejected').reason;
  assert.equal(rejection.status, 429); assert.equal(rejection.code, 'STUDIO_WRITE_LIMIT');
  assert.equal(rejection.retryAfter, 86_400);
  assert.equal((await store.list('design', userId)).length, 1);
  const accepted = await store.get('studio-write-budget', userId);
  assert.equal(accepted.hourWrites, 30); assert.equal(accepted.dayBytes, STUDIO_DAILY_BYTE_LIMIT);
  await store.close();
  pool = await embeddedPostgres(databasePath); store = await openPostgresStore({ pool });
  assert.deepEqual(await store.get('studio-write-budget', userId), accepted);
  await assert.rejects(store.transaction(() => consumeStudioWrite(store, userId, project, now + 3_600_000)), { status: 429 });
  await store.transaction(() => consumeStudioWrite(store, 'pg-other-owner', project, now));
  assert.equal((await store.get('studio-write-budget', 'pg-other-owner')).hourWrites, 1);
  await store.transaction(() => consumeStudioWrite(store, userId, project, now + 86_400_000));
  const renewed = await store.get('studio-write-budget', userId);
  assert.equal(renewed.hourWrites, 1); assert.equal(renewed.dayBytes, bytes);
});
