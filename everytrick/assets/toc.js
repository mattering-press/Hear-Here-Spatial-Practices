// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// The contents of a page you consult rather than read (build.mjs, pageToc): About this book and Bibliography and items.
// Marks the section being read, the last one whose heading has passed the upper third of the window, with
// aria-current="true" on its link. The list itself needs no script: its links lead to the sections, and on wide screens
// the stylesheet keeps it in view.
(function () {
  var links = [].slice.call(document.querySelectorAll('.page-toc a[data-toc]'));
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('data-toc')); });
  if (!links.length || targets.some(function (t) { return !t; })) return;
  var current = null, queued = false;
  function mark() {
    queued = false;
    var line = window.innerHeight / 3, at = 0;
    targets.forEach(function (t, i) { if (t.getBoundingClientRect().top <= line) at = i; });
    // at the foot of the page the last section is the one being read, however short
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) at = targets.length - 1;
    if (links[at] === current) return;
    if (current) current.removeAttribute('aria-current');
    current = links[at];
    current.setAttribute('aria-current', 'true');
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(mark); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  mark();
})();
