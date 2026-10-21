import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const path = resolve(root, 'work/local-runtime.json');
if (!existsSync(path)) { console.log('Không có phiên local được ghi nhận.'); process.exit(0); }
const record = JSON.parse(readFileSync(path, 'utf8'));
if (resolve(record.root) !== root) throw new Error('Runtime record không thuộc dự án này.');
for (const [key, fragment] of [['apiPid','server/index.mjs'],['uiPid','vite/bin/vite.js'],['runnerPid','scripts/dev-local.mjs']]) {
  const pid = record[key];
  if (!Number.isSafeInteger(pid) || pid < 1) continue;
  try {
    // Check the recorded command before stopping it, so reused PIDs are left alone.
    const command = execFileSync('powershell.exe', ['-NoProfile','-NonInteractive','-Command',`(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`], { encoding:'utf8', windowsHide:true }).replaceAll('\\','/');
    if (!command.includes(fragment)) { console.log(`Bỏ qua PID ${pid}: không còn là tiến trình của dự án.`); continue; }
    process.kill(pid, 'SIGTERM');
    console.log(`Đã dừng PID ${pid}.`);
  } catch (error) { if (error.code !== 'ESRCH') console.log(`PID ${pid} đã dừng hoặc không còn truy cập được.`); }
}
if (existsSync(path)) unlinkSync(path);
