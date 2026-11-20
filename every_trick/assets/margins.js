// Margin notes (filters/margins.lua; the plan is in DEVELOPMENT.md, "Plan: margin notes").
//  * Without JavaScript, on phones and for screen readers a note stays in reading order after its paragraph, as a
//    labelled aside. On wide screens this script sets each note in the right-hand margin, level with its paragraph;
//    when the margin is crowded, later notes are pushed down, so the text column never gets gaps.
//  * The mark in the text and the same number on the note highlight together on hover and focus.
//  * In the margin a note shows in full (the preset). With --margin-note-lines set in site.css, a long note shows
//    that many lines, then "more".
(function () {
  var notes = Array.prototype.slice.call(document.querySelectorAll('aside.margin'));
  var main = document.querySelector('main');
  if (!notes.length || !main) return;
  var wide = window.matchMedia('(min-width: 76rem)');
  var GAP = 16;     // px between notes pushed down
  // lines a long note shows in the margin before "more": --margin-note-lines in site.css; 0 shows every note in full
  function noteLines() {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--margin-note-lines'), 10) || 0;
  }

  notes.forEach(function (note) {
    var mark = document.getElementById(note.id + '-mark');
    var pair = mark ? [note, mark] : [note];
    function set(on) { pair.forEach(function (el) { el.classList.toggle('is-active', on); }); }
    pair.forEach(function (el) {
      el.addEventListener('mouseenter', function () { set(true); });
      el.addEventListener('mouseleave', function () { set(false); });
      el.addEventListener('focusin', function () { set(true); });
      el.addEventListener('focusout', function () { set(false); });
    });

    var body = document.createElement('div');
    body.className = 'margin-body';
    var number = note.querySelector('.margin-number');
    Array.prototype.slice.call(note.childNodes).forEach(function (child) { if (child !== number) body.appendChild(child); });
    note.appendChild(body);
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'margin-more';
    more.textContent = 'more';
    more.setAttribute('aria-expanded', 'false');
    more.hidden = true;   // shown by layout() only where a note is folded, whatever stylesheet the browser has
    more.addEventListener('click', function () {
      var open = note.classList.toggle('is-open');
      more.textContent = open ? 'less' : 'more';
      more.setAttribute('aria-expanded', String(open));
      layout();
    });
    note.appendChild(more);
  });

  function layout() {
    var on = wide.matches;
    main.classList.toggle('has-margin', on);
    main.style.minHeight = '';
    var bottom = -Infinity;
    var mainTop = main.getBoundingClientRect().top;
    var limit = on ? noteLines() : 0;
    notes.forEach(function (note) {
      var more = note.querySelector('.margin-more');
      note.style.top = '';
      if (!on) { note.classList.remove('is-long'); more.hidden = true; return; }
      var body = note.querySelector('.margin-body');
      var line = parseFloat(getComputedStyle(body).lineHeight) || 20;
      note.style.setProperty('--margin-lines-height', (limit * line) + 'px');
      var folded = limit > 0 && body.scrollHeight > (limit + 1) * line;
      note.classList.toggle('is-long', folded);
      more.hidden = !folded;
      var anchor = note.previousElementSibling;
      var top = anchor ? anchor.getBoundingClientRect().top - mainTop : 0;
      top = Math.max(top, bottom + GAP);
      note.style.top = top + 'px';
      bottom = top + note.offsetHeight;
    });
    if (on && bottom > main.offsetHeight) main.style.minHeight = bottom + 'px';   // keep notes clear of the footer
  }

  layout();
  wide.addEventListener('change', layout);
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);   // images and fonts change where paragraphs are
  if (document.fonts) document.fonts.ready.then(layout);
})();
