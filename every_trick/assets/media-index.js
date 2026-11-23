// The Media Index (/media-index/) and its editing view (/media-index/edit/, on previews only). The build writes the
// list as plain HTML (every_trick/media-pages.mjs), which is what readers get without JavaScript.
//  * Filters: chips by kind (see, listen, watch, read) and by where items are served from (our own site, GitHub,
//    archive.org …), made from the list itself, with how many items each has. One choice in each row; "All" clears
//    both. A line says how many items are shown.
//  * The editing view: fields for each item's name and credit, the caption (and for a picture the alt text) of each
//    place it appears in the latest text, and a comment. The checks beside each item follow the fields as they change:
//    no alt text, alt text that repeats the caption, no credit, used on no page, and a name that is not allowed or is
//    already taken. Edits are kept in this browser (localStorage, when it can), so a reload keeps them; the page works
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
        lines.push({ field: f.dataset.field, page: f.dataset.page, file: f.dataset.file, place: (f.dataset.appearance || '').split('|')[1], was: f.dataset.original.trim(), now: f.value.trim() });
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
  var FIELDS = { name: 'name', credit: 'credit', caption: 'caption', alt: 'alt text' };
  var sheetText = function () {
    var list = changes();
    var when = new Date().toISOString().slice(0, 10);
    var out = ['# Media Index: changes to hand over', '', 'From ' + location.href.replace(/#.*$/, '') + ', ' + when + '. Only what changed is listed, item by item.'];
    if (!list.length) out.push('', 'No changes yet.');
    list.forEach(function (c) {
      var e = c.entry, label = e.dataset.label, name = e.querySelector('[data-field="name"]').dataset.original;
      out.push('', '## ' + (label ? 'Item ' + label + ', ' + name : 'New item, ' + name + ' (' + e.dataset.source + ')'), '');
      c.lines.forEach(function (l) {
        var where = l.page ? ' on ' + l.page + (l.place && l.place !== '1' ? ' (place ' + l.place + ' on the page)' : '') + ' (' + l.file + ')' : '';
        var note = l.field === 'name' ? ' (the old address, /' + e.dataset.kind + '/' + l.was + '/, keeps forwarding: add it to former_names)' : '';
        out.push('- ' + FIELDS[l.field] + where + ': ' + quote(l.was) + ' → ' + quote(l.now) + note);
      });
      if (c.comment) out.push('- comment: ' + c.comment.replace(/\s*\n\s*/g, ' '));
    });
    return out.join('\n') + '\n';
  };

  // restore the stored edits, then keep them as the fields change
  entries.forEach(function (entry) {
    var saved = stored[entry.dataset.source] || {};
    fields(entry).forEach(function (f) { if (Object.prototype.hasOwnProperty.call(saved, keyOf(f))) f.value = saved[keyOf(f)]; mark(f); });
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
    if (f.dataset.field === 'name') entries.forEach(check); else check(entry);
    counted();
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
      entries.forEach(function (entry) { fields(entry).forEach(function (f) { f.value = f.dataset.original; mark(f); }); });
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
