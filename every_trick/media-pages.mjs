// The HTML of the media items' own pages (the facts below the item), the Media Index (/media-index/), its editing view
// (/media-index/edit/, built for previews only) and the small pages that forward a short address (/37/) or a former
// name to an item's page. build.mjs prepares the items (see itemView there) and puts this HTML into the site's
// template; assets/media-index.js adds the filters, and the editing view's fields, checks and change sheet.
// Every URL an item carries is relative to the site's root; root is the way from the page being written to it.

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (root, url) => esc(root + url);

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

// ---- An item's page: the facts below the item ------------------------------------------------------------------

export function itemFacts(it, { root, siteUrl }) {
  const rows = [];
  const row = (term, html) => rows.push(`<div><dt>${term}</dt><dd>${html}</dd></div>`);
  row('Number', it.label
    ? `Item ${it.label}. Its short address: <a href="${href(root, it.short)}">/${esc(it.short)}</a>`
    : 'A new item: it gets its number when the next version of the book is frozen');
  row('Address', `<a href="${href(root, it.url)}">/${esc(it.url)}</a> · ${it.kind}, ${KIND_NAMES[it.kind]}`);
  if (!it.block) row('Item', 'This item is on no page of the book.');
  if (it.captions.length > 1) row('Captions', `<ul>${it.captions.map((c) => `<li>${esc(c.text) || '<i>no caption</i>'} <span class="item-facts__where">(${c.pages.map(esc).join(', ')})</span></li>`).join('')}</ul>`);
  if (it.credit) row('Credit', esc(it.credit));
  row('Appears in', places(it, root, { after: true }));
  if (it.alsoIn.length) row('Also in', it.alsoIn.map((v) => `${esc(v.label)}: ${v.places.map((a) => `<a href="${href(root, a.link)}">${esc(a.pageTitle)}</a>`).join(', ')}`).join('; '));
  row('Since', since(it, root, true));
  row('Stored', stored(it));
  row('Served from', esc(it.served.label));
  if (it.files.length) row('Files', `<ul>${it.files.map((f) => `<li><a href="${f.external ? esc(f.url) : href(root, f.url)}"${f.download ? ' download' : ''}>${esc(f.label)}</a>${f.note ? ` <span class="item-facts__where">${esc(f.note)}</span>` : ''}</li>`).join('')}</ul>`);
  if (it.formerNames.length) row('Former addresses', it.formerNames.map((n) => `/${esc(it.kind)}/${esc(n)}/`).join(', ') + ', which lead here');
  if (it.formerSources.length) row('Earlier files', `${it.formerSources.map(esc).join(', ')}: replaced, and still shown in the versions that used them`);
  row('To cite', it.label ? `item ${it.label}, ${esc(siteUrl + it.short)}` : `${esc(siteUrl + it.url)} (until it has its number)`);
  return `<dl class="item-facts">\n${rows.join('\n')}\n</dl>`;
}

// ---- The Media Index ------------------------------------------------------------------------------------------

// An entry of the list. On the Media Index (searched), search finds an entry by its title and its address, and lists
// it as a place of its own on the page: data-pagefind-meta gives its label in the results, "item 37" (assets/search.js).
// Its number pill (the label says it), its thumbnail's box and its facts (page titles, versions, places) are left out
// of the index.
function entry(it, root, inner = '', { searched = false } = {}) {
  const ignore = searched ? ' data-pagefind-ignore' : '';
  const label = searched ? ` data-pagefind-meta="${esc(`entry-${it.anchor}:${it.label ? `item ${it.label}` : 'new item'}`)}"` : '';
  return `<li class="media-entry" id="${esc(it.anchor)}" data-kind="${it.kind}" data-served="${it.served.id}" data-served-label="${esc(it.served.chip)}"${label}>
${pill(it, root, ignore)}
${thumb(it, root, ignore)}
<div class="media-entry__body">
<h2 class="media-entry__title"><a href="${href(root, it.url)}">${esc(it.heading)}</a></h2>
<p class="media-entry__address"><span class="media-entry__kind">${it.kind}</span> · <a href="${href(root, it.url)}">/${esc(it.url)}</a>${it.short ? ` · <a href="${href(root, it.short)}">/${esc(it.short)}</a>` : ''}</p>
<dl class="media-entry__facts"${ignore}>
<div><dt>Appears in</dt><dd>${places(it, root)}</dd></div>
<div><dt>Since</dt><dd>${since(it, root)}</dd></div>
<div><dt>Stored</dt><dd>${stored(it)}</dd></div>
<div><dt>Served from</dt><dd>${esc(it.served.label)}</dd></div>
</dl>
${inner}</div>
</li>`;
}

export function mediaIndexHtml(items, { root, script, preview }) {
  const numbered = items.filter((it) => it.label).length;
  return `<div class="media-index">
<p class="media-index__intro">Every picture, recording, video and document in the book has a number of its own, the same on every page that shows it and in every version. Each has its own page, at the address below its title. ${numbered} items have their number; ${items.length - numbered ? `${items.length - numbered} new ${items.length - numbered === 1 ? 'one gets its number' : 'ones get theirs'} when the next version is frozen.` : 'new ones get theirs when the next version is frozen.'} The same list as data: <a href="${href(root, 'media.json')}">media.json</a>.</p>
${preview ? `<p class="media-index__preview" data-pagefind-ignore>This preview also has an <a href="edit/">editing view</a> of the list, for checking names, credits, captions and alt text.</p>\n` : ''}<div class="media-filters" hidden></div>
<ol class="media-list">
${items.map((it) => entry(it, root, '', { searched: true })).join('\n')}
</ol>
</div>
<script src="${esc(script)}" defer></script>`;
}

// ---- The editing view (previews only) ---------------------------------------------------------------------------

function field({ label, kind = 'input', name, value, attrs = '', wide = false, placeholder = '' }) {
  const common = `data-field="${name}" data-original="${esc(value)}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''} spellcheck="${name === 'name' ? 'false' : 'true'}" autocomplete="off"${attrs}`;
  const control = kind === 'textarea' ? `<textarea ${common} rows="2">${esc(value)}</textarea>` : `<input type="text" ${common} value="${esc(value)}">`;
  return `<label class="media-field${wide ? ' is-wide' : ''}"><span class="media-field__label">${label}</span>${control}</label>`;
}

export function mediaEditHtml(items, { root, script, names }) {
  const list = items.map((it) => {
    const fields = [
      field({ label: 'Name', name: 'name', value: it.name }),
      field({ label: 'Credit', name: 'credit', value: it.credit, placeholder: 'Photo: …' }),
    ];
    // a recording's title comes from its page's title, so it has no caption to edit here
    for (const a of it.kind === 'listen' ? [] : it.editable) {
      const on = `on ${esc(a.pageTitle)}${a.repeat ? ` (${a.repeat})` : ''}`;
      const attrs = ` data-appearance="${esc(a.key)}" data-page="${esc(a.pageTitle)}" data-file="${esc(a.file)}"`;
      fields.push(field({ label: `Caption, ${on}`, name: 'caption', value: a.shownCaption, attrs, wide: true }));
      if (it.kind === 'see') fields.push(field({ label: `Alt text, ${on}`, kind: 'textarea', name: 'alt', value: a.alt, attrs, wide: true }));
    }
    fields.push(field({ label: 'Comment', kind: 'textarea', name: 'comment', value: '', wide: true, placeholder: 'A question or a note for whoever applies the changes' }));
    const inner = `<ul class="media-checks" aria-label="Checks"></ul>\n<div class="media-fields">\n${fields.join('\n')}\n</div>\n`;
    return entry(it, root, inner).replace('<li class="media-entry"', `<li class="media-entry media-entry--edit" data-source="${esc(it.source)}" data-label="${esc(it.label || '')}" data-used="${it.appearances.length ? 'true' : 'false'}"`);
  });
  return `<div class="media-index media-edit">
<p class="media-index__intro">The Media Index with fields for the name, the credit, and the caption and alt text of each place an item appears in the latest text, and a comment. The checks beside each item update as you type. Your edits stay in this browser, even when you reload the page, and nothing is saved anywhere else: when you are done, “Hand over changes” gives a sheet that lists only what you changed, for someone to apply on a branch. This view is on previews only, never on the public site.</p>
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
</div>
<script src="${esc(script)}" defer></script>`;
}

// ---- A page that forwards an old or short address ---------------------------------------------------------------

export function forwardHtml({ lang, title, target, canonical, stylesheet, text }) {
  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(canonical)}">
  <meta http-equiv="refresh" content="0; url=${esc(target)}">
  <link rel="stylesheet" href="${esc(stylesheet)}">
</head>
<body>
  <main id="main" class="forward"><p>${text} <a href="${esc(target)}">${esc(canonical)}</a></p></main>
</body>
</html>
`;
}
