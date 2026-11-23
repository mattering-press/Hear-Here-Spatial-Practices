// The References page's Copy buttons (references/ in each edition; referencesHtml and formatReferences in
// citations.mjs). Beside each work a Copy button opens a short menu: the reference as plain text in the house style or
// another citation style, or its BibTeX or RIS entry. Choosing one copies it and says so in the status line
// ("Copied: APA"). The menu, the clipboard and the status line are copy.js's, shared with the citation popups and the
// Cite panel (cite.js).
//  * The menu's styles are in the list's data-copy-styles. The texts, made at build time with citeproc, are in the file
//    its data-copy names (formatted.json, beside the page), loaded when the reader first comes to a Copy button.
//  * Without JavaScript, or in a browser without popovers, there are no Copy buttons; the downloads at the top of the
//    page remain. The buttons are made here, so their words are neither in the page's text nor in its search index.
(function () {
  var list = document.querySelector('.references[data-copy]');
  var copy = window.everytrick && window.everytrick.copy;
  if (!list || !copy || !copy.menu.ok) return;
  var styles = [];
  try { styles = JSON.parse(list.dataset.copyStyles || '[]'); } catch (e) { styles = []; }
  if (!styles.length) return;
  var source = new URL(list.dataset.copy, location.href).href;
  var data = null, loading = null;

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
  function textOf(key, id) { return data && data.works && data.works[key] ? data.works[key][id] : null; }
  function options(button) {
    var key = button.dataset.key;
    return {
      styles: styles,
      pick: function (style) {
        return textOf(key, style.id) || load().then(function () {
          var later = textOf(key, style.id);
          if (!later) throw new Error('no ' + style.id + ' for ' + key);
          return later;
        });
      },
      done: function (style, ok) { copy.say(ok ? 'Copied: ' + style.short : 'The reference could not be copied. Please try again.'); },
    };
  }

  // a Copy button for every work: "Copy Stengers 2005a" for screen readers
  list.querySelectorAll('li.reference[id]').forEach(function (work) {
    var meta = work.getAttribute('data-pagefind-meta') || '';
    var button = copy.menu.button('Copy', meta.slice(meta.indexOf(':') + 1) || work.id, 'reference__copy');
    button.dataset.key = work.id;
    work.appendChild(button);
    work.classList.add('has-copy');
  });

  list.addEventListener('click', function (event) {
    var button = event.target.closest('.reference__copy');
    if (button) copy.menu.toggle(button, options(button));
  });
  list.addEventListener('keydown', function (event) {
    var button = event.target.closest('.reference__copy');
    if (button) copy.menu.keys(event, button, options(button));
  });
  // the texts start loading as soon as the reader comes to a Copy button
  list.addEventListener('pointerover', function (event) { if (event.target.closest('.reference__copy')) load(); });
  list.addEventListener('focusin', function (event) { if (event.target.closest('.reference__copy')) load(); });
})();
