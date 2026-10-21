import { startServer } from '../../server/index.mjs';

const dbPath = process.env.NEP_SESSION_DB;
if (!dbPath) throw new Error('Isolated session fixture database path required.');
const server = await startServer({
  dbPath, port: 3014, host: '127.0.0.1', production: false,
  appOrigin: 'http://127.0.0.1:5173', mailEnv: {},
});
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close());
