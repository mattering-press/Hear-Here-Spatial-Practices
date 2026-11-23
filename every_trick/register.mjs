// The media register, media/register.csv: one line per media item ("Plan: media register, item pages and the Media
// Index" and "The media register" in DEVELOPMENT.md). Each line holds the item's permanent number (given when a version is
// frozen, by scripts/number-media.mjs), its kind (the word of its address: see, listen, watch or read), its name (the
// readable part of its address, /see/<name>/), its source (the repository path of its file, or its address
// elsewhere, as filters/lib.lua's media_source writes it), the version it entered with, its credit, a title where its
// pages give none, and its former names and sources. Nothing else is stored: captions, sizes and where an item appears
// are read from the pages at every build.
//
//   readRegister(file)            -> { lines, problems }: the lines in the file's order, and what is wrong with them
//   writeRegister(lines, file)    writes the register: the numbered lines by number, then the others in their order
//   listItems({ pandoc, file, markdown, work })   the page's media items in page order (filters/items.lua)
//   draftName(texts, taken, skip) a short name drafted from a caption or title, unique among taken (which it extends)
//   resolveItems({ lines, editions, bookTitle, versions })  matches every item on the pages to its line; drafts names
//                                 for items without one; -> { items, bySource, problems }
//   servedFrom(item), storedAt(item)   where an item is served from and where it is stored, for people to read
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { devNull } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, REPO_ROOT } from './convert.mjs';

export const REGISTER = join(REPO_ROOT, 'media', 'register.csv');
export const COLUMNS = ['number', 'kind', 'name', 'source', 'since', 'credit', 'title', 'former_names', 'former_sources'];
export const KINDS = ['see', 'listen', 'watch', 'read'];
const TOOLKIT_DIR = dirname(fileURLToPath(import.meta.url));
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isAddress = (source) => /^[a-z][\w+.-]*:/i.test(source);
const where = (line) => `media/register.csv, line ${line.line}${line.number ? ` (item ${line.number}, ${line.name})` : line.name ? ` (${line.name})` : ''}`;

// ---- The file --------------------------------------------------------------------------------------------------

// RFC 4180: fields separated by commas, a field in double quotes may hold commas, line breaks and doubled quotes.
// -> [{ fields, line }] without blank lines; line is where the row starts in the file.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false, line = 1, start = 1;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') line++;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push({ fields: row, line: start }); row = []; field = ''; start = line; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push({ fields: row, line: start }); }
  return rows.filter((r) => r.fields.some((f) => f.trim() !== ''));
}
const csvField = (value) => (/[",\r\n]|^\s|\s$/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

// former_names and former_sources hold several values separated by spaces; a space inside a repository path is
// written %20 (addresses never contain spaces).
const splitList = (value) => value.trim().split(/\s+/).filter(Boolean).map((v) => (isAddress(v) ? v : v.replace(/%20/g, ' ')));
const joinList = (list) => list.map((v) => (isAddress(v) ? v : v.replace(/ /g, '%20'))).join(' ');

export function readRegister(file = REGISTER) {
  if (!existsSync(file)) return { lines: [], problems: [] };
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const problems = [];
  if (!rows.length) return { lines: [], problems };
  const header = rows[0].fields.map((f) => f.trim());
  const missing = COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { lines: [], problems: [`media/register.csv: its first line must name the columns ${COLUMNS.join(', ')}; ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing`] };
  const lines = rows.slice(1).map(({ fields, line }) => {
    const get = (column) => (fields[header.indexOf(column)] ?? '').trim();
    const number = get('number');
    return {
      line, number: /^\d+$/.test(number) ? Number(number) : null, numberText: number, kind: get('kind'), name: get('name'), source: get('source'),
      since: get('since'), credit: get('credit'), title: get('title'), formerNames: splitList(get('former_names')), formerSources: splitList(get('former_sources')),
    };
  });
  const names = new Map(), sources = new Map(), numbers = new Map();
  for (const l of lines) {
    if (l.numberText && (l.number === null || l.number < 1)) problems.push(`${where(l)}: the number must be a whole number from 1, or empty for an item not numbered yet`);
    if (!KINDS.includes(l.kind)) problems.push(`${where(l)}: the kind must be ${KINDS.join(', ')}, the word of the item's address`);
    if (!NAME.test(l.name)) problems.push(`${where(l)}: the name "${l.name}" must be lower-case letters (a–z, no accents) and digits, with hyphens between words, such as boulder-font`);
    for (const n of l.formerNames) if (!NAME.test(n)) problems.push(`${where(l)}: the former name "${n}" is not a name (lower-case letters and digits, with hyphens)`);
    if (!l.source) problems.push(`${where(l)}: the source is empty: write the file's path in the repository, or the item's address`);
    if (l.number !== null && !l.since) problems.push(`${where(l)}: a numbered item needs "since", the version it entered with`);
    for (const n of [l.name, ...l.formerNames]) {
      if (names.has(n) && n) problems.push(`media/register.csv: two items share the name ${n} (lines ${names.get(n).line} and ${l.line}). Names, and former names, are each used once in the book`);
      else names.set(n, l);
    }
    for (const s of [l.source, ...l.formerSources]) {
      if (sources.has(s) && s) problems.push(`media/register.csv: lines ${sources.get(s).line} and ${l.line} both name ${s}. The same file or address is one item, with one line`);
      else sources.set(s, l);
    }
    if (l.number !== null) {
      if (numbers.has(l.number)) problems.push(`media/register.csv: lines ${numbers.get(l.number).line} and ${l.line} both have number ${l.number}. A number belongs to one item for good`);
      else numbers.set(l.number, l);
    }
  }
  // Numbers are never removed or reused, so they run from 1 without gaps.
  const top = Math.max(0, ...numbers.keys());
  const gaps = [];
  for (let n = 1; n <= top; n++) if (!numbers.has(n)) gaps.push(n);
  if (gaps.length) problems.push(`media/register.csv: number${gaps.length > 1 ? 's' : ''} ${gaps.join(', ')} ${gaps.length > 1 ? 'are' : 'is'} missing. A number is never removed or given again, also when its item is withdrawn: put its line back`);
  return { lines, problems };
}

export function writeRegister(lines, file = REGISTER) {
  const numbered = lines.filter((l) => l.number !== null).sort((a, b) => a.number - b.number);
  const others = lines.filter((l) => l.number === null);
  const rows = [COLUMNS, ...[...numbered, ...others].map((l) => [l.number === null ? '' : String(l.number), l.kind, l.name, l.source, l.since || '', l.credit || '', l.title || '',
    joinList(l.formerNames || []), joinList(l.formerSources || [])])];
  writeFileSync(file, rows.map((r) => r.map(csvField).join(',')).join('\n') + '\n');
}

// ---- Items on a page -------------------------------------------------------------------------------------------

// The media items of a converted page (convert.mjs), in page order, from filters/items.lua (its comment lists the fields).
export function listItems({ pandoc, file, markdown, work, repo = REPO }) {
  const out = join(work, `${file.replace(/\W/g, '_')}.items.json`);
  const result = spawnSync(pandoc, ['-f', 'markdown-smart-implicit_figures', '-t', 'markdown', '--lua-filter', join(TOOLKIT_DIR, 'filters', 'items.lua'),
    '-M', `page=${file}`, '-M', `repo=${repo}`, '-M', `items-out=${out}`, '-o', devNull], { input: markdown, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Pandoc failed on ${file}:\n${result.stderr}`);
  return JSON.parse(readFileSync(out, 'utf8'));
}

// ---- Names -----------------------------------------------------------------------------------------------------

const STOP = new Set('a an and as at by for from in into its of on or the their this to with'.split(' '));
const ascii = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/['‘’]/g, '');
export const wordsOf = (s) => ascii(s).split(/[^a-z0-9]+/).filter(Boolean);

// Words for a name where an item has no caption or title: from its file's name, an archive.org identifier, or the
// site it is on (POD06_Boulder.jpg -> "POD06 Boulder", HearHereAcorn1 -> "Hear Here Acorn 1", YouTube -> "youtube video").
export function sourceWords(source) {
  const camel = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/[_.]+/g, ' ');
  if (!isAddress(source)) return camel(basename(source).replace(/\.[^.]+$/, ''));
  const archive = /^https:\/\/archive\.org\/details\/([^/?#]+)/.exec(source);
  if (archive) return camel(archive[1]);
  const site = host(source).replace(/\.(com|org|net|co\.uk|org\.uk)$/, '').split('.').pop();
  return `${site} ${/youtube|vimeo/.test(site) ? 'video' : 'item'}`;
}

// A draft of a name: up to four words of the first text that has any (a caption, a title, the alt text, the words
// of its source), leaving out small words and the words of the book's title (skip), joined by hyphens; -2, -3 … when
// taken.
export function draftName(texts, taken, skip = new Set()) {
  let base = '';
  for (const text of texts) {
    const words = wordsOf(text).filter((w) => !STOP.has(w) && !skip.has(w));
    if (words.length) { base = words.slice(0, 4).join('-'); break; }
  }
  base ||= 'item';
  let name = base;
  for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
  taken.add(name);
  return name;
}

// ---- Items and their lines -------------------------------------------------------------------------------------

// lines: the register's; editions: [{ id, label, frozen, has(path), pages: [{ file, title, found }] }], the latest text
// first, each with its pages in reading order and their items (listItems); versions: the ids of the frozen versions in
// versions.json. Every item found on a page is matched to its line by its source (or a former source); an item without
// a line is new, with a drafted name. Items with a line that are on no page are kept too.
//   -> { items: [{ number, label, kind, name, source, since, credit, title, formerNames, formerSources, line,
//                  appearances: [{ edition, file, title, found }] }], bySource: Map, problems: [] }
// items: the numbered ones by number, then the others, in order of first appearance (the latest text first).
export function resolveItems({ lines, editions, bookTitle = '', versions = [] }) {
  const bySource = new Map(), problems = [];
  const item = (l) => ({ number: l.number, label: l.number === null ? null : String(l.number), kind: l.kind, name: l.name, source: l.source, since: l.since,
    credit: l.credit, title: l.title, formerNames: l.formerNames, formerSources: l.formerSources, line: l, appearances: [] });
  const items = lines.map(item);
  items.forEach((it) => { for (const s of [it.source, ...it.formerSources]) bySource.set(s, it); });
  const taken = new Set(lines.flatMap((l) => [l.name, ...l.formerNames]));
  const skip = new Set(wordsOf(bookTitle));
  const fresh = [];
  for (const edition of editions) for (const page of edition.pages) for (const found of page.found) {
    let it = bySource.get(found.source);
    if (!it) {
      it = { number: null, label: null, kind: found.kind, name: draftName([found.caption, found.title, found.alt, sourceWords(found.source)], taken, skip),
        source: found.source, since: '', credit: '', title: '', formerNames: [], formerSources: [], line: null, appearances: [] };
      bySource.set(found.source, it);
      fresh.push(it);
    }
    it.appearances.push({ edition, file: page.file, title: page.title, found });
  }
  items.push(...fresh);

  // The checks: the build stops on any of these. A registered file or address that has gone is said first: it usually
  // explains an item of a frozen version that seems to have no number.
  const unnumbered = [];
  for (const edition of editions.filter((e) => e.frozen)) {
    const missing = [...new Set(edition.pages.flatMap((page) => page.found.map((f) => bySource.get(f.source))))].filter((it) => it.number === null);
    if (missing.length) {
      unnumbered.push(`Version ${edition.id} has ${missing.length} media item${missing.length > 1 ? 's' : ''} without a number: ${missing.map((it) => `${it.source} (on ${it.appearances.find((a) => a.edition === edition).file})`).join('; ')}.\n` +
        `  Every item of a frozen version has a number. If one of these is the old file or address of an item that has a line in media/register.csv, add it to that line's "former_sources".\n` +
        `  Otherwise the version's new items have not been numbered yet. In every_trick/, run: npm run number-media -- ${edition.id}\n` +
        `  and commit media/register.csv with the version's entry in versions.json ("Freezing a version for review or release" in DEVELOPMENT.md).`);
    }
  }
  for (const it of items.filter((i) => i.line)) {
    if (!isAddress(it.source) && !existsSync(join(REPO_ROOT, it.source)) && !editions.some((e) => e.has(it.source))) {
      problems.push(`${where(it.line)}: its file, ${it.source}, is no longer in the repository or in any frozen version. If it was moved, renamed or replaced, write the new path in "source" and add the old one to "former_sources", so that the item keeps its number and its address`);
    } else if (it.number !== null && !it.appearances.length && versions.includes(it.since)) {
      problems.push(`${where(it.line)}: ${it.source} is on no page of any version. If its ${isAddress(it.source) ? 'address' : 'file'} changed, write the new one in "source" and add the old one to "former_sources", so that the item keeps its number and its address`);
    }
  }
  problems.push(...unnumbered);
  const names = new Map();
  for (const it of items) for (const n of [it.name, ...it.formerNames]) {
    if (names.has(n) && names.get(n) !== it) problems.push(`Two media items share the name ${n}: ${names.get(n).source} and ${it.source}. Give one of them another name in media/register.csv`);
    names.set(n, it);
  }
  items.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));
  return { items, bySource, problems };
}

// ---- Where an item is stored and served from -------------------------------------------------------------------

const githubFile = (path) => `https://github.com/${REPO}/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`;
const host = (url) => /^https?:\/\/(?:www\.)?([^/:?#]+)/.exec(url)?.[1] ?? url;

// Where the item lives: { id, label, detail, url, copy }; id is one word, for the Media Index's filters. copy: for a zine
// whose pages are copied from archive.org into this repository (documents.mjs), the folder and the day they were fetched.
export function storedAt(it, copy = null) {
  const s = it.source;
  if (!isAddress(s)) return { id: 'repository', label: 'this repository', detail: s, url: githubFile(s) };
  const archive = /^https:\/\/archive\.org\/details\/(.+)$/.exec(s);
  if (archive) return { id: 'archive', label: 'Internet Archive', detail: archive[1], url: s, ...(copy ? { copy: { ...copy, url: `https://github.com/${REPO}/tree/main/${copy.folder}` } } : {}) };
  if (/youtube\.com\//.test(s)) return { id: 'youtube', label: 'YouTube', detail: '', url: s };
  if (/vimeo\.com\//.test(s)) return { id: 'vimeo', label: 'Vimeo', detail: '', url: s };
  if (/bbc\.co\.uk\//.test(s)) return { id: 'bbc', label: 'BBC', detail: '', url: s };
  return { id: 'other', label: host(s), detail: '', url: s };
}

// Where readers' browsers get it from: { id, label, chip } (chip: the short label of the Media Index's filter).
// Pictures, video files and documents of this repository are copied into the site; its recordings are played from
// GitHub, as raw files (filters/embeds.lua). A zine whose pages are copied from archive.org (copy) is shown from them.
export function servedFrom(it, copy = null) {
  const s = it.source;
  if (copy) return { id: 'site', label: 'our own site', chip: 'our own site' };
  if (!isAddress(s)) {
    const src = it.appearances[0]?.found.src || (it.kind === 'listen' ? 'https://github.com/' : '');
    return /^https:\/\/(?:github\.com|raw\.githubusercontent\.com)\//.test(src) ? { id: 'github', label: 'GitHub, as a raw file', chip: 'GitHub' }
      : { id: 'site', label: 'our own site', chip: 'our own site' };
  }
  if (/archive\.org\//.test(s)) return { id: 'archive', label: 'archive.org', chip: 'archive.org' };
  if (/youtube\.com\//.test(s)) return { id: 'youtube', label: 'YouTube', chip: 'YouTube' };
  if (/vimeo\.com\//.test(s)) return { id: 'vimeo', label: 'Vimeo', chip: 'Vimeo' };
  if (/bbc\.co\.uk\//.test(s)) return { id: 'bbc', label: 'BBC', chip: 'BBC' };
  return { id: 'other', label: host(s), chip: host(s) };
}
