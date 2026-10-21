import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { digest, fail, id, token } from './common.mjs';
import { accountEmail, orderEmail } from './email-templates.mjs';
import { resendTransport } from './email-transport.mjs';

const HOUR = 3600000;
const safeMailbox = value => typeof value === 'string' && /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(value);
function mailConfig(env, config) {
  const from = env.MAIL_FROM ?? '';
  const mailbox = from.match(/^[^<>\r\n]*<([^<>]+)>$/)?.[1] ?? from;
  const configured = env.MAIL_ENABLED === 'true' && typeof env.RESEND_API_KEY === 'string' && !!env.RESEND_API_KEY.trim() && !/[\r\n]/.test(env.RESEND_API_KEY) && !/[\r\n]/.test(from) && safeMailbox(mailbox);
  if (configured && config.production && (typeof env.MAIL_QUEUE_KEY !== 'string' || !/^[^\s]{32,512}$/.test(env.MAIL_QUEUE_KEY) || env.MAIL_QUEUE_KEY === env.RESEND_API_KEY)) {
    throw new Error('MAIL_QUEUE_KEY must be a separate private key of 32 to 512 non-whitespace characters.');
  }
  let origin = config.appOrigin ?? 'http://localhost:5173';
  try {
    const url = new URL(origin);
    if ((config.production && url.protocol !== 'https:') || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
    origin = url.origin;
  } catch { throw new Error('Mail website origin is invalid.'); }
  return { configured, from, origin };
}

export function emailService({ store, config, env = process.env, transport, now = Date.now }) {
  const { configured, from, origin } = mailConfig(env, config);
  const send = transport ?? resendTransport(env.RESEND_API_KEY);
  // Queue bodies contain private links. Encrypt at rest; token records themselves contain only SHA-256 hashes.
  // Keep this key stable when rotating provider credentials so committed jobs remain readable.
  const key = createHash('sha256').update(env.MAIL_QUEUE_KEY ?? 'local-mail-queue-development-only').digest();
  function seal(payload) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
  }
  function unseal(payload) {
    const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
    cipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    return JSON.parse(Buffer.concat([cipher.update(Buffer.from(payload.data, 'base64')), cipher.final()]).toString('utf8'));
  }
  async function enqueue(eventId, user, content, tokenId, tokenKind) {
    if (!configured || !safeMailbox(user.email)) return false;
    const jobId = digest(eventId);
    if (await store.get('email-job', jobId)) return true;
    await store.put('email-job', { id: jobId, status: 'pending', attempts: 0, createdAt: now(), nextAttemptAt: now(), userId: user.id, tokenId, tokenKind, payload: seal({ from, to: [user.email], ...content }) }, user.id);
    return true;
  }
  async function enqueueToken(user, purpose, resend = false) {
    if (!configured && config.production) fail(503, 'Email chưa được cấu hình. Vui lòng liên hệ cửa hàng.', 'EMAIL_NOT_CONFIGURED');
    const kind = purpose === 'verification' ? 'email-verification' : 'reset';
    const prior = await store.list(kind, user.id);
    if (prior.some(record => record.createdAt + 60000 > now())) {
      if (resend) fail(429, 'Vui lòng chờ 60 giây trước khi gửi lại.', 'EMAIL_COOLDOWN');
      return { queued: false };
    }
    for (const record of prior) await store.remove(kind, record.id);
    const raw = token(), hashed = digest(raw);
    await store.put(kind, { id: hashed, userId: user.id, email: user.email, createdAt: now(), expiresAt: now() + (purpose === 'verification' ? 24 * HOUR : HOUR / 2) }, user.id);
    const route = purpose === 'verification' ? '/xac-minh-email' : '/dat-lai-mat-khau';
    const link = `${origin}${route}?token=${raw}`;
    const queued = await enqueue(`${purpose}:${hashed}`, user, accountEmail(user, purpose, link), hashed, kind);
    return { queued, ...(!config.production && !configured ? { [purpose === 'verification' ? 'verificationUrl' : 'resetUrl']: `${route}?token=${raw}`, localOnly: true } : {}) };
  }
  async function claim() {
    return store.transaction(async () => {
      for (const job of await store.list('email-job')) {
        if (!(['pending', 'retry'].includes(job.status) && job.nextAttemptAt <= now()) && !(job.status === 'sending' && job.leaseUntil <= now())) continue;
        if (job.attempts >= 8) {
          await store.put('email-job', { ...job, status: 'failed', failureCode: 'ATTEMPTS_EXHAUSTED' }, job.userId);
          continue;
        }
        if (job.firstAttemptAt !== undefined && now() - job.firstAttemptAt >= 23 * HOUR) {
          await store.put('email-job', { ...job, status: 'failed', failureCode: 'RETRY_WINDOW_EXPIRED' }, job.userId);
          continue;
        }
        if (job.tokenId) {
          const record = await store.get(job.tokenKind, job.tokenId), user = await store.get('user', job.userId);
          if (!record || record.expiresAt <= now() || !user || record.email !== user.email) {
            await store.put('email-job', { ...job, status: 'cancelled', payload: undefined }, job.userId);
            continue;
          }
        }
        const leased = { ...job, status: 'sending', leaseId: id(), leaseUntil: now() + 60000, attempts: job.attempts + 1, firstAttemptAt: job.firstAttemptAt ?? now() };
        await store.put('email-job', leased, job.userId);
        return leased;
      }
      return null;
    });
  }
  const service = {
    configured,
    enqueueVerification: (user, { resend = false } = {}) => user.role === 'admin' || user.emailVerified ? { alreadyVerified: true } : store.transaction(() => enqueueToken(user, 'verification', resend)),
    enqueueReset: user => store.transaction(() => enqueueToken(user, 'reset')),
    enqueueOrder: (order, event = 'receipt') => enqueue(`order:${order.id}:${event}:${order.version ?? 1}`, { id: order.userId, email: order.customerEmail }, orderEmail(order, event, origin)),
    async verify(raw) {
      return store.transaction(async () => {
        const record = await store.get('email-verification', digest(raw));
        const user = record ? await store.get('user', record.userId) : null;
        if (!record || record.expiresAt <= now() || !user || user.email !== record.email) fail(400, 'Liên kết đã hết hạn hoặc đã sử dụng.', 'EMAIL_VERIFICATION_INVALID');
        const updated = { ...user, emailVerified: true, emailVerifiedAt: new Date(now()).toISOString() };
        await store.put('user', updated);
        await store.remove('email-verification', record.id);
        return updated;
      });
    },
    async status() {
      const jobs = await store.list('email-job');
      return { configured, pending: jobs.filter(job => ['pending', 'retry', 'sending'].includes(job.status)).length, failed: jobs.filter(job => job.status === 'failed').length, sent: jobs.filter(job => job.status === 'sent').length };
    },
    async runOnce() {
      if (!configured) return false;
      const job = await claim();
      if (!job) return false;
      let failure, payload;
      try { payload = unseal(job.payload); }
      catch { failure = { code: 'PAYLOAD_UNREADABLE', retryable: false }; }
      if (!failure) {
        try { await send(payload, `nep-${job.id}`); }
        catch (error) { failure = { code: /^HTTP_[1-5][0-9]{2}$/.test(error.mailCode) ? error.mailCode : 'TRANSPORT_UNAVAILABLE', retryable: error.retryable !== false }; }
      }
      await store.transaction(async () => {
        const current = await store.get('email-job', job.id);
        if (current?.leaseId !== job.leaseId) return;
        const retry = failure && failure.retryable && job.attempts < 8 && now() - job.firstAttemptAt < 23 * HOUR;
        await store.put('email-job', {
          ...job, status: failure ? (retry ? 'retry' : 'failed') : 'sent', leaseId: undefined, leaseUntil: undefined,
          nextAttemptAt: retry ? now() + Math.min(4 * HOUR, 30000 * 4 ** (job.attempts - 1)) : undefined,
          failureCode: failure?.code, sentAt: failure ? undefined : now(), payload: failure ? job.payload : undefined,
        }, job.userId);
      });
      return true;
    },
  };
  return service;
}

export function startEmailWorker(service, { intervalMs = 5000 } = {}) {
  let stopped = false, active = Promise.resolve();
  const tick = () => { active = active.then(async () => { if (!stopped) await service.runOnce(); }).catch(() => {}); };
  const timer = service.configured ? setInterval(tick, intervalMs) : null;
  timer?.unref();
  if (service.configured) tick();
  return { stop() { stopped = true; clearInterval(timer); }, get finished() { return active; } };
}
