// For the switch to the static edition (not during the parallel run, while Juncture serves the Markdown): shows how
// each page's plain-text citations would become Pandoc citations and how its typed reference list would give way to
// one that citeproc generates from references/bibliography.json. It finds the citations exactly as the build does
// (filters/citations.lua) and only prints the proposed change as a unified diff without context; it changes nothing.
//
//   node scripts/to-citation-keys.mjs                       every page
//   node scripts/to-citation-keys.mjs essays/introduction.md
//   node scripts/to-citation-keys.mjs > switch.diff         then, at the switch: git apply --unidiff-zero switch.diff
//
// The conversion:
//   (Hall, 2001)                 [@hall2001]
//   (Stengers, 2005: 184)        [@stengers2005a, p. 184]       a page number picks the work, as in the build
//   (Puwar and Sharma, 2012)     [@puwar2012]
//   Fryer (1984), … (2017:147)   Fryer [-@fryer1984], … [-@frichot2017, p. 147]   the author stays in the sentence
//   (Pratt, (1991;1992)          [@pratt1991; @pratt1992]
// With the house style these read (Hall 2001), (Stengers 2005a: 184), Fryer (1984). A bracket with any citation
// the build could not match is left as typed and listed. The typed list after "References" is replaced by the
// div that citeproc fills (::: {#refs}); works listed there but not cited in the text are listed for `nocite`, which
// the build can set from custom.typed in the bibliography so that they stay in the page's list.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hint, locate, prepareReferences } from '../citations.mjs';
import { convert, REPO_ROOT } from '../convert.mjs';

const TOOLKIT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const PANDOC = process.env.PANDOC || 'pandoc';
const all = ['README.md', ...readdirSync(join(REPO_ROOT, 'essays')).filter((f) => f.endsWith('.md')).sort().map((f) => `essays/${f}`)];
const files = process.argv.length > 2 ? process.argv.slice(2) : all;
const work = mkdtempSync(join(tmpdir(), 'citation-keys-'));
const { index, indexPath } = prepareReferences({ pandoc: PANDOC, work, order: all });

// "184" -> "p. 184", "413, 417–18" -> "pp. 413, 417–18", "p.127" -> "p. 127", "para. 12" stays
function locator(text) {
  if (!text) return '';
  const labelled = /^([A-Za-z]+)\.?\s*(.+)$/.exec(text);
  if (labelled) return `, ${labelled[1]}. ${labelled[2]}`;
  return `, ${/[-–,]/.test(text) ? 'pp.' : 'p.'} ${text}`;
}

// The citations and typed list of one page, found by citations.lua as in stage 2 of the build.
function scan(file, source) {
  const out = join(work, 'page.json');
  const result = spawnSync(PANDOC, ['-f', 'markdown-implicit_figures', '-t', 'html', '-o', join(work, 'page.html'),
    '--lua-filter', join(TOOLKIT_DIR, 'filters', 'citations.lua'), '--lua-filter', join(TOOLKIT_DIR, 'filters', 'contract.lua'),
    '-M', `page=${file}`, '-M', `citations=${indexPath}`, '-M', `contract-out=${out}`, '-M', 'root=./'],
  { input: convert(source, file).markdown, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Pandoc failed on ${file}:\n${result.stderr}`);
  const data = JSON.parse(readFileSync(out, 'utf8'));
  const list = (v) => (Array.isArray(v) ? v : []);
  const typed = list(data.typed)[0] || {};
  return { citations: locate(source, list(data.citations)), listed: list(typed.listed), unmatched: list(typed.unmatched) };
}

const summary = [];
for (const file of files) {
  const source = readFileSync(join(REPO_ROOT, file), 'utf8');
  const lines = source.split('\n');
  const { citations, listed, unmatched } = scan(file, source);
  const changed = new Map();         // line index -> new text
  const kept = [], notes = [];
  let converted = 0;

  // group the citations of one bracket: they share the bracket text and its line
  const groups = [];
  for (const c of citations.filter((x) => x.status !== 'date')) {
    const last = groups[groups.length - 1];
    if (last && last.bracket === c.bracket && last.line === c.line && !last.closed) last.items.push(c);
    else groups.push({ bracket: c.bracket, line: c.line, items: [c] });
    if (c.locator || c.text.endsWith(c.bracket.slice(1, -1))) groups[groups.length - 1].closed = true;
  }
  for (const g of groups) {
    if (!g.line) { kept.push(`${g.bracket}: not found in the Markdown`); continue; }
    if (g.items.some((c) => c.status !== 'matched')) {
      for (const c of g.items.filter((x) => x.status !== 'matched')) kept.push(`line ${g.line}  ${g.bracket}  ${hint(c, index)}`);
      continue;
    }
    const i = g.line - 1;
    const text = changed.get(i) ?? lines[i];
    const at = text.indexOf(g.bracket);
    if (at < 0) { kept.push(`line ${g.line}  ${g.bracket}: the bracket is written differently in the Markdown`); continue; }
    let start = at, cites;
    // "(Pratt, (1991;1992)": an unclosed bracket naming the author just before takes the citations in
    const open = /\(([^()]+?),\s*$/.exec(text.slice(0, at));
    const surname = index[g.items[0].key].surname;
    if (g.items.every((c) => c.form === 'year') && open && open[1].trim() === surname) {
      start = at - open[0].length;
      cites = g.items.map((c) => `@${c.key}${locator(c.locator)}`);
      notes.push(`line ${g.line}  "${text.slice(start, at + g.bracket.length)}" has an unclosed bracket; it becomes one citation`);
    } else {
      cites = g.items.map((c) => `${c.form === 'year' ? '-' : ''}@${c.key}${locator(c.locator)}`);
    }
    changed.set(i, text.slice(0, start) + `[${cites.join('; ')}]` + text.slice(at + g.bracket.length));
    converted += g.items.length;
  }

  // the typed reference list: the heading stays, its entries give way to the generated list
  const hunks = [...changed.entries()].sort((a, b) => a[0] - b[0]).map(([i, text]) => ({ start: i, remove: [lines[i]], add: [text] }));
  const heading = lines.findIndex((l) => /^#+\s*References\s*$/i.test(l));
  let nocite = [];
  if (heading >= 0) {
    const level = /^#+/.exec(lines[heading])[0].length;
    let end = lines.length;
    for (let j = heading + 1; j < lines.length; j++) if (/^#+\s/.test(lines[j]) && /^#+/.exec(lines[j])[0].length <= level) { end = j; break; }
    while (end > heading + 1 && lines[end - 1].trim() === '') end--;
    hunks.push({ start: heading + 1, remove: lines.slice(heading + 1, end), add: ['', '::: {#refs}', ':::'] });
    const cited = new Set(citations.filter((c) => c.key).map((c) => c.key));
    nocite = listed.filter((k) => !cited.has(k));
    for (const t of unmatched) notes.push(`typed list: "${t.length > 70 ? t.slice(0, 67) + '…' : t}" is not a bibliography entry and would be dropped`);
  }

  if (hunks.length) {
    console.log(`--- a/${file}\n+++ b/${file}`);
    let delta = 0;
    for (const h of hunks.sort((a, b) => a.start - b.start)) {
      const range = (start, n) => (n === 1 ? `${start + 1}` : `${n ? start + 1 : start},${n}`);
      console.log(`@@ -${range(h.start, h.remove.length)} +${range(h.start + delta, h.add.length)} @@`);
      for (const l of h.remove) console.log(`-${l}`);
      if (!source.endsWith('\n') && h.start + h.remove.length === lines.length) console.log('\\ No newline at end of file');
      for (const l of h.add) console.log(`+${l}`);
      delta += h.add.length - h.remove.length;
    }
  }
  if (converted || kept.length || notes.length || heading >= 0) {
    summary.push(`${file}: ${converted} citations converted, ${kept.length} left as typed${heading >= 0 ? `; typed list of ${listed.length + unmatched.length} paragraphs replaced by the generated list` : ''}`);
    for (const k of kept) summary.push(`  left as typed: ${k}`);
    for (const n of notes) summary.push(`  note: ${n}`);
    if (nocite.length) summary.push(`  listed but not cited, for nocite: ${nocite.map((k) => `@${k}`).join(', ')}`);
  }
}
rmSync(work, { recursive: true, force: true });
// The summary goes to stderr, so that stdout is the diff alone.
console.error(`\nDry run: nothing was changed.\n${summary.join('\n')}`);
