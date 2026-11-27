// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// Citing the book itself ("Plan: copying citations" in DEVELOPMENT.md): the reference of every page of an edition, of
// the whole book and of its media items, for the pages' Copy citation and How to cite section, the Copy quote button
// (assets/cite.js), the item pages, page.json and the metadata for Google Scholar.
//
//   selfReferences(options)   every page, the book and the media items of an edition, formatted once in every citation
//                             style a reader can choose (CITE_STYLES), with each style's in-text citation, and as
//                             BibTeX and RIS for a reference manager
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
//
// The book has an author, Nirmal Puwar (her answer of 24 November 2026), so a page is cited as a chapter in an authored
// book: "…, in N. Puwar, Hear Here: Spatial Practices, …" (CSL's container-author). The day a page's event was held or
// its podcast recorded follows its title in the house style ("held on 2 March 2024", "recorded 5 April 2025"), before
// its other credits; the year of the citation stays the year the version was published.
//
// A media item is cited against the book (the publisher, 2026-11-23): in the house style "Item 37, ‘The baptismal font
// in Coventry Cathedral’, in N. Puwar, Hear Here: Spatial Practices, …", which citeproc writes for a chapter whose
// author is "Item 37", and in the text as the book with the item's number, (Puwar 2026: item 37).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COPY_STYLES, CSL, formatReferences } from './citations.mjs';
import { longDate } from './versions.mjs';

const TOOLKIT_DIR = dirname(fileURLToPath(import.meta.url));
export const ACCESSED = [9999, 12, 31];   // in place of the day the reader copies a citation (assets/cite.js)
// The locators of the in-text citations' patterns, which assets/cite.js replaces with a passage's paragraphs
export const ONE = '999999', FIRST = '999998';
// The citation styles a reader can choose in the settings: the References page's, less those for a reference manager
export const CITE_STYLES = COPY_STYLES.filter((s) => !s.entry);

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
// The day after a page's title, in the house style: { kind: 'held' | 'recorded', date: 'YYYY-MM-DD' }
export const dateText = (date) => (date ? `${date.kind === 'held' ? 'held on' : 'recorded'} ${longDate(date.date)}` : '');
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
//   book: { id, title, authors: [names], publisher, year, url, language }
//   pages: [{ key, id, title, credits, date, url }]  every page to cite: key, its file; id, its key in BibTeX and RIS;
//                                              date, the day it was held or recorded (dateText)
//   items: [{ key, number, title, credit, url }]  media items, cited against the book: number is its label ('37'), or
//                                              null for one not numbered yet; title its caption; credit its credit,
//                                              which follows the title in the house style and ends the other styles'
//   version: { id, label } for a frozen version; null for the latest text, which its references call "latest text,
//            unreleased"
// -> { book, pages: Map(key -> entry), items: Map(key -> entry), warnings }, an entry being
//   { url, styles: { <style id>: { html, text, cite, one, range } }, bibtex, ris, csl }: html and text, its reference
//   (with ACCESSED), formatted and plain; cite, its in-text citation ("(Nassar 2026)"); one and range, the same with a
//   paragraph or two, their numbers ONE, and FIRST and ONE ("(Nassar 2026: para. 999999)"). An item's entry has only
//   html and text: its in-text citation is the book's, with its number.
export function selfReferences({ pandoc, work, book, pages, items = [], version }) {
  mkdirSync(work, { recursive: true });
  const warnings = [];
  const issued = { 'date-parts': [[Number(book.year)]] };
  const accessed = { 'date-parts': [ACCESSED] };
  const common = { publisher: book.publisher, issued, accessed, language: book.language, ...(version ? { version: version.id } : {}) };
  const inBook = { 'container-title': book.title, 'container-author': book.authors, ...common };
  const bookItem = { id: book.id, type: 'book', title: book.title, author: book.authors, URL: book.url, ...common };
  const pageItems = pages.map((p) => {
    const c = p.credits || {};
    return {
      id: p.id, type: 'chapter', title: p.title, ...(c.author ? { author: c.author } : {}), URL: p.url, ...inBook,
      ...(c.interviewer ? { interviewer: c.interviewer } : {}), ...(c.producer ? { producer: c.producer } : {}),
      ...(c['transcript-editor'] ? { contributor: c['transcript-editor'] } : {}),
    };
  });
  const mediaItems = items.map((it, i) => ({ id: `item-${i + 1}`, type: 'chapter', author: [{ literal: it.number ? `Item ${it.number}` : 'New item' }], title: it.title, URL: it.url, ...inBook }));
  const all = [bookItem, ...pageItems, ...mediaItems];
  const cited = [bookItem, ...pageItems];   // the works with an in-text citation of their own
  const entries = new Map(all.map((item) => [item.id, { url: item.URL, styles: {}, csl: item }]));

  for (const style of CITE_STYLES) {
    const house = style.id === 'house';
    // the house style: without the credits after the title (put in below), and the latest text's "latest text, unreleased"
    const source = house ? all.map(({ interviewer, producer, contributor, ...item }) => (version ? item : { ...item, version: 'LATEST-TEXT' })) : all;
    const file = join(work, `self-${style.id}.json`);
    writeFileSync(file, JSON.stringify(source));
    const csl = standalone(work, `self-${style.id}.csl`, house ? CSL : join(TOOLKIT_DIR, 'csl', style.csl));
    const run = (input) => {
      const result = spawnSync(pandoc, ['-f', 'markdown', '-t', 'html', '--wrap=none', '--citeproc', '--bibliography', file, '--csl', csl, ...(style.locale ? ['-M', `lang=${style.locale}`] : [])],
        { input, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`citeproc failed on the book's own references (${style.label}):\n${result.stderr}`);
      warnings.push(...result.stderr.split('\n').filter(Boolean).map((l) => `the book's own references (${style.short}): ${l.replace(/^\[WARNING\] /, '')}`));
      return result.stdout;
    };
    const listing = run("---\nnocite: '@*'\n---\n");
    const html = new Map([...listing.matchAll(/<div id="ref-([^"]+)" class="csl-entry"[^>]*>\s*([\s\S]*?)\s*<\/div>/g)].map((m) => [m[1], m[2].replace(/\s+/g, ' ')]));
    // each work cited three ways, one paragraph each: alone, with a paragraph, with two
    const citing = run(`---\nsuppress-bibliography: true\n---\n\n${cited.map((item) => `[@${item.id}]\n\n[@${item.id}, para. ${ONE}]\n\n[@${item.id}, paras ${FIRST}–${ONE}]`).join('\n\n')}\n`);
    const cites = [...citing.matchAll(/<p><span class="citation" data-cites="([^"]+)">([\s\S]*?)<\/span><\/p>/g)].map((m) => plain(m[2]));
    if (cites.length !== 3 * cited.length) throw new Error(`citeproc wrote ${cites.length} in-text citations of the book's own references (${style.label}), not ${3 * cited.length}`);
    cited.forEach((item, i) => { entries.get(item.id).styles[style.id] = { cite: cites[3 * i], one: cites[3 * i + 1], range: cites[3 * i + 2] }; });
    for (const item of all) {
      let h = html.get(item.id);
      if (!h) { warnings.push(`the book's own references (${style.short}): citeproc wrote nothing for ${item.id}`); h = esc(item.title); }
      if (house) {
        h = h.replace(/(versions? )?LATEST-TEXT/g, 'working copy, unreleased');
        const page = pages.find((p) => p.id === item.id);
        const credits = page && [dateText(page.date), creditsText(page.credits)].filter(Boolean).join(', ');
        if (credits) {
          // after the title in quotation marks: ‘Hear Here Podcast: Aya Nassar’, interviewed by N. Puwar, in …
          const open = h.indexOf('‘'), close = open < 0 ? null : /’(<\/span>)?, /.exec(h.slice(open));
          if (!close) warnings.push(`the book's own references: no title found in the reference of ${item.id} to put its credits after`);
          else { const at = open + close.index + close[0].length - 2; h = `${h.slice(0, at)}, ${esc(credits)}${h.slice(at)}`; }
        }
      }
      const media = items[mediaItems.indexOf(item)];
      if (media?.credit) {
        if (house) h = h.replace(/’(<\/span>)?, in /, (m, span) => `’${span || ''} (${esc(media.credit)}), in `);
        else h = `${h} ${esc(media.credit)}${/[.!?]$/.test(media.credit) ? '' : '.'}`;
      }
      const entry = entries.get(item.id);
      entry.styles[style.id] = { ...(entry.styles[style.id] || {}), html: h, text: plain(h) };
    }
  }
  // BibTeX and RIS (formatReferences), from the pages and the book with their credits
  const keys = cited.map((i) => i.id);
  const formats = formatReferences({ pandoc, work, references: { items: cited, order: keys, index: Object.fromEntries(keys.map((k) => [k, { html: entries.get(k).styles.house.html }])) } });
  warnings.push(...formats.warnings.filter((w) => /BibTeX|RIS/.test(w)).map((w) => `the book's own references: ${w}`));
  for (const key of keys) Object.assign(entries.get(key), { bibtex: formats.texts[key].bibtex, ris: formats.texts[key].ris });
  return {
    book: entries.get(bookItem.id),
    pages: new Map(pages.map((p, i) => [p.key, entries.get(pageItems[i].id)])),
    items: new Map(items.map((it, i) => [it.key, entries.get(mediaItems[i].id)])),
    warnings,
  };
}

// The tags Google Scholar reads (Highwire Press: citation_title, citation_author …) and a JSON-LD block (schema.org),
// for a page (a chapter of the book) or the home page (the book). url: the page's address; licence: its address.
export function scholarMeta({ entry, book, url, licence, isBook }) {
  const item = entry.csl;
  const tags = [['citation_title', item.title]];
  for (const n of item.author || []) tags.push(['citation_author', n.literal || `${n.family}, ${n.given}`]);
  tags.push(['citation_publication_date', String(book.year)]);
  if (!isBook) tags.push(['citation_inbook_title', book.title], ['citation_book_title', book.title]);
  tags.push(['citation_publisher', book.publisher], ['citation_language', book.language], ['citation_fulltext_html_url', url]);
  const person = (n) => (n.literal ? { '@type': 'Organization', name: n.literal } : { '@type': 'Person', name: fullName(n), familyName: n.family, givenName: n.given });
  const bookLd = { '@type': 'Book', name: book.title, author: book.authors.map(person), publisher: { '@type': 'Organization', name: book.publisher }, url: book.url };
  const ld = {
    '@context': 'https://schema.org', ...(isBook ? bookLd : { '@type': 'Chapter', name: item.title, isPartOf: bookLd }),
    ...(!isBook && item.author ? { author: item.author.map(person) } : {}),
    ...(!isBook && item.interviewer ? { contributor: [...item.interviewer, ...(item.producer || []), ...(item.contributor || [])].map(person) } : {}),
    datePublished: String(book.year), inLanguage: book.language, url, ...(item.version ? { version: item.version } : {}), ...(licence ? { license: licence } : {}),
  };
  return tags.map(([name, content]) => `<meta name="${name}" content="${esc(content)}">`).join('\n') +
    `\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
}
