import { appendFile } from 'node:fs/promises';
import { startServer } from '../../server/index.mjs';

if (!process.env.NEP_POLISH_DB || !process.env.NEP_POLISH_MAILBOX) throw Error('Isolated fixture paths required');
const server = await startServer({
  dbPath: process.env.NEP_POLISH_DB, port: 3012, host: '127.0.0.1', production: false, appOrigin: 'http://127.0.0.1:5173',
  mailEnv: { MAIL_ENABLED: 'true', RESEND_API_KEY: 'isolated-browser-test-key', MAIL_FROM: 'NẾP FORM <hello@example.test>' },
  mailTransport: async payload => { await appendFile(process.env.NEP_POLISH_MAILBOX, JSON.stringify(payload) + '\n'); },
});
process.on('SIGTERM', () => server.close());
