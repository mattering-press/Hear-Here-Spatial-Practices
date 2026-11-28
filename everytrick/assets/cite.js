// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// Copying citations ("Plan: copying citations" in DEVELOPMENT.md). The build puts the page's citation data in
// <script type="application/json" class="cite-data"> (cite.mjs, build.mjs): the page's reference in every citation
// style a reader can choose, with each style's in-text citation, the book's, the media items' on the page, and on the
// latest text the newest release's page, with the paragraphs whose text is the same there. Every copy follows the
// reader's settings ("Aa"; settings.js): the citation style, and formatted or plain text (copy.js). Every copy is one
// block, and the status line says what was copied, as the ¶ does (paragraphs.js, which this script leaves as it is).
//  * Copy quote. Selecting words in numbered paragraphs shows a button at the foot of the window, never beside the
//    selection, where the phone's own menu and Hypothesis's Annotate button appear. It copies ‘the words’ (Nassar 2026:
//    para. 55). Nassar, A., …, <…/essays/aya_nassar/#p55> [accessed …]. In formatted text the in-text citation is a
//    link to the words themselves (#p55:~:text=…), which browsers highlight.
//  * Copy citation, in the page's note at the top of its margin (build.mjs, pageNote), copies the page's reference
//    (the chapter's) in one click. On the latest text it cites the newest release that has the page.
//  * On the latest text a quote whose paragraphs are unchanged in the newest release is cited there, with that
//    release's numbers and address; any other is cited as the latest text, unreleased, and the status line says that
//    its number may still change.
//  * Media items: everytrick.citeItem(address of its page) copies the citation of a media item, against the book:
//    Item 37, ‘…’, in N. Puwar, Hear Here: Spatial Practices, … <…/37/>. The zoom viewer's Cite button uses it; an
//    item's page shows it under "To cite", with a Copy button.
//  * Citation popups get a Copy button, with the texts of the edition's References page (references/formatted.json).
//  * How to cite this page (in print only), How to cite this book's reference of the book (with its Copy citation) and
//    an item's "To cite" show the reader's style. How to cite this book has a button that opens the settings at the
//    citation style; its BibTeX and RIS are files the build writes.
//  * Every Copy button of a citation reads "Copy citation" (the publisher, 2026-11-24).
//  * The date accessed is the day the reader copies: the build writes 31 December 9999 in its place (cite.mjs, ACCESSED),
//    in each style's form; the How to cite section's date (.cite-today) is filled in here.
(function () {
  var everytrick = window.everytrick = window.everytrick || {};
  var copy = everytrick.copy;
  var holder = document.querySelector('script.cite-data');
  if (!holder || !copy) return;
  var data;
  try { data = JSON.parse(holder.textContent); } catch (e) { return; }
  var ONE = '999999', FIRST = '999998';
  var styles = data.styles || [];

  // ---- The reader's style, and the day -----------------------------------------------------------------------------
  function style() {
    var id = copy.settings().style;
    return styles.filter(function (s) { return s.id === id; })[0] || styles[0];
  }
  function styleName(s) { return s.id === 'house' ? 'Mattering Press’ house style' : s.short; }
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
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var lc = function (s) { return s.charAt(0).toLowerCase() + s.slice(1); };

  // an entry's reference in style s, its address replaced by url (a passage's): { text, html }
  function reference(entry, s, url) {
    var r = entry.styles[s.id] || entry.styles.house;
    var swap = function (t) { return url ? String(t).split(entry.url).join(url) : t; };
    return { text: swap(today(r.text)), html: swap(today(r.html)) };
  }
  function done(what, s, extra) { return function () { copy.say(what + ' copied, in ' + styleName(s) + (extra || '')); }; }
  function failed() { copy.say('It could not be copied. Please try again.'); }

  // ---- Which text a passage is cited in --------------------------------------------------------------------------------
  var paragraphs = [].slice.call(document.querySelectorAll('main .para[id]'));
  var numberOf = function (id) { return id.replace(/^p/, ''); };
  var release = data.release && typeof data.release === 'object' ? data.release : null;
  // ids: the paragraphs of the passage on this page, in order -> { entry, first, last, release, unreleased }
  function where(ids) {
    if (release && ids.length && ids.every(function (id) { return release.same && release.same[id]; })) {
      var mapped = ids.map(function (id) { return release.same[id]; });
      return { entry: release.page, first: mapped[0], last: mapped[mapped.length - 1], release: release };
    }
    return { entry: data.page, first: ids[0], last: ids[ids.length - 1], unreleased: data.version.status === 'latest' };
  }
  function inText(entry, s, first, last) {
    var r = entry.styles[s.id] || entry.styles.house;
    var a = numberOf(first), b = numberOf(last);
    return a === b ? r.one.replace(ONE, a) : r.range.replace(FIRST, a).replace(ONE, b);
  }
  // the words of a text fragment: percent-encoded, with the characters that mean something in it (, - &) encoded too
  function fragmentWords(s) { return encodeURIComponent(s).replace(/-/g, '%2D').replace(/,/g, '%2C').replace(/&/g, '%26'); }
  function fragment(words) {
    var all = words.split(/\s+/).filter(Boolean);
    if (all.length <= 8) return ':~:text=' + fragmentWords(all.join(' '));
    return ':~:text=' + fragmentWords(all.slice(0, 4).join(' ')) + ',' + fragmentWords(all.slice(-4).join(' '));
  }
  // The quotation marks of the style's language: British single ones, with double ones inside; American double ones.
  function quoted(words, s) {
    var british = (s.locale || 'en-GB') === 'en-GB';
    var inner = words;
    if (british) {
      inner = inner.replace(/(^|[\s(\[—–-])‘/g, '$1“').replace(/’(?=$|[\s.,;:!?)\]—–-])/g, function (m, at, all) {
        var before = all.slice(0, at);
        return (before.match(/“/g) || []).length > (before.match(/”/g) || []).length ? '”' : m;
      });
      return '‘' + inner + '’';
    }
    inner = inner.replace(/“/g, '‘').replace(/”/g, '’');
    return '“' + inner + '”';
  }
  function quoteParts(ids, words) {
    var place = where(ids), s = style();
    var passage = place.entry.url + '#' + place.first;
    var cite = inText(place.entry, s, place.first, place.last), ref = reference(place.entry, s, passage);
    var lead = quoted(words, s) + ' ';
    return {
      place: place, s: s,
      text: lead + cite + '. ' + ref.text,
      html: '<p>' + esc(lead) + '<a href="' + esc(passage + fragment(words)) + '">' + esc(cite) + '</a>. ' + ref.html + '</p>',
    };
  }
  function note(place) {
    if (place.release) return ', from ' + lc(place.release.label) + ', where the passage is unchanged';
    if (place.unreleased) return '. The passage is cited as the working copy, unreleased: its paragraph number may still change';
    return '';
  }

  // ---- Copy quote: a button at the foot of the window --------------------------------------------------------------
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
    return words ? { ids: ids, words: words } : null;
  }
  function makeBar() {
    bar = document.createElement('div');
    bar.className = 'cite-bar';
    bar.hidden = true;
    var q = document.createElement('button');
    q.type = 'button';
    q.className = 'cite-bar__button';
    q.textContent = 'Copy quote';
    bar.appendChild(q);
    // the selection stays while the button is pressed
    bar.addEventListener('pointerdown', function (event) { event.preventDefault(); });
    q.addEventListener('click', function () {
      if (!current) return;
      var p = quoteParts(current.ids, current.words);
      copy.write(p).then(done('Quote with its citation', p.s, note(p.place)), failed);
    });
    document.body.appendChild(bar);
  }
  function showBar(yes) {
    if (!bar) makeBar();
    clearTimeout(hideTimer);
    if (yes) {
      bar.hidden = false;
      document.documentElement.classList.add('has-cite-bar');
    } else {
      // a moment later: a tap on the button can clear the selection on a phone before its click arrives
      hideTimer = setTimeout(function () { bar.hidden = true; current = null; document.documentElement.classList.remove('has-cite-bar'); }, 400);
    }
  }
  if (paragraphs.length) {
    document.addEventListener('selectionchange', function () {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(function () {
        var s = selected();
        if (s) { current = s; showBar(true); } else showBar(false);
      }, 120);
    });
  }

  // ---- Copy citation, in the page's note: the page as a whole ------------------------------------------------------
  // One click copies, as the ¶ does; the style is in the settings, BibTeX and RIS on How to cite this book.
  // the chapter: on the latest text, the newest release's page where there is one
  var chapter = release ? release.page : data.page;
  function element(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
  }
  function textButton(label, name, cls) {
    var b = element('button', cls || 'copy-button');
    b.type = 'button';
    if (label) b.append(label);
    if (name) b.append(element('span', 'visually-hidden', (label ? ' ' : '') + name));
    return b;
  }
  var noteCopy = document.querySelector('.page-note__copy');
  if (noteCopy && chapter) {
    noteCopy.hidden = false;
    var dot = document.querySelector('.page-note__dot');
    if (dot) dot.hidden = false;
    noteCopy.addEventListener('click', function () {
      var s = style();
      copy.write(reference(chapter, s)).then(done('Citation', s), failed);
    });
  }

  // ---- How to cite this page, in the reader's style ----------------------------------------------------------------
  function showHowToCite() {
    var section = document.querySelector('.how-to-cite');
    if (!section || !data.page) return;
    var s = style(), r = data.page.styles[s.id] || data.page.styles.house;
    [].forEach.call(section.querySelectorAll('.how-to-cite__example'), function (el) {
      el.innerHTML = el.parentNode.getAttribute('data-for') === 'paragraphs' ? esc(r.one).replace(ONE, '<var>n</var>') : esc(r.cite);
    });
    var ref = section.querySelector('.how-to-cite__reference');
    if (ref) ref.innerHTML = reference(data.page, s).html;
    var name = section.querySelector('.how-to-cite__style-name');
    if (name) name.textContent = styleName(s);
  }
  // How to cite, on the About page (about/#how-to-cite) and wherever its section is shown in the peek window (peek.js):
  // the book's reference in the reader's style, its Copy citation, and a button that opens the settings at the
  // citation style. The About page's data has how the book is cited (cited); the peek window hands over that page's.
  var books = [];
  var settings = document.getElementById('settings');
  // The settings, opened from a button. In a modal window everything outside it is out of reach, so the panel moves
  // into the window for as long as it is open there, and stands under the button.
  function openSettings(from) {
    var modal = from.closest('dialog');
    if (modal && settings.parentNode !== modal) {
      var home = { parent: settings.parentNode, next: settings.nextSibling };
      modal.appendChild(settings);
      var back = function (event) {
        if (event.newState !== 'closed') return;
        settings.removeEventListener('toggle', back);
        settings.style.left = '';
        home.parent.insertBefore(settings, home.next);
      };
      settings.addEventListener('toggle', back);
    }
    settings.showPopover();
    if (modal) {
      var box = from.getBoundingClientRect(), w = document.documentElement.clientWidth, h = window.innerHeight;
      settings.style.right = 'auto';
      settings.style.left = Math.max(8, Math.min(box.left, w - settings.offsetWidth - 8)) + 'px';
      settings.style.top = Math.max(8, Math.min(box.bottom + 8, h - settings.offsetHeight - 8)) + 'px';
    }
    var first = settings.querySelector('.settings__citations button');
    if (first) first.focus();
  }
  function wireBook(root, cited) {
    [].forEach.call(root.querySelectorAll('.cite-today'), function (el) { el.textContent = TODAY[0][1]; });
    var box = root.querySelector('.cite-book');
    if (box && cited) {
      books.push({ box: box, cited: cited });
      var button = box.querySelector('.cite-book__copy button');
      if (button) {
        button.hidden = false;
        button.addEventListener('click', function () {
          var s = style();
          copy.write(reference(cited, s)).then(done('Citation of the book', s), failed);
        });
      }
    }
    var styleLine = root.querySelector('.cite-downloads__style');
    if (styleLine && settings && settings.showPopover) {
      styleLine.hidden = false;
      styleLine.querySelector('button').addEventListener('click', function () { openSettings(this); });
    }
  }
  function showBook() {
    books = books.filter(function (b) { return b.box.isConnected; });
    books.forEach(function (b) {
      var ref = b.box.querySelector('.cite-book__reference');
      if (ref) ref.innerHTML = reference(b.cited, style()).html;
    });
  }
  wireBook(document, data.cited);
  document.addEventListener('everytrick:peek', function (event) {
    wireBook(event.detail.root, event.detail.data && event.detail.data.cited);
    wireItem(event.detail.root, event.detail.data && event.detail.data.item);
    showBook();
    showItem();
  });

  // ---- Media items -----------------------------------------------------------------------------------------------------
  // an item's citation: its reference, and the item's own source where the register gives it; { text, html, cite }
  function itemParts(item, s) {
    var r = reference(item, s), source = item.citeAs ? ' Source: ' + item.citeAs + (/[.!?]$/.test(item.citeAs) ? '' : '.') : '';
    return { text: r.text + source, html: r.html + esc(source), cite: item.intext[s.id] || item.intext.house };
  }
  // its page's address (see/boulder-font/, or any address that ends with it) -> its data
  function itemAt(address) {
    if (data.item) return data.item;
    var path = new URL(address, document.baseURI).pathname.split('/').filter(Boolean).slice(-2).join('/') + '/';
    return data.items && data.items[path];
  }
  everytrick.citeItem = function (address) {
    var item = itemAt(address);
    if (!item) return Promise.reject(new Error('no citation for ' + address));
    var s = style(), p = itemParts(item, s);
    return copy.write(p).then(function () {
      var message = 'Citation copied, in ' + styleName(s) + '. In the text: ' + p.cite;
      copy.say(message);
      return message;
    }, function (e) { failed(); throw e; });
  };
  // an item's page, and an item's facts in the peek window (peek.js, which hands over the item page's data): its
  // "To cite", in the reader's style, with a Copy citation button
  var itemCites = [];
  function wireItem(root, item) {
    var box = root.querySelector('.item-cite');
    if (!box || !item) return;
    itemCites.push({ box: box, item: item });
    var b = textButton('Copy citation', '', 'copy-button is-strong');
    b.addEventListener('click', function () {
      var s = style(), p = itemParts(item, s);
      copy.write(p).then(function () { copy.say('Citation copied, in ' + styleName(s) + '. In the text: ' + p.cite); }, failed);
    });
    var line = element('p', 'item-cite__copy');
    line.appendChild(b);
    box.appendChild(line);
  }
  function showItem() {
    itemCites = itemCites.filter(function (c) { return c.box.isConnected; });
    itemCites.forEach(function (c) {
      var s = style(), p = itemParts(c.item, s);
      c.box.querySelector('.item-cite__reference').innerHTML = p.html;
      var example = c.box.querySelector('.item-cite__example');
      if (example) example.textContent = p.cite;
    });
  }
  wireItem(document, data.item);

  // ---- Citation popups -------------------------------------------------------------------------------------------------
  if (data.formatted) {
    var source = new URL(data.formatted, location.href).href, works = null, loading = null;
    var load = function () {
      if (!loading) {
        loading = fetch(source).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) { works = j.works || {}; return works; });
        loading.catch(function () { loading = null; });
      }
      return loading;
    };
    var partsFor = function (key, s) {
      var w = works && works[key];
      return w && w[s.id] ? { text: w[s.id], html: w.html && w.html[s.id] } : null;
    };
    [].forEach.call(document.querySelectorAll('.citation-popover[id^="ref-popover-"]'), function (popover) {
      var key = popover.id.slice('ref-popover-'.length);
      var button = textButton('Copy citation', '');
      button.addEventListener('pointerover', load);
      button.addEventListener('click', function () {
        var s = style(), p = partsFor(key, s);
        var job = p ? copy.write(p) : copy.later(load().then(function () { var q = partsFor(key, s); if (!q) throw new Error('no ' + s.id); return q; }));
        job.then(function () { copy.say('Copied, in ' + styleName(s)); }, failed);
      });
      var more = popover.querySelector('.citation-popover__more');
      if (more) more.prepend(button, ' '); else popover.appendChild(button);
    });
  }

  // the reader's style, now and whenever it changes
  function showStyle() { showHowToCite(); showBook(); showItem(); }
  showStyle();
  window.addEventListener('everytrick:citation', showStyle);
})();
