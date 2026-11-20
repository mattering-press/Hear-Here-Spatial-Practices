// Builds the static twin: every page of the book, compiled from the unchanged Juncture Markdown into plain
// HTML in ../_site, with resized images, zoom tiles, a Markdown view of every page (index.md, publication.md)
// and page.json / publication.json (see CONTRACT.md). Plain-text citations are linked to references/bibliography.json
// and show their reference in a popup (citations.mjs, filters/citations.lua). Reading paragraphs are numbered
// (filters/paragraphs.lua).
// Each page goes through Pandoc twice: stage 1 (filters/to-markdown.lua) writes its clean Markdown view,
// stage 2 (the other filters, template.html) turns that Markdown into HTML.
//
// Editions: the root of _site/ is the working text ("latest, unreleased"). Every version in ../versions.json is
// built too, from the text of its Git tag but always with this toolkit, into _site/v<id>/; its pages carry a notice that
// links to the same passage in the newest text (versions.mjs). Images, tiles and other media are stored once, at the
// root, and shared by all editions. _site/versions/ lists them all.
//   npm run build      needs Pandoc 3.8 on the PATH (or its path in the PANDOC environment variable)
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BIBLIOGRAPHY, locate, prepareReferences, report as citationReport } from './citations.mjs';
import { convert, REPO, REPO_ROOT, repoPath } from './convert.mjs';
import { makeImages } from './images.mjs';
import { checkout, longDate, matchParagraphs, readRegistry } from './versions.mjs';

// ---- Settings ------------------------------------------------------------------------------------------
const NOINDEX = false;  // true hides every page from search engines (it was true while Juncture served the public site)
const PUBLICATION = { creators: ['Nirmal Puwar'], publisher: 'Mattering Press', language: 'en' };
const CONTRACT = '0.4';  // version of the page.json / publication.json format, and of the paragraph rule for new text
// A frozen version keeps the paragraph rule of the contract it was frozen under ("contract" in versions.json).
// every_trick_in_the_book, the toolkit in this folder. Every footer names it with its version (every_trick/package.json),
// and links the name to its home and the version to the list of what changed in each version.
const TOOLKIT_HOME = 'https://github.com/every-trick/every_trick_in_the_book';
const TOOLKIT_CHANGES = 'https://github.com/mattering-press/Hear-Here-Spatial-Practices/blob/main/every_trick/CHANGELOG.md';
// Where the site is published. publication.md uses absolute URLs built from this; the pages use relative ones.
// It becomes 'https://hearhere.matteringpress.org/' when the site moves to its own domain.
const siteUrl = 'https://hearhere.matteringpress.org/';
const LATEST_LABEL = 'Latest text, unreleased';
// ---------------------------------------------------------------------------------------------------------

const KIT = dirname(fileURLToPath(import.meta.url));
const KIT_VERSION = JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8')).version;
// A short hash of the stylesheet and scripts in assets/. The template adds it to their addresses (site.css?v=…), so
// that browsers fetch them again whenever they change: GitHub Pages lets browsers keep a file for ten minutes, and a
// page could otherwise arrive with an old stylesheet.
const ASSET_VERSION = (() => {
  const hash = createHash('sha1');
  for (const name of readdirSync(join(KIT, 'assets')).filter((f) => /\.(css|js)$/.test(f)).sort()) hash.update(name).update(readFileSync(join(KIT, 'assets', name)));
  return hash.digest('hex').slice(0, 10);
})();
const SITE = join(REPO_ROOT, '_site');
const PANDOC = process.env.PANDOC || 'pandoc';
const FILTERS = ['figures', 'embeds', 'cards', 'transcript', 'links', 'citations', 'paragraphs', 'margins', 'contract'];
const started = Date.now();
const fail = (message) => { console.error(message); process.exit(1); };

const version = spawnSync(PANDOC, ['--version'], { encoding: 'utf8' }).stdout?.match(/^pandoc (\d+)\.(\d+)(\S*)/);
if (!version || version[1] < 3 || (version[1] == 3 && version[2] < 1)) {
  fail(`Pandoc 3.8 is needed${version ? `, found ${version[0]}` : ' but was not found'}. Set PANDOC to its path if it is installed.`);
}
if (`${version[1]}.${version[2]}` !== '3.8') console.warn(`note: built and tested with Pandoc 3.8.3, this is ${version[0]}`);

const work = mkdtempSync(join(tmpdir(), 'static-twin-'));
process.on('exit', () => rmSync(work, { recursive: true, force: true }));

// 1. Editions: the working text, then every version in the registry, each with its text from its tag.
let registry;
try { registry = readRegistry(); } catch (e) { fail(`The version registry has problems:\n${e.message}`); }
const lastChange = spawnSync('git', ['-C', REPO_ROOT, 'log', '-1', '--format=%cs'], { encoding: 'utf8' }).stdout?.trim() || new Date().toISOString().slice(0, 10);
const latest = {
  dir: '', name: 'the working text', contentRoot: REPO_ROOT, has: (path) => existsSync(join(REPO_ROOT, path)), take: () => REPO_ROOT,
  version: { id: 'latest', label: LATEST_LABEL, date: lastChange, status: 'latest' }, annotations: 'none', rule: CONTRACT,
};
const editions = [latest];
for (const entry of registry) {
  let text;
  try { text = checkout(entry, join(work, 'tags', entry.id)); } catch (e) { fail(`Version ${entry.id}: ${e.message}`); }
  editions.push({
    dir: `v${entry.id}/`, name: `version ${entry.id} (tag ${entry.tag})`, contentRoot: text.root, has: text.has, take: text.take, commit: text.commit,
    version: { id: entry.id, label: entry.label, date: entry.date, status: entry.status }, annotations: entry.annotations, group: entry.hypothesisGroup,
    rule: entry.contract,
  });
}
// Which edition a frozen one points its readers to: an older release to the newest release, anything else (a review
// version, the newest release) to the latest text.
const releases = editions.filter((e) => e.version.status === 'release');
const newestRelease = releases.at(-1);
for (const edition of editions.slice(1)) edition.target = edition.version.status === 'release' && edition !== newestRelease ? newestRelease : latest;

// 2. Pages of each edition: the home page (README.md) and every essay. test.md is a scratch page and stays out.
const urlOf = (file) => (file === 'README.md' ? '' : file.replace(/\.md$/, '/').split('/').map(encodeURIComponent).join('/'));
for (const edition of editions) {
  const root = edition.contentRoot;
  const files = ['README.md', ...readdirSync(join(root, 'essays')).filter((f) => f.endsWith('.md')).sort().map((f) => `essays/${f}`)];
  edition.pages = files.map((file) => ({ file, ...convert(readFileSync(join(root, file), 'utf8'), file, { exists: edition.has }) }));
  const unhandled = edition.pages.flatMap((page) => page.unhandled);
  if (unhandled.length) {
    fail(`The static twin cannot render these Juncture constructs in ${edition.name} yet:\n` +
      unhandled.map((u) => `  ${u.file}:${u.line}  ${u.why}\n      ${u.text}`).join('\n'));
  }
  edition.home = edition.pages[0];
  // Reading order: the home page, then the pages of its menu in order, each followed by the pages its cards lead to
  // (depth first), then any page not reached that way, alphabetically.
  edition.byFile = new Map(edition.pages.map((page) => [page.file, page]));
  const order = [];
  const visit = (file) => {
    if (order.includes(file) || !edition.byFile.has(file)) return;
    order.push(file);
    edition.byFile.get(file).cards.forEach(visit);
  };
  order.push(edition.home.file);
  for (const item of edition.home.menu) visit(repoPath(/\]\(([^)\s]+)\)/.exec(item)?.[1] ?? '', edition.home.file).replace(/^\.$/, 'README.md'));
  files.forEach(visit);
  edition.order = order;
}

// 3. Images, zoom tiles, and the repository files that pages embed (data-repo-* in essays/walk.md), made once for
//    all editions. A file is taken from the working tree; only one that is no longer there comes from the tag.
rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
const fromTags = [];
const sourceOf = (edition, path) => {
  if (existsSync(join(REPO_ROOT, path))) return REPO_ROOT;
  fromTags.push(`${path} (from ${edition.name})`);
  return edition.take(path);
};
const jobs = editions.flatMap((edition) => edition.pages.flatMap((page) => page.images.map((job) => ({ ...job, root: sourceOf(edition, job.src) }))));
const { images, tiles, sources } = await makeImages(jobs, REPO_ROOT, SITE);
const copied = new Set();
for (const edition of editions) {
  edition.files = [...new Set(edition.pages.flatMap((page) => page.files))];
  for (const path of edition.files) {
    if (copied.has(path)) continue;
    cpSync(join(sourceOf(edition, path), path), join(SITE, path));
    copied.add(path);
  }
}

// 4. Pandoc, twice per page. Stage 1 writes the page's Markdown view (index.md), and once more with absolute
//    URLs for publication.md. Stage 2 turns index.md into HTML (index.html) and page.json.
const warnings = editions.flatMap((edition) => edition.pages.flatMap((page) => page.warnings.map((w) => `${edition.dir}${w.file}:${w.line}  ${w.text}`)));
const list = (value) => (Array.isArray(value) ? value : []);
const filterArgs = (names) => names.flatMap((f) => ['--lua-filter', join(KIT, 'filters', `${f}.lua`)]);
const metaArgs = (meta) => Object.entries(meta).filter(([, v]) => v).flatMap(([k, v]) => ['-M', `${k}=${v}`]);
// Pandoc writes a div with one class as '::: video'; the Markdown view uses the braces throughout.
const bracedDivs = (markdown) => markdown.replace(/^(:{3,}) ([\w-]+)$/gm, '$1 {.$2}');
const pandoc = (args, input, file) => {
  const result = spawnSync(PANDOC, args, { input, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (result.status !== 0) fail(`Pandoc failed on ${file}:\n${result.stderr}`);
  warnings.push(...result.stderr.split('\n').filter(Boolean).map((line) => line.replace(/^warning /, '')));
  return result.stdout;
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// A metadata value of raw HTML, for the YAML file that stage 2 reads (YAML values are read as Markdown).
const rawHtml = (html) => JSON.stringify('`' + html.replace(/`/g, '&#96;').replace(/\n/g, ' ') + '`{=html}');
// root .. url, where url may start with ../ (shared media seen from a version): as lib.join in filters/lib.lua.
const join2 = (root, url) => (root === './' && url.startsWith('../') ? url : root + url);
const versionLine = (edition, shared) => {
  const v = edition.version;
  const what = v.status === 'latest' ? `${esc(v.label)} · last changed ${longDate(v.date)}`
    : `${esc(v.label)} · ${v.status === 'review' ? 'frozen' : 'released'} on ${longDate(v.date)}`;
  return `<p class="site-footer__version">${what} · <a href="${shared}versions/">All versions</a></p>`;
};
// The toolkit's line in every footer (template.html), below the book's version line.
const toolkitMeta = { 'kit-version': KIT_VERSION, 'kit-home': TOOLKIT_HOME, 'kit-changes': TOOLKIT_CHANGES };
const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const hypothesis = (edition) => {
  const config = { openSidebar: false };
  if (edition.group) config.groupsAllowlist = [edition.group];
  return `<script type="application/json" class="js-hypothesis-config">${JSON.stringify(config)}</script>` +
    '<script async src="https://hypothes.is/embed.js"></script>';
};
const versionMeta = (edition) => ({ 'version-id': edition.version.id, 'version-label': edition.version.label, 'version-date': edition.version.date, 'version-status': edition.version.status, 'kit-version': KIT_VERSION });

const report = { paragraphs: [], matching: [], citations: [] };
// An edition is built after the one its notice points to, whose paragraphs it is matched against.
for (const edition of editions) edition.paragraphs = new Map();
for (const edition of [latest, ...(newestRelease ? [newestRelease] : []), ...editions.slice(1).filter((e) => e !== newestRelease)]) {
  const out = join(SITE, edition.dir);
  const prefix = edition.dir ? '../' : '';     // from the edition's root to the shared media
  const shift = (entry) => ({ ...entry, url: prefix + entry.url, ...(entry.tiles ? { tiles: prefix + entry.tiles } : {}) });
  const editionImages = Object.fromEntries(Object.entries(images).map(([key, entry]) => [key, shift(entry)]));
  const byUrl = {};
  for (const entry of Object.values(editionImages)) if (!byUrl[entry.url] || entry.tiles) byUrl[entry.url] = entry;
  const scratch = join(work, edition.dir || 'latest');
  mkdirSync(scratch, { recursive: true });
  const manifest = join(scratch, 'manifest.json');
  writeFileSync(manifest, JSON.stringify({ images: editionImages, by_url: byUrl, files: Object.fromEntries(edition.files.map((path) => [path, prefix + path])) }));
  edition.manifest = manifest;
  // The bibliography, formatted once in the house style; citations.lua links each page's citations to it.
  let bibliography = join(edition.contentRoot, 'references', 'bibliography.json');
  if (!existsSync(bibliography)) {
    warnings.push(`${edition.name} has no references/bibliography.json; its citations are linked with the working tree's`);
    bibliography = BIBLIOGRAPHY;
  }
  const references = prepareReferences({ pandoc: PANDOC, work: scratch, order: edition.order, bibliography });
  edition.references = references;
  const target = edition.target;

  for (const page of edition.pages) {
    const url = urlOf(page.file);
    const dir = join(out, decodeURIComponent(url));
    const root = url ? '../'.repeat(url.split('/').length - 1) : './';
    const shared = join2(root, prefix) || './';   // the site's root, where assets/ and versions/ are
    const contractOut = join(scratch, page.file.replace(/\W/g, '_') + '.json');
    const meta = { page: page.file, repo: REPO, manifest, 'contract-out': contractOut, lang: PUBLICATION.language, title: page.title, subtitle: page.subtitle };

    // stage 1: the Markdown view
    const toMarkdown = ['-f', 'markdown-smart-implicit_figures', '-t', 'markdown-smart', '--wrap=none', '--markdown-headings=atx', ...filterArgs(['to-markdown'])];
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.md'), bracedDivs(pandoc([...toMarkdown, '-s', ...metaArgs({ ...meta, ...versionMeta(edition), root })], page.markdown, page.file)));
    page.markdownBody = bracedDivs(pandoc([...toMarkdown, ...metaArgs({ ...meta, root: siteUrl + edition.dir, 'title-heading': 'true' })], page.markdown, page.file)).trim();

    // stage 2: HTML from the Markdown view, with the menu, footer and version notice as metadata
    const extra = { version_line: versionLine(edition, shared) };
    if (edition.annotations === 'hypothesis') extra.annotations = hypothesis(edition);
    const there = target && target.paragraphs.get(page.file);   // this page in the edition the notice points to
    if (target) {
      // The notice links to the same page there (its home page if the page is gone). paragraphs.js takes the reader
      // to the passage they are reading, with the map of this page's paragraphs to that page's added below.
      const href = join2(shared, target.dir + (there ? url : ''));
      const v = edition.version, when = `${v.status === 'review' ? 'frozen' : 'released'} on ${longDate(v.date)}`;
      const link = target === latest ? 'Read the latest text' : `Read the newest release, ${lcFirst(target.version.label)}`;
      const newest = edition === newestRelease ? ', the newest release' : '';
      extra.version_notice = `<aside class="version-notice" aria-label="About this version"><p>You are reading ${esc(lcFirst(v.label))}, ${when}${newest}. ` +
        `<a class="version-notice__link" href="${esc(href)}" data-paragraphs="{}">${esc(link)}</a>.</p></aside>`;
    }
    const yaml = join(scratch, page.file.replace(/\W/g, '_') + '.yaml');
    writeFileSync(yaml, [
      ...['menu', 'footer'].filter((key) => page[key].length).map((key) => `${key}:\n${page[key].map((item) => `  - ${JSON.stringify(item)}`).join('\n')}\n`),
      ...Object.entries(extra).map(([key, html]) => `${key.replace('_', '-')}: ${rawHtml(html)}\n`),
    ].join(''));
    const headerImage = page.header.image && editionImages[`header|${page.header.image}|0`];
    const headerStyle = headerImage ? `background-image: url('${join2(root, headerImage.url)}')`
      : page.header.colour ? `background-color: ${page.header.colour.replace(/[^#\w(),.% -]/g, '')}` : '';
    let html = pandoc(['-f', 'markdown-implicit_figures', '-t', 'html5', '--wrap=none', '-s', '--template', join(KIT, 'template.html'), '--metadata-file', yaml,
      ...metaArgs({ ...meta, ...toolkitMeta, root, shared, 'paragraph-rule': edition.rule, 'asset-version': ASSET_VERSION, views: 'true', citations: references.indexPath, 'header-style': headerStyle, 'site-title': page === edition.home ? '' : edition.home.title, noindex: NOINDEX ? 'true' : '' }),
      ...filterArgs(FILTERS)], readFileSync(join(dir, 'index.md'), 'utf8'), page.file);
    const data = JSON.parse(readFileSync(contractOut, 'utf8'));
    const paragraphs = list(data.paragraphs);
    if (target) {
      // the map needs this page's paragraphs, which stage 2 has just numbered
      const result = there ? matchParagraphs(paragraphs, there) : { map: {}, counts: null };
      html = html.replace('data-paragraphs="{}"', `data-paragraphs='${JSON.stringify(result.map)}'`);   // ids only: no quotes to escape
      report.matching.push({ edition, file: page.file, total: paragraphs.length, missing: !there, ...result.counts });
    }
    writeFileSync(join(dir, 'index.html'), html);
    edition.paragraphs.set(page.file, paragraphs);
    report.paragraphs.push({ edition, file: page.file, paragraphs });

    page.url = url || './';
    writeFileSync(join(dir, 'page.json'), JSON.stringify({
      contract: CONTRACT, paragraphRule: edition.rule, id: page.file, url: page.url, title: page.title, subtitle: page.subtitle,
      version: edition.version, kit: KIT_VERSION,
      markdown: `${url}index.md`,
      headings: list(data.headings).map(({ level, text, id }) => ({ level, text, id })),
      paragraphs: paragraphs.map(({ id, n, text_hash }) => ({ id, n, text_hash })),
      figures: list(data.figures).map(({ image, width, height, tiles, alt, caption }) => ({ image, width, height, tiles, alt, caption })),
      audio: list(data.audio).map(({ url, title }) => ({ url, title })),
      video: list(data.video).map(({ url, title, kind }) => ({ url, title, kind })),
      links: list(data.links).map(({ id, url, text }) => ({ id, url: url || './', text })),
      references: list(data.references).map(({ key, html, url, citations }) => ({ key, html, url, citations: list(citations) })),
    }, null, 2) + '\n');
    if (edition === latest) report.citations.push({ file: page.file, citations: locate(readFileSync(join(REPO_ROOT, page.file), 'utf8'), list(data.citations)), typed: list(data.typed)[0] || { listed: [], unmatched: [] } });
  }

  // publication.json, in the reading order worked out above.
  const home = edition.home;
  const versionsList = [latest, ...editions.slice(1).reverse()].map((e) => ({ ...e.version, url: e === edition ? './' : prefix + e.dir || './' }));
  writeFileSync(join(out, 'publication.json'), JSON.stringify({
    contract: CONTRACT, paragraphRule: edition.rule, title: home.title, subtitle: home.subtitle, ...PUBLICATION, url: siteUrl + edition.dir, markdown: 'publication.md',
    version: edition.version, kit: KIT_VERSION, versions: versionsList,
    readingOrder: edition.order.map((file) => ({ id: file, url: edition.byFile.get(file).url, title: edition.byFile.get(file).title })),
  }, null, 2) + '\n');

  // publication.md: every page in reading order, each starting with its title as a heading, with absolute URLs.
  const v = edition.version;
  const front = ['---', `title: ${JSON.stringify(home.title)}`, `subtitle: ${JSON.stringify(home.subtitle ?? '')}`, 'author:', ...PUBLICATION.creators.map((c) => `  - ${JSON.stringify(c)}`),
    `publisher: ${JSON.stringify(PUBLICATION.publisher)}`, `lang: ${PUBLICATION.language}`,
    'version:', `  id: ${JSON.stringify(v.id)}`, `  label: ${JSON.stringify(v.label)}`, `  date: ${JSON.stringify(v.date)}`, `  status: ${JSON.stringify(v.status)}`,
    `kit: ${JSON.stringify(KIT_VERSION)}`, '---'].join('\n');
  writeFileSync(join(out, 'publication.md'), `${front}\n\n${edition.order.map((file) => edition.byFile.get(file).markdownBody).join('\n\n')}\n`);
}

// 5. The versions page, /versions/: every edition, newest first, with the working text at the top.
{
  const describe = (e) => {
    const v = e.version;
    if (e === latest) return `the working text, which changes as the book is edited. Last changed on ${longDate(v.date)}.`;
    const what = v.status === 'review' ? `Frozen for peer review on ${longDate(v.date)}` : `Released on ${longDate(v.date)}`;
    return `${what}${e.annotations === 'hypothesis' ? '. Reviewers annotate it with Hypothesis' : ''}.`;
  };
  const items = [latest, ...editions.slice(1).reverse()].map((e) => `- [${e.version.label}](${e === latest ? '../' : `../${e.dir}`}): ${describe(e)}`);
  const markdown = [
    'Every version of the book that has been frozen for review or released stays online at its own address, and its paragraphs keep their numbers. To cite a passage, use a frozen version: the ¶ beside each paragraph number copies a link to that paragraph, with the version in it.',
    '',
    ...items,
    '',
    editions.length === 1 ? 'No version has been frozen yet.' : 'A frozen version keeps its text, but it is shown with the current design of the site.',
    '',
    `The site’s design, and what its pages do, come from the toolkit that builds it: [every_trick_in_the_book](${TOOLKIT_HOME}){.toolkit-name aria-label="every trick in the book"} ${KIT_VERSION} ([what’s new](${TOOLKIT_CHANGES})). The toolkit’s versions are numbered separately from the book’s.`,
  ].join('\n');
  const dir = join(SITE, 'versions');
  mkdirSync(dir, { recursive: true });
  const yaml = join(work, 'versions.yaml');
  const home = latest.home;
  writeFileSync(yaml, [
    ...['menu', 'footer'].filter((key) => home[key].length).map((key) => `${key}:\n${home[key].map((item) => `  - ${JSON.stringify(item)}`).join('\n')}\n`),
    `version-line: ${rawHtml(versionLine(latest, '../'))}\n`,
  ].join(''));
  const html = pandoc(['-f', 'markdown', '-t', 'html5', '--wrap=none', '-s', '--template', join(KIT, 'template.html'), '--metadata-file', yaml,
    ...metaArgs({ page: 'versions.md', repo: REPO, manifest: latest.manifest, 'contract-out': join(work, 'versions.json'), lang: PUBLICATION.language, title: 'Versions',
      ...toolkitMeta, root: '../', shared: '../', 'asset-version': ASSET_VERSION, 'site-title': home.title, 'paragraph-numbers': 'false', noindex: NOINDEX ? 'true' : '' }),
    ...filterArgs(['links', 'paragraphs', 'contract'])], markdown, 'versions page');
  writeFileSync(join(dir, 'index.html'), html);
}

// 6. Stylesheet, scripts, the Roboto font and OpenSeadragon (the deep-zoom viewer), shared by all editions.
const modules = join(KIT, 'node_modules');
cpSync(join(KIT, 'assets'), join(SITE, 'assets'), { recursive: true });
for (const style of ['normal', 'italic']) cpSync(join(modules, `@fontsource-variable/roboto/files/roboto-latin-wght-${style}.woff2`), join(SITE, `assets/fonts/roboto-latin-wght-${style}.woff2`));
cpSync(join(modules, '@fontsource-variable/roboto/LICENSE'), join(SITE, 'assets/fonts/LICENSE.txt'));
cpSync(join(modules, 'openseadragon/build/openseadragon/openseadragon.min.js'), join(SITE, 'assets/osd/openseadragon.min.js'));
cpSync(join(modules, 'openseadragon/build/openseadragon/images'), join(SITE, 'assets/osd/images'), { recursive: true });
cpSync(join(modules, 'openseadragon/LICENSE.txt'), join(SITE, 'assets/osd/LICENSE.txt'));

// 7. Report.
const size = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => sum + (e.isDirectory() ? size(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;
const total = size(SITE), imageBytes = size(join(SITE, 'images')), tileBytes = size(join(SITE, 'iiif'));
const pageCount = editions.reduce((n, e) => n + e.pages.length, 0);
console.log(`Built ${pageCount} pages${editions.length > 1 ? ` in ${editions.length} editions` : ''} into _site/ in ${((Date.now() - started) / 1000).toFixed(1)} s: ${mb(total)} ` +
  `(images ${mb(imageBytes)}, tiles ${mb(tileBytes)}, other ${mb(total - imageBytes - tileBytes)}); ` +
  `${sources} source images, ${tiles} tiles; every_trick_in_the_book ${KIT_VERSION}, contract ${CONTRACT}${NOINDEX ? '; pages carry noindex' : ''}.`);
for (const edition of editions.slice(1)) {
  console.log(`  ${edition.dir.padEnd(22)} ${edition.version.label} (${edition.version.status}, tag at ${edition.commit.slice(0, 7)}): ${edition.pages.length} pages, ${mb(size(join(SITE, edition.dir)))}` +
    `${edition.annotations === 'hypothesis' ? `, Hypothesis${edition.group ? ` for group ${edition.group}` : ' (no hypothesisGroup set: annotations go to the group each reviewer picks)'}` : ''}`);
  if (edition.annotations === 'hypothesis' && !edition.group) warnings.push(`version ${edition.version.id}: annotations are on, but hypothesisGroup is empty, so reviewers could annotate publicly`);
}
if (fromTags.length) console.log(`\nMedia no longer in the working tree, taken from the tags:\n${[...new Set(fromTags)].map((f) => `  ${f}`).join('\n')}`);

console.log('\nNumbered paragraphs (the latest text):');
for (const { file, paragraphs } of report.paragraphs.filter((p) => p.edition === latest)) console.log(`  ${file.padEnd(30)} ${String(paragraphs.length).padStart(4)}`);
console.log(`  ${'all pages'.padEnd(30)} ${String(report.paragraphs.filter((p) => p.edition === latest).reduce((n, p) => n + p.paragraphs.length, 0)).padStart(4)}`);
for (const edition of editions.slice(1)) {
  const rows = report.matching.filter((m) => m.edition === edition);
  console.log(`\nParagraphs of ${edition.dir} matched to ${edition.target === latest ? 'the latest text' : edition.target.dir}: same text, similar text, nearby (not found)`);
  for (const r of rows) {
    console.log(`  ${r.file.padEnd(30)} ${String(r.total).padStart(4)}: ${r.missing ? 'the page is not in the newer text; the notice links to its home page'
      : `${String(r.same).padStart(4)} same, ${String(r.similar).padStart(3)} similar, ${String(r.nearby).padStart(3)} nearby`}`);
  }
}

if (warnings.length) console.log(`\n${warnings.length} warnings:\n${warnings.map((w) => `  ${w}`).join('\n')}`);
console.log(citationReport(report.citations.map((c) => ({ ...c, typed: { listed: list(c.typed.listed), unmatched: list(c.typed.unmatched) } })), latest.references.index, latest.references.warnings).join('\n'));
