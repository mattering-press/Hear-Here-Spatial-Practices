// Copying, shared by the scripts that copy something for the reader (references.js, cite.js, citations.js, zoom.js):
// window.everytrick.copy. It loads before them.
//  * say(message): the status line at the foot of the window (.copy-status, an aria-live region) says what was copied.
//  * write(parts): puts parts on the clipboard: a text, or { text, html }, which the clipboard gets as formatted text
//    (for a word processor) beside the plain text (for a plain field). Without the clipboard (a page not served over
//    https) the text goes through a hidden text field, as plain text only. -> a promise.
//  * later(promise, html): the same for parts still on their way (a file being loaded): the clipboard is promised them
//    at once, while the click still counts as the reader's; html says whether they will have formatted text.
//  * menu.open(button, { styles, pick, done, last }): the Copy menu under button, one for the whole page, as a menu
//    button does: styles, [{ id, label, short, entry }], are its entries (a rule before the first entry for a reference
//    manager); pick(style) gives the parts to copy (or a promise of them, with html true if they will have formatted
//    text), done(style, ok) is told what happened.
//    Enter, Space or ↓ on the button opens it at its first entry, ↑ at its last; ↑ ↓ Home End move; Enter or Space
//    copies and closes it; Escape closes it; either way the focus goes back to the button. Tab, or a click or tap
//    outside, closes it too. menu.toggle(button, options) opens it, or closes it when it is open under that button;
//    menu.keys(event, button, options) opens it from ↑ and ↓. Without popovers there is no menu (menu.ok is false).
(function () {
  var everytrick = window.everytrick = window.everytrick || {};
  var status = document.querySelector('.copy-status');
  var timer = 0;

  function say(message) {
    if (!status) return;
    clearTimeout(timer);
    status.textContent = message;
    status.classList.add('is-shown');
    timer = setTimeout(function () { status.classList.remove('is-shown'); status.textContent = ''; }, 5000);
  }

  function partsOf(parts) { return typeof parts === 'string' ? { text: parts } : parts; }
  function canWrite() { return !!(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && window.isSecureContext); }
  function escape(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

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
    if (p.html && canWrite()) {
      var blobs = { 'text/plain': new Blob([p.text], { type: 'text/plain' }), 'text/html': new Blob([p.html], { type: 'text/html' }) };
      return navigator.clipboard.write([new ClipboardItem(blobs)]).catch(function () { return plainly(p.text); });
    }
    return plainly(p.text);
  }

  function later(promise, html) {
    var parts = Promise.resolve(promise).then(partsOf);
    if (canWrite()) {
      // the ClipboardItem must be made during the click, with promises of its texts (a text without html is its own)
      var data = { 'text/plain': parts.then(function (p) { return new Blob([p.text], { type: 'text/plain' }); }) };
      if (html) data['text/html'] = parts.then(function (p) { return new Blob([p.html || escape(p.text).replace(/\n/g, '<br>')], { type: 'text/html' }); });
      return navigator.clipboard.write([new ClipboardItem(data)]).catch(function () { return parts.then(function (p) { return plainly(p.text); }); });
    }
    return parts.then(write);
  }

  // ---- The Copy menu ----------------------------------------------------------------------------------------------
  var menu = null, items = [], owner = null, options = null;
  var ok = !!HTMLElement.prototype.showPopover;

  function build(styles) {
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'copy-menu';
      menu.id = 'copy-menu';
      menu.setAttribute('popover', 'manual');
      menu.setAttribute('role', 'menu');
      menu.setAttribute('aria-label', 'Copy as');
      document.body.appendChild(menu);
      menu.addEventListener('click', function (event) {
        var entry = event.target.closest('.copy-menu__item');
        if (!entry || !owner) return;
        var o = options, style = o.styles[Number(entry.dataset.style)];
        close(true);
        run(style, o);
      });
      menu.addEventListener('keydown', function (event) {
        var at = items.indexOf(document.activeElement), to = null;
        if (event.key === 'ArrowDown') to = (at + 1) % items.length;
        else if (event.key === 'ArrowUp') to = (at - 1 + items.length) % items.length;
        else if (event.key === 'Home') to = 0;
        else if (event.key === 'End') to = items.length - 1;
        else if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
        else if (event.key === 'Tab') { close(true); return; }   // the Tab then moves on from the button
        if (to === null) return;
        event.preventDefault();
        items[to].focus();
      });
      document.addEventListener('pointerdown', function (event) {
        if (owner && !menu.contains(event.target) && !owner.contains(event.target)) close(false);
      });
      window.addEventListener('scroll', place, { passive: true });
      window.addEventListener('resize', place);
    }
    menu.textContent = '';
    styles.forEach(function (style, i) {
      if (style.entry && i && !styles[i - 1].entry) {
        var rule = document.createElement('div');
        rule.className = 'copy-menu__rule';
        rule.setAttribute('role', 'separator');
        menu.appendChild(rule);
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'copy-menu__item';
      b.setAttribute('role', 'menuitem');
      b.tabIndex = -1;
      b.dataset.style = String(i);
      b.textContent = style.label;
      menu.appendChild(b);
    });
    items = [].slice.call(menu.querySelectorAll('.copy-menu__item'));
  }

  function run(style, o) {
    var parts;
    try { parts = o.pick(style); } catch (e) { parts = Promise.reject(e); }
    var job = parts && typeof parts.then === 'function' ? later(parts, o.html) : write(parts);
    job.then(function () { if (o.done) o.done(style, true); }, function () { if (o.done) o.done(style, false); });
  }

  // below the button, its right edge in line with the button's; above it where there is no room below
  function place() {
    if (!owner || !menu) return;
    var box = owner.getBoundingClientRect();
    var width = document.documentElement.clientWidth, height = window.innerHeight;
    var w = menu.offsetWidth, h = menu.offsetHeight;
    var top = box.bottom + 4;
    if (top + h > height - 8 && box.top - 4 - h >= 8) top = box.top - 4 - h;
    menu.style.top = top + 'px';
    menu.style.left = Math.max(8, Math.min(box.right - w, width - 8 - w)) + 'px';
  }

  function open(button, o) {
    if (!ok) return;
    if (owner && owner !== button) close(false);
    build(o.styles);
    owner = button;
    options = o;
    button.setAttribute('aria-controls', menu.id);
    menu.showPopover();
    button.setAttribute('aria-expanded', 'true');
    place();
    items[o.last ? items.length - 1 : 0].focus();
  }

  function close(refocus) {
    if (!owner) return;
    var button = owner;
    owner = null;
    if (menu.matches(':popover-open')) menu.hidePopover();
    button.setAttribute('aria-expanded', 'false');
    if (refocus) button.focus();
  }

  // a Copy button with its chevron, for a menu: label is its word, name what it copies (for screen readers)
  function button(label, name, className) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = className || 'copy-button';
    b.setAttribute('aria-haspopup', 'menu');
    b.setAttribute('aria-expanded', 'false');
    b.append(label);
    if (name) {
      var hidden = document.createElement('span');
      hidden.className = 'visually-hidden';
      hidden.textContent = ' ' + name;
      b.append(hidden);
    }
    b.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" viewBox="0 0 10 10"><path d="m2 3.5 3 3 3-3"/></svg>');
    return b;
  }

  everytrick.copy = {
    say: say, write: write, later: later,
    menu: {
      ok: ok, button: button,
      open: open,
      close: close,
      isOpen: function () { return !!owner; },
      owner: function () { return owner; },
      element: function () { return menu; },
      toggle: function (b, o) { if (owner === b) close(true); else open(b, o); },
      keys: function (event, b, o) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        o.last = event.key === 'ArrowUp';
        open(b, o);
      },
    },
  };
})();
