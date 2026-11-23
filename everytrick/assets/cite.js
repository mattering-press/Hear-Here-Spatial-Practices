// Copying citations ("Plan: copying citations" in DEVELOPMENT.md). The build puts the page's citation data in
// <script type="application/json" class="cite-data"> (cite.mjs, build.mjs): how the text cites the page ("Nassar 2026")
// and its reference in the house style and the other styles of the References page's Copy menus, the same for the book,
// and on the latest text the newest release's, with the paragraphs whose text is the same there. Copying goes through
// copy.js, which loads first; every copy says in the status line what it copied, as the ¶ does (paragraphs.js, which
// this script leaves as it is).
//  * Quotes. Selecting words in numbered paragraphs shows a bar at the foot of the window with "Copy quote" and "Copy
//    citation". It never sits beside the selection, where the phone's own menu and Hypothesis's Annotate button appear.
//    Copy quote copies ‘the words’ (Nassar 2026: para. 55), then the reference, and in plain text the address of the
//    words on a line of its own; in formatted text the citation is itself a link to them. Copy citation copies the same
//    without the words. The address is the paragraph with a text fragment (#p55:~:text=…), which browsers highlight.
//  * Cite, under the page's title, opens a panel: the citation of the paragraph in the address or the one being read
//    (its number can be changed), the reference with the Copy menu of styles, and the link.
//  * On the latest text a passage whose paragraphs are unchanged in the newest release is cited there, with that
//    release's numbers and address; any other passage is cited as the latest text, unreleased, and the status line says
//    that its number may still change.
//  * Media items: everytrick.citeItem(item) copies the citation of a media item, against the book: (Puwar 2026: item
//    37), its title and credit, the book's reference and its short address. The zoom viewer's Cite button uses it, and
//    an item's page has a Copy button in its "To cite" row.
//  * Citation popups get a Copy menu, with the texts of the edition's References page (references/formatted.json).
//  * The date accessed is the day the reader copies: the build writes 31 December 9999 in its place (cite.mjs, ACCESSED),
//    in each style's form, and the How to cite section's date (.cite-today) is filled in here.
(function () {
  var everytrick = window.everytrick = window.everytrick || {};
  var copy = everytrick.copy;
  var holder = document.querySelector('script.cite-data');
  if (!holder || !copy) return;
  var data;
  try { data = JSON.parse(holder.textContent); } catch (e) { return; }

  // ---- The day ------------------------------------------------------------------------------------------------------
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SHORT = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  var now = new Date(), d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var TODAY = [
    ['31 December 9999', d + ' ' + MONTHS[m] + ' ' + y],
    ['December 31, 9999', MONTHS[m] + ' ' + d + ', ' + y],
    ['31 Dec. 9999', d + ' ' + SHORT[m] + ' ' + y],
    ['9999-12-31', y + '-' + pad(m + 1) + '-' + pad(d)],
    ['9999/12/31', y + '/' + pad(m + 1) + '/' + pad(d)],
  ];
  function today(text) {
    var out = String(text || '');
    TODAY.forEach(function (pair) { out = out.split(pair[0]).join(pair[1]); });
    return out;
  }
  [].forEach.call(document.querySelectorAll('.cite-today'), function (el) { el.textContent = TODAY[0][1]; });

  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var styles = data.styles || [];

  // ---- Which text a passage is cited in --------------------------------------------------------------------------------
  var paragraphs = [].slice.call(document.querySelectorAll('main .para[id]'));
  var numberOf = function (id) { return id.replace(/^p/, ''); };
  // ids: the paragraphs of the passage on this page, in order -> { entry, first, last, url, unreleased, release }
  function where(ids) {
    var release = data.release && typeof data.release === 'object' ? data.release : null;
    if (release && ids.length && ids.every(function (id) { return release.same && release.same[id]; })) {
      var mapped = ids.map(function (id) { return release.same[id]; });
      return { entry: release.page, first: mapped[0], last: mapped[mapped.length - 1], url: release.page.url, release: release };
    }
    return { entry: data.page, first: ids[0] || null, last: ids[ids.length - 1] || null, url: data.page.url, unreleased: data.version.status === 'latest' };
  }
  function inText(entry, first, last) {
    if (!first) return '(' + entry.cite + ')';
    var a = numberOf(first), b = numberOf(last || first);
    return '(' + entry.cite + ': ' + (a === b ? 'para. ' + a : 'paras ' + a + '–' + b) + ')';
  }
  // the words of a text fragment: percent-encoded, with the characters that mean something in it (, - &) encoded too
  function fragmentWords(s) { return encodeURIComponent(s).replace(/-/g, '%2D').replace(/,/g, '%2C').replace(/&/g, '%26'); }
  function fragment(words) {
    var all = words.split(/\s+/).filter(Boolean);
    if (!all.length) return '';
    if (all.length <= 8) return ':~:text=' + fragmentWords(all.join(' '));
    return ':~:text=' + fragmentWords(all.slice(0, 4).join(' ')) + ',' + fragmentWords(all.slice(-4).join(' '));
  }
  function address(place, quote) {
    return place.url + (place.first ? '#' + place.first + (quote ? fragment(quote) : '') : '');
  }
  function note(place) {
    if (place.release) return ' (in ' + place.release.label.charAt(0).toLowerCase() + place.release.label.slice(1) + ', where the passage is unchanged)';
    if (place.unreleased && place.first) return '. This passage is cited as the latest text, unreleased: its paragraph number may still change';
    return '';
  }

  // ---- What is copied ---------------------------------------------------------------------------------------------------
  // House style: single quotation marks, double ones for a quote inside a quote.
  function quoted(words) {
    var inner = words.replace(/(^|[\s(\[—–-])‘/g, '$1“').replace(/’(?=$|[\s.,;:!?)\]—–-])/g, function (m, at, all) {
      var before = all.slice(0, at), opens = (before.match(/“/g) || []).length, closes = (before.match(/”/g) || []).length;
      return opens > closes ? '”' : m;
    });
    return '‘' + inner + '’';
  }
  function parts(place, quote) {
    var link = address(place, quote), cite = inText(place.entry, place.first, place.last);
    var reference = today(place.entry.texts.house), referenceHtml = today(place.entry.html);
    var lead = quote ? quoted(quote) + ' ' : '';
    return {
      text: lead + cite + '\n\n' + reference + (place.first ? '\n' + link : ''),
      html: '<p>' + esc(lead) + '<a href="' + esc(link) + '">' + esc(cite) + '</a></p>\n<p>' + referenceHtml + '</p>',
      cite: cite, link: link,
    };
  }
  function done(what, place, cite) {
    return function () { copy.say(what + ' copied: ' + cite + note(place)); };
  }
  function failed() { copy.say('It could not be copied. Please try again.'); }

  // ---- The selection bar -----------------------------------------------------------------------------------------------
  var main = document.querySelector('main');
  var bar = null, current = null, hideTimer = 0, checkTimer = 0;
  // the words of a range, without paragraph numbers, ▸, margin notes, popups and buttons
  function wordsOf(range) {
    var box = document.createElement('div');
    box.appendChild(range.cloneContents());
    [].forEach.call(box.querySelectorAll('.para-link, .para-play, .margin, aside, button, .citation-popover, .citation-popovers, script, style, .visually-hidden'), function (el) { el.remove(); });
    [].forEach.call(box.querySelectorAll('p, li, div, h1, h2, h3, h4, blockquote, br'), function (el) { el.append(' '); });
    return box.textContent.replace(/\s+/g, ' ').trim();
  }
  function selected() {
    var sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !main) return null;
    var range = sel.getRangeAt(0);
    if (!main.contains(range.commonAncestorContainer)) return null;
    var ids = paragraphs.filter(function (p) { return range.intersectsNode(p); }).map(function (p) { return p.id; });
    if (!ids.length) return null;
    // only what lies in the numbered paragraphs
    var first = document.getElementById(ids[0]), last = document.getElementById(ids[ids.length - 1]);
    var inside = range.cloneRange();
    if (!first.contains(range.startContainer)) inside.setStart(first, 0);
    if (!last.contains(range.endContainer)) inside.setEnd(last, last.childNodes.length);
    // whole words: a selection that starts or ends inside a word takes all of it, which the quote's address needs too
    var letter = /[\p{L}\p{N}’'-]/u;
    if (inside.startContainer.nodeType === 3) {
      var t = inside.startContainer.data, i = inside.startOffset;
      while (i > 0 && letter.test(t[i - 1]) && letter.test(t[i] || '')) i--;
      inside.setStart(inside.startContainer, i);
    }
    if (inside.endContainer.nodeType === 3) {
      var u = inside.endContainer.data, j = inside.endOffset;
      while (j < u.length && letter.test(u[j]) && j > 0 && letter.test(u[j - 1])) j++;
      inside.setEnd(inside.endContainer, j);
    }
    var words = wordsOf(inside);
    if (!words) return null;
    return { ids: ids, words: words };
  }
  function makeBar() {
    bar = document.createElement('div');
    bar.className = 'cite-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Copy the selected words');
    bar.hidden = true;
    var q = document.createElement('button');
    q.type = 'button';
    q.className = 'cite-bar__button';
    q.textContent = 'Copy quote';
    var c = q.cloneNode();
    c.textContent = 'Copy citation';
    bar.append(q, c);
    // the selection stays while a button is pressed
    bar.addEventListener('pointerdown', function (event) { event.preventDefault(); });
    q.addEventListener('click', function () { copySelection(true); });
    c.addEventListener('click', function () { copySelection(false); });
    document.body.appendChild(bar);
  }
  function copySelection(withQuote) {
    var s = current;
    if (!s) return;
    var place = where(s.ids), p = parts(place, withQuote ? s.words : '');
    copy.write(p).then(done(withQuote ? 'Quote with its citation' : 'Citation', place, p.cite), failed);
  }
  function show(yes) {
    if (!bar) makeBar();
    clearTimeout(hideTimer);
    if (yes) {
      bar.hidden = false;
      document.documentElement.classList.add('has-cite-bar');
    } else {
      // a moment later: a tap on the bar can clear the selection on a phone before its click arrives
      hideTimer = setTimeout(function () { bar.hidden = true; current = null; document.documentElement.classList.remove('has-cite-bar'); }, 400);
    }
  }
  if (paragraphs.length) {
    document.addEventListener('selectionchange', function () {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(function () {
        var s = selected();
        if (s) { current = s; show(true); } else show(false);
      }, 120);
    });
  }

  // ---- The Cite panel --------------------------------------------------------------------------------------------------
  var citeButton = document.querySelector('.cite-button');
  var panel = null, field = null, rows = {}, chosen = null, place = null;
  // the paragraph being read: the one in the address, or the first whose end is below the top of the window
  function reading() {
    var hash = decodeURIComponent(location.hash.slice(1));
    if (/^p\d+$/.test(hash) && document.getElementById(hash)) return hash;
    for (var i = 0; i < paragraphs.length; i++) if (paragraphs[i].getBoundingClientRect().bottom > 64) return paragraphs[i].id;
    return paragraphs.length ? paragraphs[0].id : null;
  }
  function row(label, cls) {
    var r = document.createElement('div');
    r.className = 'cite-panel__row ' + cls;
    var term = document.createElement('p');
    term.className = 'cite-panel__label';
    term.textContent = label;
    var value = document.createElement('p');
    value.className = 'cite-panel__value';
    var actions = document.createElement('p');
    actions.className = 'cite-panel__actions';
    r.append(term, value, actions);
    return { el: r, value: value, actions: actions };
  }
  function plainButton(label, name) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'copy-button';
    b.append(label);
    var hidden = document.createElement('span');
    hidden.className = 'visually-hidden';
    hidden.textContent = ' ' + name;
    b.append(hidden);
    return b;
  }
  function update() {
    var n = field && field.value.trim();
    chosen = n && document.getElementById('p' + n) ? 'p' + n : null;
    if (field) field.setAttribute('aria-invalid', n && !chosen ? 'true' : 'false');
    place = where(chosen ? [chosen] : []);
    var p = parts(place, '');
    rows.intext.value.textContent = p.cite;
    rows.reference.value.innerHTML = today(place.entry.html);
    rows.link.value.textContent = address(place, '');
    var about = panel.querySelector('.cite-panel__about');
    about.textContent = place.release
      ? 'Paragraph ' + numberOf(chosen) + ' is unchanged in ' + place.release.label.charAt(0).toLowerCase() + place.release.label.slice(1) + ', so it is cited there' + (place.first !== chosen ? ', as paragraph ' + numberOf(place.first) : '') + '.'
      : place.unreleased && chosen ? 'Paragraph ' + numberOf(chosen) + ' is cited as the latest text, unreleased: its number may still change.'
        : data.version.status === 'latest' ? '' : 'You are citing ' + data.version.label.charAt(0).toLowerCase() + data.version.label.slice(1) + '.';
    about.hidden = !about.textContent;
  }
  function makePanel() {
    panel = document.createElement('div');
    panel.className = 'cite-panel';
    panel.id = 'cite-panel';
    panel.setAttribute('popover', 'manual');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'cite-panel-title');
    var head = document.createElement('div');
    head.className = 'cite-panel__head';
    var title = document.createElement('h2');
    title.id = 'cite-panel-title';
    title.className = 'cite-panel__title';
    title.textContent = data.home ? 'Cite the book' : 'Cite this page';
    title.tabIndex = -1;
    var closer = document.createElement('button');
    closer.type = 'button';
    closer.className = 'cite-panel__close';
    closer.setAttribute('aria-label', 'Close');
    closer.innerHTML = '<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"><path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    closer.addEventListener('click', function () { closePanel(true); });
    head.append(title, closer);
    panel.appendChild(head);
    if (paragraphs.length) {
      var choose = document.createElement('p');
      choose.className = 'cite-panel__para';
      var label = document.createElement('label');
      label.htmlFor = 'cite-panel-para';
      label.textContent = 'Paragraph';
      field = document.createElement('input');
      field.id = 'cite-panel-para';
      field.type = 'number';
      field.inputMode = 'numeric';
      field.min = '1';
      field.max = numberOf(paragraphs[paragraphs.length - 1].id);
      field.addEventListener('input', update);
      var hint = document.createElement('span');
      hint.className = 'cite-panel__hint';
      hint.textContent = 'its number is in the margin; leave it empty to cite the whole page';
      choose.append(label, field, hint);
      panel.appendChild(choose);
    }
    var about = document.createElement('p');
    about.className = 'cite-panel__about';
    panel.appendChild(about);
    rows.intext = row('In the text', 'is-intext');
    rows.reference = row('Reference', 'is-reference');
    rows.link = row('Link', 'is-link');
    var b1 = plainButton('Copy', 'the citation in the text');
    b1.addEventListener('click', function () { var p = parts(place, ''); copy.write(p.cite).then(function () { copy.say('Copied: ' + p.cite + note(place)); }, failed); });
    rows.intext.actions.appendChild(b1);
    var b2 = copy.menu.ok ? copy.menu.button('Copy', 'the reference', 'copy-button') : plainButton('Copy', 'the reference');
    var menuOptions = {
      styles: styles,
      pick: function (style) {
        var text = today(place.entry.texts[style.id] || '');
        return style.id === 'house' ? { text: text, html: today(place.entry.html) } : text;
      },
      done: function (style, ok) { if (ok) copy.say('Copied: the reference in ' + (style.id === 'house' ? style.label : style.short) + note(place)); else failed(); },
    };
    if (copy.menu.ok) {
      b2.addEventListener('click', function () { copy.menu.toggle(b2, menuOptions); });
      b2.addEventListener('keydown', function (event) { copy.menu.keys(event, b2, menuOptions); });
    } else {
      b2.addEventListener('click', function () { copy.write(menuOptions.pick(styles[0])).then(function () { menuOptions.done(styles[0], true); }, failed); });
    }
    rows.reference.actions.appendChild(b2);
    var b3 = plainButton('Copy', 'the link');
    b3.addEventListener('click', function () { var link = address(place, ''); copy.write(link).then(function () { copy.say('Link copied: ' + link); }, failed); });
    rows.link.actions.appendChild(b3);
    panel.append(rows.intext.el, rows.reference.el, rows.link.el);
    var all = document.createElement('p');
    all.className = 'cite-panel__all';
    var b4 = document.createElement('button');
    b4.type = 'button';
    b4.className = 'copy-button is-strong';
    b4.textContent = 'Copy citation and reference';
    b4.addEventListener('click', function () { var p = parts(place, ''); copy.write(p).then(done('Citation', place, p.cite), failed); });
    all.appendChild(b4);
    panel.appendChild(all);
    document.body.appendChild(panel);
    panel.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !copy.menu.isOpen()) { event.preventDefault(); closePanel(true); }
    });
    document.addEventListener('pointerdown', function (event) {
      if (!panel.matches(':popover-open')) return;
      var menuEl = copy.menu.element && copy.menu.element();
      if (panel.contains(event.target) || citeButton.contains(event.target) || (menuEl && menuEl.contains(event.target))) return;
      closePanel(false);
    });
    window.addEventListener('resize', placePanel);
  }
  function placePanel() {
    if (!panel || !panel.matches(':popover-open')) return;
    var box = citeButton.getBoundingClientRect(), width = document.documentElement.clientWidth;
    var w = panel.offsetWidth;
    panel.style.top = Math.max(8, Math.min(box.bottom + 6, window.innerHeight - panel.offsetHeight - 8)) + 'px';
    panel.style.left = Math.max(8, Math.min(box.left, width - 8 - w)) + 'px';
  }
  function openPanel() {
    if (!panel) makePanel();
    if (field) field.value = (reading() || '').replace(/^p/, '');
    update();
    panel.showPopover();
    citeButton.setAttribute('aria-expanded', 'true');
    placePanel();
    // the focus goes to the panel's title, not to the number, which would open a phone's keyboard
    panel.querySelector('.cite-panel__title').focus();
  }
  function closePanel(refocus) {
    if (!panel || !panel.matches(':popover-open')) return;
    copy.menu.close(false);
    panel.hidePopover();
    citeButton.setAttribute('aria-expanded', 'false');
    if (refocus) citeButton.focus();
  }
  if (citeButton && HTMLElement.prototype.showPopover) {
    citeButton.hidden = false;
    citeButton.setAttribute('aria-expanded', 'false');
    citeButton.setAttribute('aria-controls', 'cite-panel');
    citeButton.addEventListener('click', function () { if (panel && panel.matches(':popover-open')) closePanel(true); else openPanel(); });
  }

  // ---- Media items -----------------------------------------------------------------------------------------------------
  // item: { number (its label, '37'), title, credit, citeAs, short (its short address; made from the site's address
  // when it is not given), url (its page) }; the book is
  // the newest release's where the item is in it, otherwise this edition's.
  function itemParts(item) {
    var book = (item.number && data.releaseBook) || data.book;
    var cite = '(' + book.cite + (item.number ? ': item ' + item.number : '') + ')';
    var link = item.number ? item.short || (data.site ? data.site + item.number + '/' : item.url) : item.url;
    var line = (item.number ? 'Item ' + item.number : 'A new item, not yet numbered') + (item.title ? ', ' + item.title : '') + (item.credit ? ' (' + item.credit + ')' : '');
    var source = item.citeAs ? 'Source: ' + item.citeAs : '';
    return {
      text: cite + '\n\n' + line + '\n' + today(book.texts.house) + '\n' + link + (source ? '\n' + source : ''),
      html: '<p><a href="' + esc(link) + '">' + esc(cite) + '</a></p>\n<p>' + esc(line) + '</p>\n<p>' + today(book.html) + '</p>' + (source ? '\n<p>' + esc(source) + '</p>' : ''),
      cite: cite,
    };
  }
  everytrick.citeItem = function (item) {
    var p = itemParts(item);
    return copy.write(p).then(function () {
      var message = 'Citation copied: ' + p.cite;
      copy.say(message);
      return message;
    }, function (e) { failed(); throw e; });
  };
  // an item's page: its "To cite" row gets a Copy button
  var itemCite = document.querySelector('.item-cite');
  if (itemCite && data.item) {
    var b = plainButton('Copy citation', '');
    b.classList.add('is-strong');
    b.addEventListener('click', function () { everytrick.citeItem(data.item); });
    var p = document.createElement('p');
    p.className = 'item-cite__copy';
    p.appendChild(b);
    itemCite.appendChild(p);
  }

  // ---- Citation popups -------------------------------------------------------------------------------------------------
  if (data.formatted && copy.menu.ok) {
    var source = new URL(data.formatted, location.href).href, works = null;
    var textOf = function (key, id) { return works && works[key] ? works[key][id] : null; };
    var load = function () { return fetch(source).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) { works = j.works || {}; return works; }); };
    var loading = null;
    var ensure = function () { if (!loading) { loading = load(); loading.catch(function () { loading = null; }); } return loading; };
    [].forEach.call(document.querySelectorAll('.citation-popover[id^="ref-popover-"]'), function (popover) {
      var key = popover.id.slice('ref-popover-'.length);
      var b = copy.menu.button('Copy', 'the reference', 'copy-button');
      var options = {
        styles: styles,
        pick: function (style) {
          var text = textOf(key, style.id);
          return text || ensure().then(function () { var t = textOf(key, style.id); if (!t) throw new Error('no ' + style.id); return t; });
        },
        done: function (style, ok) { if (ok) copy.say('Copied: ' + style.short); else failed(); },
      };
      b.addEventListener('click', function () { ensure(); copy.menu.toggle(b, options); });
      b.addEventListener('keydown', function (event) { copy.menu.keys(event, b, options); });
      b.addEventListener('pointerover', ensure);
      var line = popover.querySelector('.citation-popover__more');
      if (line) line.prepend(b, ' '); else popover.appendChild(b);
    });
  }
})();
