// Documents: the pages of the book's documents, as images for the zoom viewer and as text ("Plan: documents and zines"
// in DEVELOPMENT.md). A document is a media item of kind read whose pages the build can show:
//   a PDF in this repository     its pages are rendered here with poppler (pdftoppm), and its text is read from it
//                                (pdftotext), page by page
//   a zine on archive.org        its pages were copied into media/zines/<identifier>/ by scripts/fetch-zine.mjs
//                                (page-001.jpg …, zine.json); a flattened zine has no text that can be read reliably
// build.mjs makes each page's zoom tiles and smaller images (images.mjs, makePages) and writes the document's data,
// read/<name>/document.json (CONTRACT.md, "Documents").
//
//   pagesOf(source, has)    -> { kind: 'pdf' | 'zine', ... } or null: where a read item's pages come from
//   requirePoppler()        stops the build, saying what to install, when pdftoppm or pdftotext is missing
//   renderPdf(file, dir)    -> [{ n, file }]: every page of the PDF as a PNG in dir, at DPI
//   pdfText(file)           -> [[paragraph, …], …]: the text of every page, as paragraphs of plain text
//   zinePages(id)           -> { pages: [{ n, file }], record } from media/zines/<id>/
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './convert.mjs';

// How finely a PDF's pages are rendered: enough for a sharp reading view on any screen, and for zooming in a little.
// An A5 page at 250 dpi is 1462 × 2067 pixels.
export const DPI = 250;
export const ZINES = 'media/zines';

const archiveId = (source) => /^https:\/\/archive\.org\/details\/([^/?#]+)$/.exec(source)?.[1] ?? null;

// Where a read item's pages come from: { kind: 'pdf', path } for a PDF of this repository (has(path) says whether an
// edition has it), { kind: 'zine', id, folder } for an archive.org item copied into media/zines/, or null.
export function pagesOf(source) {
  if (/\.pdf$/i.test(source) && !/^[a-z][\w+.-]*:/i.test(source)) return { kind: 'pdf', path: source };
  const id = archiveId(source);
  if (id && existsSync(join(REPO_ROOT, ZINES, id, 'zine.json'))) return { kind: 'zine', id, folder: `${ZINES}/${id}` };
  return null;
}

export function requirePoppler() {
  const missing = ['pdftoppm', 'pdftotext'].filter((tool) => spawnSync(tool, ['-v'], { stdio: 'ignore' }).error);
  if (!missing.length) return null;
  return `The book has a PDF document, whose pages are shown with poppler, but ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not installed.\n` +
    '  On macOS: brew install poppler. On Debian and Ubuntu: sudo apt-get install poppler-utils (GitHub Actions installs it).';
}

// Every page of the PDF as a PNG: dir/page-01.png … (pdftoppm numbers them with as many digits as the last needs).
export function renderPdf(file, dir) {
  mkdirSync(dir, { recursive: true });
  const result = spawnSync('pdftoppm', ['-r', String(DPI), '-png', file, join(dir, 'page')], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`pdftoppm could not render ${file}:\n${result.stderr}`);
  return readdirSync(dir).map((name) => ({ name, n: Number(/^page-(\d+)\.png$/.exec(name)?.[1] ?? NaN) }))
    .filter((p) => Number.isInteger(p.n)).sort((a, b) => a.n - b.n).map((p) => ({ n: p.n, file: join(dir, p.name) }));
}

// ---- The text of a PDF -------------------------------------------------------------------------------------------
// pdftotext -bbox-layout gives every page's blocks of text, their lines and their words, each with its place on the
// page. poppler makes a block of each run of lines without space between them, so a block is a paragraph, or several
// lines of dialogue, or a heading and its first line. The rules:
//   - a block starts a new paragraph, unless it follows the block before at the distance of a line, in text of the same
//     size, and the line before does not end a sentence (a title in italics that poppler set apart);
//   - inside a block, a line that ends a sentence (. ? ! : ; or a closing quote or bracket) and stops well short of the
//     page's text column (less than 85% of its width) ends a paragraph;
//   - lines are joined with a space, except after a hyphen that ends a word, which stays (non-visible, 1924-26,
//     post-war: in a booklet made on a computer, a hyphen at the end of a line is the author's, not a break inside a
//     word), and inside a web address cut at the end of a full line;
//   - words that touch (a full stop after a word in italics) take no space between them;
//   - the page's own number at its foot is left out.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(1).replace(/^x/i, ''), /^#x/i.test(e) ? 16 : 10)) : ENTITIES[e] ?? m));
const box = (attrs) => Object.fromEntries(['xMin', 'yMin', 'xMax', 'yMax'].map((k) => [k, Number(new RegExp(`${k}="([-\\d.]+)"`).exec(attrs)?.[1] ?? 0)]));
const ENDS = /[.?!:;”"’)]$/;
const SHORT = 0.85;
const lastWord = (text) => text.slice(text.lastIndexOf(' ') + 1);
const isAddress = (word) => /^(https?:\/\/|www\.)/.test(word) || /\w\/\w/.test(word);

export function pdfText(file) {
  const result = spawnSync('pdftotext', ['-bbox-layout', file, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (result.status !== 0) throw new Error(`pdftotext could not read ${file}:\n${result.stderr}`);
  return [...result.stdout.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)].map((page, index) => {
    const n = index + 1;
    const blocks = [...page[1].matchAll(/<block ([^>]*)>([\s\S]*?)<\/block>/g)].map((b) => ([...b[2].matchAll(/<line ([^>]*)>([\s\S]*?)<\/line>/g)].map((l) => {
      const words = [...l[2].matchAll(/<word ([^>]*)>([^<]*)<\/word>/g)].map((w) => ({ ...box(w[1]), text: decode(w[2]) }));
      const height = Math.max(0, ...words.map((w) => w.yMax - w.yMin));
      let text = '';
      words.forEach((w, i) => { text += i && w.xMin - words[i - 1].xMax > height * 0.12 ? ` ${w.text}` : w.text; });
      return { ...box(l[1]), height, text: text.replace(/\s+/g, ' ').trim() };
    }).filter((l) => l.text))).filter((lines) => lines.length);
    // the page's own number at its foot: a block of one line that is the number, the lowest on the page
    const folio = blocks.filter((lines) => lines.length === 1 && lines[0].text === String(n)).sort((a, b) => b[0].yMin - a[0].yMin)[0];
    const lines = blocks.filter((lines) => lines !== folio).flatMap((lines) => lines.map((line, i) => ({ ...line, first: i === 0 })));
    if (!lines.length) return [];
    const left = Math.min(...lines.map((l) => l.xMin)), right = Math.max(...lines.map((l) => l.xMax));
    const paragraphs = [];
    lines.forEach((line, i) => {
      const prev = lines[i - 1];
      const short = prev && prev.xMax - left < (right - left) * SHORT;
      const runsOn = prev && (line.first
        ? !ENDS.test(prev.text) && Math.abs(line.height - prev.height) < 1 && line.yMin > prev.yMin && line.yMin - prev.yMax < line.height * 0.6
        : !(short && ENDS.test(prev.text)));
      if (!runsOn) { paragraphs.push(line.text); return; }
      const text = paragraphs.pop(), first = line.text.split(' ')[0];
      const glue = /\w-$/.test(text) || (!short && isAddress(lastWord(text)) && /[/.]/.test(first) && !/[“"‘(]/.test(first[0])) ? '' : ' ';
      paragraphs.push(text + glue + line.text);
    });
    return paragraphs;
  });
}

// ---- A zine copied from archive.org -------------------------------------------------------------------------------

export function zinePages(id) {
  const folder = join(REPO_ROOT, ZINES, id);
  const record = JSON.parse(readFileSync(join(folder, 'zine.json'), 'utf8'));
  const pages = readdirSync(folder).map((name) => ({ name, n: Number(/^page-(\d+)\.jpg$/.exec(name)?.[1] ?? NaN) }))
    .filter((p) => Number.isInteger(p.n)).sort((a, b) => a.n - b.n);
  if (pages.length !== record.pages || pages.some((p, i) => p.n !== i + 1)) {
    throw new Error(`${ZINES}/${id}/ should hold page-001.jpg to page-${String(record.pages).padStart(3, '0')}.jpg, as its zine.json says. Run npm run fetch-zine -- ${id} again.`);
  }
  return { record, pages: pages.map((p) => ({ n: p.n, file: join(folder, p.name), path: `${ZINES}/${id}/${p.name}` })) };
}
