// The References page's Copy buttons (references/ in each edition; referencesHtml and formatReferences in
// citations.mjs). Beside each work a Copy button copies its reference in the reader's citation style, as formatted or
// plain text, both chosen in the settings ("Aa"; settings.js), and says so in the status line ("Copied: APA"). The
// clipboard and the status line are copy.js's. BibTeX and RIS: the downloads at the top of the page, or the Cite panel
// of a page (cite.js).
//  * The page's styles are in the list's data-copy-styles. The texts, made at build time with citeproc, are in the file
//    its data-copy names (formatted.json, beside the page), loaded when the reader first comes to a Copy button.
//  * Without JavaScript there are no Copy buttons; the downloads at the top of the page remain. The buttons are made
//    here, so their words are neither in the page's text nor in its search index.
(function () {
  var list = document.querySelector('.references[data-copy]');
  var copy = window.everytrick && window.everytrick.copy;
  if (!list || !copy) return;
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
  function style() {
    var id = copy.settings().style;
    return styles.filter(function (s) { return s.id === id && !s.entry; })[0] || styles[0];
  }
  function partsOf(key, s) {
    var work = data && data.works && data.works[key];
    if (!work || !work[s.id]) return null;
    return { text: work[s.id], html: work.html && work.html[s.id] };
  }

  // a Copy button for every work: "Copy Stengers 2005a" for screen readers
  list.querySelectorAll('li.reference[id]').forEach(function (work) {
    var meta = work.getAttribute('data-pagefind-meta') || '';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'reference__copy';
    button.dataset.key = work.id;
    button.append('Copy');
    var name = document.createElement('span');
    name.className = 'visually-hidden';
    name.textContent = ' ' + (meta.slice(meta.indexOf(':') + 1) || work.id);
    button.append(name);
    work.appendChild(button);
    work.classList.add('has-copy');
  });

  list.addEventListener('click', function (event) {
    var button = event.target.closest('.reference__copy');
    if (!button) return;
    var key = button.dataset.key, s = style(), parts = partsOf(key, s);
    var job = parts ? copy.write(parts) : copy.later(load().then(function () {
      var later = partsOf(key, s);
      if (!later) throw new Error('no ' + s.id + ' for ' + key);
      return later;
    }));
    job.then(function () { copy.say('Copied: ' + s.short); }, function () { copy.say('The reference could not be copied. Please try again.'); });
  });
  // the texts start loading as soon as the reader comes to a Copy button
  list.addEventListener('pointerover', function (event) { if (event.target.closest('.reference__copy')) load(); });
  list.addEventListener('focusin', function (event) { if (event.target.closest('.reference__copy')) load(); });
})();
