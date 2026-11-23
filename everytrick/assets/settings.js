// The reader's settings: text size (four steps), colours (System, Light, Dark; System follows the reader's device),
// and how citations are copied: their style (Mattering Press, the preset, APA, Chicago, MLA or Harvard) and whether as
// formatted text (the preset) or plain text ("Plan: copying citations" in DEVELOPMENT.md; assets/cite.js). The "Aa"
// button in the bar opens them as a popover. A choice is kept in this browser (localStorage). Text size and colours
// are applied by a line in the template's <head> before the page is drawn, as data-text-size and data-theme on <html>,
// and the stylesheet does the rest; the citation settings are data-citation-style and data-citation-format, and a
// change to them is announced to cite.js with the event "everytrick:citation". Without JavaScript the button stays
// hidden, and browser zoom and the device's settings still apply.
(function () {
  var button = document.querySelector('.settings-button');
  var panel = document.getElementById('settings');
  if (!button || !panel || typeof panel.showPopover !== 'function') return;   // browsers without popovers: no settings
  var root = document.documentElement;
  // The keys keep the toolkit's old name (every_trick_in_the_book until 1.14.0) so that readers keep their settings,
  // as do those in place.js, search.js and media-index.js. Readers never see them.
  var settings = { textSize: 'every-trick-text-size', theme: 'every-trick-theme', citationStyle: 'every-trick-citation-style', citationFormat: 'every-trick-citation-format' };
  var attrs = { textSize: 'data-text-size', theme: 'data-theme', citationStyle: 'data-citation-style', citationFormat: 'data-citation-format' };
  // the citation settings, which the template's <head> does not apply (nothing is drawn from them)
  ['citationStyle', 'citationFormat'].forEach(function (name) {
    try { root.dataset[name] = localStorage.getItem(settings[name]) || ''; } catch (e) { root.dataset[name] = ''; }
  });

  function store(key, value) {
    try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch (e) { /* private mode */ }
  }

  function mark() {
    Object.keys(settings).forEach(function (name) {
      var attr = attrs[name];
      panel.querySelectorAll('[' + attr + ']').forEach(function (choice) {
        choice.setAttribute('aria-pressed', String(choice.getAttribute(attr) === (root.dataset[name] || '')));
      });
    });
  }

  panel.addEventListener('click', function (event) {
    var choice = event.target.closest('button');
    if (!choice) return;
    var name = Object.keys(attrs).filter(function (n) { return choice.hasAttribute(attrs[n]); })[0];
    if (!name) return;
    var value = choice.getAttribute(attrs[name]);
    root.dataset[name] = value;
    store(settings[name], value);
    mark();
    if (name === 'textSize') window.dispatchEvent(new Event('resize'));   // margin notes find their paragraphs again
    if (name === 'citationStyle' || name === 'citationFormat') window.dispatchEvent(new Event('everytrick:citation'));
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
