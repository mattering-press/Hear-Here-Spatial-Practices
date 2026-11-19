// Builds the static twin: every page of the book, compiled from the unchanged Juncture Markdown into plain
// HTML in ../_site, with resized images, zoom tiles, a Markdown view of every page (index.md, publication.md)
// and page.json / publication.json (see CONTRACT.md).
// Each page goes through Pandoc twice: stage 1 (filters/to-markdown.lua) writes its clean Markdown view,
// stage 2 (the other filters, template.html) turns that Markdown into HTML.
//   npm run build      needs Pandoc 3.8 on the PATH (or its path in the PANDOC environment variable)
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convert, REPO, REPO_ROOT, repoPath } from './convert.mjs';
import { makeImages } from './images.mjs';

// ---- Settings ------------------------------------------------------------------------------------------
const NOINDEX = true;   // tell search engines to skip the twin while Juncture serves the public site
const PUBLICATION = { creators: ['Nirmal Puwar'], publisher: 'Mattering Press', language: 'en' };
const CONTRACT = '0.1';  // version of the page.json / publication.json format
// Where the site is published. publication.md uses absolute URLs built from this; the pages use relative ones.
// It becomes 'https://hearhere.matteringpress.org/' when the site moves to its own domain.
const siteUrl = 'https://mattering-press.github.io/Hear-Here-Spatial-Practices/';
// ---------------------------------------------------------------------------------------------------------

const KIT = dirname(fileURLToPath(import.meta.url));
const SITE = join(REPO_ROOT, '_site');
const PANDOC = process.env.PANDOC || 'pandoc';
const FILTERS = ['figures', 'embeds', 'cards', 'transcript', 'links', 'contract'];
const started = Date.now();

const version = spawnSync(PANDOC, ['--version'], { encoding: 'utf8' }).stdout?.match(/^pandoc (\d+)\.(\d+)(\S*)/);
if (!version || version[1] < 3 || (version[1] == 3 && version[2] < 1)) {
  console.error(`Pandoc 3.8 is needed${version ? `, found ${version[0]}` : ' but was not found'}. Set PANDOC to its path if it is installed.`);
  process.exit(1);
}
if (`${version[1]}.${version[2]}` !== '3.8') console.warn(`note: built and tested with Pandoc 3.8.3, this is ${version[0]}`);

// 1. Pages: the home page (README.md) and every essay. test.md is a scratch page and stays out.
const files = ['README.md', ...readdirSync(join(REPO_ROOT, 'essays')).filter((f) => f.endsWith('.md')).sort().map((f) => `essays/${f}`)];
const pages = files.map((file) => ({ file, ...convert(readFileSync(join(REPO_ROOT, file), 'utf8'), file) }));
const unhandled = pages.flatMap((page) => page.unhandled);
if (unhandled.length) {
  console.error('The static twin cannot render these Juncture constructs yet:');
  for (const u of unhandled) console.error(`  ${u.file}:${u.line}  ${u.why}\n      ${u.text}`);
  process.exit(1);
}
const home = pages[0];
const urlOf = (file) => (file === 'README.md' ? '' : file.replace(/\.md$/, '/').split('/').map(encodeURIComponent).join('/'));

// 2. Images, zoom tiles, and the repository files that pages embed (data-repo-* in essays/walk.md).
rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
const { images, tiles, sources } = await makeImages(pages.flatMap((page) => page.images), REPO_ROOT, SITE);
const copied = {};
for (const path of new Set(pages.flatMap((page) => page.files))) {
  cpSync(join(REPO_ROOT, path), join(SITE, path));
  copied[path] = path;
}

// 3. Pandoc, twice per page. Stage 1 writes the page's Markdown view (index.md), and once more with absolute
//    URLs for publication.md. Stage 2 turns index.md into HTML (index.html) and page.json.
const byUrl = {};
for (const entry of Object.values(images)) if (!byUrl[entry.url] || entry.tiles) byUrl[entry.url] = entry;
const work = mkdtempSync(join(tmpdir(), 'static-twin-'));
const manifest = join(work, 'manifest.json');
writeFileSync(manifest, JSON.stringify({ images, by_url: byUrl, files: copied }));
const warnings = pages.flatMap((page) => page.warnings.map((w) => `${w.file}:${w.line}  ${w.text}`));
const list = (value) => (Array.isArray(value) ? value : []);
const filterArgs = (names) => names.flatMap((f) => ['--lua-filter', join(KIT, 'filters', `${f}.lua`)]);
const metaArgs = (meta) => Object.entries(meta).filter(([, v]) => v).flatMap(([k, v]) => ['-M', `${k}=${v}`]);
// Pandoc writes a div with one class as '::: video'; the Markdown view uses the braces throughout.
const bracedDivs = (markdown) => markdown.replace(/^(:{3,}) ([\w-]+)$/gm, '$1 {.$2}');
const pandoc = (args, input, file) => {
  const result = spawnSync(PANDOC, args, { input, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (result.status !== 0) { console.error(`Pandoc failed on ${file}:\n${result.stderr}`); process.exit(1); }
  warnings.push(...result.stderr.split('\n').filter(Boolean).map((line) => line.replace(/^warning /, '')));
  return result.stdout;
};
const markdownBodies = new Map();   // page file -> Markdown with absolute URLs, for publication.md
for (const page of pages) {
  const url = urlOf(page.file);
  const dir = join(SITE, decodeURIComponent(url));
  const root = url ? '../'.repeat(url.split('/').length - 1) : './';
  const contractOut = join(work, page.file.replace(/\W/g, '_') + '.json');
  const meta = { page: page.file, repo: REPO, manifest, 'contract-out': contractOut, lang: PUBLICATION.language, title: page.title, subtitle: page.subtitle };

  // stage 1: the Markdown view
  const toMarkdown = ['-f', 'markdown-smart-implicit_figures', '-t', 'markdown-smart', '--wrap=none', '--markdown-headings=atx', ...filterArgs(['to-markdown'])];
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.md'), bracedDivs(pandoc([...toMarkdown, '-s', ...metaArgs({ ...meta, root })], page.markdown, page.file)));
  markdownBodies.set(page.file, bracedDivs(pandoc([...toMarkdown, ...metaArgs({ ...meta, root: siteUrl, 'title-heading': 'true' })], page.markdown, page.file)).trim());

  // stage 2: HTML from the Markdown view, with the menu and footer as metadata
  const extra = join(work, page.file.replace(/\W/g, '_') + '.yaml');
  writeFileSync(extra, ['menu', 'footer'].filter((key) => page[key].length).map((key) => `${key}:\n${page[key].map((item) => `  - ${JSON.stringify(item)}`).join('\n')}\n`).join(''));
  const headerStyle = page.header.image ? `background-image: url('${root}${images[`header|${page.header.image}|0`].url}')`
    : page.header.colour ? `background-color: ${page.header.colour.replace(/[^#\w(),.% -]/g, '')}` : '';
  const html = pandoc(['-f', 'markdown-implicit_figures', '-t', 'html5', '--wrap=none', '-s', '--template', join(KIT, 'template.html'), '--metadata-file', extra,
    ...metaArgs({ ...meta, root, 'header-style': headerStyle, 'site-title': page === home ? '' : home.title, noindex: NOINDEX ? 'true' : '' }),
    ...filterArgs(FILTERS)], readFileSync(join(dir, 'index.md'), 'utf8'), page.file);
  writeFileSync(join(dir, 'index.html'), html);

  const data = JSON.parse(readFileSync(contractOut, 'utf8'));
  page.url = url || './';
  writeFileSync(join(dir, 'page.json'), JSON.stringify({
    contract: CONTRACT, id: page.file, url: page.url, title: page.title, subtitle: page.subtitle,
    markdown: `${url}index.md`,
    headings: list(data.headings).map(({ level, text, id }) => ({ level, text, id })),
    figures: list(data.figures).map(({ image, width, height, tiles, alt, caption }) => ({ image, width, height, tiles, alt, caption })),
    audio: list(data.audio).map(({ url, title }) => ({ url, title })),
    video: list(data.video).map(({ url, title, kind }) => ({ url, title, kind })),
    links: list(data.links).map(({ id, url, text }) => ({ id, url: url || './', text })),
  }, null, 2) + '\n');
}
rmSync(work, { recursive: true, force: true });

// 4. publication.json. Reading order: the home page, then the pages of its menu in order, each followed by
//    the pages its cards lead to (depth first), then any page not reached that way, alphabetically.
const byFile = new Map(pages.map((page) => [page.file, page]));
const order = [];
const visit = (file) => {
  if (order.includes(file) || !byFile.has(file)) return;
  order.push(file);
  byFile.get(file).cards.forEach(visit);
};
order.push(home.file);
for (const item of home.menu) visit(repoPath(/\]\(([^)\s]+)\)/.exec(item)?.[1] ?? '', home.file).replace(/^\.$/, 'README.md'));
files.forEach(visit);
writeFileSync(join(SITE, 'publication.json'), JSON.stringify({
  contract: CONTRACT, title: home.title, subtitle: home.subtitle, ...PUBLICATION, url: siteUrl, markdown: 'publication.md',
  readingOrder: order.map((file) => ({ id: file, url: byFile.get(file).url, title: byFile.get(file).title })),
}, null, 2) + '\n');

// publication.md: every page in reading order, each starting with its title as a heading, with absolute URLs.
const front = ['---', `title: ${JSON.stringify(home.title)}`, `subtitle: ${JSON.stringify(home.subtitle ?? '')}`, 'author:', ...PUBLICATION.creators.map((c) => `  - ${JSON.stringify(c)}`),
  `publisher: ${JSON.stringify(PUBLICATION.publisher)}`, `lang: ${PUBLICATION.language}`, '---'].join('\n');
writeFileSync(join(SITE, 'publication.md'), `${front}\n\n${order.map((file) => markdownBodies.get(file)).join('\n\n')}\n`);

// 5. Stylesheet, scripts, the Roboto font and OpenSeadragon (the deep-zoom viewer).
const modules = join(KIT, 'node_modules');
cpSync(join(KIT, 'assets'), join(SITE, 'assets'), { recursive: true });
for (const style of ['normal', 'italic']) cpSync(join(modules, `@fontsource-variable/roboto/files/roboto-latin-wght-${style}.woff2`), join(SITE, `assets/fonts/roboto-latin-wght-${style}.woff2`));
cpSync(join(modules, '@fontsource-variable/roboto/LICENSE'), join(SITE, 'assets/fonts/LICENSE.txt'));
cpSync(join(modules, 'openseadragon/build/openseadragon/openseadragon.min.js'), join(SITE, 'assets/osd/openseadragon.min.js'));
cpSync(join(modules, 'openseadragon/build/openseadragon/images'), join(SITE, 'assets/osd/images'), { recursive: true });
cpSync(join(modules, 'openseadragon/LICENSE.txt'), join(SITE, 'assets/osd/LICENSE.txt'));

// 6. Report.
const size = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => sum + (e.isDirectory() ? size(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;
const total = size(SITE), imageBytes = size(join(SITE, 'images')), tileBytes = size(join(SITE, 'iiif'));
console.log(`Built ${pages.length} pages into _site/ in ${((Date.now() - started) / 1000).toFixed(1)} s: ${mb(total)} ` +
  `(images ${mb(imageBytes)}, tiles ${mb(tileBytes)}, other ${mb(total - imageBytes - tileBytes)}); ` +
  `${sources} source images, ${tiles} tiles${NOINDEX ? '; pages carry noindex' : ''}.`);
if (warnings.length) console.log(`\n${warnings.length} warnings:\n${warnings.map((w) => `  ${w}`).join('\n')}`);
