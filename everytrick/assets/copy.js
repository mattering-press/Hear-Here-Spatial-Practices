// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// Copying, shared by the scripts that copy something for the reader (references.js, cite.js, zoom.js):
// window.everytrick.copy. It loads before them.
//  * settings(): the reader's citation settings (settings.js; "Plan: copying citations" in DEVELOPMENT.md):
//    { style, format }: style, the id of a citation style (house, the preset, apa, chicago, mla, harvard), format
//    'formatted' (the preset) or 'plain'.
//  * say(message): the status line at the foot of the window (.copy-status, an aria-live region) says what was copied.
//  * write(parts): puts parts on the clipboard: a text, or { text, html }. With the reader's format 'formatted' the
//    clipboard gets the html as formatted text (italics, links, for a word processor) beside the plain text; with
//    'plain', the plain text alone, so that an app that would turn formatting into Markdown gets none. Without the
//    clipboard (a page not served over https) the text goes through a hidden text field. -> a promise.
//  * later(promise): the same for parts still on their way (a file being loaded): the clipboard is promised them at
//    once, while the click still counts as the reader's.
(function () {
  var everytrick = window.everytrick = window.everytrick || {};
  var status = document.querySelector('.copy-status');
  var timer = 0;
  var KEYS = { style: 'every-trick-citation-style', format: 'every-trick-citation-format' };

  function read(key) { try { return localStorage.getItem(key) || ''; } catch (e) { return ''; } }
  function settings() {
    return { style: read(KEYS.style) || 'house', format: read(KEYS.format) === 'plain' ? 'plain' : 'formatted' };
  }

  function say(message) {
    if (!status) return;
    clearTimeout(timer);
    status.textContent = message;
    status.classList.add('is-shown');
    timer = setTimeout(function () { status.classList.remove('is-shown'); status.textContent = ''; }, 5000);
  }

  function partsOf(parts) { return typeof parts === 'string' ? { text: parts } : parts; }
  function rich() { return !!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && window.isSecureContext); }

  function plainly(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      area.remove();
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function write(parts) {
    var p = partsOf(parts);
    if (p.html && settings().format === 'formatted' && rich()) {
      var blobs = { 'text/plain': new Blob([p.text], { type: 'text/plain' }), 'text/html': new Blob([p.html], { type: 'text/html' }) };
      return navigator.clipboard.write([new ClipboardItem(blobs)]).catch(function () { return plainly(p.text); });
    }
    return plainly(p.text);
  }

  function later(promise) {
    var parts = Promise.resolve(promise).then(partsOf);
    if (rich()) {
      // the ClipboardItem must be made during the click, with promises of its texts
      var data = { 'text/plain': parts.then(function (p) { return new Blob([p.text], { type: 'text/plain' }); }) };
      if (settings().format === 'formatted') data['text/html'] = parts.then(function (p) { return new Blob([p.html || p.text], { type: 'text/html' }); });
      return navigator.clipboard.write([new ClipboardItem(data)]);
    }
    return parts.then(write);
  }

  everytrick.copy = { settings: settings, say: say, write: write, later: later };
})();
