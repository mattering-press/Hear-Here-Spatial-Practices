// The References page's Copy buttons (references/ in each edition; referencesHtml and formatReferences in
// citations.mjs). Beside each work a Copy button opens a short menu: the reference as plain text in the house style or
// another citation style, or its BibTeX or RIS entry. Choosing one copies it and says so in the status line
// ("Copied: APA").
//  * The menu's styles are in the list's data-copy-styles. The texts, made at build time with citeproc, are in the file
//    its data-copy names (formatted.json, beside the page), loaded when the reader first comes to a Copy button.
//  * One menu serves every button, as a menu button does: Enter, Space or ↓ on the button opens it at its first entry,
//    ↑ at its last; ↑ ↓ Home End move; Enter or Space copies and closes it; Escape closes it; either way the focus goes
//    back to the button. Tab, or a click or tap outside, closes it too.
//  * Without JavaScript, or in a browser without popovers, there are no Copy buttons; the downloads at the top of the
//    page remain. The buttons are made here, so their words are neither in the page's text nor in its search index.
(function () {
  var list = document.querySelector('.references[data-copy]');
  if (!list || !HTMLElement.prototype.showPopover) return;
  var styles = [];
  try { styles = JSON.parse(list.dataset.copyStyles || '[]'); } catch (e) { styles = []; }
  if (!styles.length) return;
  var status = document.querySelector('.copy-status');
  var source = new URL(list.dataset.copy, location.href).href;
  var data = null, loading = null, owner = null, timer = 0;

  function load() {
    if (!loading) {
      loading = fetch(source).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      }).then(function (json) { data = json; return json; });
      loading.catch(function () { loading = null; });   // the next try loads it again
    }
    return loading;
  }

  function say(message) {
    if (!status) return;
    clearTimeout(timer);
    status.textContent = message;
    status.classList.add('is-shown');
    timer = setTimeout(function () { status.classList.remove('is-shown'); status.textContent = ''; }, 4000);
  }

  // the clipboard: the browser's, or a hidden text field where it is not available (a page served without https)
  function write(text) {
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
  // a text still on its way: the clipboard is promised it at once, while the click still counts as the reader's
  function writeLater(promise) {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && window.isSecureContext) {
      return navigator.clipboard.write([new ClipboardItem({ 'text/plain': promise.then(function (text) { return new Blob([text], { type: 'text/plain' }); }) })]);
    }
    return promise.then(write);
  }
  function textOf(key, id) { return data && data.works && data.works[key] ? data.works[key][id] : null; }

  function copy(key, style) {
    var text = textOf(key, style.id);
    var job = text ? write(text) : writeLater(load().then(function () {
      var later = textOf(key, style.id);
      if (!later) throw new Error('no ' + style.id + ' for ' + key);
      return later;
    }));
    job.then(function () { say('Copied: ' + style.short); }, function () { say('The reference could not be copied. Please try again.'); });
  }

  // the menu, one for every button
  var menu = document.createElement('div');
  menu.className = 'copy-menu';
  menu.id = 'copy-menu';
  menu.setAttribute('popover', 'manual');
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Copy as');
  styles.forEach(function (style, i) {
    if (style.entry && i && !styles[i - 1].entry) {
      var rule = document.createElement('div');
      rule.className = 'copy-menu__rule';
      rule.setAttribute('role', 'separator');
      menu.appendChild(rule);
    }
    var item = document.createElement('button');
    item.type = 'button';
    item.className = 'copy-menu__item';
    item.setAttribute('role', 'menuitem');
    item.tabIndex = -1;
    item.dataset.style = String(i);
    item.textContent = style.label;
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  var items = [].slice.call(menu.querySelectorAll('.copy-menu__item'));

  // below the button, its right edge in line with the button's; above it where there is no room below
  function place() {
    if (!owner) return;
    var box = owner.getBoundingClientRect();
    var width = document.documentElement.clientWidth, height = window.innerHeight;
    var w = menu.offsetWidth, h = menu.offsetHeight;
    var top = box.bottom + 4;
    if (top + h > height - 8 && box.top - 4 - h >= 8) top = box.top - 4 - h;
    menu.style.top = top + 'px';
    menu.style.left = Math.max(8, Math.min(box.right - w, width - 8 - w)) + 'px';
  }

  function open(button, last) {
    if (owner && owner !== button) close(false);
    owner = button;
    load();
    menu.showPopover();
    button.setAttribute('aria-expanded', 'true');
    place();
    items[last ? items.length - 1 : 0].focus();
  }

  function close(refocus) {
    if (!owner) return;
    var button = owner;
    owner = null;
    if (menu.matches(':popover-open')) menu.hidePopover();
    button.setAttribute('aria-expanded', 'false');
    if (refocus) button.focus();
  }

  // a Copy button for every work
  var chevron = '<svg aria-hidden="true" viewBox="0 0 10 10"><path d="m2 3.5 3 3 3-3"/></svg>';
  list.querySelectorAll('li.reference[id]').forEach(function (work) {
    var meta = work.getAttribute('data-pagefind-meta') || '';
    var name = document.createElement('span');
    name.className = 'visually-hidden';
    name.textContent = ' ' + (meta.slice(meta.indexOf(':') + 1) || work.id);   // "Copy Stengers 2005a"
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'reference__copy';
    button.dataset.key = work.id;
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', menu.id);
    button.append('Copy', name);
    button.insertAdjacentHTML('beforeend', chevron);
    work.appendChild(button);
    work.classList.add('has-copy');
  });

  list.addEventListener('click', function (event) {
    var button = event.target.closest('.reference__copy');
    if (!button) return;
    if (owner === button) close(true); else open(button, false);
  });
  list.addEventListener('keydown', function (event) {
    var button = event.target.closest('.reference__copy');
    if (!button || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    open(button, event.key === 'ArrowUp');
  });
  // the texts start loading as soon as the reader comes to a Copy button
  list.addEventListener('pointerover', function (event) { if (event.target.closest('.reference__copy')) load(); });
  list.addEventListener('focusin', function (event) { if (event.target.closest('.reference__copy')) load(); });

  menu.addEventListener('click', function (event) {
    var item = event.target.closest('.copy-menu__item');
    if (!item || !owner) return;
    var key = owner.dataset.key;
    close(true);
    copy(key, styles[Number(item.dataset.style)]);
  });
  menu.addEventListener('keydown', function (event) {
    var at = items.indexOf(document.activeElement);
    var to = null;
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
})();
