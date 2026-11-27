// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// Paragraph links and the version notice.
//  * Every numbered paragraph has a link, <a class="para-link" href="#p12" data-n="12">, that shows its number in
//    the margin and a ¶ on hover and focus. Without JavaScript it is a plain link to #p12. With it, a click copies
//    the paragraph's full address to the clipboard, with the version in it on a frozen version
//    (https://…/v0.9-review2/essays/aya_nassar/#p12), and says so in the status line (an aria-live region).
//  * On a frozen version, the notice's link (a.version-notice__link) goes to the same page in the newer text. Its
//    data-paragraphs maps this page's paragraphs to that page's ({"p12": "p14"}, made by the build from the paragraphs'
//    text); the link is pointed at the passage the reader has reached: the paragraph in the address, or the one they
//    last scrolled down to. Without JavaScript it goes to the top of that page.
(function () {
  var status = document.querySelector('.copy-status');
  var timer = 0;

  function say(message) {
    if (!status) return;
    clearTimeout(timer);
    status.textContent = message;
    status.classList.add('is-shown');
    timer = setTimeout(function () { status.classList.remove('is-shown'); status.textContent = ''; }, 4000);
  }

  function addressOf(id) {
    var url = new URL(location.href);
    url.search = '';
    url.hash = id;
    url.pathname = url.pathname.replace(/index\.html$/, '');
    return url.href;
  }

  function copy(text) {
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

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a.para-link');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    var id = link.hash.slice(1), address = addressOf(id);
    copy(address).then(function () {
      say('Link to paragraph ' + link.dataset.n + ' copied: ' + address);
    }, function () {
      location.hash = id;   // the clipboard is not available: at least show the paragraph's address
      say('Paragraph ' + link.dataset.n + ': copy its address from the address bar');
    });
  });

  var notice = document.querySelector('a.version-notice__link');
  if (!notice) return;
  var map = {};
  try { map = JSON.parse(notice.dataset.paragraphs || '{}'); } catch (e) { map = {}; }
  var base = notice.href.replace(/#.*$/, '');

  // The reading position: the paragraph in the address, then, each time the reader scrolls down past the notice, the
  // first paragraph on screen (the first that reaches below the top 48 px, so not the end of the one before). Scrolling back up to the notice does not change it, so the link still leads to the
  // passage the reader had reached.
  var reading = null, lastY = scrollY, queued = false;
  function fromHash() {
    var hash = decodeURIComponent(location.hash.slice(1));
    if (/^p\d+$/.test(hash) && map[hash]) reading = hash;
  }
  function onScroll() {
    queued = false;
    var down = scrollY > lastY;
    lastY = scrollY;
    if (!down || notice.getBoundingClientRect().bottom > 0) return;
    var paragraphs = document.querySelectorAll('main .para');
    for (var i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].getBoundingClientRect().bottom > 48) { reading = paragraphs[i].id; return; }
    }
  }
  function update() { notice.href = reading && map[reading] ? base + '#' + map[reading] : base; }
  fromHash();
  update();
  addEventListener('hashchange', function () { fromHash(); update(); });
  addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(function () { onScroll(); update(); }); } }, { passive: true });
})();
