// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// The peek window ("Plan: the peek window" in DEVELOPMENT.md): a link marked data-peek, to a section of another page
// of the book (about/#how-to-cite), shows that section in a window over the page being read, so that the reader
// checks something without losing their place. Nothing is written twice: the window fetches the page the link leads
// to and shows the section as it is there.
//  * The section is the element the link's #id names. If that is a heading, it is the heading and everything after
//    it, up to the next heading of the same level or a higher one; otherwise the element alone.
//  * The window is a <dialog>, opened as a modal: Esc, the × and a click beside the window close it, and so does the
//    browser's Back (the window adds a step to the history, which matters most on a phone, where it fills the screen).
//  * Its head names the page the section is from, as a link to the section on that page.
//  * The link stays a link: without JavaScript, with a modifier key or the middle button, when the page cannot be
//    fetched or has no such section, and on the page the section is on, it leads where it says.
//  * Addresses in the section are resolved against its own page. Ids are left out, so that none is on the page twice.
//  * Scripts that fill in parts of a section hear of it: the event "everytrick:peek" on document, with
//    detail.root (the section in the window), detail.url (its page) and detail.data (that page's citation data).
//    cite.js fills in the book's reference, its Copy citation and the settings button of How to cite.
//  * While the window is open the status line (.copy-status, copy.js) is inside it, since a modal covers the page
//    and hides it from screen readers.
(function () {
  var links = document.querySelectorAll('a[data-peek]');
  if (!links.length || typeof HTMLDialogElement !== 'function' || !window.fetch || !window.DOMParser) return;
  var root = document.documentElement;
  var dialog = null, head = null, body = null, stepped = false;
  var pages = {};
  var status = document.querySelector('.copy-status'), statusHome = null;

  var pageOf = function (url) { return url.origin + url.pathname + url.search; };

  // the page a link leads to, fetched once -> a promise of its document
  function load(url) {
    var key = pageOf(url);
    if (!pages[key]) {
      pages[key] = fetch(key).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
      pages[key].catch(function () { delete pages[key]; });
    }
    return pages[key];
  }

  // the section #id of a fetched page: its elements, in order, or null
  function sectionOf(doc, id) {
    var main = doc.querySelector('main'), target = id && doc.getElementById(id);
    if (!main || !target || !main.contains(target)) return null;
    var level = /^H[1-6]$/.test(target.tagName) ? Number(target.tagName.charAt(1)) : 0;
    var nodes = [target];
    if (level) {
      for (var n = target.nextElementSibling; n; n = n.nextElementSibling) {
        var m = /^H([1-6])$/.exec(n.tagName);
        if (m && Number(m[1]) <= level) break;
        nodes.push(n);
      }
    }
    return nodes;
  }

  function dataOf(doc) {
    var holder = doc.querySelector('script.cite-data');
    try { return holder ? JSON.parse(holder.textContent) : null; } catch (e) { return null; }
  }

  function make() {
    dialog = document.createElement('dialog');
    dialog.className = 'peek';
    dialog.setAttribute('aria-labelledby', 'peek-heading');
    dialog.innerHTML = '<div class="peek__head"><p class="peek__from"><a></a></p>'
      + '<button class="peek__close" type="button" aria-label="Close" title="Close"><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path d="m3.5 3.5 9 9m0-9-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>'
      + '<div class="peek__body" tabindex="-1"></div>';
    head = dialog.querySelector('.peek__from a');
    body = dialog.querySelector('.peek__body');
    dialog.querySelector('.peek__close').addEventListener('click', function () { dialog.close(); });
    // a click beside the window, on its backdrop, which belongs to the dialog itself
    dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', closed);
    document.body.appendChild(dialog);
  }

  function closed() {
    root.classList.remove('has-peek');
    document.body.style.paddingRight = '';
    if (status && statusHome) { statusHome.parent.insertBefore(status, statusHome.next); statusHome = null; }
    body.textContent = '';
    // the step the window added to the history; when Back closed the window, it is already gone
    if (stepped) { stepped = false; history.back(); }
  }
  window.addEventListener('popstate', function () {
    if (dialog && dialog.open) { stepped = false; dialog.close(); }
  });

  function show(url, doc, nodes) {
    if (!dialog) make();
    var page = pageOf(url);
    body.textContent = '';
    nodes.forEach(function (n) { body.appendChild(document.importNode(n, true)); });
    [].forEach.call(body.querySelectorAll('script, style, link'), function (el) { el.remove(); });
    [].forEach.call(body.querySelectorAll('[href], [src], [poster]'), function (el) {
      ['href', 'src', 'poster'].forEach(function (name) {
        var value = el.getAttribute(name);
        if (value === null) return;
        try { el.setAttribute(name, new URL(value, page).href); } catch (e) { /* left as it is */ }
      });
    });
    [].forEach.call(body.querySelectorAll('[id], [aria-describedby], [data-popover]'), function (el) {
      el.removeAttribute('id');
      el.removeAttribute('aria-describedby');
      el.removeAttribute('data-popover');
    });
    var first = body.firstElementChild;
    if (first) first.id = 'peek-heading';
    var title = doc.querySelector('.page-title');
    var name = (title ? title.textContent : doc.title).trim();
    head.textContent = name;
    head.href = url.href;
    head.setAttribute('aria-label', 'Open this section in ' + name);

    // the page behind keeps still, and keeps its width where the scrollbar takes room
    var bar = window.innerWidth - root.clientWidth;
    if (bar > 0) document.body.style.paddingRight = bar + 'px';
    root.classList.add('has-peek');
    if (status && !statusHome) { statusHome = { parent: status.parentNode, next: status.nextSibling }; dialog.appendChild(status); }
    dialog.showModal();
    body.scrollTop = 0;
    body.focus();
    history.pushState({ peek: true }, '');
    stepped = true;
    document.dispatchEvent(new CustomEvent('everytrick:peek', { detail: { root: body, url: page, data: dataOf(doc) } }));
  }

  [].forEach.call(links, function (link) {
    var url;
    try { url = new URL(link.href, location.href); } catch (e) { return; }
    var id = decodeURIComponent(url.hash.slice(1));
    // a section of another page of this site; on its own page the link is an ordinary one
    if (!id || url.origin !== location.origin || pageOf(url) === pageOf(new URL(location.href))) return;
    var warm = function () { load(url).catch(function () {}); };
    link.addEventListener('pointerenter', warm);
    link.addEventListener('focus', warm);
    link.addEventListener('touchstart', warm, { passive: true });
    link.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      load(url).then(function (doc) {
        var nodes = sectionOf(doc, id);
        if (!nodes) throw new Error('no section ' + id);
        show(url, doc, nodes);
      }).catch(function () { location.href = url.href; });
    });
  });
})();
