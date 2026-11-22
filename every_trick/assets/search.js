// Search, on the search page of each edition (/search/, /v0.1/search/). It asks that edition's Pagefind index
// (pagefind/, made by the build) and lists every page the words are found on, best first, each with up to three of its
// paragraphs: their number, a few words around the words found, and a link straight to the paragraph (#p12).
//  * The words searched for are kept in the address (search/?q=dust), so a search can be shared, bookmarked and
//    reached again with the back button.
//  * Pagefind is loaded only on this page, when the reader starts typing or arrives with ?q=.
//  * On a frozen version the notice's link, "Search the latest text", carries the same words.
//  * Without JavaScript the page says so and points to the whole book in Markdown (the build writes that text).
(function () {
  var root = document.querySelector('.search');
  if (!root) return;
  var form = root.querySelector('.search__form');
  var input = root.querySelector('.search__input');
  var status = root.querySelector('.search__status');
  var list = root.querySelector('.search__results');
  var more = root.querySelector('.search__more');
  var elsewhere = document.querySelector('a.search-elsewhere');
  var PAGES = 10, PASSAGES = 3, AROUND = 14;   // pages shown at a time, paragraphs shown per page, words either side
  var engine = null, run = 0, found = [], shown = 0, timer = 0;

  function load() {
    if (!engine) {
      engine = import(new URL(root.dataset.pagefind + 'pagefind.js', location.href).href)
        // baseUrl '/' keeps the addresses as the build wrote them (/essays/aya_nassar/), whatever folder the edition is in
        .then(function (pagefind) { return pagefind.options({ baseUrl: '/' }).then(function () { return pagefind.init(); }).then(function () { return pagefind; }); });
      engine.catch(function () { say('Search could not be loaded. Please try again later.'); });
    }
    return engine;
  }

  function say(text) { status.textContent = text; }

  function escape(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // A result's address as Pagefind gives it (/essays/aya_nassar/) made relative to this page, one folder down.
  function href(url, id) {
    return '..' + url + (id ? '#' + id : '');
  }

  // The places on a page where the words were found, grouped by the paragraph (p12) or heading they are under, best
  // first; each with the stretch of words it spans in Pagefind's text of the page.
  function passages(data) {
    var words = data.content.split(/\s+/);
    var marks = (data.anchors || []).filter(function (a) { return /^p\d+$/.test(a.id) || /^h[2-6]$/.test(a.element); })
      .sort(function (a, b) { return a.location - b.location; });
    var groups = {}, order = [];
    (data.weighted_locations || data.locations.map(function (n) { return { location: n, balanced_score: 1 }; })).forEach(function (hit) {
      var at = -1;
      for (var i = 0; i < marks.length && marks[i].location <= hit.location; i++) at = i;
      var key = String(at);
      if (!groups[key]) {
        groups[key] = { mark: marks[at] || null, start: at < 0 ? 0 : marks[at].location, end: at + 1 < marks.length ? marks[at + 1].location : words.length, hits: [], score: 0 };
        order.push(key);
      }
      groups[key].hits.push(hit.location);
      groups[key].score += hit.balanced_score || 1;
    });
    var best = order.map(function (k) { return groups[k]; }).sort(function (a, b) { return b.score - a.score; }).slice(0, PASSAGES);
    best.sort(function (a, b) { return a.start - b.start; });   // shown in the order of the page
    return { total: order.length, best: best, words: words };
  }

  function excerpt(group, words) {
    var hits = group.hits.slice().sort(function (a, b) { return a - b; });
    var from = Math.max(group.start, hits[0] - AROUND), to = Math.min(group.end, hits[0] + AROUND + 1);
    var out = [];
    for (var i = from; i < to; i++) out.push(hits.indexOf(i) >= 0 ? '<mark>' + escape(words[i]) + '</mark>' : escape(words[i]));
    return (from > group.start ? '… ' : '') + out.join(' ') + (to < group.end ? ' …' : '');
  }

  function label(mark) {
    if (!mark) return 'Top of the page';
    if (/^p\d+$/.test(mark.id)) return 'para. ' + mark.id.slice(1);
    return mark.text || 'Section';
  }

  function item(data) {
    var title = (data.meta && data.meta.title) || data.url;
    var p = passages(data);
    var html = '<li class="search-result"><h2 class="search-result__title"><a href="' + escape(href(data.url)) + '">' + escape(title) + '</a></h2><ul class="search-result__passages">';
    p.best.forEach(function (group) {
      html += '<li><a class="search-result__where" href="' + escape(href(data.url, group.mark && group.mark.id)) + '">' + escape(label(group.mark)) + '</a> ' +
        '<span class="search-result__excerpt">' + excerpt(group, p.words) + '</span></li>';
    });
    html += '</ul>';
    if (p.total > p.best.length) html += '<p class="search-result__more">Also in ' + (p.total - p.best.length) + ' more ' + (p.total - p.best.length === 1 ? 'place' : 'places') + ' on this page.</p>';
    return html + '</li>';
  }

  function showMore(mine) {
    var next = found.slice(shown, shown + PAGES);
    more.hidden = true;
    return Promise.all(next.map(function (r) { return r.data(); })).then(function (all) {
      if (mine !== run) return;
      list.insertAdjacentHTML('beforeend', all.map(item).join(''));
      shown += next.length;
      more.hidden = shown >= found.length;
    });
  }

  function search(query) {
    var mine = ++run;
    var url = new URL(location.href);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (elsewhere) {
      var there = new URL(elsewhere.href);
      if (query) there.searchParams.set('q', query); else there.searchParams.delete('q');
      elsewhere.href = there.href;
    }
    document.title = (query ? '‘' + query + '’: ' : '') + document.title.replace(/^‘.*’: /, '');
    if (!query) { list.innerHTML = ''; more.hidden = true; say(''); return; }
    say('Searching…');
    load().then(function (pagefind) { return pagefind.search(query); }).then(function (response) {
      if (mine !== run || !response) return;
      found = response.results; shown = 0; list.innerHTML = '';
      if (!found.length) { more.hidden = true; say('No pages found for ‘' + query + '’.'); return; }
      say('‘' + query + '’ is found on ' + found.length + (found.length === 1 ? ' page.' : ' pages.'));
      return showMore(mine);
    });
  }

  form.addEventListener('submit', function (event) { event.preventDefault(); clearTimeout(timer); search(input.value.trim()); });
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { search(input.value.trim()); }, 250); });
  input.addEventListener('focus', function () { load(); }, { once: true });
  more.addEventListener('click', function () { showMore(run); });

  var asked = new URLSearchParams(location.search).get('q');
  if (asked) { input.value = asked; search(asked.trim()); } else input.focus();
})();
