// The reader's settings: text size (four steps) and colours (System, Light, Dark; System follows the reader's
// device). The "Aa" button in the bar opens them as a popover. A choice is kept in this browser (localStorage) and
// applied by a line in the template's <head> before the page is drawn, as data-text-size and data-theme on <html>;
// the stylesheet does the rest. Without JavaScript the button stays hidden, and browser zoom and the device's
// settings still apply.
(function () {
  var button = document.querySelector('.settings-button');
  var panel = document.getElementById('settings');
  if (!button || !panel || typeof panel.showPopover !== 'function') return;   // browsers without popovers: no settings
  var root = document.documentElement;
  // The keys keep the toolkit's old name (every_trick_in_the_book until 1.14.0) so that readers keep their settings,
  // as do those in place.js, search.js and media-index.js. Readers never see them.
  var settings = { textSize: 'every-trick-text-size', theme: 'every-trick-theme' };

  function store(key, value) {
    try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch (e) { /* private mode */ }
  }

  function mark() {
    Object.keys(settings).forEach(function (name) {
      var attr = name === 'textSize' ? 'data-text-size' : 'data-theme';
      panel.querySelectorAll('[' + attr + ']').forEach(function (choice) {
        choice.setAttribute('aria-pressed', String(choice.getAttribute(attr) === (root.dataset[name] || '')));
      });
    });
  }

  panel.addEventListener('click', function (event) {
    var choice = event.target.closest('button');
    if (!choice) return;
    var name = choice.hasAttribute('data-text-size') ? 'textSize' : 'theme';
    var value = choice.getAttribute(name === 'textSize' ? 'data-text-size' : 'data-theme');
    root.dataset[name] = value;
    store(settings[name], value);
    mark();
    if (name === 'textSize') window.dispatchEvent(new Event('resize'));   // margin notes find their paragraphs again
  });

  // the panel opens under the button, its right edge in line with the button's
  panel.addEventListener('beforetoggle', function (event) {
    if (event.newState !== 'open') return;
    var box = button.getBoundingClientRect();
    panel.style.top = (box.bottom + 8) + 'px';
    panel.style.right = Math.max(8, document.documentElement.clientWidth - box.right) + 'px';
  });

  mark();
  button.hidden = false;
})();
