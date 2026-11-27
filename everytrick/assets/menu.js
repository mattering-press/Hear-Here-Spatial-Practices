// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
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
