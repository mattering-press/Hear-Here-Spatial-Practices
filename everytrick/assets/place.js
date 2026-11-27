// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// The reader's place, for the search page's close button (×, assets/search.js). The search button is in the header,
// so a reader scrolls up to the top to reach it; the place worth returning to is where they last stopped to read.
// Every page therefore notes, in this tab only (sessionStorage), the last place below its header where the reader
// stopped scrolling for a moment. When the × leads back to the page (it marks the page with "restore"), the page
// returns to that place: on a fresh load, and when the browser shows it again from its cache after going back.
(function () {
  var KEY = 'every-trick-place';
  var here = location.pathname + location.search;
  var header = document.querySelector('.site-header');
  function read() { try { var p = JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; if (typeof p.at !== 'object' || !p.at) p.at = {}; return p; } catch (e) { return { at: {} }; } }
  function write(places) { try { sessionStorage.setItem(KEY, JSON.stringify(places)); } catch (e) { /* private mode */ } }

  function restore() {
    var places = read();
    if (places.restore !== here || !(here in places.at)) return;
    var y = places.at[here];
    delete places.restore;
    write(places);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var go = function () { scrollTo(0, y); };
    go();
    if (document.readyState === 'complete') requestAnimationFrame(go);
    else addEventListener('load', function () { go(); requestAnimationFrame(go); }, { once: true });
    setTimeout(function () { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; }, 1000);
  }
  restore();
  addEventListener('pageshow', function (event) { if (event.persisted) restore(); });

  var timer = 0;
  addEventListener('scroll', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (!header || scrollY <= header.offsetHeight) return;   // in the header: not a reading place
      var places = read();
      places.at[here] = Math.round(scrollY);
      write(places);
    }, 500);
  }, { passive: true });
})();
