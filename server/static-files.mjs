import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
export async function serveStatic(request, response, root) {
  if (!['GET', 'HEAD'].includes(request.method)) return false;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  let path;
  try { path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.statusCode = 400; response.end(); return true; }
  if (path.includes('\0') || path.includes('\\') || path.split('/').some(part => part.startsWith('.') && part !== '')) { response.statusCode = 404; response.end(); return true; }
  const directory = resolve(root);
  let file = resolve(directory, `.${path}`);
  if (file !== directory && !file.startsWith(directory + sep)) { response.statusCode = 404; response.end(); return true; }
  let info = await stat(file).catch(() => null);
  if (!info?.isFile()) {
    if (extname(path)) { response.statusCode = 404; response.end(); return true; }
    file = resolve(directory, 'index.html'); info = await stat(file).catch(() => null);
  }
  if (!info?.isFile()) { response.statusCode = 503; response.end('Build frontend first.'); return true; }
  response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  response.setHeader('Content-Length', info.size);
  response.setHeader('Cache-Control', extname(file) === '.html' ? 'no-cache' : path.startsWith('/assets/') ? 'public,max-age=31536000,immutable' : 'public,max-age=3600');
  if (request.method === 'HEAD') response.end();
  else await pipeline(createReadStream(file), response);
  return true;
}
