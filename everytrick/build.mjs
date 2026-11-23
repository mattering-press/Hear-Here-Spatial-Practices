// Builds the static twin: every page of the book, compiled from the unchanged Juncture Markdown into plain
// HTML in ../_site, with resized images, zoom tiles, a Markdown view of every page (index.md, publication.md)
// and page.json / publication.json (see CONTRACT.md). Plain-text citations are linked to references/bibliography.json
// and show their reference in a popup (citations.mjs, filters/citations.lua); each edition's References and media
// (about/references-and-media/) lists every work, with the passages that cite it. Reading paragraphs are numbered
// (filters/paragraphs.lua). Each edition has its own search page, /search/, and its own Pagefind index of its reading
// text, /pagefind/ (see "Plan: search" in DEVELOPMENT.md).
// Each page goes through Pandoc twice: stage 1 (filters/to-markdown.lua) writes its clean Markdown view,
// stage 2 (the other filters, template.html) turns that Markdown into HTML.
//
// Editions: the root of _site/ is the working text ("latest, unreleased"). Every version in ../versions.json is
// built too, from the text of its Git tag but always with this toolkit, into _site/v<id>/; its pages carry a notice that
// links to the same passage in the newest text (versions.mjs). Images, tiles and other media are stored once, at the
// root, and shared by all editions. _site/versions/ lists them all.
// Media items: every picture, recording, video and document has a line in the media register (media/register.csv,
// register.mjs), with its permanent number and its name. Each gets its own page at the site's root, shared by all
// editions (/see/<name>/, /listen/, /watch/, /read/), a short address (/37/), and a place in the Media Index
// (on about/references-and-media/, and media.json); captions start with the item's number (filters/figures.lua, filters/embeds.lua).
// Documents (documents.mjs): a PDF of the repository, rendered with poppler, or a zine copied from archive.org into
// media/zines/, is shown as page images with zoom tiles in the viewer (assets/zoom.js), with its text on its own page.
// Back matter (BACKMATTER below), which readers know as "About this book": each edition closes with an overview, about/,
// and three parts: Contributors & acknowledgements (about/contributors/), the Colophon (about/colophon/: Making this
// book and the publisher's statement, then the licence and the versions and kit, which the build writes), and
// References and media (about/references-and-media/: the References page and the Media Index on one page). The
// menu has one entry for it, and the old addresses (references/, media-index/, back-matter/…) forward to the new ones.
//   npm run build            needs Pandoc 3.8 on the PATH (or its path in the PANDOC environment variable)
//   npm run build:preview    the same, with the Media Index's editing view (/media-index/edit/), which only previews
//                            have: the workflow sets EVERYTRICK_PREVIEW=true on every branch but main
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BIBLIOGRAPHY, COPY_DATA, COPY_STYLES, CSL_COMMIT, DOWNLOADS, formatReferences, locate, prepareReferences, referencesHtml, report as citationReport } from './citations.mjs';
import { readBook, REPO, REPO_ROOT, repoPath } from './convert.mjs';
import { mp3Duration, paragraphCues } from './audio.mjs';
import { pagesOf, pdfText, renderPdf, requirePoppler, zinePages } from './documents.mjs';
import { itemDates } from './history.mjs';
import { imageName, makeImages, makePages } from './images.mjs';
import { documentText, forwardHtml, itemFacts, mediaEditHtml, mediaIndexHtml, sizeText } from './media-pages.mjs';
import * as pagefind from 'pagefind';
import { readRegister, resolveItems, RIGHTS, servedFrom, storedAt } from './register.mjs';
import { checkout, longDate, matchParagraphs, readRegistry } from './versions.mjs';

// ---- Settings ------------------------------------------------------------------------------------------
const NOINDEX = false;  // true hides every page from search engines (it was true while Juncture served the public site)
// A build for a preview adds the Media Index's editing view, /media-index/edit/; the public site never has it.
const PREVIEW = process.argv.includes('--preview') || /^(1|true|yes)$/i.test(process.env.EVERYTRICK_PREVIEW || '');
const PUBLICATION = { creators: ['Nirmal Puwar'], publisher: 'Mattering Press', language: 'en' };
const CONTRACT = '0.8';  // version of the page.json / publication.json / media.json format, and of the paragraph rule for new text
// A frozen version keeps the paragraph rule of the contract it was frozen under ("contract" in versions.json). The
// paragraph rule of contract 0.5 is the rule of 0.4, unchanged; 0.6's adds long descriptions to the blocks not numbered,
// and 0.7 and 0.8 keep 0.6's.
// everytrickinthebook, the toolkit in this folder. Every footer names it with its version (everytrick/package.json),
// and links the name to its home and the version to the list of what changed in each version.
const TOOLKIT_HOME = 'https://everytrick.org/';
const TOOLKIT_CHANGES = 'https://github.com/mattering-press/Hear-Here-Spatial-Practices/blob/main/everytrick/CHANGELOG.md';
// The description of the book's data (page.json, publication.json, media.json), which "About this book" links to.
const TOOLKIT_CONTRACT = 'https://github.com/mattering-press/Hear-Here-Spatial-Practices/blob/main/everytrick/CONTRACT.md';
// Where the public site is hosted, for the colophon of "About this book".
const HOSTING = { name: 'GitHub Pages', url: 'https://pages.github.com/' };
// Where the site is published. publication.md uses absolute URLs built from this; the pages use relative ones.
// It becomes 'https://hearhere.matteringpress.org/' when the site moves to its own domain.
const siteUrl = 'https://hearhere.matteringpress.org/';
const LATEST_LABEL = 'Latest text, unreleased';
// What frames every page (template.html): in every footer the publisher's logo (the long one, the icon alone on
// phones), a credit line and the licence. Paths are files in the repository. menu.backmatter: the word of the one entry
// the header's menu adds after the home page's own, for the back matter, written as those are (here in lower case);
// empty, the menu has no such entry.
const FRAME = {
  credit: 'convened by Nirmal Puwar',
  publisherUrl: 'https://www.matteringpress.org/',
  logo: 'media/publisher/mattering-press-logo.svg',
  icon: 'media/publisher/mattering-press-icon.svg',
  licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  menu: { backmatter: 'about' },
};
// The back matter (EPUB's backmatter, LaTeX's \backmatter, JATS's <back>; British usage calls it end matter): what
// follows the book's text and closes every reading order. Readers see it as "About this book" (title): an overview at
// about/ in every edition, with intro and a line for each of its parts: its pages (pages, each with its line; their
// files are in about/ beside the overview's address) and References and media (about/references-and-media/), which the
// build makes. colophon: the page after whose text the build writes the licence and the versions and kit, with the
// publisher's own sentences from colophonNote, if it holds any. acknowledgements: the author's thanks, added under
// their heading to the page `into`, if the file holds any. moved: the former files of pages that moved into the back
// matter, whose old addresses forward to the new ones; forwards: other former addresses in each edition, with where
// they lead now (references/ and back-matter/ in each edition; media-index/ is forwarded once, at the site's root).
const BACKMATTER = {
  title: 'About this book',
  intro: 'Who made this book, how it was made and published, and the works and media it draws on.',
  pages: [
    { file: 'about/contributors.md', line: 'The people who made the book, and the author’s thanks.' },
    { file: 'about/colophon.md', line: 'How the book was made and published: Mattering Press, the licence, the book’s versions and open data, and the tools that build it.' },
  ],
  referencesAndMedia: { title: 'References and media', url: 'about/references-and-media/',
    line: 'Every work in the book’s bibliography, with the passages that cite it, and every picture, recording, video and document in the book.' },
  colophon: 'about/colophon.md',
  colophonNote: 'about/colophon-note.md',
  acknowledgements: { file: 'about/acknowledgements.md', into: 'about/contributors.md', heading: 'Acknowledgements' },
  moved: { 'essays/contributors.md': 'about/contributors.md' },
  forwards: { 'references/': 'about/references-and-media/', 'back-matter/': 'about/', 'back-matter/contributors/': 'about/contributors/',
    'back-matter/acknowledgements/': 'about/colophon/#making-this-book' },
};
// ---------------------------------------------------------------------------------------------------------

const TOOLKIT_DIR = dirname(fileURLToPath(import.meta.url));
const TOOLKIT_VERSION = JSON.parse(readFileSync(join(TOOLKIT_DIR, 'package.json'), 'utf8')).version;
// A short hash of the stylesheet and scripts in assets/. The template adds it to their addresses (site.css?v=…), so
// that browsers fetch them again whenever they change: GitHub Pages lets browsers keep a file for ten minutes, and a
// page could otherwise arrive with an old stylesheet.
const ASSET_VERSION = (() => {
  const hash = createHash('sha1');
  for (const name of readdirSync(join(TOOLKIT_DIR, 'assets')).filter((f) => /\.(css|js)$/.test(f)).sort()) hash.update(name).update(readFileSync(join(TOOLKIT_DIR, 'assets', name)));
  return hash.digest('hex').slice(0, 10);
})();
const SITE = join(REPO_ROOT, '_site');
const PANDOC = process.env.PANDOC || 'pandoc';
const FILTERS = ['figures', 'embeds', 'cards', 'transcript', 'links', 'citations', 'paragraphs', 'cues', 'margins', 'contract'];
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

// 2. Pages of each edition: the home page (README.md) and every essay, in reading order (convert.mjs, readBook). test.md
//    is a scratch page and stays out.
const urlOf = (file) => (file === 'README.md' ? '' : file.replace(/\.md$/, '/').split('/').map(encodeURIComponent).join('/'));
// a Markdown file of the back matter with its comments taken out, '' if it holds nothing else
const optionalText = (file) => (existsSync(file) ? readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').trim() : '');
for (const edition of editions) {
  // The back matter's pages that this edition has: each under its own name or under the name it had before it moved
  // (version 0.1 has essays/contributors.md), and the colophon from the working tree where a version frozen before it
  // existed has none: Making this book and the publisher's statement are the publisher's, not the book's text. The
  // author's acknowledgements, if the edition has any, close the page they belong to.
  const has = edition.has;
  const former = (file) => Object.keys(BACKMATTER.moved).find((old) => BACKMATTER.moved[old] === file && has(old));
  const backmatter = BACKMATTER.pages.map(({ file }) => (has(file) ? file : former(file) || file));
  const borrowed = !has(BACKMATTER.colophon) && existsSync(join(REPO_ROOT, BACKMATTER.colophon)) ? { [BACKMATTER.colophon]: REPO_ROOT } : {};
  const thanks = BACKMATTER.acknowledgements;
  const extend = (file, source, folder) => {
    const text = file === thanks.into ? optionalText(join(folder, thanks.file)) : '';
    return text ? `${source.replace(/\s*$/, '')}\n\n# ${thanks.heading}\n\n${text}\n` : source;
  };
  const book = readBook(edition.contentRoot, { exists: edition.has, backmatter, borrowed, extend });
  edition.backmatter = book.backmatter;
  edition.pages = book.pages;
  const unhandled = edition.pages.flatMap((page) => page.unhandled);
  if (unhandled.length) {
    fail(`The static twin cannot render these Juncture constructs in ${edition.name} yet:\n` +
      unhandled.map((u) => `  ${u.file}:${u.line}  ${u.why}\n      ${u.text}`).join('\n'));
  }
  edition.home = book.home;
  edition.byFile = book.byFile;
  const order = book.order;
  edition.order = order;
  // Every page shows the home page's menu, its links made root-absolute so that they work from any page.
  edition.menu = edition.home.menu.map((item) => item.replace(/\]\(([^)\s]+)\)/g, (m, target) =>
    (/^([a-z][\w+.-]*:|#)/i.test(target) ? m : `](/${repoPath(target, edition.home.file).replace(/^\.$/, '')})`)));
  // A page's section is the page whose cards lead to it (Podcasts for each podcast); the first in reading order wins.
  edition.section = new Map();
  for (const file of order) for (const target of edition.byFile.get(file).cards) if (!edition.section.has(target)) edition.section.set(target, file);
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
const { images, tiles, sources, widths } = await makeImages(jobs, REPO_ROOT, SITE);
// The publisher's logos, shared by all editions like the images.
for (const path of [FRAME.logo, FRAME.icon].filter(Boolean)) {
  if (!existsSync(join(REPO_ROOT, path))) fail(`FRAME in build.mjs names ${path}, which is not in the repository`);
}
const copied = new Set();
for (const path of [FRAME.logo, FRAME.icon].filter(Boolean)) {
  mkdirSync(dirname(join(SITE, path)), { recursive: true });
  cpSync(join(REPO_ROOT, path), join(SITE, path));
  copied.add(path);
}
for (const edition of editions) {
  edition.files = [...new Set(edition.pages.flatMap((page) => page.files))];
  for (const path of edition.files) {
    if (copied.has(path)) continue;
    cpSync(join(sourceOf(edition, path), path), join(SITE, path));
    copied.add(path);
  }
}

// The length of every MP3 in this repository that a page plays (audio.mjs), so that its player can show it before
// anything is loaded, and its paragraph cues if it has a cue file (filters/cues.lua). Pages play them from GitHub; a link
// to a file that is not there is reported by convert.mjs.
const audio = {};
{
  const repo = REPO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const onGitHub = new RegExp(`^https://(?:github\\.com/${repo}/raw|raw\\.githubusercontent\\.com/${repo})/(?:refs/heads/)?main/([^?#]+)$`);
  for (const edition of editions) for (const page of edition.pages) {
    for (const [, src] of page.markdown.matchAll(/twin-audio src="([^"]+)"/g)) {
      const path = decodeURIComponent(onGitHub.exec(src)?.[1] ?? '');
      if (!/\.mp3$/i.test(path) || path in audio || !edition.has(path)) continue;
      const file = join(sourceOf(edition, path), path), cues = paragraphCues(file);
      audio[path] = { duration: mp3Duration(file), ...(cues ? { cues: cues.cues, cueFile: path.replace(/\.mp3$/i, '.paragraphs.vtt') } : {}) };
    }
  }
}

// 4. Pandoc, twice per page. Stage 1 writes the page's Markdown view (index.md), and once more with absolute
//    URLs for publication.md (4a); then the media register is read (4b); stage 2 turns index.md into HTML
//    (index.html) and page.json (4c).
const warnings = editions.flatMap((edition) => edition.pages.flatMap((page) => page.warnings.map((w) => `${edition.dir}${w.file}:${w.line}  ${w.text}`)));
const list = (value) => (Array.isArray(value) ? value : []);
const filterArgs = (names) => names.flatMap((f) => ['--lua-filter', join(TOOLKIT_DIR, 'filters', `${f}.lua`)]);
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
// The book's version line in every footer, with one link, to the edition's "About this book" (its versions and data
// are there, and the back matter's contents a click away). shared: the way to the site's root; root: to the edition's root.
const versionLine = (edition, shared, root) => {
  const v = edition.version;
  const what = v.status === 'latest' ? `${esc(v.label)} · last changed ${longDate(v.date)}`
    : `${esc(v.label)} · ${v.status === 'review' ? 'frozen' : 'released'} on ${longDate(v.date)}`;
  return `<p class="site-footer__version">${what} · <a href="${root}about/">${esc(BACKMATTER.title)}</a></p>`;
};
// The back matter's sections in an edition, in order: the overview (About this book), its pages, and References and
// media. id: the page's file, 'about' or 'references-and-media'; url: from the edition's root.
const backmatterSections = (edition) => [
  { id: 'about', title: BACKMATTER.title, url: 'about/' },
  ...edition.backmatter.map((file) => ({ id: file, title: edition.byFile.get(file).title, url: urlOf(file),
    line: BACKMATTER.pages.find((p) => p.file === file || BACKMATTER.moved[file] === p.file)?.line || '' })),
  { id: 'references-and-media', title: BACKMATTER.referencesAndMedia.title, url: BACKMATTER.referencesAndMedia.url, line: BACKMATTER.referencesAndMedia.line },
];
// The menu's entry for the back matter (FRAME.menu.backmatter), in the bar and in the menu button's panel, as raw HTML
// for the template. Without JavaScript it is a link to the overview; assets/menu.js makes the bar's entry a menu button
// that opens the list of the sections, while the panel shows them as an indented group. current: the page being built,
// as a section's id ('in:references-and-media' for an item page, which is within the Media Index), or '' for a page
// outside the back matter. r: the way to the edition's root.
const backmatterMenu = (edition, s, r, current = '') => {
  const label = FRAME.menu?.backmatter;
  if (!label) return {};
  const sections = backmatterSections(edition);
  const within = sections.some((x) => current === x.id || current === `in:${x.id}`);
  const top = `<a class="backmatter-menu__link" href="${esc(r)}about/"${current === 'about' ? ' aria-current="page"' : within ? ' aria-current="true"' : ''}>${esc(label)}</a>`;
  const items = sections.map((x) => `<li><a href="${esc(r + x.url)}"${current === x.id ? ' aria-current="page"' : current === `in:${x.id}` ? ' aria-current="true"' : ''}>${esc(x.title)}</a></li>`).join('');
  return {
    backmatter_menu: `<li class="backmatter-menu">${top}<ul class="backmatter-menu__list" hidden>${items}</ul></li>`,
    backmatter_panel: `<li class="menu-panel__backmatter">${top}<ul class="menu-panel__group" aria-label="${esc(BACKMATTER.title)}">${items}</ul></li>`,
  };
};
// The section line above the title of a back matter page, which leads to the overview.
const backmatterSection = (r) => ({ 'section-title': BACKMATTER.title, 'section-url': `${r}about/` });
// The toolkit's line in every footer (template.html), below the book's version line.
const toolkitMeta = { 'toolkit-version': TOOLKIT_VERSION, 'toolkit-home': TOOLKIT_HOME, 'toolkit-changes': TOOLKIT_CHANGES };
const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const hypothesis = (edition) => {
  const config = { openSidebar: false };
  if (edition.group) config.groupsAllowlist = [edition.group];
  return `<script type="application/json" class="js-hypothesis-config">${JSON.stringify(config)}</script>` +
    '<script async src="https://hypothes.is/embed.js"></script>';
};
const versionMeta = (edition) => ({ 'version-id': edition.version.id, 'version-label': edition.version.label, 'version-date': edition.version.date, 'version-status': edition.version.status, 'toolkit-version': TOOLKIT_VERSION });
// The notice at the top of every page of a frozen version, with a link (href) to the same page in the newer text it
// points its readers to. A page's build fills in data-paragraphs, the map of its paragraphs to that page's.
const versionNotice = (edition, href) => {
  const v = edition.version, when = `${v.status === 'review' ? 'frozen' : 'released'} on ${longDate(v.date)}`;
  const link = edition.target === latest ? 'Read the latest text' : `Read the newest release, ${lcFirst(edition.target.version.label)}`;
  const newest = edition === newestRelease ? ', the newest release' : '';
  return `<aside class="version-notice" aria-label="About this version"><p>You are reading ${esc(lcFirst(v.label))}, ${when}${newest}. ` +
    `<a class="version-notice__link" href="${esc(href)}" data-paragraphs="{}">${esc(link)}</a>.</p></aside>`;
};
// raw HTML as a block of the Markdown that stage 2 reads
const rawBlock = (html) => {
  const fence = '`'.repeat(Math.max(3, ...[...html.matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}{=html}\n${html}\n${fence}\n`;
};
// Markdown shown as a page (a page's Markdown view, publication/): the text at a reading width under a line about it.
const wrapMarkdown = (source, about) => {
  const fence = '`'.repeat(Math.max(3, ...[...source.matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}{=html}\n<div class="markdown-view"><p class="markdown-view__about">${about}</p>\n` +
    `<pre class="markdown-source"><code>${esc(source)}</code></pre></div>\n${fence}\n`;
};
// One folder further from the site's root: from a page to its Markdown view.
const deeper = (root) => (root === './' ? '../' : root + '../');
// The parts of the frame that are the same on every page of an edition (template.html); s is the site's root. (The
// menu's entry for the back matter is backmatterMenu's.)
const frameMeta = (edition, s) => ({
  'book-title': edition.home.title, credit: FRAME.credit, publisher: PUBLICATION.publisher, 'publisher-url': FRAME.publisherUrl,
  licence: FRAME.licence?.name, 'licence-url': FRAME.licence?.url, logo: FRAME.logo && s + FRAME.logo, icon: FRAME.icon && s + FRAME.icon,
});
// The metadata file that stage 2 reads: the menu, and values of raw HTML (version notice, footer line, picture).
const writeYaml = (file, menu, extra) => writeFileSync(file, [
  menu.length ? `menu:\n${menu.map((item) => `  - ${JSON.stringify(item)}`).join('\n')}\n` : '',
  ...Object.entries(extra).map(([key, html]) => `${key.replace(/_/g, '-')}: ${rawHtml(html)}\n`),
].join(''));

// The manifest that the filters read (filters/lib.lua): the resized images (each with the repository file it was made
// from, src, which is the source of its media item), the copied files and the recordings, with the URLs of one edition
// (prefix: from its root to the shared media), and from step 4b the media items.
const manifestOf = (prefix, files) => {
  const shift = (entry) => ({ ...entry, url: prefix + entry.url, ...(entry.tiles ? { tiles: prefix + entry.tiles } : {}), ...(entry.still ? { still: prefix + entry.still } : {}),
    ...(entry.srcset ? { srcset: entry.srcset.map((c) => ({ ...c, url: prefix + c.url })), largest: prefix + entry.largest } : {}) });
  const editionImages = Object.fromEntries(Object.entries(images).map(([key, entry]) => [key, { ...shift(entry), src: key.slice(key.indexOf('|') + 1, key.lastIndexOf('|')) }]));
  const byUrl = {};
  for (const entry of Object.values(editionImages)) if (!byUrl[entry.url] || entry.tiles) byUrl[entry.url] = entry;
  return { images: editionImages, by_url: byUrl, audio, files: Object.fromEntries(files.map((path) => [path, prefix + path])) };
};
for (const edition of editions) {
  edition.prefix = edition.dir ? '../' : '';     // from the edition's root to the shared media
  edition.scratch = join(work, edition.dir || 'latest');
  mkdirSync(edition.scratch, { recursive: true });
  edition.manifest = join(edition.scratch, 'manifest.json');
  edition.manifestData = manifestOf(edition.prefix, edition.files);
  writeFileSync(edition.manifest, JSON.stringify(edition.manifestData));
}

// 4a. Stage 1 of every page of every edition: its Markdown view (index.md), and once more with absolute URLs for
//     publication.md. It also lists the page's media items (filters/items.lua), which the register needs before any
//     page is made.
const toMarkdown = (names) => ['-f', 'markdown-smart-implicit_figures', '-t', 'markdown-smart', '--wrap=none', '--markdown-headings=atx', ...filterArgs(names)];
for (const edition of editions) for (const page of edition.pages) {
  const url = urlOf(page.file);
  const dir = join(SITE, edition.dir, decodeURIComponent(url));
  const root = url ? '../'.repeat(url.split('/').length - 1) : './';
  const itemsOut = join(edition.scratch, page.file.replace(/\W/g, '_') + '.items.json');
  const meta = { page: page.file, repo: REPO, manifest: edition.manifest, lang: PUBLICATION.language, title: page.title, subtitle: page.subtitle };
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.md'), bracedDivs(pandoc([...toMarkdown(['items', 'to-markdown']), '-s', ...metaArgs({ ...meta, ...versionMeta(edition), root, 'items-out': itemsOut })], page.markdown, page.file)));
  page.found = JSON.parse(readFileSync(itemsOut, 'utf8'));
  page.markdownBody = bracedDivs(pandoc([...toMarkdown(['to-markdown']), ...metaArgs({ ...meta, root: siteUrl + edition.dir, 'title-heading': 'true' })], page.markdown, page.file)).trim();
}

// 4b. The media register (register.mjs): every item on the pages matched to its line in media/register.csv by its file
//     or address, a name drafted for an item that has no line yet, and the checks: the build stops when a registered
//     item's file has gone or its address has changed, when two items share a name, or when an item of a frozen
//     version has no number. The manifests then get the items, for the captions' number pills.
const register = readRegister();
if (register.problems.length) fail(`The media register, media/register.csv, has problems:\n${register.problems.map((p) => `  ${p}`).join('\n')}`);
const byNewest = [latest, ...editions.slice(1).reverse()];   // the latest text, then the frozen versions, newest first
const media = resolveItems({
  lines: register.lines, bookTitle: latest.home.title, versions: registry.map((v) => v.id),
  editions: byNewest.map((e) => ({ id: e.version.id, label: e.version.label, frozen: e !== latest, has: e.has, edition: e,
    pages: e.order.map((file) => ({ file, title: e.byFile.get(file).title, found: e.byFile.get(file).found })) })),
});
if (media.problems.length) fail(`The media register and the pages do not agree:\n${media.problems.map((p) => `  ${p}`).join('\n')}`);
const itemUrl = (it) => `${it.kind}/${it.name}/`;
// (an item not numbered yet has no label: JSON's null would reach the filters as a value that is not nil)
const itemsFor = (prefix) => Object.fromEntries([...media.bySource].map(([source, it]) => [source,
  { ...(it.label ? { label: it.label } : {}), kind: it.kind, name: it.name, url: prefix + itemUrl(it), credit: it.credit || '', title: it.title || '' }]));
// 4b'. Documents (documents.mjs; "Plan: documents and zines" in DEVELOPMENT.md): every read item whose pages the build can
//     show gets them as images (zoom tiles, and two widths for the row of pages and the cover: images.mjs, makePages),
//     its text page by page, and its data, read/<name>/document.json at the site's root (CONTRACT.md, "Documents").
//     A PDF of this repository is rendered with poppler; a zine on archive.org shows the pages that scripts/fetch-zine.mjs
//     copied into media/zines/<identifier>/ (a flattened zine has no text that can be read reliably). Any other read item
//     stays an embed. The manifests get the documents, for the filters (filters/embeds.lua).
const documents = new Map();   // item name -> its document
const documentReport = { pages: 0, tiles: 0 };
{
  const jobs = [];
  for (const it of media.items.filter((i) => i.kind === 'read' && i.appearances.length)) {
    const from = pagesOf(it.source);
    if (!from) continue;
    const first = it.appearances[0];
    const title = it.title || first.found.title || first.found.caption || it.name;
    if (from.kind === 'pdf') {
      const missing = requirePoppler();
      if (missing) fail(missing);
      const file = join(sourceOf(first.edition.edition, from.path), from.path);
      let rendered, text;
      try { rendered = renderPdf(file, join(work, 'documents', it.name)); text = pdfText(file); } catch (e) { fail(e.message); }
      if (text.length !== rendered.length) fail(`${from.path}: pdftoppm found ${rendered.length} pages and pdftotext ${text.length}`);
      jobs.push({ it, title, kind: 'pdf', text, pages: rendered.map((p) => ({ n: p.n, file: p.file, name: `${imageName(from.path)}-page-${String(p.n).padStart(3, '0')}` })),
        download: { url: from.path, label: 'PDF', size: statSync(file).size } });
      // the PDF is the download, so it is in the site (a page in Juncture's syntax has had it copied already)
      if (!copied.has(from.path)) {
        mkdirSync(dirname(join(SITE, from.path)), { recursive: true });
        cpSync(file, join(SITE, from.path));
        copied.add(from.path);
      }
    } else {
      let zine;
      try { zine = zinePages(from.id); } catch (e) { fail(e.message); }
      jobs.push({ it, title, kind: 'zine', text: null, pages: zine.pages.map((p) => ({ n: p.n, file: p.file, name: imageName(p.path) })),
        download: { url: it.source, label: 'archive.org', external: true }, copy: { folder: from.folder, fetched: zine.record.fetched } });
    }
  }
  const made = await makePages(jobs.flatMap((j) => j.pages), SITE);
  documentReport.tiles = made.tiles;
  let k = 0;
  for (const j of jobs) {
    const it = j.it, url = itemUrl(it);
    const pages = j.pages.map((p) => ({ n: p.n, ...made.pages[k++], ...(j.text ? { text: j.text[p.n - 1] } : {}) }));
    documentReport.pages += pages.length;
    const doc = { name: it.name, kind: j.kind, title: j.title, url, json: `${url}document.json`, text: !!j.text, download: j.download, copy: j.copy || null, pages };
    documents.set(it.name, doc);
    mkdirSync(join(SITE, url), { recursive: true });
    writeFileSync(join(SITE, doc.json), JSON.stringify({
      contract: CONTRACT, everytrickinthebook: TOOLKIT_VERSION, number: it.number, name: it.name, title: doc.title, url, source: it.source,
      download: { url: doc.download.url, label: doc.download.label, size: doc.download.size ?? null },
      copy: doc.copy ? { folder: doc.copy.folder, fetched: doc.copy.fetched } : null,
      text: doc.text,
      pages: pages.map((p) => ({ n: p.n, width: p.width, height: p.height, tiles: p.tiles, info: p.info, image: p.srcset.at(-1).url, thumb: p.srcset[0].url,
        text: p.text ?? null })),
    }, null, 1) + '\n');
  }
}
// what the filters need of each document, with URLs from an edition's root (prefix: from there to the site's root)
const documentsFor = (prefix) => Object.fromEntries([...documents.values()].map((d) => [d.name, {
  title: d.title, kind: d.kind, text: d.text, json: prefix + d.json, page: prefix + d.url,
  download: { url: d.download.external ? d.download.url : prefix + d.download.url, label: d.download.label, size: d.download.size ? sizeText(d.download.size) : '', external: !!d.download.external },
  pages: d.pages.map((p) => ({ width: p.width, height: p.height, srcset: p.srcset.map((c) => ({ url: prefix + c.url, width: c.width })) })),
}]));
for (const edition of editions) {
  edition.manifestData.items = itemsFor(edition.prefix);
  edition.manifestData.documents = documentsFor(edition.prefix);
  writeFileSync(edition.manifest, JSON.stringify(edition.manifestData));
}

// The colophon (BACKMATTER.colophon): after its own text (Making this book and the publisher's statement, numbered and
// searched like any other page), what the build writes: the book's licence, and the versions and kit. None of it is
// reading text: it has no paragraph numbers and is left out of the search index (data-pagefind-ignore). The kit starts
// with the publisher's own sentences, if BACKMATTER.colophonNote holds any (its comments aside), taken from the working
// tree for every edition, like the rest of the kit. root: from the page to its edition's root; shared: to the site's.
const packageVersion = (name) => JSON.parse(readFileSync(join(TOOLKIT_DIR, 'node_modules', name, 'package.json'), 'utf8')).version;
const colophonNote = (() => {
  const text = optionalText(join(REPO_ROOT, BACKMATTER.colophonNote));
  return text ? pandoc(['-f', 'markdown', '-t', 'html5', '--wrap=none'], text, BACKMATTER.colophonNote).trim() : '';
})();
const colophonHtml = (edition, root, shared) => {
  const v = edition.version;
  const a = (href, text, attrs = '') => `<a href="${esc(href)}"${attrs}>${text}</a>`;
  const when = v.status === 'latest' ? `last changed on ${longDate(v.date)}` : `${v.status === 'review' ? 'frozen for peer review' : 'released'} on ${longDate(v.date)}`;
  const toolkit = `<a class="toolkit-name" href="${esc(TOOLKIT_HOME)}" aria-label="every trick in the book">everytrickinthebook</a> ` +
    `<a href="${esc(TOOLKIT_CHANGES)}" aria-label="${TOOLKIT_VERSION}, what’s new">${TOOLKIT_VERSION}</a>`;
  const media = `${root}${BACKMATTER.referencesAndMedia.url}`;
  const licence = FRAME.licence ? `<p class="colophon__licence">This book is published under ${a(FRAME.licence.url, esc(FRAME.licence.name), ' rel="license"')}. ` +
    `Its media items – pictures, recordings, videos and documents – may carry other rights, which the ${a(`${media}#media`, 'Media Index')} gives item by item.</p>\n` : '';
  return `<div class="colophon__built" data-pagefind-ignore>
${licence}<h2 id="versions-and-kit">Versions and kit</h2>
<p>You are reading ${v.status === 'latest' ? 'the latest text of the book, unreleased' : esc(lcFirst(v.label))}, ${when}. Every version of the book that has been frozen for review or released stays online at its own address, with its paragraph numbers: ${a(`${shared}versions/`, 'all versions')}.</p>
<p>The book is open data too, for other tools and for archiving, in the format of ${a(TOOLKIT_CONTRACT, `contract ${CONTRACT}`)} of everytrickinthebook:</p>
<ul class="colophon__data">
<li>${a(`${root}publication.json`, '<code>publication.json</code>')}: the book’s title, its versions, its reading order and the parts of About this book</li>
<li>${a(`${shared}media.json`, '<code>media.json</code>')}: every media item, with its credit, its rights and where it appears</li>
<li>the Markdown views: every page in the Markdown it is built from, behind the Markdown switch in its header (${a('markdown/', 'this page’s')}), with the file itself, <code>index.md</code>, and the page’s data, <code>page.json</code>, beside it</li>
<li>${a(`${root}publication/`, 'the whole book in Markdown')}, in reading order (${a(`${root}publication.md`, '<code>publication.md</code>', ' download')})</li>
<li>the bibliography, as ${a(`${root}references/${DOWNLOADS.bibtex}`, 'BibTeX', ' download')}, ${a(`${root}references/${DOWNLOADS.ris}`, 'RIS', ' download')} and ${a(`${root}references/${DOWNLOADS.csljson}`, 'CSL-JSON', ' download')}</li>
</ul>
${colophonNote ? `${colophonNote}\n` : ''}<p>This site is made with ${toolkit}, a Mattering toolkit by SJMcH (${a('https://www.mozilla.org/en-US/MPL/2.0/', 'Mozilla Public License 2.0')}), which builds it from the book’s Markdown with ${a('https://pandoc.org/', 'Pandoc')} ${esc(version[0].replace(/^pandoc\s+/, ''))} (${a('https://www.gnu.org/licenses/old-licenses/gpl-2.0.html', 'GNU GPL')}). Its text is set in ${a('https://fonts.google.com/specimen/Roboto', 'Roboto')} (${a('https://openfontlicense.org/', 'SIL Open Font License 1.1')}). Search is by ${a('https://pagefind.app/', 'Pagefind')} ${esc(packageVersion('pagefind'))} (${a('https://opensource.org/license/mit', 'MIT licence')}), and pictures and documents zoom in ${a('https://openseadragon.github.io/', 'OpenSeadragon')} ${esc(packageVersion('openseadragon'))} (${a('https://opensource.org/license/bsd-3-clause', 'BSD 3-Clause licence')}). References are formatted in the ${a('https://citationstyles.org/', 'Citation Style Language')}: Mattering Press’ house style, adapted from the MHRA styles, and the APA, Chicago, MLA and Harvard styles of the official CSL repository, which the ${a(`${media}#references`, 'References')} offer to copy, all under ${a('https://creativecommons.org/licenses/by-sa/3.0/', 'CC BY-SA 3.0')}.</p>
<p>The site is hosted on ${a(HOSTING.url, esc(HOSTING.name))}, and built from ${a(`https://github.com/${REPO}`, 'the book’s repository on GitHub')}.</p>
</div>`;
};
// A page that forwards a former address to the new one, keeping the fragment (#hall2001, #item-37) with JavaScript;
// without it, the meta refresh leads to the new address as it is. depth: how deep the old address is below the site's root.
const forwardPage = ({ dir, target, title, canonical }) => {
  const up = '../'.repeat(dir.split('/').filter(Boolean).length);
  const to = up + target;
  mkdirSync(join(SITE, dir), { recursive: true });
  writeFileSync(join(SITE, dir, 'index.html'), forwardHtml({ lang: PUBLICATION.language, title, target: to, canonical, stylesheet: `${up}assets/site.css?v=${ASSET_VERSION}`,
    text: 'This page has a new address:', keepFragment: true }));
};

// 4c. Stage 2 of every page: HTML from its Markdown view (index.html), its Markdown view's page, and page.json.
const report = { paragraphs: [], matching: [], citations: [], references: [] };
// An edition is built after the one its notice points to, whose paragraphs it is matched against.
for (const edition of editions) edition.paragraphs = new Map();
for (const edition of [latest, ...(newestRelease ? [newestRelease] : []), ...editions.slice(1).filter((e) => e !== newestRelease)]) {
  const out = join(SITE, edition.dir);
  const prefix = edition.prefix;
  const editionImages = edition.manifestData.images;
  const scratch = edition.scratch;
  const manifest = edition.manifest;
  // The bibliography, formatted once in the house style; citations.lua links each page's citations to it.
  let bibliography = join(edition.contentRoot, 'references', 'bibliography.json');
  if (!existsSync(bibliography)) {
    warnings.push(`${edition.name} has no references/bibliography.json; its citations are linked with the working tree's`);
    bibliography = BIBLIOGRAPHY;
  }
  const references = prepareReferences({ pandoc: PANDOC, work: scratch, bibliography });
  edition.references = references;
  // for the edition's References page: every linked citation ({ key, file, anchor, para, note, after, inPage }) and
  // every entry of a typed reference list ({ key, file }), page by page
  edition.citing = [];
  edition.listing = [];
  const target = edition.target;
  edition.searchable = [];   // this edition's pages as built, for its search index (step 7)

  for (const page of edition.pages) {
    const url = urlOf(page.file);
    const dir = join(out, decodeURIComponent(url));
    const root = url ? '../'.repeat(url.split('/').length - 1) : './';
    const shared = join2(root, prefix) || './';   // the site's root, where assets/ and versions/ are
    const contractOut = join(scratch, page.file.replace(/\W/g, '_') + '.json');
    const meta = { page: page.file, repo: REPO, manifest, 'contract-out': contractOut, lang: PUBLICATION.language, title: page.title, subtitle: page.subtitle };

    // stage 2: HTML from the Markdown view, with the menu, the page's header band, the footer and the version
    // notice as metadata. The same frame, with the page's Markdown as its text, makes the Markdown view's page.
    // this page in the edition the notice points to (under its new name, if it has moved into the back matter there)
    const counterpart = BACKMATTER.moved[page.file] && target?.byFile.has(BACKMATTER.moved[page.file]) ? BACKMATTER.moved[page.file] : page.file;
    const there = target && target.paragraphs.get(counterpart);
    const section = edition.section.get(page.file);
    const inBackmatter = edition.backmatter.includes(page.file);
    const band = page.header.image && editionImages[`header|${page.header.image}|0`];
    // the frame of this page as seen from `from`, the page's own folder ('') or its Markdown view ('markdown/')
    const frame = (from) => {
      const r = from ? deeper(root) : root, s = join2(r, prefix) || './';
      const extra = { version_line: versionLine(edition, s, r), ...backmatterMenu(edition, s, r, page.file) };
      if (edition.annotations === 'hypothesis') extra.annotations = hypothesis(edition);
      // The notice links to the same page there (its home page if the page is gone). paragraphs.js takes the reader
      // to the passage they are reading, with the map of this page's paragraphs to that page's added below.
      if (target) extra.version_notice = versionNotice(edition, join2(s, target.dir + (there ? urlOf(counterpart) : '')));
      if (band) extra.page_band = `<img src="${esc(join2(r, band.url))}" width="${band.width}" height="${band.height}" alt="" fetchpriority="high">`;
      const yaml = join(scratch, page.file.replace(/\W/g, '_') + (from ? '.markdown' : '') + '.yaml');
      writeYaml(yaml, edition.menu, extra);
      return ['--metadata-file', yaml, ...metaArgs({ ...meta, ...toolkitMeta, ...frameMeta(edition, s), root: r, shared: s, 'paragraph-rule': edition.rule, 'asset-version': ASSET_VERSION, views: 'true',
        [from ? 'on-markdown' : 'on-page']: 'true', 'view-page': from ? '../' : './', 'view-markdown': from ? './' : 'markdown/',
        'section-page': section && section !== edition.home.file ? section : '', 'section-title': section && section !== edition.home.file ? edition.byFile.get(section).title : '',
        'section-url': section && section !== edition.home.file ? r + urlOf(section) : '', ...(inBackmatter ? backmatterSection(r) : {}),
        'site-title': page === edition.home ? '' : edition.home.title, noindex: NOINDEX || from ? 'true' : '', searchable: from ? '' : 'true' })];
    };
    // the colophon adds what the build writes after its own text: the licence, and the versions and kit
    const after = page.file === BACKMATTER.colophon ? `\n\n${rawBlock(colophonHtml(edition, root, shared))}` : '';
    let html = pandoc(['-f', 'markdown-implicit_figures', '-t', 'html5', '--wrap=none', '-s', '--template', join(TOOLKIT_DIR, 'template.html'),
      ...frame(''), '-M', `citations=${references.indexPath}`, ...filterArgs(FILTERS)], readFileSync(join(dir, 'index.md'), 'utf8') + after, page.file);
    // The Markdown view's page: the page's Markdown, wrapped at a reading width, with a link to the file itself.
    const markdownView = wrapMarkdown(readFileSync(join(dir, 'index.md'), 'utf8'), 'The Markdown this page is built from. ' +
      `<a href="../index.md" download>Download index.md</a> · <a href="${esc(deeper(root))}publication/">The whole book in Markdown</a>`);
    mkdirSync(join(dir, 'markdown'), { recursive: true });
    writeFileSync(join(dir, 'markdown', 'index.html'), pandoc(['-f', 'markdown', '-t', 'html5', '--wrap=none', '-s', '--template', join(TOOLKIT_DIR, 'template.html'),
      ...frame('markdown/'), ...filterArgs(['links'])], markdownView, `${page.file} (Markdown view)`));
    const data = JSON.parse(readFileSync(contractOut, 'utf8'));
    const paragraphs = list(data.paragraphs);
    if (target) {
      // the map needs this page's paragraphs, which stage 2 has just numbered
      const result = there ? matchParagraphs(paragraphs, there) : { map: {}, counts: null };
      html = html.replace('data-paragraphs="{}"', `data-paragraphs='${JSON.stringify(result.map)}'`);   // ids only: no quotes to escape
      report.matching.push({ edition, file: page.file, total: paragraphs.length, missing: !there, ...result.counts });
    }
    writeFileSync(join(dir, 'index.html'), html);
    edition.searchable.push({ url: `/${url}`, content: html });
    edition.paragraphs.set(page.file, paragraphs);
    report.paragraphs.push({ edition, file: page.file, paragraphs });
    // where each media item is on the page (its anchor, and the paragraph before it), for its item page and the index
    const items = list(data.items);
    for (const d of items) {
      const it = media.bySource.get(d.source);
      const a = it && it.appearances.find((x) => x.edition.edition === edition && x.file === page.file && !x.anchor);
      if (a) Object.assign(a, { anchor: d.anchor, after: d.after || null });
    }

    // what the References page says of this page: the works its typed list has, and its linked citations
    const typed = list(data.typed)[0] || {};
    const listedHere = new Set(list(typed.listed));
    for (const key of listedHere) edition.listing.push({ key, file: page.file });
    for (const c of list(data.citations)) {
      if (c.status === 'matched' && c.key && c.id) edition.citing.push({ key: c.key, file: page.file, anchor: c.id, para: c.para || null, note: c.note || null, after: c.after || null, inPage: listedHere.has(c.key) });
    }

    page.url = url || './';
    writeFileSync(join(dir, 'page.json'), JSON.stringify({
      contract: CONTRACT, paragraphRule: edition.rule, id: page.file, url: page.url, title: page.title, subtitle: page.subtitle,
      part: inBackmatter ? 'backmatter' : 'body', version: edition.version, everytrickinthebook: TOOLKIT_VERSION,
      markdown: `${url}index.md`,
      headings: list(data.headings).map(({ level, text, id }) => ({ level, text, id })),
      paragraphs: paragraphs.map(({ id, n, text_hash }) => ({ id, n, text_hash })),
      items: items.map(({ label, kind, name, url, anchor, after }) => ({ number: label ? Number(label) : null, kind, name, url, anchor, after: after || null })),
      figures: list(data.figures).map(({ image, width, height, tiles, alt, caption, description, description_by }) => ({ image, width, height, tiles, alt, caption,
        description: description || '', description_by: description_by || '' })),
      audio: list(data.audio).map(({ url, title }) => ({ url, title })),
      video: list(data.video).map(({ url, title, kind }) => ({ url, title, kind })),
      links: list(data.links).map(({ id, url, text }) => ({ id, url: url || './', text })),
      references: list(data.references).map(({ key, html, url, citations }) => ({ key, html, url, citations: list(citations) })),
    }, null, 2) + '\n');
    if (edition === latest) report.citations.push({ file: page.file, citations: locate(readFileSync(join(REPO_ROOT, page.file), 'utf8'), list(data.citations)), typed: list(data.typed)[0] || { listed: [], unmatched: [] } });
  }

  // The References of this edition (referencesHtml in citations.mjs), the first part of References and media
  // (about/references-and-media/, made in step 6 with the Media Index): every work of its bibliography once, in the
  // order of the house style's reference list, each with the passages that cite it and the pages whose typed lists
  // include it, in reading order. A citation whose page does not list its work links to it there. In references/, the
  // whole bibliography to download as BibTeX, RIS and CSL-JSON, and formatted.json, every work in each style of the
  // Copy menus (formatReferences; assets/references.js); references/ itself forwards to the new page (step 6b).
  {
    const rank = (file) => (edition.order.includes(file) ? edition.order.indexOf(file) : edition.order.length);
    const byPage = (a, b) => rank(a.file) - rank(b.file);   // (stable: a page's citations stay in their order)
    const titleOf = (file) => edition.byFile.get(file).title;
    const works = references.order.map((key) => {
      const passages = new Set();   // a passage that cites the work twice is named once, with a link to the first
      const cited = edition.citing.filter((c) => c.key === key).sort(byPage)
        .filter((c) => { const at = `${c.file}|${c.para || c.note || c.after || ''}`; return !passages.has(at) && passages.add(at); })
        .map((c) => ({ title: titleOf(c.file), url: `${urlOf(c.file)}#${c.anchor}`, para: c.para, note: c.note, after: c.after }));
      const listed = [...new Set(edition.listing.filter((l) => l.key === key).sort(byPage).map((l) => l.file))]
        .map((file) => ({ title: titleOf(file), url: `${urlOf(file)}#ref-${key}` }));
      return { key, html: references.index[key].html, cite: references.cites[key] || key, cited, listed };
    });
    const depth = BACKMATTER.referencesAndMedia.url.split('/').filter(Boolean).length;
    edition.referencesHtml = referencesHtml(works, { root: '../'.repeat(depth), files: `${'../'.repeat(depth)}references/` });
    mkdirSync(join(out, 'references'), { recursive: true });
    let formats;
    try { formats = formatReferences({ pandoc: PANDOC, work: scratch, references }); } catch (e) { fail(`${edition.name}: ${e.message}`); }
    if (edition === latest) warnings.push(...formats.warnings);
    writeFileSync(join(out, 'references', DOWNLOADS.bibtex), formats.bibtex);
    writeFileSync(join(out, 'references', DOWNLOADS.ris), formats.ris);
    writeFileSync(join(out, 'references', DOWNLOADS.csljson), formats.csljson);
    writeFileSync(join(out, 'references', COPY_DATA), JSON.stringify({
      contract: CONTRACT, everytrickinthebook: TOOLKIT_VERSION, version: edition.version,
      styles: COPY_STYLES.map(({ id, label, short, csl, locale, entry }) => ({ id, label, short, ...(csl ? { csl: `https://github.com/citation-style-language/styles/blob/${CSL_COMMIT}/${csl}`, locale } : {}), ...(entry ? { entry } : {}) })),
      works: formats.texts,
    }) + '\n');
    report.references.push({ edition, works: works.length, cited: works.filter((w) => w.cited.length).length,
      citations: edition.citing.length, inPage: edition.citing.filter((c) => c.inPage).length });
  }

  // about/: the overview of About this book (the back matter): a short paragraph and a line for each of its parts, each
  // with its link. It is not a page of the book's text: it has no paragraph numbers and is in no search index.
  {
    const s = join2('../', prefix) || './';
    const extra = { version_line: versionLine(edition, s, '../'), ...backmatterMenu(edition, s, '../', 'about') };
    if (edition.annotations === 'hypothesis') extra.annotations = hypothesis(edition);
    if (target) extra.version_notice = versionNotice(edition, join2(s, `${target.dir}about/`));
    const yaml = join(scratch, 'about.yaml');
    writeYaml(yaml, edition.menu, extra);
    const parts = backmatterSections(edition).filter((x) => x.id !== 'about')
      .map((x) => `<li><a class="about-parts__title" href="${esc('../' + x.url)}">${esc(x.title)}</a>${x.line ? `<p>${esc(x.line)}</p>` : ''}</li>`);
    mkdirSync(join(out, 'about'), { recursive: true });
    writeFileSync(join(out, 'about', 'index.html'), pandoc(['-f', 'markdown', '-t', 'html5', '--wrap=none', '-s', '--template', join(TOOLKIT_DIR, 'template.html'), '--metadata-file', yaml,
      ...metaArgs({ page: 'about', repo: REPO, manifest, lang: PUBLICATION.language, title: BACKMATTER.title, ...toolkitMeta, ...frameMeta(edition, s),
        root: '../', shared: s, 'asset-version': ASSET_VERSION, 'site-title': edition.home.title, noindex: NOINDEX ? 'true' : '' }), ...filterArgs(['links'])],
      rawBlock(`<p class="about-intro">${esc(BACKMATTER.intro)}</p>\n<ul class="about-parts">\n${parts.join('\n')}\n</ul>`), `${edition.name}: about/`));
  }

  // publication.json, in the reading order worked out above, which the back matter closes, and the back matter's sections.
  const home = edition.home;
  const versionsList = [latest, ...editions.slice(1).reverse()].map((e) => ({ ...e.version, url: e === edition ? './' : prefix + e.dir || './' }));
  writeFileSync(join(out, 'publication.json'), JSON.stringify({
    contract: CONTRACT, paragraphRule: edition.rule, title: home.title, subtitle: home.subtitle, ...PUBLICATION, url: siteUrl + edition.dir, markdown: 'publication.md',
    version: edition.version, everytrickinthebook: TOOLKIT_VERSION, versions: versionsList,
    readingOrder: edition.order.map((file) => ({ id: file, url: edition.byFile.get(file).url, title: edition.byFile.get(file).title,
      part: edition.backmatter.includes(file) ? 'backmatter' : 'body' })),
    backmatter: { title: BACKMATTER.title, url: 'about/',
      sections: backmatterSections(edition).filter((x) => x.id !== 'about').map((x) => ({ id: x.id, title: x.title, url: x.url })) },
  }, null, 2) + '\n');

  // publication.md: every page in reading order, each starting with its title as a heading, with absolute URLs.
  const v = edition.version;
  const front = ['---', `title: ${JSON.stringify(home.title)}`, `subtitle: ${JSON.stringify(home.subtitle ?? '')}`, 'author:', ...PUBLICATION.creators.map((c) => `  - ${JSON.stringify(c)}`),
    `publisher: ${JSON.stringify(PUBLICATION.publisher)}`, `lang: ${PUBLICATION.language}`,
    'version:', `  id: ${JSON.stringify(v.id)}`, `  label: ${JSON.stringify(v.label)}`, `  date: ${JSON.stringify(v.date)}`, `  status: ${JSON.stringify(v.status)}`,
    `everytrickinthebook: ${JSON.stringify(TOOLKIT_VERSION)}`, '---'].join('\n');
  const publication = `${front}\n\n${edition.order.map((file) => edition.byFile.get(file).markdownBody).join('\n\n')}\n`;
  writeFileSync(join(out, 'publication.md'), publication);
  // publication/: the same Markdown in the frame of the site, at a reading width, like a page's Markdown view.
  {
    const s = join2('../', prefix) || './';
    const yaml = join(scratch, 'publication.yaml');
    writeYaml(yaml, edition.menu, { version_line: versionLine(edition, s, '../'), ...backmatterMenu(edition, s, '../') });
    mkdirSync(join(out, 'publication'), { recursive: true });
    writeFileSync(join(out, 'publication', 'index.html'), pandoc(['-f', 'markdown', '-t', 'html5', '--wrap=none', '-s', '--template', join(TOOLKIT_DIR, 'template.html'), '--metadata-file', yaml,
      ...metaArgs({ page: 'publication.md', repo: REPO, manifest, lang: PUBLICATION.language, title: 'The whole book in Markdown', ...toolkitMeta, ...frameMeta(edition, s),
        root: '../', shared: s, 'asset-version': ASSET_VERSION, 'site-title': home.title, noindex: 'true',
        // the Page / Markdown switch: "Page" leads to the home page, and the template's script points it at the page the reader came from
        views: 'true', 'on-markdown': 'true', 'whole-book': 'true', 'view-page': '../', 'view-markdown': './' }), ...filterArgs(['links'])],
      wrapMarkdown(publication, 'Every page of the book in reading order, in the Markdown it is built from. <a href="../publication.md" download>Download publication.md</a>'),
      `${edition.name}: publication/`));
  }

  // search/: the search page. assets/search.js asks this edition's index (pagefind/, made in step 7) and lists each page
  // found with the paragraphs the words are in. Without JavaScript it points to the whole book in Markdown.
  {
    const s = join2('../', prefix) || './';
    const yaml = join(scratch, 'search.yaml');
    const v = edition.version;
    const extra = { version_line: versionLine(edition, s, '../'), ...backmatterMenu(edition, s, '../') };
    if (edition !== latest) {
      extra.version_notice = `<aside class="version-notice" aria-label="About this version"><p>You are searching ${esc(lcFirst(v.label))}, ` +
        `${v.status === 'review' ? 'frozen' : 'released'} on ${longDate(v.date)}. <a class="search-elsewhere" href="${esc(join2(s, 'search/'))}">Search the latest text</a>.</p></aside>`;
    }
    writeYaml(yaml, edition.menu, extra);
    const body = '```{=html}\n<div class="search" data-pagefind="../pagefind/">\n' +
      '<form class="search__form" role="search" action="./" method="get">\n' +
      '<label class="search__label" for="search-input">Words to find in the book</label>\n' +
      '<input class="search__input" id="search-input" type="search" name="q" autocomplete="off" spellcheck="false">\n' +
      '</form>\n<p class="search__status" role="status" aria-live="polite"></p>\n<ol class="search__results"></ol>\n' +
      '<button class="search__more" type="button" hidden>More pages</button>\n' +
      '<noscript><p class="search__noscript">Search needs JavaScript. Without it, open <a href="../publication/">the whole book in Markdown</a> and use your browser’s Find in page.</p></noscript>\n' +
      '</div>\n```\n';
    mkdirSync(join(out, 'search'), { recursive: true });
    writeFileSync(join(out, 'search', 'index.html'), pandoc(['-f', 'markdown', '-t', 'html5', '--wrap=none', '-s', '--template', join(TOOLKIT_DIR, 'template.html'), '--metadata-file', yaml,
      ...metaArgs({ page: 'search.md', repo: REPO, manifest, lang: PUBLICATION.language, title: 'Search', ...toolkitMeta, ...frameMeta(edition, s),
        root: '../', shared: s, 'asset-version': ASSET_VERSION, 'site-title': home.title, noindex: 'true', 'search-page': 'true' }), ...filterArgs(['links'])],
      body, `${edition.name}: search/`));
  }
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
    `The site’s design, and what its pages do, come from the toolkit that builds it: [everytrickinthebook](${TOOLKIT_HOME}){.toolkit-name aria-label="every trick in the book"} ${TOOLKIT_VERSION} ([what’s new](${TOOLKIT_CHANGES})). The toolkit’s versions are numbered separately from the book’s.`,
  ].join('\n');
  const dir = join(SITE, 'versions');
  mkdirSync(dir, { recursive: true });
  const yaml = join(work, 'versions.yaml');
  const home = latest.home;
  writeYaml(yaml, latest.menu, { version_line: versionLine(latest, '../', '../'), ...backmatterMenu(latest, '../', '../') });
  const html = pandoc(['-f', 'markdown', '-t', 'html5', '--wrap=none', '-s', '--template', join(TOOLKIT_DIR, 'template.html'), '--metadata-file', yaml,
    ...metaArgs({ page: 'versions.md', repo: REPO, manifest: latest.manifest, 'contract-out': join(work, 'versions.json'), lang: PUBLICATION.language, title: 'Versions',
      ...toolkitMeta, ...frameMeta(latest, '../'), root: '../', shared: '../', 'asset-version': ASSET_VERSION, 'site-title': home.title, 'paragraph-numbers': 'false', noindex: NOINDEX ? 'true' : '' }),
    ...filterArgs(['links', 'paragraphs', 'contract'])], markdown, 'versions page');
  writeFileSync(join(dir, 'index.html'), html);
}

// 6. Media items, at the site's root and shared by all editions: a page for every item (/see/<name>/, /listen/,
//    /watch/, /read/), the short address of every numbered item (/37/), a page that forwards each former name's address
//    to the current one, References and media (the References of step 4c and the Media Index, in every edition) and
//    media.json; and on a preview the Media Index's editing view
//    (/media-index/edit/). See "Plan: media register, item pages and the Media Index" in DEVELOPMENT.md.
const pandocAsync = (args, input, file) => new Promise((resolve) => {
  const child = spawn(PANDOC, args);
  let out = '', err = '';
  child.stdout.setEncoding('utf8').on('data', (d) => { out += d; });
  child.stderr.setEncoding('utf8').on('data', (d) => { err += d; });
  child.on('error', (e) => fail(`Pandoc could not run for ${file}: ${e.message}`));
  child.on('close', (code) => {
    if (code !== 0) fail(`Pandoc failed on ${file}:\n${err}`);
    warnings.push(...err.split('\n').filter(Boolean).map((line) => line.replace(/^warning /, '')));
    resolve(out);
  });
  child.stdin.end(input);
});
const inParallel = async (list, task) => {
  const queue = [...list];
  await Promise.all(Array.from({ length: 6 }, async () => { for (let x; (x = queue.shift()) !== undefined;) await task(x); }));
};
const ordinal = (n) => ['first', 'second', 'third', 'fourth', 'fifth'][n - 1] || `${n}th`;
const rawGitHub = (path) => `https://raw.githubusercontent.com/${REPO}/main/${path.split('/').map(encodeURIComponent).join('/')}`;
const mediaReport = { pages: 0, short: 0, forwards: 0 };
{
  const versionById = new Map(editions.slice(1).map((e) => [e.version.id, e]));
  const image = (role, src, rotation) => images[`${role}|${src}|${Math.floor(Number(rotation) || 0)}`];
  // An item as its page, the Media Index and media.json show it. URLs are relative to the site's root.
  const itemView = (it) => {
    const url = itemUrl(it);
    const apps = it.appearances.map((a) => {
      const e = a.edition.edition;
      return { edition: e, frozen: e !== latest, editionLabel: e.version.label, file: a.file, pageTitle: a.title, caption: a.found.caption, alt: a.found.alt,
        found: a.found, anchor: a.anchor, after: a.after, link: `${e.dir}${urlOf(a.file)}${a.anchor ? `#${a.anchor}` : ''}` };
    });
    // where it is shown: the latest text, or else the newest frozen version that has it
    const frozenWith = editions.slice(1).reverse().filter((e) => apps.some((a) => a.edition === e));
    let shown = apps.filter((a) => a.edition === latest);
    if (!shown.length && frozenWith.length) shown = apps.filter((a) => a.edition === frozenWith[0]);
    const first = shown[0] || null;
    const captions = [];
    for (const a of shown) {
      let c = captions.find((x) => x.text === a.caption);
      if (!c) captions.push(c = { text: a.caption, pages: [] });
      if (!c.pages.includes(a.pageTitle)) c.pages.push(a.pageTitle);
    }
    let thumb = null, files = [], duration = null, docType = '';
    const source = first?.found.source || it.source;
    const doc = documents.get(it.name) || null;
    if (doc) {
      // a document: its cover, the original (our PDF, or the item on archive.org), and its data
      const cover = doc.pages[0].srcset[0];
      thumb = { url: cover.url, width: cover.width, height: cover.height };
      files = doc.kind === 'pdf'
        ? [{ label: 'The document (PDF)', url: doc.download.url, note: `(${sizeText(doc.download.size)}, ${doc.pages.length} pages)`, download: true }]
        : [{ label: 'The original, on archive.org', url: it.source, external: true }];
      files.push({ label: `Its pages${doc.text ? ' and their text' : ''} as data: document.json`, url: doc.json });
      docType = doc.kind === 'pdf' ? 'PDF' : 'zine';
    } else if (it.kind === 'see' && first) {
      const entry = image('figure', source, first.found.rotation);
      if (entry?.animated) {
        thumb = { url: entry.still, width: entry.width, height: entry.height };
        files = [{ label: 'The animation (WebP)', url: entry.url, download: true }, { label: 'Its first frame (JPEG)', url: entry.still, download: true }];
      } else if (entry) {
        const small = entry.srcset[0], big = entry.srcset.at(-1), tall = (w) => Math.round((w * entry.height) / entry.width);
        thumb = { url: small.url, width: small.width, height: tall(small.width) };
        files = [{ label: 'The largest image', url: entry.largest, note: `(${big.width} × ${tall(big.width)} pixels, JPEG)`, download: true },
          { label: 'Its zoom tiles: IIIF info.json', url: entry.tiles }];
      }
    } else if (!/^[a-z][\w+.-]*:/i.test(source)) {
      if (it.kind === 'listen') {
        duration = audio[source]?.duration ?? null;
        files = [{ label: 'The recording (MP3)', url: rawGitHub(source), external: true }];
        if (audio[source]?.cueFile) files.push({ label: 'When each paragraph is heard (WebVTT)', url: rawGitHub(audio[source].cueFile), external: true });
      } else {
        files = [{ label: `The ${it.kind === 'watch' ? 'video' : 'document'} (${source.split('.').pop().toUpperCase()})`, url: source, download: true }];
        const poster = first?.found.poster && image('poster', first.found.poster, 0);
        if (poster) thumb = { url: poster.url, width: poster.width, height: poster.height };
      }
      docType = source.split('.').pop().toUpperCase();
    } else {
      const where = storedAt(it);
      files = [{ label: `On ${where.id === 'archive' ? 'archive.org' : where.id === 'bbc' ? 'the BBC’s site' : where.label}`, url: it.source, external: true }];
      docType = 'document';
    }
    // the fields of the editing view: each place in the latest text, keyed by page and place on the page
    const counts = {};
    const editable = apps.filter((a) => a.edition === latest).map((a) => {
      counts[a.file] = (counts[a.file] || 0) + 1;
      const n = counts[a.file], twice = apps.filter((b) => b.edition === latest && b.file === a.file).length > 1;
      // what readers see as the caption: a video's or an embed's caption, or the title its page gives it
      return { ...a, key: `${a.file}|${n}`, repeat: twice ? `${ordinal(n)} place` : '', shownCaption: a.caption || (it.kind === 'see' ? '' : a.found.title),
        description: a.found.description || '', descriptionBy: a.found.description_by || '' };
    });
    const since = it.since ? versionById.get(it.since) : null;
    return {
      ...it, url, short: it.label ? `${it.label}/` : null, anchor: `item-${it.label || it.name}`, apps, shown, captions, editable,
      heading: it.title || first?.caption || first?.found.title || apps[0]?.caption || it.name,
      alsoIn: frozenWith.filter((e) => !(first && first.edition === e)).map((e) => ({ label: e.version.label, places: apps.filter((a) => a.edition === e) })),
      sinceLabel: since ? since.version.label : it.since ? `Version ${it.since}` : '', sinceUrl: since ? since.dir : null,
      stored: storedAt(it, doc?.copy), served: servedFrom(it, doc?.copy), thumb, files, duration, docType, doc,
      block: first?.found.block || null, blockPage: first?.file || 'README.md',
    };
  };
  const views = media.items.map(itemView);
  // When each item was first published and last changed, from the Git history (history.mjs): two passes over it for
  // all the items. Without the whole history the item pages leave both out, and the build says so.
  {
    const wanted = views.map((it) => ({ it, source: it.source, formerSources: it.formerSources, copy: it.doc?.copy?.folder || null }));
    const { dates, warning } = itemDates(wanted, { root: REPO_ROOT });
    for (const w of wanted) Object.assign(w.it, dates.get(w));
    if (warning) warnings.push(`media items: ${warning}`);
  }

  // The items' pages, through both stages like the book's own pages: the item alone (the converted page's block, as
  // items.lua recorded it), then the facts below it.
  const allFiles = [...new Set(editions.flatMap((e) => e.files))];
  const itemManifest = join(work, 'items-manifest.json');
  writeFileSync(itemManifest, JSON.stringify({ ...manifestOf('', allFiles), items: itemsFor(''), documents: documentsFor('') }));
  // current: where the page is in the back matter, for the menu ('in:references-and-media' for an item page)
  const pageFrame = (root, extra = {}, current = 'in:references-and-media') => {
    const yaml = join(work, `frame-${root.length}-${current.replace(/\W/g, '_')}.yaml`);
    if (!existsSync(yaml)) writeYaml(yaml, latest.menu, { version_line: versionLine(latest, root, root), ...backmatterMenu(latest, root, root, current) });
    return ['-f', 'markdown-implicit_figures', '-t', 'html5', '--wrap=none', '-s', '--template', join(TOOLKIT_DIR, 'template.html'), '--metadata-file', yaml,
      ...metaArgs({ repo: REPO, lang: PUBLICATION.language, ...toolkitMeta, ...frameMeta(latest, root), root, shared: root, 'asset-version': ASSET_VERSION,
        'site-title': latest.home.title, ...extra })];
  };
  const documentsSearched = [];   // the pages of the documents that have text, for the latest text's search index
  await inParallel(views, async (it) => {
    const name = `${it.url} (the page of ${it.label ? `item ${it.label}` : 'a new item'})`;
    const meta = { page: it.blockPage, manifest: itemManifest, title: it.heading };
    let body = '';
    if (it.block) {
      body = bracedDivs(await pandocAsync([...toMarkdown(['to-markdown']), ...metaArgs({ ...meta, repo: REPO, lang: PUBLICATION.language, root: '../../' })], it.block, name));
    }
    // a document: below the viewer (filters/embeds.lua), its text page by page and its download. The text of a document
    // that has one is searched, in the latest text's index (step 7): the page's title names the result, and only the
    // pages' text is indexed (documentText).
    const searched = !!it.doc?.text;
    if (it.doc) body += `\n${rawBlock(documentText(it, { root: '../../' }))}`;
    body += `\n${rawBlock(itemFacts(it, { root: '../../', siteUrl }))}`;
    const html = await pandocAsync([...pageFrame('../../', { ...meta, pagetitle: `${it.label ? `Item ${it.label}` : 'New item'}: ${it.heading}`, 'item-page': 'true',
      'section-title': it.label ? `Item ${it.label}` : 'New item', 'section-url': `../../${BACKMATTER.referencesAndMedia.url}#${it.anchor}`, noindex: NOINDEX ? 'true' : '',
      'search-title': searched ? 'true' : '' }),
      ...filterArgs(['figures', 'embeds', 'links'])], body, name);
    mkdirSync(join(SITE, it.url), { recursive: true });
    writeFileSync(join(SITE, it.url, 'index.html'), html);
    if (searched) documentsSearched.push({ url: `/${it.url}`, content: html });
    mediaReport.pages++;
  });
  // in the order of the Media Index, whichever page Pandoc finished first
  documentsSearched.sort((a, b) => views.findIndex((it) => `/${it.url}` === a.url) - views.findIndex((it) => `/${it.url}` === b.url));
  latest.searchable.push(...documentsSearched);

  // Short addresses, /37/, and the former names' addresses: small pages that forward to the item's page.
  const forward = (dir, it, text) => {
    const depth = dir.split('/').filter(Boolean).length, up = '../'.repeat(depth);
    mkdirSync(join(SITE, dir), { recursive: true });
    writeFileSync(join(SITE, dir, 'index.html'), forwardHtml({ lang: PUBLICATION.language, title: `${it.label ? `Item ${it.label}` : it.name} · ${latest.home.title}`,
      target: up + it.url, canonical: siteUrl + it.url, stylesheet: `${up}assets/site.css?v=${ASSET_VERSION}`, text }));
  };
  for (const it of views) {
    if (it.short) { forward(it.short, it, `Item ${it.label} is at`); mediaReport.short++; }
    for (const old of it.formerNames) { forward(`${it.kind}/${old}/`, it, `This item has a new address:`); mediaReport.forwards++; }
  }

  // References and media (about/references-and-media/ in every edition): the edition's References (step 4c), then the
  // Media Index, which is the same in every edition, with a switch at the top that leads to either part. The References
  // are searched in each edition's index, each work a place of its own in the results ("Stengers 2005a"), and the Media
  // Index in the latest text's only, each entry a place of its own ("item 37"; mediaIndexHtml); in a frozen version it is
  // left out of the index altogether (data-pagefind-ignore="all"). The item pages, which hold the same words, the short
  // and former addresses and the editing view are in no index; only the text of a document's pages is, on its page
  // (above). media-index/ forwards to the Media Index there; the editing view stays at media-index/edit/.
  {
    const rm = BACKMATTER.referencesAndMedia, r = '../'.repeat(rm.url.split('/').filter(Boolean).length);
    for (const edition of editions) {
      const s = join2(r, edition.prefix) || './';
      const extra = { version_line: versionLine(edition, s, r), ...backmatterMenu(edition, s, r, 'references-and-media') };
      if (edition.annotations === 'hypothesis') extra.annotations = hypothesis(edition);
      if (edition.target) extra.version_notice = versionNotice(edition, join2(s, `${edition.target.dir}${rm.url}`));
      const yaml = join(edition.scratch, 'references-and-media.yaml');
      writeYaml(yaml, edition.menu, extra);
      const media = mediaIndexHtml(views, { root: s, script: `${s}assets/media-index.js?v=${ASSET_VERSION}`, preview: PREVIEW && edition === latest, edit: `${s}media-index/edit/` });
      const body = `<nav class="part-switch" aria-label="Parts of this page" data-pagefind-ignore><a href="#references">References</a><a href="#media">Media</a></nav>
<section class="part" aria-labelledby="references">
<h2 id="references">References</h2>
${edition.referencesHtml}
</section>
<section class="part" aria-labelledby="media"${edition === latest ? '' : ' data-pagefind-ignore="all"'}>
<h2 id="media">Media</h2>
${media}
</section>`;
      const html = pandoc(['-f', 'markdown', '-t', 'html5', '--wrap=none', '-s', '--template', join(TOOLKIT_DIR, 'template.html'), '--metadata-file', yaml,
        ...metaArgs({ page: 'references-and-media', repo: REPO, manifest: edition.manifest, lang: PUBLICATION.language, title: rm.title, ...toolkitMeta, ...frameMeta(edition, s),
          root: r, shared: s, 'asset-version': ASSET_VERSION, 'site-title': edition.home.title, noindex: NOINDEX ? 'true' : '', searchable: 'true',
          'references-page': 'true', ...backmatterSection(r) }), ...filterArgs(['links'])], rawBlock(body), `${edition.name}: ${rm.url}`);
      mkdirSync(join(SITE, edition.dir, rm.url), { recursive: true });
      writeFileSync(join(SITE, edition.dir, rm.url, 'index.html'), html);
      edition.searchable.push({ url: `/${rm.url}`, content: html });
    }
    forwardPage({ dir: 'media-index/', target: `${rm.url}#media`, title: `${latest.home.title}: this page has moved`, canonical: `${siteUrl}${rm.url}#media` });
  }
  if (PREVIEW) {
    const names = Object.fromEntries(views.flatMap((it) => [it.name, ...it.formerNames].map((n) => [n, it.source])));
    const editHtml = mediaEditHtml(views, { root: '../../', script: `../../assets/media-index.js?v=${ASSET_VERSION}`, names, rights: RIGHTS });
    mkdirSync(join(SITE, 'media-index', 'edit'), { recursive: true });
    writeFileSync(join(SITE, 'media-index', 'edit', 'index.html'), pandoc([...pageFrame('../../', { page: 'media-index/edit', title: 'Editing view',
      pagetitle: 'Media Index: editing view', 'section-title': BACKMATTER.referencesAndMedia.title, 'section-url': `../../${BACKMATTER.referencesAndMedia.url}#media`, noindex: 'true' }), ...filterArgs(['links'])], rawBlock(editHtml), 'the editing view'));
  }

  // media.json: every item, for other frontends (CONTRACT.md). URLs are relative to the site's root.
  writeFileSync(join(SITE, 'media.json'), JSON.stringify({
    contract: CONTRACT, everytrickinthebook: TOOLKIT_VERSION, title: latest.home.title, url: siteUrl,
    items: views.map((it) => ({
      number: it.number, kind: it.kind, name: it.name, source: it.source, since: it.since || null, credit: it.credit || '',
      rights: it.rights || '', rights_label: it.rightsLabel || '', rights_note: it.rightsNote || '', cite_as: it.citeAs || '', title: it.title || '',
      url: it.url, short: it.short, caption: it.shown[0]?.caption ?? '', former_names: it.formerNames, former_sources: it.formerSources,
      stored: it.stored.label, served: it.served.label, first_published: it.firstPublished || null, last_changed: it.lastChanged || null,
      pages: it.doc ? it.doc.pages.length : null, document: it.doc ? it.doc.json : null,
      appearances: it.apps.map((a) => ({ edition: a.edition.version.id, page: a.file, url: /^#|^$/.test(a.link) ? `./${a.link}` : a.link, anchor: a.anchor || null,
        after: a.after || null, caption: a.caption, alt: a.alt, description: a.found.description_text || '', description_by: a.found.description_by || '' })),
    })),
  }, null, 2) + '\n');
}

// 6b. Former addresses, forwarded with their fragments: in an edition that has a page under its new name only, its old
//     address (essays/contributors/ to about/contributors/), and BACKMATTER.forwards in every edition (references/,
//     whose downloads stay where they were, and back-matter/…), where what they lead to is there.
for (const edition of editions) {
  const forwards = Object.entries(BACKMATTER.moved).filter(([old, now]) => edition.byFile.has(now) && !edition.byFile.has(old)).map(([old, now]) => [urlOf(old), urlOf(now)]);
  for (const [old, now] of Object.entries(BACKMATTER.forwards)) {
    // the edition's contributors under their old name, if it has them so
    const to = now === urlOf(BACKMATTER.acknowledgements.into) ? urlOf(edition.backmatter.find((f) => f === BACKMATTER.acknowledgements.into || BACKMATTER.moved[f] === BACKMATTER.acknowledgements.into) || '') : now;
    if (to && existsSync(join(SITE, edition.dir, decodeURIComponent(to.split('#')[0]), 'index.html'))) forwards.push([old, to]);
  }
  for (const [old, now] of forwards) {
    forwardPage({ dir: edition.dir + decodeURIComponent(old), target: edition.dir + now, title: `${edition.home.title}: this page has moved`, canonical: siteUrl + edition.dir + now });
  }
}

// 7. Search: one Pagefind index for each edition, of its pages' reading text only (<main>, marked data-pagefind-body by
//    the template; cards are left out by filters/cards.lua). The Markdown views, publication/, versions/ and search/
//    are not in it. Each edition's index also holds the References of its References and media, and the latest text's
//    its Media Index too, and the text of the documents' pages (/read/<name>/, only the text), which all editions share
//    (step 6); the
//    other item pages, their short and former addresses and the editing view are in no index.
//    Result addresses are root-absolute here (/essays/aya_nassar/); search.js makes them relative.
//    Pagefind's own search boxes are not used, so their files are removed; its licence goes with the index.
//    A page whose reading text is only cards (Events) has nothing to index; the report lists such pages.
for (const edition of editions) {
  const { index, errors } = await pagefind.createIndex({});
  if (errors.length) fail(`Pagefind could not start:\n${errors.join('\n')}`);
  for (const file of edition.searchable) {
    const added = await index.addHTMLFile(file);
    if (added.errors.length) fail(`Pagefind could not index ${edition.dir}${file.url.slice(1)}:\n${added.errors.join('\n')}`);
  }
  const output = join(SITE, edition.dir, 'pagefind');
  const written = await index.writeFiles({ outputPath: output });
  if (written.errors.length) fail(`Pagefind could not write ${edition.dir}pagefind/:\n${written.errors.join('\n')}`);
  for (const name of readdirSync(output)) if (/^pagefind-(component-|modular-)?ui\.|^pagefind-highlight\.js$/.test(name)) rmSync(join(output, name));
  cpSync(join(TOOLKIT_DIR, 'node_modules/pagefind/LICENSE/LICENSE'), join(output, 'LICENSE.txt'));
  // the pages that made it into the index: each has a fragment file, gzipped JSON after a short signature
  const indexed = new Set(readdirSync(join(output, 'fragment')).map((name) => {
    const data = gunzipSync(readFileSync(join(output, 'fragment', name))).toString('utf8');
    return JSON.parse(data.slice(data.indexOf('{'))).url;
  }));
  edition.unsearchable = edition.searchable.map((file) => file.url).filter((url) => !indexed.has(url)).map((url) => url.slice(1) || './');
}
await pagefind.close();

// 8. Stylesheet, scripts, the Roboto font and OpenSeadragon (the deep-zoom viewer), shared by all editions.
const modules = join(TOOLKIT_DIR, 'node_modules');
cpSync(join(TOOLKIT_DIR, 'assets'), join(SITE, 'assets'), { recursive: true });
for (const style of ['normal', 'italic']) cpSync(join(modules, `@fontsource-variable/roboto/files/roboto-latin-wght-${style}.woff2`), join(SITE, `assets/fonts/roboto-latin-wght-${style}.woff2`));
cpSync(join(modules, '@fontsource-variable/roboto/LICENSE'), join(SITE, 'assets/fonts/LICENSE.txt'));
cpSync(join(modules, 'openseadragon/build/openseadragon/openseadragon.min.js'), join(SITE, 'assets/osd/openseadragon.min.js'));
cpSync(join(modules, 'openseadragon/build/openseadragon/images'), join(SITE, 'assets/osd/images'), { recursive: true });
cpSync(join(modules, 'openseadragon/LICENSE.txt'), join(SITE, 'assets/osd/LICENSE.txt'));

// 9. Report.
const size = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => sum + (e.isDirectory() ? size(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;
const total = size(SITE), imageBytes = size(join(SITE, 'images')), tileBytes = size(join(SITE, 'iiif'));
const pageCount = editions.reduce((n, e) => n + e.pages.length, 0);
console.log(`Built ${pageCount} pages${editions.length > 1 ? ` in ${editions.length} editions` : ''} into _site/ in ${((Date.now() - started) / 1000).toFixed(1)} s: ${mb(total)} ` +
  `(images ${mb(imageBytes)}, tiles ${mb(tileBytes)}, other ${mb(total - imageBytes - tileBytes)}); ` +
  `${sources} source images, ${tiles} tiles; everytrickinthebook ${TOOLKIT_VERSION}, contract ${CONTRACT}${NOINDEX ? '; pages carry noindex' : ''}.`);
{
  const counted = (list) => ['see', 'listen', 'watch', 'read'].map((k) => `${list.filter((it) => it.kind === k).length} ${k}`).join(', ');
  const numbered = media.items.filter((it) => it.number !== null), fresh = media.items.filter((it) => it.number === null);
  console.log(`  Media items: ${media.items.length}, ${numbered.length} with a number (${counted(numbered)})${fresh.length ? `, ${fresh.length} new, not numbered yet (${fresh.map((it) => it.name).join(', ')})` : ''}; ` +
    `${mediaReport.pages} item pages, ${mediaReport.short} short addresses, ${mediaReport.forwards} former name${mediaReport.forwards === 1 ? '' : 's'} forwarded. The editing view ${PREVIEW ? 'is built: a preview build' : 'is not built: it is for previews only'}.`);
  const docs = [...documents.values()];
  if (docs.length) {
    console.log(`  Documents: ${docs.map((d) => `${d.name} (${d.kind === 'pdf' ? 'PDF' : `zine, copied on ${longDate(d.copy.fetched)}`}, ${d.pages.length} pages${d.text ? `, ${d.pages.reduce((n, p) => n + p.text.join(' ').split(/\s+/).filter(Boolean).length, 0)} words of text` : ''})`).join(', ')}; ` +
      `${documentReport.pages} pages, ${documentReport.tiles} tiles.`);
  }
}
// the References: how many citations lead to their page's own list, and how many to the References
for (const r of report.references) {
  console.log(`  References ${`${r.edition.dir}${BACKMATTER.referencesAndMedia.url}`.padEnd(33)} ${r.works} works, ${r.cited} of them cited; of ${r.citations} linked citations, ` +
    `${r.inPage} lead to their page's own reference list and ${r.citations - r.inPage} to the References.`);
}
// what the zoomable pictures' widths for srcset add to the images (the files made for nothing else)
console.log(`  Of the images, ${mb(widths.bytes)} are the ${widths.files} extra widths of the zoomable pictures (srcset); ` +
  `without them the images would be ${mb(imageBytes - widths.bytes)}.`);
for (const edition of editions.slice(1)) {
  console.log(`  ${edition.dir.padEnd(22)} ${edition.version.label} (${edition.version.status}, tag at ${edition.commit.slice(0, 7)}): ${edition.pages.length} pages, ${mb(size(join(SITE, edition.dir)))}` +
    `${edition.annotations === 'hypothesis' ? `, Hypothesis${edition.group ? ` for group ${edition.group}` : ' (no hypothesisGroup set: annotations go to the group each reviewer picks)'}` : ''}`);
  if (edition.annotations === 'hypothesis' && !edition.group) warnings.push(`version ${edition.version.id}: annotations are on, but hypothesisGroup is empty, so reviewers could annotate publicly`);
}
for (const edition of editions) {
  const n = edition.searchable.length - edition.unsearchable.length;
  console.log(`Search${edition.dir ? ` in ${edition.dir}` : ''}: ${n} of ${edition.searchable.length} pages indexed` +
    `${edition.unsearchable.length ? `; no text outside cards in ${edition.unsearchable.join(', ')}` : ''}.`);
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
