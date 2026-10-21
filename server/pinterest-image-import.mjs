import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { fail } from './common.mjs';

const pageHosts = new Set(['pinterest.com', 'www.pinterest.com', 'pin.it']);
const imageHosts = new Set(['i.pinimg.com']);
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]]) blocked.addSubnet(address, prefix);

export function pinterestUrl(value, imageOnly = false) {
  let url;
  try { url = new URL(value); } catch { fail(400, 'Liên kết Pinterest không hợp lệ.'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !(imageHosts.has(url.hostname) || (!imageOnly && pageHosts.has(url.hostname)))) fail(400, 'Chỉ nhập trang Pinterest hoặc ảnh i.pinimg.com qua HTTPS.');
  return url;
}
export async function publicPinterestAddress(hostname, resolver = lookup) {
  // Pin the actual socket to a validated IPv4 answer; never resolve again during connect.
  const records = await resolver(hostname, { family: 4, all: true });
  if (!records.length || records.some(record => isIP(record.address) !== 4 || blocked.check(record.address))) fail(400, 'Máy chủ ảnh không được phép.');
  return records[0].address;
}

export async function downloadPinterestResource(value, { imageOnly = false, deadline = Date.now() + 10_000, redirects = 0, resolver = lookup, requestImpl = request } = {}) {
  const url = pinterestUrl(value, imageOnly);
  if (redirects > 4 || Date.now() >= deadline) fail(400, 'Liên kết chuyển hướng quá nhiều hoặc quá chậm.');
  // DNS is covered by the same overall deadline as the HTTPS download.
  let dnsTimer;
  const address = await Promise.race([publicPinterestAddress(url.hostname, resolver), new Promise((_, reject) => { dnsTimer = setTimeout(() => reject(Object.assign(new Error('Không phân giải được máy chủ Pinterest kịp thời.'), { status: 400 })), Math.max(1, deadline - Date.now())); })]).finally(() => clearTimeout(dnsTimer));
  const isImage = imageHosts.has(url.hostname);
  const limit = isImage ? 4_000_000 : 512_000;
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (error, result) => { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolve(result); };
    const req = requestImpl(url, { method: 'GET', agent: false, headers: { Accept: isImage ? 'image/*' : 'text/html', 'User-Agent': 'NepForm-ProductImage/1.0' }, lookup: (_host, options, callback) => callback(null, options.all ? [{ address, family: 4 }] : address, 4) }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.destroy();
        let next;
        try { next = pinterestUrl(new URL(response.headers.location, url), imageOnly || isImage); } catch (error) { finish(error); return; }
        downloadPinterestResource(next, { imageOnly: imageOnly || isImage, deadline, redirects: redirects + 1, resolver, requestImpl }).then(result => finish(null, result), finish);
        return;
      }
      if (response.statusCode !== 200 || Number(response.headers['content-length']) > limit) { response.destroy(); finish(Object.assign(new Error('Không tải được ảnh Pinterest hoặc nội dung quá lớn.'), { status: 400 })); return; }
      const contentType = response.headers['content-type'] || '';
      if (isImage ? !contentType.startsWith('image/') : !contentType.startsWith('text/html')) { response.destroy(); finish(Object.assign(new Error('Liên kết không trả về trang/ảnh Pinterest hợp lệ.'), { status: 400 })); return; }
      const chunks = []; let bytes = 0;
      response.on('data', chunk => { bytes += chunk.length; if (bytes > limit) { response.destroy(); finish(Object.assign(new Error('Nội dung Pinterest quá lớn.'), { status: 413 })); } else chunks.push(chunk); });
      response.on('end', () => finish(null, { data: Buffer.concat(chunks), isImage }));
      response.on('error', finish);
      response.on('aborted', () => finish(Object.assign(new Error('Tải Pinterest bị gián đoạn.'), { status: 400 })));
    });
    const timer = setTimeout(() => { req.destroy(); finish(Object.assign(new Error('Pinterest phản hồi quá chậm.'), { status: 400 })); }, Math.max(1, deadline - Date.now()));
    req.on('error', finish); req.end();
  });
}

export function pinterestImageFromHtml(html) {
  for (const tag of html.match(/<meta\b[^>]{0,8192}>/gi) || []) {
    const attributes = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), match[2]]));
    if ((attributes.property || attributes.name)?.toLowerCase() === 'og:image' && attributes.content) return pinterestUrl(attributes.content.replace(/&amp;/g, '&').replace(/&#0*38;/g, '&'), true).toString();
  }
  fail(400, 'Không đọc được ảnh từ trang Pinterest này. Hãy tải ảnh về rồi chọn tệp, hoặc dán liên kết ảnh i.pinimg.com.');
}
export async function importPinterestImage(value) {
  try {
    const deadline = Date.now() + 10_000;
    const result = await downloadPinterestResource(value, { deadline });
    if (result.isImage) return result.data;
    return (await downloadPinterestResource(pinterestImageFromHtml(result.data.toString('utf8')), { imageOnly: true, deadline })).data;
  } catch (error) {
    if (error.status) throw error;
    fail(400, 'Không tải được ảnh Pinterest. Hãy tải ảnh về rồi chọn tệp.');
  }
}
