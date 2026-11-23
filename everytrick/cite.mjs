// Citing the book itself ("Plan: copying citations" in DEVELOPMENT.md): the reference of every page of an edition,
// and of the whole book, for the page's Cite panel and How to cite section, the Copy quote bar (assets/cite.js), the
// media items, page.json and the metadata for Google Scholar.
//
//   selfReferences(options)   every page of an edition and the book, formatted once, in the house style and in the
//                             other styles of the References page's Copy menus (formatReferences in citations.mjs)
//   creditsText(credits)      the credits after a reference's title, in the house style ("interviewed by N. Puwar")
//   scholarMeta(...)          the <meta name="citation_…"> tags and the JSON-LD block of a page
//
// Each copied citation stands alone, as a reference manager copies it: the year letters and the added given names that
// tell two works apart in one reference list are switched off, as is the "——" for a repeated author. The date
// accessed is the day the reader copies it, so the build writes ACCESSED in its place and assets/cite.js puts in the
// day, in the form each style writes a date.
//
// The house style names a page's author first and its other credits after its title. The house CSL follows MHRA 7.11,
// which lists a published interview under its interviewer; this book lists a podcast under the person interviewed,
// with the interviewer after the title (the publisher, 2026-11-23), so the house style's reference is made without the
// other credits and they are put in after its title here. The other styles get them as CSL names (interviewer,
// producer, and contributor for a transcript's editor) and write them in their own way.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { CSL, formatReferences } from './citations.mjs';

export const ACCESSED = [9999, 12, 31];   // in place of the day the reader copies a citation (assets/cite.js)

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#39|#(\d+));/g, (m, name, n) => (n ? String.fromCodePoint(Number(n)) : { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name]))
  .replace(/\s+/g, ' ').trim();

// A name as a reader sees it: "Aya Nassar"; and as the house style writes it after a title: "A. Nassar".
export const fullName = (n) => n.literal || [n.given, n.family].filter(Boolean).join(' ');
const initials = (given) => given.split(/\s+/).filter(Boolean).map((part) => part.split('-').map((p) => `${p[0]}.`).join('-')).join(' ');
const shortName = (n) => n.literal || [n.given ? initials(n.given) : '', n.family].filter(Boolean).join(' ');
const listed = (names, form) => {
  const all = names.map(form);
  return all.length < 2 ? all.join('') : `${all.slice(0, -1).join(', ')} and ${all.at(-1)}`;
};
// The words before each role's names, in the house style, and the order they follow the title in.
const ROLE_WORDS = { interviewer: 'interviewed by', producer: 'prod. by', 'transcript-editor': 'transcript ed. by' };
export const creditsText = (credits) => Object.entries(ROLE_WORDS).filter(([role]) => credits?.[role]?.length)
  .map(([role, words]) => `${words} ${listed(credits[role], shortName)}`).join(', ');

// A CSL file with the disambiguation switched off (see the top).
function standalone(work, name, file) {
  const path = join(work, name);
  writeFileSync(path, readFileSync(file, 'utf8')
    .replace(/\sdisambiguate-add-(year-suffix|givenname|names)="[^"]*"/g, '').replace(/\sgivenname-disambiguation-rule="[^"]*"/g, '')
    .replace(/\ssubsequent-author-substitute(-rule)?="[^"]*"/g, ''));
  return path;
}

// options:
//   pandoc, work (a scratch folder of its own)
//   book: { id, title, editors: [names], publisher, year, url, language }
//   pages: [{ key, id, title, credits, url }]  every page to cite: key, its file; id, its key in BibTeX and RIS
//   version: { id, label } for a frozen version; null for the latest text, which its references call "latest text,
//            unreleased"
// -> { book: entry, pages: Map(key -> entry), warnings } where an entry is
//   { cite: 'Nassar 2026', html (house style, with ACCESSED), texts: { house, apa, chicago, mla, harvard, bibtex, ris }, csl }
export function selfReferences({ pandoc, work, book, pages, version }) {
  mkdirSync(work, { recursive: true });
  const warnings = [];
  const issued = { 'date-parts': [[Number(book.year)]] };
  const accessed = { 'date-parts': [ACCESSED] };
  const common = { publisher: book.publisher, issued, accessed, language: book.language, ...(version ? { version: version.id } : {}) };
  const bookItem = { id: book.id, type: 'book', title: book.title, editor: book.editors, URL: book.url, ...common };
  const pageItems = pages.map((p) => {
    const c = p.credits || {};
    return {
      id: p.id, type: 'chapter', title: p.title, ...(c.author ? { author: c.author } : {}), 'container-title': book.title, editor: book.editors,
      URL: p.url, ...common,
      ...(c.interviewer ? { interviewer: c.interviewer } : {}), ...(c.producer ? { producer: c.producer } : {}),
      ...(c['transcript-editor'] ? { contributor: c['transcript-editor'] } : {}),
    };
  });
  const items = [bookItem, ...pageItems];
  // the house style: without the credits after the title (put in below), and the latest text's "latest text, unreleased"
  const houseItems = items.map(({ interviewer, producer, contributor, ...item }) => (version ? item : { ...item, version: 'LATEST-TEXT' }));
  const houseFile = join(work, 'self-house.json');
  writeFileSync(houseFile, JSON.stringify(houseItems));
  const csl = standalone(work, 'self-house.csl', CSL);
  const run = (input) => {
    const result = spawnSync(pandoc, ['-f', 'markdown', '-t', 'html', '--wrap=none', '--citeproc', '--bibliography', houseFile, '--csl', csl], { input, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`citeproc failed on the book's own references:\n${result.stderr}`);
    warnings.push(...result.stderr.split('\n').filter(Boolean).map((l) => `the book's own references: ${l.replace(/^\[WARNING\] /, '')}`));
    return result.stdout;
  };
  const listing = run("---\nnocite: '@*'\n---\n");
  const html = new Map([...listing.matchAll(/<div id="ref-([^"]+)" class="csl-entry"[^>]*>\s*([\s\S]*?)\s*<\/div>/g)].map((m) => [m[1], m[2].replace(/\s+/g, ' ')]));
  const keys = items.map((i) => i.id);
  const citing = run(`---\nsuppress-bibliography: true\n---\n\n${keys.map((key) => `[@${key}]`).join('\n\n')}\n`);
  const cites = [...citing.matchAll(/<p><span class="citation" data-cites="([^"]+)">([\s\S]*?)<\/span><\/p>/g)]
    .map((m) => [m[1], plain(m[2]).replace(/^\((.*)\)$/s, '$1').trim()]);
  const citeOf = new Map(cites);
  for (const item of items) {
    let h = html.get(item.id);
    if (!h) { warnings.push(`the book's own references: citeproc wrote nothing for ${item.id}`); h = esc(item.title); }
    h = h.replace(/(versions? )?LATEST-TEXT/g, 'latest text, unreleased');
    const page = pages.find((p) => p.id === item.id);
    const credits = page && creditsText(page.credits);
    if (credits) {
      // after the title in quotation marks: ‘Hear Here Podcast: Aya Nassar’, interviewed by N. Puwar, in …
      const open = h.indexOf('‘'), close = open < 0 ? null : /’(<\/span>)?, /.exec(h.slice(open));
      if (!close) warnings.push(`the book's own references: no title found in the reference of ${item.id} to put its credits after`);
      else { const at = open + close.index + close[0].length - 2; h = `${h.slice(0, at)}, ${esc(credits)}${h.slice(at)}`; }
    }
    html.set(item.id, h);
  }
  // the other styles, BibTeX and RIS (formatReferences), from the items with their credits
  const formats = formatReferences({ pandoc, work, references: { items, order: keys, index: Object.fromEntries(keys.map((k) => [k, { html: html.get(k) }])) } });
  warnings.push(...formats.warnings.map((w) => `the book's own references: ${w}`));
  const entry = (item) => ({ cite: citeOf.get(item.id) || item.title, html: html.get(item.id), texts: formats.texts[item.id], csl: item });
  return { book: entry(bookItem), pages: new Map(pages.map((p, i) => [p.key, entry(pageItems[i])])), warnings };
}

// The tags Google Scholar reads (Highwire Press: citation_title, citation_author …) and a JSON-LD block (schema.org),
// for a page (a chapter of the book) or the home page (the book). url: the page's address; licence: its address.
export function scholarMeta({ entry, book, url, licence, isBook }) {
  const item = entry.csl;
  const tags = [['citation_title', item.title]];
  for (const n of (isBook ? [] : item.author || [])) tags.push(['citation_author', n.literal || `${n.family}, ${n.given}`]);
  for (const n of (isBook ? book.editors : [])) tags.push(['citation_editor', n.literal || `${n.family}, ${n.given}`]);
  tags.push(['citation_publication_date', String(book.year)]);
  if (!isBook) tags.push(['citation_inbook_title', book.title], ['citation_book_title', book.title]);
  tags.push(['citation_publisher', book.publisher], ['citation_language', book.language], ['citation_fulltext_html_url', url]);
  const person = (n) => (n.literal ? { '@type': 'Organization', name: n.literal } : { '@type': 'Person', name: fullName(n), familyName: n.family, givenName: n.given });
  const bookLd = { '@type': 'Book', name: book.title, editor: book.editors.map(person), publisher: { '@type': 'Organization', name: book.publisher }, url: book.url };
  const ld = {
    '@context': 'https://schema.org', ...(isBook ? bookLd : { '@type': 'Chapter', name: item.title, isPartOf: bookLd }),
    ...(!isBook && item.author ? { author: item.author.map(person) } : {}),
    ...(!isBook && item.interviewer ? { contributor: [...item.interviewer, ...(item.producer || []), ...(item.contributor || [])].map(person) } : {}),
    datePublished: String(book.year), inLanguage: book.language, url, ...(item.version ? { version: item.version } : {}), ...(licence ? { license: licence } : {}),
  };
  return tags.map(([name, content]) => `<meta name="${name}" content="${esc(content)}">`).join('\n') +
    `\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
}
