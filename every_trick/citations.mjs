// The citation layer of the static twin, shared by build.mjs and scripts/to-citation-keys.mjs.
//
// references/bibliography.json is the book's one bibliography (CSL-JSON). Each entry's custom.typed records where it
// is typed in a chapter's reference list ({ page, text }, the text as Pandoc reads it), so that filters/citations.lua
// can give that typed entry the id ref-<key>. During the parallel run the chapters keep their plain-text citations;
// citations.lua matches them to the bibliography and links them (see the comment at its top).
//
//   prepareReferences(options)  formats every entry with citeproc in the house style (csl/mattering-press.csl) and
//                               writes the index that citations.lua reads
//   locate(source, records)     the line in the page's Markdown of each citation citations.lua found
//   report(...)                 the build's summary: per page counts, unmatched citations, uncited entries
//   formatReferences(options)   every work in the styles of the References page's Copy menus, as plain text, and as
//                               BibTeX and RIS; and the whole bibliography as BibTeX, RIS and CSL-JSON, for its downloads
//   referencesHtml(works, …)    the References page of an edition (/references/): every work once, with the passages
//                               that cite it and the pages whose reference lists include it
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './convert.mjs';
import { toRis } from './ris.mjs';

const TOOLKIT_DIR = dirname(fileURLToPath(import.meta.url));
export const BIBLIOGRAPHY = join(REPO_ROOT, 'references', 'bibliography.json');
export const CSL = join(TOOLKIT_DIR, 'csl', 'mattering-press.csl');
// The styles a reference can be copied in on the References page, in the order of its Copy menu: the house style (as
// the page shows it), four styles of the official CSL repository <https://github.com/citation-style-language/styles>,
// copied unchanged into csl/ from commit CSL_COMMIT (see NOTICE.md), each formatted in the locale its guide is written
// for, and the entry for a reference manager. label is the menu's, short the confirmation's ("Copied: APA").
export const CSL_COMMIT = 'edc263cf0e4b09ed184f8a9e1e1de23deb2a7a9e';   // 23 November 2026
export const HOUSE_STYLE = 'Mattering Press’ house style';   // the house style (CSL above) as the References page names it
export const COPY_STYLES = [
  { id: 'house', label: HOUSE_STYLE, short: HOUSE_STYLE },
  { id: 'apa', label: 'APA (7th edition)', short: 'APA', csl: 'apa.csl', locale: 'en-US' },
  { id: 'chicago', label: 'Chicago (author-date)', short: 'Chicago', csl: 'chicago-author-date.csl', locale: 'en-US' },
  { id: 'mla', label: 'MLA (9th edition)', short: 'MLA', csl: 'modern-language-association.csl', locale: 'en-US' },
  { id: 'harvard', label: 'Harvard (Cite Them Right)', short: 'Harvard', csl: 'harvard-cite-them-right.csl', locale: 'en-GB' },
  { id: 'bibtex', label: 'BibTeX', short: 'BibTeX', entry: true },
  { id: 'ris', label: 'RIS', short: 'RIS', entry: true },
];
// Formatted HTML -> plain text: tags dropped, entities read, white space collapsed.
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#39|#(\d+));/g, (m, name, n) => (n ? String.fromCodePoint(Number(n)) : { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name]))
  .replace(/\s+/g, ' ').trim();

const norm = (s) => s.replace(/\s+/g, ' ').trim();
export const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
const firstName = (item) => {
  const name = (item.author || item.editor || [])[0];
  return name ? name.literal || name.family : null;
};
const yearOf = (item) => item.issued?.['date-parts']?.[0]?.[0];

// options: { pandoc, work (a scratch folder), bibliography (default: the working tree's; a frozen version uses the one
// in its tag) }
// -> { items, index, indexPath, warnings, order, cites }: order is every key in the order of the house style's reference
// list (by author, then year, then key: csl/mattering-press.csl), which the References page follows; cites is each
// work as the text cites it in the house style, without the brackets ("Back and Sinha 2018"), for search results.
export function prepareReferences({ pandoc, work, bibliography = BIBLIOGRAPHY }) {
  const items = JSON.parse(readFileSync(bibliography, 'utf8'));
  const warnings = [];
  // The popups and the References page show each reference on its own, so the "——" for a repeated author is switched
  // off. All the entries are formatted in one run, so the year letters (stengers2005a, 2005b) are the whole book's,
  // whichever page shows the reference.
  const popupCsl = join(work, 'popup.csl');
  writeFileSync(popupCsl, readFileSync(CSL, 'utf8').replace(/\ssubsequent-author-substitute(-rule)?="[^"]*"/g, ''));
  const result = spawnSync(pandoc, ['-f', 'markdown', '-t', 'html', '--wrap=none', '--citeproc', '--bibliography', bibliography, '--csl', popupCsl],
    { input: "---\nnocite: '@*'\n---\n", encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`citeproc failed on ${bibliography}:\n${result.stderr}`);
  warnings.push(...result.stderr.split('\n').filter(Boolean).map((l) => `references/bibliography.json: ${l.replace(/^\[WARNING\] /, '')}`));
  const formatted = [...result.stdout.matchAll(/<div id="ref-([^"]+)" class="csl-entry"[^>]*>\s*([\s\S]*?)\s*<\/div>/g)];
  const html = Object.fromEntries(formatted.map((m) => [m[1], m[2].replace(/\s+/g, ' ')]));
  const entries = {};
  for (const item of items) {
    const key = item.id;
    if (!html[key]) warnings.push(`references/bibliography.json: citeproc wrote nothing for ${key}`);
    const year = yearOf(item);
    const suffix = /\d{4}([a-z])$/.exec(key)?.[1] ?? '';
    // citeproc gives the year letters; the house style sorts by key, so they should be the key's own.
    if (suffix && year && !new RegExp(`${year}(–\\d+)?${suffix}`).test(html[key] || '')) warnings.push(`references/bibliography.json: ${key} is not shown as ${year}${suffix}`);
    const pages = /^(\d+)\s*[-–]\s*(\d+)$/.exec(item.page || '');
    const typed = item.custom?.typed || [];
    entries[key] = {
      surname: firstName(item), year: year ? String(year) : null, suffix,
      pages: pages && Number(pages[2]) >= Number(pages[1]) ? [Number(pages[1]), Number(pages[2])] : null,
      html: html[key] || '',
      typed: Object.fromEntries(typed.map((t) => [t.page, norm(t.text)])),
    };
  }
  const order = formatted.map((m) => m[1]).filter((key) => key in entries);
  for (const key of Object.keys(entries)) if (!order.includes(key)) order.push(key);   // (citeproc wrote nothing for it: warned above)
  const indexPath = join(work, 'citations-index.json');
  writeFileSync(indexPath, JSON.stringify({ entries }, (k, v) => (v === null ? undefined : v)));   // no nulls for Lua
  // Every work cited on its own, one paragraph each, in one run with all of them, so that the year letters match:
  // <p><span class="citation" data-cites="back2018">(Back and Sinha 2018)</span></p>
  const citing = spawnSync(pandoc, ['-f', 'markdown', '-t', 'html', '--wrap=none', '--citeproc', '--bibliography', bibliography, '--csl', popupCsl],
    { input: `---\nnocite: '@*'\nsuppress-bibliography: true\n---\n\n${order.map((key) => `[@${key}]`).join('\n\n')}\n`, encoding: 'utf8' });
  if (citing.status !== 0) throw new Error(`citeproc failed on ${bibliography}:\n${citing.stderr}`);
  const text = (h) => h.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#39|#(\d+));/g, (m, name, n) => (n ? String.fromCodePoint(Number(n)) : { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name]));
  const cites = Object.fromEntries([...citing.stdout.matchAll(/<p><span class="citation" data-cites="([^"]+)">([\s\S]*?)<\/span><\/p>/g)]
    .map((m) => [m[1], text(m[2]).replace(/^\((.*)\)$/s, '$1').trim()]).filter(([, cite]) => cite));
  return { items, index: entries, indexPath, warnings, order, cites };
}

// Every work of an edition's bibliography in each style of COPY_STYLES, for its References page, and the bibliography
// for its downloads. references: what prepareReferences returned.
// -> { texts: { <key>: { house: text, apa: text, …, bibtex: entry, ris: entry } }, csljson, bibtex, ris (the files'
//    text), warnings }
// The house style is the reference as the page shows it, with the book's year letters (Stengers 2005a). The other
// styles format each work as it stands alone, as a reference manager copies it: their year letters, which only tell
// apart two works of the same author and year in this book, and the dashes some styles put for a repeated author, are
// switched off. The works are in the order of the References page; the CSL-JSON leaves out custom (where each entry is
// typed in the pages, for the build), and the BibTeX, which Pandoc writes, gets the DOI and date accessed it leaves out.
export function formatReferences({ pandoc, work, references }) {
  const { items, order, index } = references;
  const byKey = new Map(items.map((item) => [item.id, item]));
  const clean = order.map((key) => byKey.get(key)).filter(Boolean).map(({ custom, ...item }) => item);
  const csljson = JSON.stringify(clean, null, 2) + '\n';
  const input = join(work, 'bibliography-clean.json');
  writeFileSync(input, csljson);
  const warnings = [];
  const texts = Object.fromEntries(clean.map((item) => [item.id, { house: plain(index[item.id]?.html || '') }]));
  for (const style of COPY_STYLES.filter((s) => s.csl)) {
    const csl = join(work, `copy-${style.id}.csl`);
    writeFileSync(csl, readFileSync(join(TOOLKIT_DIR, 'csl', style.csl), 'utf8')
      .replace(/\sdisambiguate-add-year-suffix="[^"]*"/g, '').replace(/\ssubsequent-author-substitute(-rule)?="[^"]*"/g, ''));
    const result = spawnSync(pandoc, ['-f', 'markdown', '-t', 'html', '--wrap=none', '--citeproc', '--bibliography', input, '--csl', csl, '-M', `lang=${style.locale}`],
      { input: "---\nnocite: '@*'\n---\n", encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`citeproc failed with csl/${style.csl}:\n${result.stderr}`);
    warnings.push(...result.stderr.split('\n').filter(Boolean).map((l) => `csl/${style.csl}: ${l.replace(/^\[WARNING\] /, '')}`));
    const formatted = new Map([...result.stdout.matchAll(/<div id="ref-([^"]+)" class="csl-entry"[^>]*>\s*([\s\S]*?)\s*<\/div>/g)].map((m) => [m[1], plain(m[2])]));
    for (const item of clean) {
      if (formatted.get(item.id)) texts[item.id][style.id] = formatted.get(item.id);
      else warnings.push(`csl/${style.csl} wrote nothing for ${item.id}`);
    }
  }
  // BibTeX: Pandoc's entries, one field a line, with the DOI and the date accessed added where the entry has them
  const bib = spawnSync(pandoc, ['-f', 'csljson', '-t', 'bibtex', '--wrap=none', input], { encoding: 'utf8' });
  if (bib.status !== 0) throw new Error(`Pandoc could not write BibTeX:\n${bib.stderr}`);
  const brace = (s) => String(s).replace(/[{}]/g, '');
  for (const entry of bib.stdout.split(/\n(?=@)/)) {
    const key = /^@\w+\{([^,\s]+),/.exec(entry.trim())?.[1];
    const item = key && byKey.get(key);
    if (!item) continue;
    const extra = [];
    if (item.DOI && !/^\s*doi\s*=/m.test(entry)) extra.push(`  doi = {${brace(item.DOI)}}`);
    const accessed = item.accessed?.['date-parts']?.[0];
    if (accessed?.[0] && !/^\s*urldate\s*=/m.test(entry)) extra.push(`  urldate = {${accessed.map((n, i) => (i ? String(n).padStart(2, '0') : n)).join('-')}}`);
    texts[key].bibtex = extra.length ? entry.trim().replace(/\n\}$/, `,\n${extra.join(',\n')}\n}`) : entry.trim();
  }
  for (const item of clean) {
    if (!texts[item.id].bibtex) warnings.push(`Pandoc wrote no BibTeX entry for ${item.id}`);
    texts[item.id].ris = toRis(item);
  }
  return {
    texts, csljson, warnings,
    bibtex: clean.map((item) => texts[item.id].bibtex).filter(Boolean).join('\n\n') + '\n',
    ris: clean.map((item) => texts[item.id].ris).join('\n\n').replace(/\n/g, '\r\n') + '\r\n',   // the specification's line ends
  };
}

// The line (1-based) of each citation in the page's Markdown. Paragraphs are single lines (a Juncture rule), so the
// bracket is searched for line by line, from where the previous citation was found.
export function locate(source, records) {
  const lines = source.split('\n');
  let line = 0, col = 0;
  const find = (needle) => {
    for (let i = line; i < lines.length; i++) {
      const at = lines[i].indexOf(needle, i === line ? col : 0);
      if (at >= 0) return [i, at];
    }
    for (let i = 0; i < lines.length; i++) {
      const at = lines[i].indexOf(needle);
      if (at >= 0) return [i, at];
    }
    return null;
  };
  let lastBracket = null;
  return records.map((r) => {
    // several citations in one bracket share it: look for the bracket once, then for each citation's text in it
    const straight = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    const hit = (r.bracket === lastBracket && find(r.text)) || find(r.bracket) || find(straight(r.bracket)) || find(r.text);
    lastBracket = r.bracket;
    if (!hit) return { ...r, line: null };
    [line, col] = hit;
    return { ...r, line: line + 1, column: col + 1 };
  });
}

const distance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

// Why a citation did not match, and which entries it may mean.
export function hint(record, index) {
  const all = Object.entries(index).filter(([, e]) => e.surname);
  const sameYear = all.filter(([, e]) => e.year === record.year);
  if (record.status === 'ambiguous') return `could be ${record.candidates.join(' or ')}: add the letter (${record.year}a, ${record.year}b) or a page`;
  if (record.form === 'parenthetical') {
    const name = fold(record.names.split(/,| and | & | et al/)[0]).toLowerCase().trim();
    const same = all.filter(([, e]) => fold(e.surname).toLowerCase() === name).map(([k]) => k);
    if (same.length) return `no ${record.year} work by this author; the bibliography has ${same.join(', ')}`;
    const similar = sameYear.filter(([, e]) => distance(fold(e.surname).toLowerCase(), name) <= 2).map(([k]) => k);
    if (similar.length) return `spelt differently? ${similar.join(', ')}`;
    return 'not in the bibliography';
  }
  const sentence = fold(record.sentence);
  const words = sentence.match(/[A-Z][A-Za-z'-]+(?: [A-Z][A-Za-z'-]+)?/g) || [];
  const similar = sameYear.filter(([, e]) => words.some((w) => distance(fold(e.surname), w) <= 2)).map(([k]) => k);
  if (similar.length) return `spelt differently? ${similar.join(', ')}`;
  const named = all.filter(([, e]) => new RegExp(`(^|[^A-Za-z])${fold(e.surname).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`).test(sentence));
  if (named.length) return `the sentence names ${[...new Set(named.map(([k]) => k))].join(', ')}, none from ${record.year}`;
  return sameYear.length ? `no author named; works from ${record.year}: ${sameYear.map(([k]) => k).join(', ')}` : `no author named, and no work from ${record.year}`;
}

// pages: [{ file, citations (located), typed: { listed, unmatched } }] -> lines of text
export function report(pages, index, warnings) {
  const out = [];
  const counted = (p) => p.citations.filter((c) => c.status !== 'date');
  const withCitations = pages.filter((p) => counted(p).length || p.typed.listed.length);
  let found = 0, matched = 0;
  out.push('', 'Citations (matched to references/bibliography.json):');
  for (const p of withCitations) {
    const c = counted(p), m = c.filter((x) => x.status === 'matched').length;
    found += c.length; matched += m;
    out.push(`  ${p.file.padEnd(30)} ${String(c.length).padStart(3)} found, ${String(m).padStart(3)} linked, ${String(c.length - m).padStart(2)} unmatched; ${p.typed.listed.length} of ${p.typed.listed.length + p.typed.unmatched.length} typed references are bibliography entries`);
  }
  out.push(`  ${'all pages'.padEnd(30)} ${String(found).padStart(3)} found, ${String(matched).padStart(3)} linked, ${String(found - matched).padStart(2)} unmatched`);
  const unmatched = pages.flatMap((p) => counted(p).filter((c) => c.status !== 'matched').map((c) => ({ ...c, file: p.file })));
  if (unmatched.length) {
    out.push('', `${unmatched.length} citations not linked:`);
    for (const c of unmatched) out.push(`  ${c.file}:${c.line ?? '?'}  ${c.bracket}${c.bracket.includes(c.text) && c.bracket !== `(${c.text})` ? `  [${c.text}]` : ''}  ${hint(c, index)}`);
  }
  const dates = pages.flatMap((p) => p.citations.filter((c) => c.status === 'date').map((c) => `${p.file}:${c.line ?? '?'} ${c.bracket}`));
  if (dates.length) out.push('', `${dates.length} years in brackets read as dates, not citations (no author of the bibliography in the sentence):`, ...dates.map((d) => `  ${d}`));
  const typedOther = pages.flatMap((p) => p.typed.unmatched.map((t) => `  ${p.file}  ${t.length > 90 ? t.slice(0, 87) + '…' : t}`));
  if (typedOther.length) out.push('', `${typedOther.length} paragraphs in typed reference lists are not bibliography entries:`, ...typedOther);
  const cited = new Set(pages.flatMap((p) => p.citations.filter((c) => c.key).map((c) => c.key)));
  const uncited = Object.keys(index).filter((k) => !cited.has(k));
  if (uncited.length) out.push('', `${uncited.length} bibliography entries that no page cites:`, `  ${uncited.join(', ')}`);
  if (warnings.length) out.push('', ...warnings.map((w) => `  ${w}`));
  return out;
}

// The References page of an edition (references/ at its root): every work of the bibliography once, in the order of
// the house style's reference list, as <li id="<key>" class="reference">, so that /references/#hall2001 finds it. Under
// the formatted reference: the passages that cite it ("Introduction, para. 12", each a link to the citation,
// #cite-hall2001-1) and the pages whose typed reference lists include it (a link to #ref-hall2001 there).
// Search finds each work by its formatted reference and lists it as a place of its own on the page: data-pagefind-meta
// gives its label in the results, the work as the text cites it ("Stengers 2005a"; assets/search.js). The lists of
// passages and pages are left out of the index, so that searching a page's title does not list every work it cites.
//   works: [{ key, html, cite, cited: [{ title, url, para, note, after }], listed: [{ title, url }] }], in order; cite is
//          the work as the text cites it ("Hall 2001"; its key when citeproc gives none); para is the numbered
//          paragraph that holds the citation ("p12"), or for a citation outside the numbered paragraphs, note the margin
//          note it is in ("n3") and after the paragraph before it. URLs are relative to the edition's root.
//   root:  the way from the References page to the edition's root ("../")
// The explainer at the top links the downloads of the whole bibliography (DOWNLOADS, beside the page). The Copy
// buttons are made by assets/references.js, which reads the styles of the menu from data-copy-styles and the texts
// from formatted.json (COPY_DATA) when a menu is first opened; without JavaScript there are none, and nothing of them
// is in the page's text or its search index.
export const DOWNLOADS = { bibtex: 'bibliography.bib', ris: 'bibliography.ris', csljson: 'bibliography.json' };
export const COPY_DATA = 'formatted.json';
const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function referencesHtml(works, { root }) {
  const place = (c) => (c.para ? `para. ${c.para.slice(1)}` : c.note ? `note ${c.note.slice(1)}` : c.after ? `after para. ${c.after.slice(1)}` : '');
  const link = (url, text) => `<a href="${escHtml(root + url)}">${escHtml(text)}</a>`;
  const entry = (w) => {
    const rows = [];
    if (w.cited.length) rows.push(`<div><dt>Cited in</dt><dd>${w.cited.map((c) => link(c.url, place(c) ? `${c.title}, ${place(c)}` : c.title)).join('; ')}</dd></div>`);
    if (w.listed.length) rows.push(`<div><dt>Listed in</dt><dd>${w.listed.map((l) => link(l.url, l.title)).join('; ')}</dd></div>`);
    return `<li id="${escHtml(w.key)}" class="reference" data-pagefind-meta="${escHtml(`entry-${w.key}:${w.cite || w.key}`)}">\n<p class="reference__text">${w.html}</p>\n` +
      (rows.length ? `<dl class="reference__where" data-pagefind-ignore>\n${rows.join('\n')}\n</dl>\n` : '') + '</li>';
  };
  const download = (file, name) => `<a href="${escHtml(file)}" download>${name}</a>`;
  const styles = COPY_STYLES.map(({ id, label, short, entry }) => ({ id, label, short, ...(entry ? { entry } : {}) }));
  return `<div class="references" data-copy="${escHtml(COPY_DATA)}" data-copy-styles="${escHtml(JSON.stringify(styles))}">
<p class="references__intro">All ${works.length} works in the book’s bibliography, in ${escHtml(HOUSE_STYLE)}. Under each work are the passages that cite it, which lead to the citation in the text, and the pages whose reference lists include it. Copy any reference in another style with the Copy button beside it, or download them all as ${download(DOWNLOADS.bibtex, 'BibTeX')}, ${download(DOWNLOADS.ris, 'RIS')} or ${download(DOWNLOADS.csljson, 'CSL-JSON')}.</p>
<ul class="reference-list">
${works.map(entry).join('\n')}
</ul>
</div>`;
}
