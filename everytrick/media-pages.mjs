// The HTML of the media items' own pages (the facts below the item, and below a document's viewer its text and its
// download), the Media Index (on about/references-and-media/, after the References), its editing view (/media-index/edit/, built for previews only) and the small
// pages that forward a short address (/37/) or a former name to an item's page. build.mjs prepares the items (see
// itemView there) and puts this HTML into the site's template; assets/media-index.js adds the filters, and the editing
// view's fields, checks and change sheet.
// Every URL an item carries is relative to the site's root; root is the way from the page being written to it.
import { longDate } from './versions.mjs';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (root, url) => esc(root + url);

// The size of a file, for people: "0.9 MB", "64 KB".
export const sizeText = (bytes) => (bytes >= 1e5 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

// What each kind is, for people: the word of the address and what it names.
export const KIND_NAMES = { see: 'a picture', listen: 'a recording', watch: 'a video', read: 'a document' };

// The number pill, as on the pages: a link to the item's page (dashed "new" for an item not yet numbered). attrs: more
// attributes for the link.
export function pill(it, root, attrs = '') {
  return it.label
    ? `<a class="item-number" href="${href(root, it.url)}" aria-label="Item ${it.label}"${attrs}>${it.label}</a>`
    : `<a class="item-number is-new" href="${href(root, it.url)}" aria-label="New item, not yet numbered"${attrs}>new</a>`;
}

const clock = (seconds) => {
  const s = Math.round(seconds), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
};

// The thumbnail: a small copy of a picture, a video's poster, or a plain labelled box (with a recording's length).
// attrs: more attributes for the box.
function thumb(it, root, attrs = '') {
  if (it.thumb) {
    return `<a class="media-entry__thumb" href="${href(root, it.url)}" tabindex="-1" aria-hidden="true"><img src="${href(root, it.thumb.url)}" width="${it.thumb.width}" height="${it.thumb.height}" alt="" loading="lazy" decoding="async"></a>`;
  }
  const icon = { listen: '♪', watch: '▶', read: '▤', see: '◻' }[it.kind];
  const note = it.kind === 'listen' && it.duration ? clock(it.duration) : it.kind === 'read' ? it.docType : it.kind;
  return `<span class="media-entry__thumb media-entry__box" aria-hidden="true"${attrs}><span class="media-entry__icon">${icon}</span><span>${esc(note)}</span></span>`;
}

// Where an item appears: links to it in its pages (the latest text, or else the newest frozen version that has it).
function places(it, root, { after = false } = {}) {
  if (!it.shown.length) return 'on no page';
  const frozen = it.shown[0].frozen ? `${esc(it.shown[0].editionLabel)}: ` : '';
  return frozen + it.shown.map((a) => `<a href="${href(root, a.link)}">${esc(a.pageTitle)}</a>${after && a.after ? `, after para. ${a.after.replace(/^p/, '')}` : ''}`).join(', ');
}

const since = (it, root, long = false) => (it.since
  ? (it.sinceUrl !== null ? `<a href="${href(root, it.sinceUrl)}">${esc(long ? it.sinceLabel : `version ${it.since}`)}</a>` : esc(long ? it.sinceLabel : `version ${it.since}`))
  : (long ? 'Not in a frozen version yet' : 'new, not in a frozen version yet'));

const stored = (it) => `${esc(it.stored.label)}${it.stored.detail ? `, <a href="${esc(it.stored.url)}">${esc(it.stored.detail)}</a>` : it.stored.url ? ` (<a href="${esc(it.stored.url)}">its page there</a>)` : ''}`;
// on an item's page, a zine whose pages are copied from archive.org says so
const storedInFull = (it) => stored(it) + (it.stored.copy
  ? `, which keeps the original. The pages shown here are a copy of the item’s page images, fetched on ${esc(longDate(it.stored.copy.fetched))} into this repository: <a href="${esc(it.stored.copy.url)}">${esc(it.stored.copy.folder)}/</a>`
  : '');

// Plain text with its web addresses as links (a rights note, a document's text). Punctuation after an address is not
// part of it.
const linked = (text) => String(text ?? '').split(/(https?:\/\/[^\s<>"'‘’“”]*[^\s<>"'‘’“”.,;:!?)\]])/)
  .map((part, i) => (i % 2 ? `<a href="${esc(part)}">${esc(part)}</a>` : esc(part))).join('');

// ---- A document's page: below the viewer, its text page by page, and its download -------------------------------

// The text of a document's pages is searched, in the latest text's index (build.mjs, step 7): only the pages' text, in
// <div class="document-pages" data-pagefind-body>, each page a place of its own in the results, "page 3", leading to
// #page-3 (its data-pagefind-meta, as the References page's works and the Media Index's items; assets/search.js). The
// headings "Page 3", the line said for a page without text, and everything else on the page are left out.
export function documentText(it, { root }) {
  const doc = it.doc;
  const sections = [];
  if (doc.text) {
    sections.push(`<section class="document-text" id="text" aria-labelledby="text-heading">\n<h2 id="text-heading">Text</h2>\n` +
      `<p class="document-text__about">The text of each page, as it is read from the PDF. The pictures of the pages are above.</p>\n` +
      '<div class="document-pages" data-pagefind-body>\n' +
      doc.pages.map((p) => `<section class="document-page" id="page-${p.n}" aria-labelledby="page-${p.n}-heading" data-pagefind-meta="entry-page-${p.n}:page ${p.n}">` +
        `<h3 id="page-${p.n}-heading" data-pagefind-ignore>Page ${p.n}</h3>\n` +
        (p.text.length ? p.text.map((para) => `<p>${linked(para)}</p>`).join('\n') : '<p class="document-page__empty" data-pagefind-ignore>No text on this page.</p>') + '\n</section>').join('\n') +
      '\n</div>\n</section>');
  } else {
    const caption = it.shown[0]?.caption || doc.title;
    sections.push(`<section class="document-text" id="text" aria-labelledby="text-heading">\n<h2 id="text-heading">Text</h2>\n` +
      `<p class="document-text__title">${esc(caption)}</p>\n` +
      '<p class="document-text__about">The pages of this zine are pictures, and the text that can be recognised in them is not reliable enough to show here. A description of each page will follow.</p>\n</section>');
  }
  const download = doc.kind === 'pdf'
    ? `<p>The original PDF: <a href="${href(root, doc.download.url)}" download>${esc(doc.download.url.split('/').pop())}</a> (${esc(sizeText(doc.download.size))}, ${doc.pages.length} pages).</p>`
    : `<p>The original is kept on the Internet Archive: <a href="${esc(doc.download.url)}">${esc(doc.title)}</a>. The pages above are a copy of its page images.</p>`;
  sections.push(`<section class="document-download" id="download" aria-labelledby="download-heading">\n<h2 id="download-heading">${doc.kind === 'pdf' ? 'Download' : 'The original'}</h2>\n${download}\n</section>`);
  return `<div class="document-about">\n${sections.join('\n')}\n</div>`;
}

// An item's rights, which public pages show only when they are filled in: the label of its statement or licence linked
// to its address ("In Copyright", "CC BY 4.0"), and with note, its rights note after it.
const rightsHtml = (it, { note = false } = {}) => [it.rights ? `<a href="${esc(it.rights)}">${esc(it.rightsLabel)}</a>` : '', note && it.rightsNote ? linked(it.rightsNote) : '']
  .filter(Boolean).join(' · ');

// ---- An item's page: the facts below the item ------------------------------------------------------------------

// Credit, rights and source (how to cite the item's own source) are shown only when they are filled in: public pages
// never show a missing field (the publisher, 2026-11-23). The editing view marks what is missing. First published and
// last changed come from the Git history (history.mjs): an item served from elsewhere has no file of ours, so no "Last
// changed", and without the history neither row is there. A long description is shown above, below the item
// (filters/figures.lua), only where one is written: it is optional, and nothing says when there is none.
export function itemFacts(it, { root, siteUrl }) {
  const rows = [];
  const row = (term, html) => rows.push(`<div><dt>${term}</dt><dd>${html}</dd></div>`);
  row('Number', it.label
    ? `Item ${it.label}. Its short address: <a href="${href(root, it.short)}">/${esc(it.short)}</a>`
    : 'A new item: it gets its number when the next version of the book is frozen');
  row('Address', `<a href="${href(root, it.url)}">/${esc(it.url)}</a> · ${it.kind}, ${KIND_NAMES[it.kind]}`);
  if (!it.block) row('Item', 'This item is on no page of the book.');
  if (it.doc) row('Pages', `${it.doc.pages.length}${it.doc.text ? `, with <a href="#text">their text</a>` : ''}`);
  // the captions of an item captioned differently on different pages (a page that gives it none is not listed)
  const captions = it.captions.filter((c) => c.text);
  if (it.captions.length > 1 && captions.length) row('Captions', `<ul>${captions.map((c) => `<li>${esc(c.text)} <span class="item-facts__where">(${c.pages.map(esc).join(', ')})</span></li>`).join('')}</ul>`);
  if (it.credit) row('Credit', esc(it.credit));
  if (it.rights || it.rightsNote) row('Rights', rightsHtml(it, { note: true }));
  if (it.citeAs) row('Source', esc(it.citeAs));
  row('Appears in', places(it, root, { after: true }));
  if (it.alsoIn.length) row('Also in', it.alsoIn.map((v) => `${esc(v.label)}: ${v.places.map((a) => `<a href="${href(root, a.link)}">${esc(a.pageTitle)}</a>`).join(', ')}`).join('; '));
  row('Since', since(it, root, true));
  if (it.firstPublished) row('First published', esc(longDate(it.firstPublished)));
  if (it.lastChanged) row('Last changed', esc(longDate(it.lastChanged)));
  row('Stored', storedInFull(it));
  row('Served from', esc(it.served.label));
  if (it.files.length) row('Files', `<ul>${it.files.map((f) => `<li><a href="${f.external ? esc(f.url) : href(root, f.url)}"${f.download ? ' download' : ''}>${esc(f.label)}</a>${f.note ? ` <span class="item-facts__where">${esc(f.note)}</span>` : ''}</li>`).join('')}</ul>`);
  if (it.formerNames.length) row('Former addresses', it.formerNames.map((n) => `/${esc(it.kind)}/${esc(n)}/`).join(', ') + ', which lead here');
  if (it.formerSources.length) row('Earlier files', `${it.formerSources.map(esc).join(', ')}: replaced, and still shown in the versions that used them`);
  row('To cite', it.cite ? itemCite(it) : it.label ? `item ${it.label}, ${esc(siteUrl + it.short)}` : `${esc(siteUrl + it.url)} (until it has its number)`);
  return `<dl class="item-facts">\n${rows.join('\n')}\n</dl>`;
}

// How to cite an item, against the book ("Plan: copying citations" in DEVELOPMENT.md): one block, its reference in the
// house style, "Item 37, ‘The baptismal font in Coventry Cathedral’, in N. Puwar, ed., Hear Here: Spatial Practices, …
// <https://hearhere.matteringpress.org/37/> [accessed …]", ending with how to cite its own source where the register
// says, and below it the in-text citation, (Puwar 2026: item 37). assets/cite.js shows both in the reader's citation
// style, adds the Copy button and fills in the date accessed, which the build leaves as 31 December 9999 (cite.mjs).
export const sourceText = (citeAs) => (citeAs ? ` Source: ${citeAs}${/[.!?]$/.test(citeAs) ? '' : '.'}` : '');
function itemCite(it) {
  const c = it.cite;
  return `<div class="item-cite"><p class="item-cite__reference">${c.styles.house.html.replace('31 December 9999', '<span class="cite-today">the day you read it</span>')}${esc(sourceText(c.citeAs))}</p>` +
    `<p class="item-cite__intext">In the text: <span class="item-cite__example">${esc(c.intext.house)}</span></p></div>`;
}

// ---- The Media Index ------------------------------------------------------------------------------------------

// An entry of the list. On the Media Index (searched), search finds an entry by its title and its address, and lists
// it as a place of its own on the page: data-pagefind-meta gives its label in the results, "item 37" (assets/search.js).
// Its number pill (the label says it), its thumbnail's box and its facts (page titles, versions, places) are left out
// of the index. Its credit and rights are among the facts only when they are filled in.
function entry(it, root, inner = '', { searched = false } = {}) {
  const ignore = searched ? ' data-pagefind-ignore' : '';
  const label = searched ? ` data-pagefind-meta="${esc(`entry-${it.anchor}:${it.label ? `item ${it.label}` : 'new item'}`)}"` : '';
  return `<li class="media-entry" id="${esc(it.anchor)}" data-kind="${it.kind}" data-served="${it.served.id}" data-served-label="${esc(it.served.chip)}"${label}>
${pill(it, root, ignore)}
${thumb(it, root, ignore)}
<div class="media-entry__body">
<h3 class="media-entry__title"><a href="${href(root, it.url)}">${esc(it.heading)}</a></h3>
<p class="media-entry__address"><span class="media-entry__kind">${it.kind}</span> · <a href="${href(root, it.url)}">/${esc(it.url)}</a>${it.short ? ` · <a href="${href(root, it.short)}">/${esc(it.short)}</a>` : ''}</p>
<dl class="media-entry__facts"${ignore}>
<div><dt>Appears in</dt><dd>${places(it, root)}</dd></div>
<div><dt>Since</dt><dd>${since(it, root)}</dd></div>
<div><dt>Stored</dt><dd>${stored(it)}</dd></div>
<div><dt>Served from</dt><dd>${esc(it.served.label)}</dd></div>
${it.credit ? `<div><dt>Credit</dt><dd>${esc(it.credit)}</dd></div>\n` : ''}${it.rights ? `<div><dt>Rights</dt><dd>${rightsHtml(it)}</dd></div>\n` : ''}</dl>
${inner}</div>
</li>`;
}

export function mediaIndexHtml(items, { root, script, preview, edit = 'edit/' }) {
  const numbered = items.filter((it) => it.label).length;
  return `<div class="media-index">
<p class="media-index__intro">Every picture, recording, video and document in the book has a number of its own, the same on every page that shows it and in every version. Each has its own page, at the address below its title. ${numbered} items have their number; ${items.length - numbered ? `${items.length - numbered} new ${items.length - numbered === 1 ? 'one gets its number' : 'ones get theirs'} when the next version is frozen.` : 'new ones get theirs when the next version is frozen.'} The same list as data: <a href="${href(root, 'media.json')}">media.json</a>.</p>
${preview ? `<p class="media-index__preview" data-pagefind-ignore>This preview also has an <a href="${esc(edit)}">editing view</a> of the list, for checking names, credits, rights, sources, captions and alt text.</p>\n` : ''}<div class="media-filters" hidden></div>
<ol class="media-list">
${items.map((it) => entry(it, root, '', { searched: true })).join('\n')}
</ol>
</div>
<script src="${esc(script)}" defer></script>`;
}

// ---- The editing view (previews only) ---------------------------------------------------------------------------

function field({ label, kind = 'input', name, value, attrs = '', wide = false, placeholder = '', rows = 2 }) {
  const common = `data-field="${name}" data-original="${esc(value)}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''} spellcheck="${name === 'name' || name === 'rights' ? 'false' : 'true'}" autocomplete="off"${attrs}`;
  const control = kind === 'textarea' ? `<textarea ${common} rows="${rows}">${esc(value)}</textarea>` : `<input type="text" ${common} value="${esc(value)}">`;
  return `<label class="media-field${wide ? ' is-wide' : ''}"><span class="media-field__label">${label}</span>${control}</label>`;
}

// The rights: a choice of the common rightsstatements.org statements and Creative Commons licences (register.mjs, RIGHTS),
// and the address itself, where any other statement or licence can be typed. assets/media-index.js writes the address
// of what is chosen, and shows what an address typed in is. Then the note shown after the rights.
function rightsFields(it, choices) {
  const listed = choices.some((g) => g.options.some((o) => o.url === it.rights));
  const option = (value, text, on) => `<option value="${esc(value)}"${on ? ' selected' : ''}>${esc(text)}</option>`;
  const select = `<select data-rights-choice>${option('', 'Not given yet', !it.rights)}` +
    choices.map((g) => `<optgroup label="${esc(g.group)}">${g.options.map((o) => option(o.url, o.label, o.url === it.rights)).join('')}</optgroup>`).join('') +
    `${option('other', 'Another statement or licence: type its address', it.rights && !listed)}</select>`;
  return [
    `<label class="media-field"><span class="media-field__label">Rights</span>${select}</label>`,
    field({ label: 'Rights: its address', name: 'rights', value: it.rights, attrs: ' inputmode="url"', placeholder: 'http://rightsstatements.org/vocab/InC/1.0/' }),
    field({ label: 'Rights note, shown after the rights', name: 'rights_note', value: it.rightsNote, wide: true, placeholder: 'A few words or a link' }),
  ];
}

export function mediaEditHtml(items, { root, script, names, rights }) {
  const list = items.map((it) => {
    const fields = [
      field({ label: 'Name', name: 'name', value: it.name }),
      field({ label: 'Credit', name: 'credit', value: it.credit, placeholder: 'Photo: …' }),
      ...rightsFields(it, rights.choices),
      field({ label: 'Source, how to cite it', name: 'cite_as', value: it.citeAs, wide: true, placeholder: 'Maker, ‘Title’ (year), holder' }),
    ];
    // a recording's title comes from its page's title, so it has no caption to edit here
    for (const a of it.kind === 'listen' ? [] : it.editable) {
      const on = `on ${esc(a.pageTitle)}${a.repeat ? ` (${a.repeat})` : ''}`;
      const attrs = ` data-appearance="${esc(a.key)}" data-page="${esc(a.pageTitle)}" data-file="${esc(a.file)}"`;
      fields.push(field({ label: `Caption, ${on}`, name: 'caption', value: a.shownCaption, attrs, wide: true }));
      if (it.kind !== 'see') continue;
      fields.push(field({ label: `Alt text, ${on}`, kind: 'textarea', name: 'alt', value: a.alt, attrs, wide: true }));
      // optional, for a picture that carries an argument: no check ever asks for one
      fields.push(field({ label: `Long description (optional), ${on}`, kind: 'textarea', name: 'description', value: a.description, attrs, wide: true, rows: 4,
        placeholder: 'For a picture that carries an argument: what a reader who cannot see it needs to follow it. A blank line between paragraphs' }));
      fields.push(field({ label: `Long description written by, ${on}`, name: 'description_by', value: a.descriptionBy, attrs, placeholder: 'Name' }));
    }
    fields.push(field({ label: 'Comment', kind: 'textarea', name: 'comment', value: '', wide: true, placeholder: 'A question or a note for whoever applies the changes' }));
    const inner = `<ul class="media-checks" aria-label="Checks"></ul>\n<div class="media-fields">\n${fields.join('\n')}\n</div>\n`;
    return entry(it, root, inner).replace('<li class="media-entry"', `<li class="media-entry media-entry--edit" data-source="${esc(it.source)}" data-label="${esc(it.label || '')}" data-used="${it.appearances.length ? 'true' : 'false'}"`);
  });
  return `<div class="media-index media-edit">
<p class="media-index__intro">The Media Index with fields for the name, the credit, the rights, how to cite the item’s source, and the caption and alt text of each place an item appears in the latest text (for a picture also an optional long description, and who wrote it), and a comment. The checks beside each item update as you type. Credit, rights and source show on the public pages only when they are filled in, so only these checks say what is missing. Your edits stay in this browser, even when you reload the page, and nothing is saved anywhere else: when you are done, “Hand over changes” gives a sheet that lists only what you changed, for someone to apply on a branch. This view is on previews only, never on the public site.</p>
<div class="media-filters" hidden></div>
<ol class="media-list">
${list.join('\n')}
</ol>
<div class="media-handover">
<button type="button" class="media-button media-button--strong" data-action="hand-over">Hand over changes</button>
<span class="media-handover__count" role="status"></span>
<button type="button" class="media-button" data-action="clear">Clear all edits</button>
</div>
<dialog class="media-sheet" aria-labelledby="media-sheet-title">
<div class="media-sheet__head"><h2 id="media-sheet-title">Changes to hand over</h2><button type="button" class="media-button" data-action="close">Close</button></div>
<p class="media-sheet__about">Copy this sheet, or download it, and send it to whoever applies the changes on a branch.</p>
<pre class="media-sheet__text" tabindex="0"></pre>
<div class="media-sheet__actions"><button type="button" class="media-button media-button--strong" data-action="copy">Copy</button><button type="button" class="media-button" data-action="download">Download (.md)</button><button type="button" class="media-button" data-action="clear">Clear all edits</button><span class="media-sheet__status" role="status"></span></div>
</dialog>
<script type="application/json" class="media-names">${JSON.stringify(names).replace(/</g, '\\u003c')}</script>
<script type="application/json" class="media-rights">${JSON.stringify(rights).replace(/</g, '\\u003c')}</script>
</div>
<script src="${esc(script)}" defer></script>`;
}

// ---- A page that forwards an old or short address ---------------------------------------------------------------

// keepFragment: a script forwards with the fragment of the address the reader came to (#hall2001 instead of the target's
// own, if it has one); the meta refresh, only for readers without JavaScript, leads to the target as it is.
export function forwardHtml({ lang, title, target, canonical, stylesheet, text, keepFragment = false }) {
  const script = keepFragment ? `\n  <script>try{var t=${JSON.stringify(target).replace(/</g, '\\u003c')},h=location.hash;location.replace(h?t.split('#')[0]+h:t)}catch(e){}</script>` : '';
  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(canonical)}">${script}
  ${keepFragment ? '<noscript>' : ''}<meta http-equiv="refresh" content="0; url=${esc(target)}">${keepFragment ? '</noscript>' : ''}
  <link rel="stylesheet" href="${esc(stylesheet)}">
</head>
<body>
  <main id="main" class="forward"><p>${text} <a href="${esc(target)}">${esc(canonical)}</a></p></main>
</body>
</html>
`;
}
