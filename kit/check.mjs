// Checks the built site without a browser: every internal link and every local file that a page, the
// stylesheet or a JSON file refers to must exist in _site/, and links to #fragments must find their id.
// Root-absolute URLs ("/essays/…") are errors too, because the site must also work under a sub-path.
// Frozen versions (v<id>/, each with its own publication.json) are checked too, with the media they share.
//   npm run check     (after npm run build)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { REPO_ROOT } from './convert.mjs';

const SITE = join(REPO_ROOT, '_site');
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const all = files(SITE).filter((f) => !f.includes('/iiif/'));
const siteUrl = JSON.parse(readFileSync(join(SITE, 'publication.json'), 'utf8')).url;
const problems = [], ids = new Map();
// The edition a file belongs to: the folder of the nearest publication.json above it (a version, or the site root).
const editionRoot = (file) => {
  for (let dir = dirname(file); dir.startsWith(SITE); dir = dirname(dir)) if (existsSync(join(dir, 'publication.json'))) return dir;
  return SITE;
};
let checked = 0;

const idsOf = (file) => {
  if (!ids.has(file)) ids.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return ids.get(file);
};

// url as written in `from`; base is the folder it is relative to.
function check(url, from, base) {
  if (!url || /^([a-z][\w+.-]*:|\/\/)/i.test(url)) return;          // external, mailto:, data: …
  checked++;
  if (url.startsWith('/')) return problems.push(`${from}: root-absolute URL ${url}`);
  const [path, fragment] = url.replace(/\?[^#]*/, '').split('#');
  let target = path ? join(base, decodeURIComponent(path)) : join(SITE, from);
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
  if (!existsSync(target)) return problems.push(`${from}: missing ${url}`);
  if (fragment && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(fragment))) problems.push(`${from}: no id "${fragment}" in ${relative(SITE, target)}`);
}

for (const file of all) {
  const from = relative(SITE, file), base = dirname(file), text = readFileSync(file, 'utf8');
  if (file.endsWith('.html')) {
    const html = text.replace(/<!--.*?-->/gs, '');
    for (const m of html.matchAll(/\s(?:href|src|poster|data|data-tiles)="([^"]*)"/g)) check(m[1].replace(/&amp;/g, '&'), from, base);
    for (const m of html.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) check(m[1], from, base);
    // paragraphs are numbered p1, p2, … without gaps; a version notice's paragraph map points at paragraphs that exist
    const numbers = [...html.matchAll(/<div id="p(\d+)" class="para">/g)].map((m) => Number(m[1]));
    if (numbers.some((n, i) => n !== i + 1)) problems.push(`${from}: paragraphs are not numbered 1 to ${numbers.length} in order`);
    const notice = /<a class="version-notice__link" href="([^"]*)" data-paragraphs='([^']*)'/.exec(html);
    if (notice) {
      const map = JSON.parse(notice[2]);
      for (const target of new Set(Object.values(map))) check(`${notice[1]}#${target}`, from, base);
    }
  } else if (file.endsWith('.md')) {
    // Markdown view: ](url) and (url) targets. publication.md uses absolute URLs below the site's own address.
    const own = file.endsWith('/publication.md') ? siteUrl : null;
    for (const m of text.replace(/^---\n.*?\n---\n/s, '').matchAll(/\]\(([^()\s]*(?:\([^()\s]*\)[^()\s]*)*)\)/g)) {
      const url = m[1];
      check(own && url.startsWith(own) ? url.slice(own.length) : url, from, own ? SITE : base);
    }
  } else if (file.endsWith('.css')) {
    for (const m of text.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) check(m[1], from, base);
  } else if (file.endsWith('page.json') || file.endsWith('publication.json')) {
    // URLs in page.json and publication.json are relative to the edition's root (see CONTRACT.md), except the
    // published address of publication.json itself.
    const root = editionRoot(file), data = JSON.parse(text);
    JSON.stringify(data, (key, value) => {
      if (['url', 'image', 'tiles', 'markdown'].includes(key) && typeof value === 'string' && !(from.endsWith('publication.json') && value === data.url)) check(value, from, root);
      return value;
    });
  }
}
for (const info of files(join(SITE, 'iiif')).filter((f) => f.endsWith('info.json'))) {
  const { width, height } = JSON.parse(readFileSync(info, 'utf8'));
  if (!width || !height) problems.push(`${relative(SITE, info)}: no size`);
}

console.log(`Checked ${checked} local links and files in ${all.filter((f) => f.endsWith('.html')).length} pages: ${problems.length ? problems.length + ' problems' : 'all found'}.`);
if (problems.length) { problems.forEach((p) => console.log(`  ${p}`)); process.exit(1); }
