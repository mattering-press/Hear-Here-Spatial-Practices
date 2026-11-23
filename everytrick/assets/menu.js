// The menu button (☰) in the bar, which stands in for the menu where the whole menu does not fit beside the title and
// the tools (the width is in site.css). It is a <details>, so without JavaScript it opens and closes its panel all the
// same. This script makes it behave like a menu button:
//   - opening it moves the focus into the panel, to its first entry;
//   - Escape closes it and puts the focus back on the button;
//   - a click or tap outside it closes it, and so does the focus leaving it (Tab past its last entry);
//   - it closes when the window widens enough for the menu itself to show.
(function () {
  var menu = document.querySelector('details.menu-button');
  if (!menu) return;
  var button = menu.querySelector('summary');
  var panel = menu.querySelector('.menu-panel');

  function close(refocus) {
    if (!menu.open) return;
    menu.open = false;
    if (refocus) button.focus();
  }

  button.setAttribute('aria-expanded', 'false');
  menu.addEventListener('toggle', function () {
    button.setAttribute('aria-expanded', String(menu.open));
    var first = menu.open && panel.querySelector('a');
    if (first) first.focus();
  });
  menu.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.open) {
      event.preventDefault();
      close(true);
    }
  });
  document.addEventListener('pointerdown', function (event) {
    if (menu.open && !menu.contains(event.target)) close(false);
  });
  menu.addEventListener('focusout', function (event) {
    if (menu.open && event.relatedTarget && !menu.contains(event.relatedTarget)) close(false);
  });
  // the button shows only on narrower windows; where it is hidden, the panel would otherwise wait, open, for the next
  // narrowing
  addEventListener('resize', function () {
    if (menu.open && !button.getClientRects().length) close(false);
  });
})();

// The back matter's entry in the bar (FRAME.menu.backmatter in build.mjs). Without JavaScript it is a link to the back
// matter's contents page. This script makes it a menu button that opens a short list of the back matter's sections,
// in the menu button pattern:
//   - a click, Enter, Space or ↓ opens the list on its first section, ↑ on its last;
//   - in the list ↑ and ↓ move from section to section (round), Home and End to the first and the last, and Enter
//     follows the link;
//   - Escape closes it and puts the focus back on the button; Tab, a click or tap outside, and the focus leaving it
//     close it too.
// In the menu button's panel (the narrow bar) the sections are an indented group under the entry's link instead.
(function () {
  var entry = document.querySelector('.site-menu .backmatter-menu');
  var link = entry && entry.querySelector('.backmatter-menu__link');
  var list = entry && entry.querySelector('.backmatter-menu__list');
  if (!link || !list) return;
  var button = document.createElement('button');
  button.type = 'button';
  button.id = 'backmatter-menu-button';
  button.className = 'backmatter-menu__button' + (link.hasAttribute('aria-current') ? ' is-current' : '');
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  list.id = 'backmatter-menu-list';
  button.setAttribute('aria-controls', list.id);
  var label = document.createElement('span');
  label.className = 'backmatter-menu__label';
  label.textContent = link.textContent;
  button.appendChild(label);
  button.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" viewBox="0 0 10 10" width="10" height="10"><path d="m2 3.75 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  list.setAttribute('role', 'menu');
  list.setAttribute('aria-labelledby', button.id);
  var items = Array.prototype.slice.call(list.querySelectorAll('a'));
  items.forEach(function (a) {
    a.setAttribute('role', 'menuitem');
    a.tabIndex = -1;
    a.parentNode.setAttribute('role', 'none');
  });
  link.replaceWith(button);

  function isOpen() { return !list.hidden; }
  function open(index) {
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    var item = items[(index + items.length) % items.length];
    if (item) item.focus();
  }
  function close(refocus) {
    if (!isOpen()) return;
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (refocus) button.focus();
  }

  button.addEventListener('click', function () {
    if (isOpen()) close(false); else open(0);
  });
  button.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') { event.preventDefault(); open(0); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); open(items.length - 1); }
  });
  list.addEventListener('keydown', function (event) {
    var at = items.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); open(at + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); open(at - 1); }
    else if (event.key === 'Home') { event.preventDefault(); open(0); }
    else if (event.key === 'End') { event.preventDefault(); open(items.length - 1); }
    else if (event.key === 'Tab') close(false);
  });
  entry.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) { event.preventDefault(); close(true); }
  });
  document.addEventListener('pointerdown', function (event) {
    if (isOpen() && !entry.contains(event.target)) close(false);
  });
  entry.addEventListener('focusout', function (event) {
    if (isOpen() && event.relatedTarget && !entry.contains(event.relatedTarget)) close(false);
  });
  // where the bar folds the menu into the menu button, the list would otherwise wait, open, for the next widening
  addEventListener('resize', function () {
    if (isOpen() && !button.getClientRects().length) close(false);
  });
})();
