// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// Serves _site/ for a local preview, with HTTP range requests so audio and video can seek.
//   npm run serve                                               http://localhost:8080/
//   npm run serve -- --base /Hear-Here-Spatial-Practices/       as on GitHub Pages
//   npm run serve -- --port 8090
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { parseArgs } from 'node:util';
import { REPO_ROOT } from './convert.mjs';

const { values } = parseArgs({ options: { port: { type: 'string', default: '8080' }, base: { type: 'string', default: '/' } } });
const SITE = join(REPO_ROOT, '_site');
const base = `/${values.base}/`.replace(/\/+/g, '/');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf', '.bib': 'application/x-bibtex; charset=utf-8', '.ris': 'application/x-research-info-systems; charset=utf-8' };

createServer((req, res) => {
  const send = (status, headers = {}) => { res.writeHead(status, headers); res.end(); };
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400); }
  if (!path.startsWith(base)) return path === '/' ? send(302, { location: base }) : send(404);
  let file = join(SITE, normalize(path.slice(base.length)));
  if (!file.startsWith(SITE)) return send(403);
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) return send(301, { location: `${path}/` });
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) return send(404);
  const size = statSync(file).size;
  const headers = { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'accept-ranges': 'bytes', 'cache-control': 'no-cache' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  let start = 0, end = size - 1, status = 200;
  if (range && (range[1] || range[2])) {
    start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) return send(416, { 'content-range': `bytes */${size}` });
    status = 206;
    headers['content-range'] = `bytes ${start}-${end}/${size}`;
  }
  res.writeHead(status, { ...headers, 'content-length': end - start + 1 });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file, { start, end }).pipe(res);
}).listen(Number(values.port), () => console.log(`Serving _site/ at http://localhost:${values.port}${base}  (Ctrl+C to stop)`));
