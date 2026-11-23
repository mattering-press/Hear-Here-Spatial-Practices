// Numbers the media items of a frozen version that have no number yet, a step of "Freezing a version for review or
// release" in DEVELOPMENT.md. The version must be in versions.json, with its Git tag. Its items are numbered in its
// reading order (readingOrder in its publication.json) and in page order, the first appearance of an item winning;
// each gets the next free number and "since" set to the version's id. An item without a line in media/register.csv
// gets one, with a drafted name (register.mjs, draftName), which the publisher may change before the version's entry
// is merged. Numbers already given never change, and no number is given twice.
//   npm run number-media -- 0.1             numbers version 0.1's items and writes media/register.csv
//   npm run number-media -- 0.1 --dry-run   says what it would do and writes nothing
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { readBook } from '../convert.mjs';
import { draftName, KINDS, listItems, readRegister, REGISTER, sourceWords, wordsOf, writeRegister } from '../register.mjs';
import { checkout, readRegistry } from '../versions.mjs';

const { values, positionals } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } }, allowPositionals: true });
const fail = (message) => { console.error(message); process.exit(1); };
const id = positionals[0];
if (!id) fail('Which version? For example: npm run number-media -- 0.1 (add --dry-run to see what it would do)');
const PANDOC = process.env.PANDOC || 'pandoc';

let registry;
try { registry = readRegistry(); } catch (e) { fail(`The version registry has problems:\n${e.message}`); }
const version = registry.find((v) => v.id === id);
if (!version) fail(`Version ${id} is not in versions.json. Add its entry first (step 3 of "Freezing a version for review or release" in DEVELOPMENT.md); its tag must exist.`);

const { lines, problems } = readRegister();
if (problems.length) fail(`media/register.csv has problems:\n${problems.map((p) => `  ${p}`).join('\n')}`);

const work = mkdtempSync(join(tmpdir(), 'number-media-'));
process.on('exit', () => rmSync(work, { recursive: true, force: true }));
let text;
try { text = checkout(version, join(work, 'text')); } catch (e) { fail(`Version ${id}: ${e.message}`); }
const book = readBook(text.root, { exists: text.has });
const unhandled = book.pages.flatMap((page) => page.unhandled);
if (unhandled.length) fail(`Version ${id} has pages the build cannot read:\n${unhandled.map((u) => `  ${u.file}:${u.line}  ${u.why}`).join('\n')}`);

const bySource = new Map();
for (const l of lines) for (const s of [l.source, ...l.formerSources]) bySource.set(s, l);
const taken = new Set(lines.flatMap((l) => [l.name, ...l.formerNames]));
const skip = new Set(wordsOf(book.home.title));
let next = Math.max(0, ...lines.map((l) => l.number ?? 0)) + 1;
const first = next, numbered = [], already = new Set(), seen = new Set();
for (const file of book.order) {
  const page = book.byFile.get(file);
  for (const found of listItems({ pandoc: PANDOC, file, markdown: page.markdown, work })) {
    if (seen.has(found.source)) continue;   // the first appearance wins
    seen.add(found.source);
    let line = bySource.get(found.source);
    if (line?.number != null) { already.add(line); continue; }
    if (!line) {
      line = { number: null, kind: found.kind, source: found.source, since: '', credit: '', rights: '', rightsNote: '', citeAs: '', title: '', formerNames: [], formerSources: [],
        name: draftName([found.caption, found.title, found.alt, sourceWords(found.source)], taken, skip) };
      lines.push(line);
      bySource.set(found.source, line);
    }
    line.number = next++;
    line.since = id;
    numbered.push({ line, file, caption: found.caption || found.title || found.alt });
  }
}

const count = (list) => KINDS.map((k) => `${list.filter((l) => l.kind === k).length} ${k}`).join(', ');
if (!numbered.length) console.log(`Version ${id}: all its ${already.size} media items have numbers already; nothing to do.`);
else {
  console.log(`Version ${id}: ${numbered.length} item${numbered.length > 1 ? 's' : ''} numbered ${first}–${next - 1} (${count(numbered.map((n) => n.line))})` +
    `${already.size ? `; ${already.size} had a number already` : ''}.`);
  for (const { line, file, caption } of numbered) console.log(`  ${String(line.number).padStart(4)}  ${line.kind.padEnd(6)} ${line.name.padEnd(34)} ${file}  ${String(caption || '').slice(0, 60)}`);
  if (values['dry-run']) console.log('\nA dry run: media/register.csv is unchanged.');
  else {
    writeRegister(lines);
    console.log(`\nWritten to ${REGISTER.replace(/^.*\/(media\/register\.csv)$/, '$1')}. Commit it with the version's entry in versions.json.`);
  }
}
