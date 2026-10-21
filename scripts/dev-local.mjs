import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import net from 'node:net';

const root = process.cwd();
const record = resolve(root, 'work/local-runtime.json');
const children = [];
let ending = false;
async function portBusy(port) {
  return new Promise((done) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); done(true); });
    socket.once('error', () => done(false));
  });
}
function stop(code = 0) {
  if (ending) return; ending = true;
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
  if (existsSync(record)) unlinkSync(record);
  setTimeout(() => process.exit(code), 150).unref();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
for (const port of [3001, 5173]) {
  if (await portBusy(port)) {
    console.error(`Cổng ${port} đang được dùng. Kiểm tra tiến trình hiện tại trước khi chạy lại.`);
    process.exit(1);
  }
}
function start(args) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', (error) => { console.error(error); stop(1); });
  child.on('exit', (code) => { if (!ending) stop(code || 0); });
  return child;
}
const api = start(['server/index.mjs']);
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try { ready = (await fetch('http://127.0.0.1:3001/api/health')).ok; } catch { /* Wait for the local API to bind. */ }
  if (ready) break;
  await new Promise((done) => setTimeout(done, 250));
}
if (!ready) { console.error('API local chưa khởi động được.'); stop(1); }
else {
  const ui = start(['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort']);
  mkdirSync(resolve(root, 'work'), { recursive: true });
  writeFileSync(record, JSON.stringify({ root, runnerPid: process.pid, apiPid: api.pid, uiPid: ui.pid, ports: [3001, 5173], startedAt: new Date().toISOString() }, null, 2));
  console.log('NẾP FORM local: http://127.0.0.1:5173 · API: http://127.0.0.1:3001');
}
