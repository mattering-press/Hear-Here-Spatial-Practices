// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// Copies the page images of a zine on the Internet Archive into the repository, once, on your own computer. Not part of
// the build ("Plan: documents and zines" in DEVELOPMENT.md).
//
//   cd everytrick && npm run fetch-zine -- <archive.org identifier>       e.g. npm run fetch-zine -- trauma-body-and-home
//   npm run fetch-zine -- <identifier> --dry-run                             says what it would fetch, and writes nothing
//
// It reads the item's metadata (https://archive.org/metadata/<identifier>), downloads its "Single Page Processed JP2
// ZIP" (the pages as archive.org made them from the uploaded file, about 12 MB for a zine of 40 pages), leaves out any
// page that archive.org's scandata marks as not part of the book, and writes every page as a JPEG at full size and
// quality 85:
//   media/zines/<identifier>/page-001.jpg, page-002.jpg, …
//   media/zines/<identifier>/zine.json      where the pages came from, when they were fetched, and how many there are
// The build makes the zoom tiles and the smaller images from these files, and the zine's page on the site
// (/read/<name>/) says it is a copy: archive.org keeps the original, and the download links to it there. Running the
// script again replaces the pages, so to correct a zine, correct it on archive.org and run the script again.
//
// Needs unzip, and something that reads JPEG 2000: on macOS sips, which is built in, and for the pages sips cannot read
// (archive.org stores a blank page as a palette image, which sips refuses) opj_decompress from OpenJPEG
// (brew install openjpeg). Elsewhere opj_decompress for every page (Debian and Ubuntu: sudo apt-get install
// libopenjp2-tools unzip). sharp, which the toolkit installs with npm ci, writes the JPEGs.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JPEG = { quality: 85, mozjpeg: true };
const PAGES_FORMAT = 'Single Page Processed JP2 ZIP';

const fail = (message) => { console.error(message); process.exit(1); };
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
if (!id) fail('Which item? Give its archive.org identifier, the part of its address after /details/: npm run fetch-zine -- trauma-body-and-home');
if (!/^[A-Za-z0-9][\w.-]*$/.test(id)) fail(`"${id}" is not an archive.org identifier (letters, digits, dots, hyphens and underscores, as in https://archive.org/details/<identifier>)`);

const has = (command, probe) => !spawnSync(command, probe, { stdio: 'ignore' }).error;
const decoders = [
  process.platform === 'darwin' && has('sips', ['--help']) && 'sips',
  has('opj_decompress', ['-h']) && 'opj_decompress',
].filter(Boolean);
if (!has('unzip', ['-v'])) fail('unzip is needed to open archive.org\'s ZIP of page images (Debian and Ubuntu: sudo apt-get install unzip).');
if (!decoders.length) fail('Nothing here reads JPEG 2000, the format of archive.org\'s page images. Install OpenJPEG: brew install openjpeg on macOS, sudo apt-get install libopenjp2-tools on Debian and Ubuntu.');

const download = `https://archive.org/download/${id}/`;
const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) fail(`${url} answered ${response.status} ${response.statusText}`);
  return response.json();
};

// 1. The item's metadata: its title, and its files.
const item = await getJson(`https://archive.org/metadata/${id}`);
if (!item.metadata || item.metadata.identifier !== id) fail(`archive.org has no item ${id} (https://archive.org/details/${id})`);
const files = item.files || [];
const zip = files.find((f) => f.format === PAGES_FORMAT);
if (!zip) fail(`${id} has no "${PAGES_FORMAT}" among its files, so it has no page images to copy. Is it a text (a book or a zine) on archive.org?`);
const scandata = files.find((f) => f.format === 'Scandata');
const folder = join(REPO_ROOT, 'media', 'zines', id);
const fileUrl = (name) => download + name.split('/').map(encodeURIComponent).join('/');
console.log(`${item.metadata.title || id} (https://archive.org/details/${id})\n  pages: ${zip.name}, ${(Number(zip.size) / 1e6).toFixed(1)} MB\n  into:  ${folder.slice(REPO_ROOT.length + 1)}/`);
if (dryRun) process.exit(0);

const work = mkdtempSync(join(tmpdir(), 'fetch-zine-'));
process.on('exit', () => rmSync(work, { recursive: true, force: true }));

// 2. The ZIP, checked against the MD5 that archive.org lists for it.
const response = await fetch(fileUrl(zip.name));
if (!response.ok) fail(`${fileUrl(zip.name)} answered ${response.status} ${response.statusText}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (zip.md5 && createHash('md5').update(bytes).digest('hex') !== zip.md5) fail(`${zip.name} arrived damaged (its MD5 is not the one archive.org lists). Try again.`);
const zipFile = join(work, 'pages.zip');
writeFileSync(zipFile, bytes);

// 3. Which leaves are pages of the book: all of them, unless the scandata leaves some out (a colour card, a cover
//    sheet). Each leaf is a file <name>_0007.jp2, numbered from 0.
const leaveOut = new Set();
if (scandata) {
  const xml = await (await fetch(fileUrl(scandata.name))).text();
  for (const m of xml.matchAll(/<page leafNum="(\d+)">([\s\S]*?)<\/page>/g)) {
    if (/<addToAccessFormats>\s*false\s*<\/addToAccessFormats>/.test(m[2])) leaveOut.add(Number(m[1]));
  }
}
const unpacked = join(work, 'jp2');
mkdirSync(unpacked);
const unzip = spawnSync('unzip', ['-q', '-j', zipFile, '-d', unpacked], { encoding: 'utf8' });
if (unzip.status !== 0) fail(`unzip could not open ${zip.name}:\n${unzip.stderr}`);
const leaves = readdirSync(unpacked).map((name) => ({ name, leaf: Number(/_(\d+)\.jp2$/i.exec(name)?.[1] ?? NaN) }))
  .filter((l) => Number.isInteger(l.leaf) && !leaveOut.has(l.leaf)).sort((a, b) => a.leaf - b.leaf);
if (!leaves.length) fail(`${zip.name} holds no page images (<name>_0000.jp2 …)`);

// 4. Every page: JPEG 2000 -> PNG (sips, or opj_decompress where sips cannot read it) -> JPEG.
const run = (command, list) => new Promise((resolve) => {
  const child = spawn(command, list, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  child.stderr.on('data', (d) => { err += d; });
  child.on('error', (e) => resolve({ ok: false, err: e.message }));
  child.on('close', (code) => resolve({ ok: code === 0, err }));
});
const decode = async (jp2, png) => {
  const tried = [];
  for (const decoder of decoders) {
    const result = decoder === 'sips' ? await run('sips', ['-s', 'format', 'png', jp2, '--out', png]) : await run('opj_decompress', ['-i', jp2, '-o', png]);
    let ok = result.ok;
    try { ok = ok && statSync(png).size > 0; } catch { ok = false; }
    if (ok) return decoder;
    tried.push(`${decoder}: ${result.err.trim().split('\n').pop() || 'failed'}`);
  }
  const hint = decoders.includes('opj_decompress') ? '' : ' Installing OpenJPEG may help: brew install openjpeg.';
  fail(`Could not read ${jp2.split('/').pop()} (${tried.join('; ')}).${hint}`);
};
const pages = leaves.map((l, i) => ({ ...l, n: i + 1, file: `page-${String(i + 1).padStart(3, '0')}.jpg` }));
const out = join(work, 'out');
mkdirSync(out);
const used = {};
const queue = [...pages];
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let page; (page = queue.shift());) {
    const png = join(work, `leaf-${page.leaf}.png`);
    const decoder = await decode(join(unpacked, page.name), png);
    used[decoder] = (used[decoder] || 0) + 1;
    const info = await sharp(png).flatten({ background: '#ffffff' }).jpeg(JPEG).toFile(join(out, page.file));
    Object.assign(page, { width: info.width, height: info.height, bytes: info.size });
    rmSync(png);
  }
}));

// 5. Replace the zine's folder: the new pages, and zine.json.
mkdirSync(folder, { recursive: true });
for (const name of readdirSync(folder)) if (/^page-\d+\.jpg$/.test(name)) rmSync(join(folder, name));
for (const page of pages) writeFileSync(join(folder, page.file), readFileSync(join(out, page.file)));
const record = {
  source: `https://archive.org/details/${id}`,
  title: item.metadata.title || '',
  file: fileUrl(zip.name),
  md5: zip.md5 || '',
  fetched: new Date().toISOString().slice(0, 10),
  pages: pages.length,
};
writeFileSync(join(folder, 'zine.json'), JSON.stringify(record, null, 2) + '\n');
const total = pages.reduce((sum, p) => sum + p.bytes, 0);
const sizes = [...new Set(pages.map((p) => `${p.width} × ${p.height}`))];
console.log(`  wrote ${pages.length} pages (${sizes.join(', ')} pixels), ${(total / 1e6).toFixed(1)} MB${leaveOut.size ? `; left out leaves ${[...leaveOut].join(', ')}, which the scandata marks as not part of the book` : ''}` +
  `\n  read with ${Object.entries(used).map(([d, n]) => `${d} (${n})`).join(', ')}; commit media/zines/${id}/ and build.`);
