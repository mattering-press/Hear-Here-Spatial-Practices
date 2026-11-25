// The Items (/media-index/) and its editing view (/media-index/edit/, on previews only). The build writes the
// list as plain HTML (everytrick/media-pages.mjs), which is what readers get without JavaScript.
//  * Filters: chips by kind (see, listen, watch, read) and by where items are served from (our own site, GitHub,
//    archive.org …), made from the list itself, with how many items each has. One choice in each row; "All" clears
//    both. A line says how many items are shown.
//  * The editing view: fields for each item's name, credit, rights (a choice of the common statements and licences,
//    which writes their address, or any other address typed in) with its note, and how to cite its source; the caption
//    (and for a picture the alt text, and an optional long description with who wrote it) of each place it appears in
//    the latest text; and a comment. A long description is optional: no check asks for one. The checks beside each
//    item follow the fields as they change: no alt text, alt text that repeats the caption, no credit, no rights (or an
//    address that is not a statement or licence), no source to cite, used on no page, and a name that is not allowed or
//    is already taken. Public pages never show a missing field, so these checks are the only place that says what is
//    missing. Edits are kept in this browser (localStorage, when it can), so a reload keeps them; the page works
//    without it. "Hand over changes" opens a sheet that lists only what changed, item by item, with Copy and Download
//    (.md); "Clear all edits" puts every field back. Nothing is ever sent or saved anywhere else.
(function () {
  var list = document.querySelector('.media-list');
  if (!list) return;
  var entries = Array.prototype.slice.call(list.querySelectorAll('.media-entry'));

  // ---- Filters ------------------------------------------------------------------------------------------------------
  var bar = document.querySelector('.media-filters');
  if (bar && entries.length) {
    var groups = { kind: [], served: [] }, chosen = { kind: '', served: '' }, chips = [];
    var tally = function (group, id, label) {
      var found = groups[group].filter(function (g) { return g.id === id; })[0];
      if (!found) groups[group].push(found = { id: id, label: label, count: 0 });
      found.count++;
    };
    entries.forEach(function (e) { tally('kind', e.dataset.kind, e.dataset.kind); tally('served', e.dataset.served, e.dataset.servedLabel); });
    var KINDS = ['see', 'listen', 'watch', 'read'];
    groups.kind.sort(function (a, b) { return KINDS.indexOf(a.id) - KINDS.indexOf(b.id); });
    groups.served.sort(function (a, b) { return b.count - a.count; });
    var chip = function (group, id, text) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'media-chip';
      b.textContent = text;
      b.addEventListener('click', function () {
        if (!group) { chosen.kind = chosen.served = ''; } else { chosen[group] = chosen[group] === id ? '' : id; }
        apply();
      });
      chips.push({ button: b, group: group, id: id });
      return b;
    };
    // a row of chips under its label
    var row = function (text, buttons) {
      var div = document.createElement('div');
      div.className = 'media-filters__group';
      div.setAttribute('role', 'group');
      var s = document.createElement('span');
      s.className = 'media-filters__by';
      s.id = 'media-filters-' + text.replace(/\W+/g, '-').toLowerCase();
      s.textContent = text;
      div.setAttribute('aria-labelledby', s.id);
      div.appendChild(s);
      buttons.forEach(function (b) { div.appendChild(b); });
      return div;
    };
    var shown = document.createElement('p');
    shown.className = 'media-filters__count';
    shown.setAttribute('role', 'status');
    bar.appendChild(row('Kind', [chip('', '', 'All ' + entries.length)].concat(groups.kind.map(function (g) { return chip('kind', g.id, g.label + ' ' + g.count); }))));
    bar.appendChild(row('Served from', groups.served.map(function (g) { return chip('served', g.id, g.label + ' ' + g.count); })));
    bar.appendChild(shown);
    var apply = function () {
      var n = 0;
      entries.forEach(function (e) {
        var hide = (chosen.kind && e.dataset.kind !== chosen.kind) || (chosen.served && e.dataset.served !== chosen.served);
        e.hidden = !!hide;
        if (!hide) n++;
      });
      chips.forEach(function (c) {
        var on = c.group ? chosen[c.group] === c.id : !chosen.kind && !chosen.served;
        c.button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      shown.textContent = n === entries.length ? 'All ' + n + ' items.' : n + ' of ' + entries.length + ' items.';
    };
    bar.hidden = false;
    apply();
  }

  // ---- The editing view ---------------------------------------------------------------------------------------------
  var edit = document.querySelector('.media-edit');
  if (!edit) return;
  var KEY = 'every-trick-media-edits';
  var NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var names = {};   // every name and former name of the book -> the source of its item
  try { names = JSON.parse(edit.querySelector('.media-names').textContent); } catch (e) { /* no check of names */ }
  // the statements and licences the build knows (RIGHTS in everytrick/register.mjs): an address is labelled as
  // register.mjs's rightsLabel does it, "In Copyright", "CC BY 4.0"
  var RIGHTS = { patterns: {}, statements: {}, notKnown: {} }, pattern = {};
  try { RIGHTS = JSON.parse(edit.querySelector('.media-rights').textContent); } catch (e) { /* no check of rights */ }
  Object.keys(RIGHTS.patterns).forEach(function (k) { pattern[k] = new RegExp(RIGHTS.patterns[k], 'i'); });
  var code = function (address) { var m = pattern.statement && pattern.statement.exec(address); return m ? m[1].toLowerCase() : ''; };
  var rightsLabel = function (address) {
    var a = address.trim(), m;
    if (pattern.statement && pattern.statement.test(a)) return RIGHTS.statements[code(a)] || '';
    if (pattern.licence && (m = pattern.licence.exec(a))) return 'CC ' + m[1].toUpperCase() + ' ' + m[2] + (m[3] ? ' ' + m[3].toUpperCase() : '');
    if (pattern.publicDomain && (m = pattern.publicDomain.exec(a))) return m[1].toLowerCase() === 'zero' ? 'CC0 1.0' : 'Public Domain Mark 1.0';
    return '';
  };
  var notKnown = function (address) { return RIGHTS.notKnown[code(address.trim())] || ''; };
  var stored = {};  // source -> { "caption@essays/x.md|1": "…", name: "…", … }: the fields that differ from the page
  try { stored = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { stored = {}; }
  var save = function () {
    try {
      if (Object.keys(stored).length) localStorage.setItem(KEY, JSON.stringify(stored)); else localStorage.removeItem(KEY);
    } catch (e) { /* edits stay in this page only */ }
  };
  var fields = function (entry) { return Array.prototype.slice.call(entry.querySelectorAll('[data-field]')); };
  var keyOf = function (f) { return f.dataset.field + (f.dataset.appearance ? '@' + f.dataset.appearance : ''); };
  var same = function (a, b) { return a.trim() === b.trim(); };
  var value = function (entry, name) { var f = entry.querySelector('[data-field="' + name + '"]'); return f ? f.value.trim() : ''; };
  var plain = function (s) { return s.toLowerCase().replace(/[^a-z0-9À-￿]+/g, ' ').trim(); };

  var mark = function (f) { f.closest('.media-field').classList.toggle('is-changed', !same(f.value, f.dataset.original)); };

  // The rights choice follows the address: the statement or licence it is, "another" for any other address, or "not
  // given yet" when it is empty. Choosing one writes its address (the change listener below).
  var syncChoice = function (entry) {
    var select = entry.querySelector('[data-rights-choice]'), input = entry.querySelector('[data-field="rights"]');
    if (!select || !input) return;
    var a = input.value.trim();
    var listed = a && Array.prototype.some.call(select.options, function (o) { return o.value === a && o.value !== 'other'; });
    select.value = !a ? '' : listed ? a : 'other';
    select.closest('.media-field').classList.toggle('is-changed', !same(input.value, input.dataset.original));
  };

  // the checks beside an item, from its fields as they are now
  var check = function (entry) {
    var out = [], kind = entry.dataset.kind, source = entry.dataset.source, name = value(entry, 'name');
    if (!NAME.test(name)) out.push('Name: lower-case letters, digits and hyphens only');
    else if ((names[name] && names[name] !== source) || entries.some(function (e) { return e !== entry && value(e, 'name') === name; })) out.push('Name already used by another item');
    if (kind === 'see') {
      var alts = entry.querySelectorAll('[data-field="alt"]'), missing = false, repeats = false;
      Array.prototype.forEach.call(alts, function (alt) {
        var caption = entry.querySelector('[data-field="caption"][data-appearance="' + alt.dataset.appearance + '"]');
        if (!alt.value.trim()) missing = true;
        else if (caption && plain(alt.value) === plain(caption.value)) repeats = true;
      });
      if (missing) out.push('No alt text');
      if (repeats) out.push('Alt text repeats the caption');
    }
    if (!value(entry, 'credit')) out.push('No credit');
    var rights = value(entry, 'rights');
    if (!rights) out.push('No rights');
    else if (notKnown(rights)) out.push('Rights: leave them empty until they are known');
    else if (!rightsLabel(rights)) out.push('Rights: not a rightsstatements.org or Creative Commons address');
    if (!value(entry, 'cite_as')) out.push('No source to cite');
    if (entry.dataset.used !== 'true') out.push('Used on no page');
    var ul = entry.querySelector('.media-checks');
    ul.textContent = '';
    (out.length ? out : ['Nothing missing']).forEach(function (text) {
      var li = document.createElement('li');
      li.className = out.length ? 'is-warning' : 'is-ok';
      li.textContent = text;
      ul.appendChild(li);
    });
  };

  // what changed, item by item: [{ entry, lines: [{ field, page, file, place, was, now }], comment }]
  var changes = function () {
    return entries.map(function (entry) {
      var lines = [], comment = '';
      fields(entry).forEach(function (f) {
        if (f.dataset.field === 'comment') { comment = f.value.trim(); return; }
        if (same(f.value, f.dataset.original)) return;
        lines.push({ field: f.dataset.field, appearance: f.dataset.appearance, page: f.dataset.page, file: f.dataset.file, place: (f.dataset.appearance || '').split('|')[1], was: f.dataset.original.trim(), now: f.value.trim() });
      });
      return { entry: entry, lines: lines, comment: comment };
    }).filter(function (c) { return c.lines.length || c.comment; });
  };
  var countLine = edit.querySelector('.media-handover__count');
  var counted = function () {
    var list = changes(), n = 0, c = 0;
    list.forEach(function (x) { n += x.lines.length; if (x.comment) c++; });
    countLine.textContent = !n && !c ? 'No changes yet.' : n + (n === 1 ? ' change' : ' changes') + ', ' + c + (c === 1 ? ' comment' : ' comments') + '.';
    return list;
  };

  var quote = function (s) { return s ? '“' + s + '”' : '(empty)'; };
  // a value as the sheet gives it: quoted, and a rights address with its label, “http://…/InC/1.0/” (In Copyright)
  var inSheet = function (field, s) { var label = field === 'rights' && s ? rightsLabel(s) : ''; return quote(s) + (label ? ' (' + label + ')' : ''); };
  // each field as the sheet names it, with its column in media/register.csv where the name alone does not say it
  var FIELDS = { name: 'name', credit: 'credit', rights: 'rights', rights_note: 'rights note (rights_note)', cite_as: 'source to cite (cite_as)', caption: 'caption', alt: 'alt text' };
  // A long description, and who wrote it, are one block of the page, directly after the picture: the sheet gives the
  // block as it is to be written, once for both fields (CONTRACT.md, "Long descriptions").
  var descriptionBlock = function (entry, appearance) {
    var field = function (name) { return entry.querySelector('[data-field="' + name + '"][data-appearance="' + appearance + '"]'); };
    var text = field('description').value.trim().replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n'), by = field('description_by').value.trim();
    return {
      had: !!field('description').dataset.original.trim(),
      lines: text ? ['::: {.description' + (by ? ' by="' + by.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' : '') + '}'].concat(text.split('\n'), [':::']) : null,
    };
  };
  var sheetText = function () {
    var list = changes();
    var when = new Date().toISOString().slice(0, 10);
    var out = ['# Items: changes to hand over', '', 'From ' + location.href.replace(/#.*$/, '') + ', ' + when + '. Only what changed is listed, item by item.'];
    if (!list.length) out.push('', 'No changes yet.');
    list.forEach(function (c) {
      var e = c.entry, label = e.dataset.label, name = e.querySelector('[data-field="name"]').dataset.original;
      out.push('', '## ' + (label ? 'Item ' + label + ', ' + name : 'New item, ' + name + ' (' + e.dataset.source + ')'), '');
      var described = {};
      c.lines.forEach(function (l) {
        var where = l.page ? ' on ' + l.page + (l.place && l.place !== '1' ? ' (place ' + l.place + ' on the page)' : '') + ' (' + l.file + ')' : '';
        if (l.field === 'description' || l.field === 'description_by') {
          if (described[l.appearance]) return;
          described[l.appearance] = true;
          var block = descriptionBlock(e, l.appearance);
          if (!block.lines) {
            out.push('- long description' + where + (block.had ? ': remove the ::: {.description} block after the picture' : ': a writer without a description, so nothing to write yet'));
            return;
          }
          out.push('- long description' + where + ', the block to write directly after the picture' + (block.had ? ', in place of the one there' : '') + ':', '');
          block.lines.forEach(function (line) { out.push(line ? '    ' + line : ''); });
          out.push('');
          return;
        }
        var note = l.field === 'name' ? ' (the old address, /' + e.dataset.kind + '/' + l.was + '/, keeps forwarding: add it to former_names)' : '';
        out.push('- ' + FIELDS[l.field] + where + ': ' + inSheet(l.field, l.was) + ' → ' + inSheet(l.field, l.now) + note);
      });
      if (c.comment) out.push('- comment: ' + c.comment.replace(/\s*\n\s*/g, ' '));
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  };

  // restore the stored edits, then keep them as the fields change
  entries.forEach(function (entry) {
    var saved = stored[entry.dataset.source] || {};
    fields(entry).forEach(function (f) { if (Object.prototype.hasOwnProperty.call(saved, keyOf(f))) f.value = saved[keyOf(f)]; mark(f); });
    syncChoice(entry);
  });
  entries.forEach(check);
  counted();
  list.addEventListener('input', function (event) {
    var f = event.target.closest && event.target.closest('[data-field]');
    if (!f) return;
    var entry = f.closest('.media-entry'), source = entry.dataset.source, key = keyOf(f);
    var mine = stored[source] || (stored[source] = {});
    if (same(f.value, f.dataset.original)) delete mine[key]; else mine[key] = f.value;
    if (!Object.keys(mine).length) delete stored[source];
    save();
    mark(f);
    if (f.dataset.field === 'rights') syncChoice(entry);
    if (f.dataset.field === 'name') entries.forEach(check); else check(entry);
    counted();
  });
  // choosing a statement or licence writes its address; "another" leaves the address to be typed
  list.addEventListener('change', function (event) {
    var select = event.target.closest && event.target.closest('[data-rights-choice]');
    if (!select) return;
    var input = select.closest('.media-entry').querySelector('[data-field="rights"]');
    if (select.value === 'other') { input.focus(); input.select(); return; }
    input.value = select.value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // hand over: the change sheet, with Copy and Download
  var sheet = edit.querySelector('.media-sheet'), text = sheet.querySelector('.media-sheet__text'), status = sheet.querySelector('.media-sheet__status');
  var say = function (message) { status.textContent = message; };
  var actions = {
    'hand-over': function () {
      text.textContent = sheetText();
      say('');
      if (typeof sheet.showModal === 'function') sheet.showModal(); else sheet.setAttribute('open', '');
    },
    close: function () { if (typeof sheet.close === 'function') sheet.close(); else sheet.removeAttribute('open'); },
    copy: function () {
      var done = function () { say('Copied.'); };
      var fallback = function () {
        var range = document.createRange();
        range.selectNodeContents(text);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        try { document.execCommand('copy'); done(); } catch (e) { say('Select the text and copy it.'); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text.textContent).then(done, fallback); else fallback();
    },
    download: function () {
      var blob = new Blob([text.textContent], { type: 'text/markdown;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'media-changes-' + new Date().toISOString().slice(0, 10) + '.md';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      say('Downloaded ' + a.download + '.');
    },
    clear: function () {
      if (!changes().length && !Object.keys(stored).length) return;
      if (!window.confirm('Clear all your edits in this view? Every field goes back to what the pages say.')) return;
      stored = {};
      save();
      entries.forEach(function (entry) { fields(entry).forEach(function (f) { f.value = f.dataset.original; mark(f); }); syncChoice(entry); });
      entries.forEach(check);
      counted();
      if (sheet.open) text.textContent = sheetText();
    },
  };
  edit.addEventListener('click', function (event) {
    var b = event.target.closest && event.target.closest('[data-action]');
    if (b && actions[b.dataset.action]) actions[b.dataset.action]();
  });
})();
