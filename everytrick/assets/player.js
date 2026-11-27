// SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
// Podcast players. filters/embeds.lua writes each one as the browser's own player:
//   <div class="player" data-for="audio-1" data-duration="2308.1"><audio id="audio-1" controls preload="none" …>
// Without JavaScript that player is what the reader gets. With it, this script hides the browser's controls and adds
// the site's: play, time and length, position, back and forward 15 seconds, speed, and "Follow text".
//
// Docking: while a recording plays (or is paused part-way) and its player has scrolled out of view, the player sits as a
// bar at the foot of the window. Docking is only a class on the player: the <audio> element and the buttons stay where
// they are in the page, so playback carries on and keyboard focus stays on the button that had it. The player keeps
// its space in the page while docked, so nothing jumps. The bar's × stops playback and puts the player back.
//
// Cues: the moments of a recording that the transcript marks. A transcript timecode,
//   <a class="timecode" href="#audio-1" data-seconds="613">[00:10:13]</a>
// plays the recording from that moment when clicked, and is a cue. Elements with data-cue-for="audio-1" and
// data-cue-start="613.2" (and data-cue-end) are cues too: the transcript paragraphs that filters/cues.lua found in the
// recording's cue file. Each gets a ▸ on the transcript's rule that plays from it; when a recording has such cues, its
// timecodes only seek. The cue being heard gets
// the class is-current. With "Follow text" on, the page scrolls to each new cue. Follow is off until the reader turns it
// on, and any scrolling of their own (wheel, touch, keys, the scroll bar) turns it off again until they ask for it.
(function () {
  var players = Array.prototype.slice.call(document.querySelectorAll('.player[data-for]'));
  if (!players.length) return;
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var SPEEDS = [1, 1.25, 1.5, 2, 0.75];
  var PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 2.5v11l9-5.5z"/></svg>';
  var PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';
  var all = [];
  var active = null;   // the player played last: the only one that docks
  var follow = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clock(s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60);
  }
  function spoken(s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), parts = [];
    if (h) parts.push(h + (h === 1 ? ' hour' : ' hours'));
    if (m) parts.push(m + (m === 1 ? ' minute' : ' minutes'));
    parts.push((s % 60) + (s % 60 === 1 ? ' second' : ' seconds'));
    return parts.join(' ');
  }
  function button(className, label, html) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    if (label) b.setAttribute('aria-label', label);
    b.innerHTML = html;
    return b;
  }
  // "AYA NASSAR:" -> "Aya Nassar"
  function speakerName(text) {
    return text.replace(/:\s*$/, '').toLowerCase().replace(/(^|[\s'-])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function speakerOf(para) {
    var p = para && para.querySelector('p');
    if (!p) return '';
    var link = p.querySelector('.para-link'), node = link ? link.nextSibling : p.firstChild;
    while (node && node.nodeType === 3 && !node.textContent.trim()) node = node.nextSibling;
    var text = node && node.nodeName === 'STRONG' ? node.textContent.trim() : '';
    return /^[A-Z][A-Z .’'-]+:$/.test(text) ? speakerName(text) : '';
  }
  // what the bar says about a cue: the speaker and the paragraph ("Aya Nassar · para. 17")
  function describe(el) {
    var para = el.classList.contains('para') ? el : el.closest('.para');
    if (!para) {   // a timecode on its own line: the paragraph it introduces
      for (var next = el.nextElementSibling; next && !para; next = next.nextElementSibling) if (next.classList.contains('para')) para = next;
    }
    if (!para) return '';
    var speaker = '';
    for (var p = para; p && !speaker; p = p.previousElementSibling) if (p.classList.contains('para')) speaker = speakerOf(p);
    var link = para.querySelector('.para-link');
    var n = link && link.getAttribute('data-n');
    return [speaker, n ? 'para. ' + n : ''].filter(Boolean).join(' · ');
  }

  function cuesFor(id) {
    var list = Array.prototype.slice.call(document.querySelectorAll('[data-cue-for="' + id + '"][data-cue-start]')).map(function (el) {
      return { start: Number(el.getAttribute('data-cue-start')), end: Number(el.getAttribute('data-cue-end')) || Infinity, el: el, paragraph: true };
    });
    if (!list.length) {
      list = Array.prototype.slice.call(document.querySelectorAll('a.timecode[href="#' + id + '"]')).map(function (a) {
        return { start: Number(a.getAttribute('data-seconds')), end: Infinity, el: a.closest('p') || a };
      });
    }
    return list.filter(function (c) { return isFinite(c.start); }).sort(function (a, b) { return a.start - b.start; });
  }

  function setFollow(on) {
    follow = on;
    all.forEach(function (p) { if (p.followButton) p.followButton.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (on && active) active.scrollToCue();
  }
  // The reader's own scrolling turns Follow off. The page's own scrolling never does: it is not a wheel, touch or key.
  function readerScrolled() { if (follow) setFollow(false); }
  function interactive(el) { return el && el.closest && el.closest('input, textarea, select, button, a[href], [contenteditable], .player'); }
  var SCROLL_KEYS = { PageUp: 1, PageDown: 1, Home: 1, End: 1, ArrowUp: 1, ArrowDown: 1, ' ': 1 };
  window.addEventListener('wheel', readerScrolled, { passive: true });
  window.addEventListener('touchmove', readerScrolled, { passive: true });
  window.addEventListener('keydown', function (e) { if (SCROLL_KEYS[e.key] && !interactive(e.target)) readerScrolled(); });
  window.addEventListener('mousedown', function (e) { if (e.target === root || e.clientX >= root.clientWidth) readerScrolled(); });   // the scroll bar
  window.addEventListener('hashchange', readerScrolled);

  function Player(outer) {
    var self = this;
    var audio = document.getElementById(outer.getAttribute('data-for'));
    if (!audio || typeof audio.play !== 'function') return;
    var title = audio.getAttribute('aria-label') || 'Recording';
    var length = Number(outer.getAttribute('data-duration')) || 0;
    var cues = cuesFor(audio.id), current = null, started = false, closed = false, visible = true, dragging = false;
    self.audio = audio;

    // the controls, around the <audio>, which loses its own controls (and is then not shown)
    var dock = document.createElement('div');
    dock.className = 'player__dock';
    dock.setAttribute('role', 'group');
    dock.setAttribute('aria-label', 'Player: ' + title);
    var now = document.createElement('p');
    now.className = 'player__now';
    var nowTitle = document.createElement('span');
    nowTitle.className = 'player__title';
    nowTitle.textContent = title;
    var nowWhere = document.createElement('span');
    nowWhere.className = 'player__where';
    now.appendChild(nowTitle);
    now.appendChild(nowWhere);
    var controls = document.createElement('div');
    controls.className = 'player__controls';
    var play = button('player__play', 'Play', PLAY);
    var time = document.createElement('span');
    time.className = 'player__time';
    var seek = document.createElement('input');
    seek.type = 'range';
    seek.className = 'player__seek';
    seek.min = '0';
    seek.step = '1';
    seek.value = '0';
    seek.setAttribute('aria-label', 'Position in the recording');
    var back = button('player__skip', 'Back 15 seconds', '−15');
    var forward = button('player__skip', 'Forward 15 seconds', '+15');
    var speed = button('player__speed', '', '1×');
    var close = button('player__close', 'Stop and close the player bar', '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>');
    var message = document.createElement('p');
    message.className = 'player__message';
    message.hidden = true;
    // On a narrow player (a phone) the controls are one line: play, time, position, "More" and, when docked, ×. The
    // others (back, forward, speed, Follow text) wait in a small panel that "More" opens. On a wide player they sit in
    // the line itself and "More" is hidden. Both are the same buttons, so nothing moves when the player docks.
    var moreButton = button('player__more-toggle', 'More controls', '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="3" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="13" cy="8" r="1.4"/></svg>');
    var more = document.createElement('div');
    more.className = 'player__more';
    more.id = audio.id + '-more';
    moreButton.setAttribute('aria-expanded', 'false');
    moreButton.setAttribute('aria-controls', more.id);
    var moreNow = document.createElement('p');   // the panel says what is playing, which the one-line bar has no room for
    moreNow.className = 'player__more-now';
    var moreTitle = document.createElement('span');
    moreTitle.className = 'player__title';
    moreTitle.textContent = title;
    var moreWhere = document.createElement('span');
    moreWhere.className = 'player__where';
    moreNow.appendChild(moreTitle);
    moreNow.appendChild(moreWhere);
    more.appendChild(moreNow);
    [play, time, seek, moreButton, more].forEach(function (el) { controls.appendChild(el); });
    [back, forward, speed].forEach(function (el) { more.appendChild(el); });
    if (cues.length) {
      self.followButton = button('player__follow', '', 'Follow text');
      self.followButton.setAttribute('aria-pressed', follow ? 'true' : 'false');
      self.followButton.addEventListener('click', function () { setFollow(!follow); });
      more.appendChild(self.followButton);
    }
    controls.appendChild(close);
    function setMore(open) {
      moreButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      dock.classList.toggle('is-more-open', open);
    }
    moreButton.addEventListener('click', function () { setMore(moreButton.getAttribute('aria-expanded') !== 'true'); });
    dock.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dock.classList.contains('is-more-open')) { setMore(false); moreButton.focus(); }
    });
    document.addEventListener('click', function (e) { if (!controls.contains(e.target)) setMore(false); });
    outer.insertBefore(dock, audio);
    dock.appendChild(now);
    dock.appendChild(controls);
    dock.appendChild(message);
    dock.appendChild(audio);
    audio.removeAttribute('controls');
    outer.classList.add('is-ready');

    // a ▸ on the transcript's rule beside every timed paragraph: plays from its start (focus stays on the ▸)
    cues.forEach(function (cue) {
      if (!cue.paragraph) return;
      var link = cue.el.querySelector('.para-link'), n = link && link.getAttribute('data-n');
      var b = button('para-play', 'Play from paragraph ' + (n || ''), PLAY);
      b.addEventListener('click', function () { self.playFrom(cue.start); });
      cue.el.insertBefore(b, cue.el.firstChild);
    });

    function duration() { return isFinite(audio.duration) && audio.duration > 0 ? audio.duration : length; }
    function showTime() {
      var t = audio.currentTime, d = duration();
      time.textContent = clock(t) + ' / ' + (d ? clock(d) : '–:––');
      if (d) seek.max = String(Math.round(d));
      if (!dragging) seek.value = String(Math.round(t));
      seek.setAttribute('aria-valuetext', spoken(t) + (d ? ' of ' + spoken(d) : ''));
    }
    function showState() {
      var playing = !audio.paused && !audio.ended;
      play.innerHTML = playing ? PAUSE : PLAY;
      play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      outer.classList.toggle('is-playing', playing);
    }
    function showSpeed() {
      var r = audio.playbackRate;
      speed.textContent = r + '×';
      speed.setAttribute('aria-label', 'Speed ' + r + ' times');
    }

    // the cue being heard
    function cueAt(t) {
      var found = null;
      for (var i = 0; i < cues.length && cues[i].start <= t + 0.25; i++) found = cues[i];
      return found && t < found.end + 0.25 ? found : null;   // an untimed paragraph leaves a gap: nothing is marked
    }
    function showCue() {
      var cue = started && self === active ? cueAt(audio.currentTime) : null;   // only the recording played last is marked
      if (cue === current) return;
      if (current) current.el.classList.remove('is-current');
      current = cue;
      if (cue) cue.el.classList.add('is-current');
      nowWhere.textContent = moreWhere.textContent = cue ? describe(cue.el) : '';
      if (cue && follow && self === active) self.scrollToCue();
    }
    self.clearCue = function () {   // another recording is playing: only its passage is marked
      if (current) current.el.classList.remove('is-current');
      current = null;
      nowWhere.textContent = moreWhere.textContent = '';
    };
    self.scrollToCue = function () {
      if (!current) return;
      var el = current.el, tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
      el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    };

    // docking
    function dockHeight() { root.style.setProperty('--docked-player-height', dock.offsetHeight + 'px'); }
    self.updateDock = function () {
      var want = self === active && !visible && started && !closed && !audio.ended;
      if (want === dock.classList.contains('is-docked')) return;
      if (want) {
        outer.style.height = outer.offsetHeight + 'px';   // keep the player's place in the page
        dock.classList.add('is-docked');
        root.classList.add('has-docked-player');
        dockHeight();
      } else {
        dock.classList.remove('is-docked');
        outer.style.height = '';
        if (!all.some(function (p) { return p !== self && p.isDocked(); })) root.classList.remove('has-docked-player');
      }
    };
    self.isDocked = function () { return dock.classList.contains('is-docked'); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        self.updateDock();
      }).observe(outer);
    }
    window.addEventListener('resize', function () { if (self.isDocked()) dockHeight(); });

    self.playFrom = function (seconds) {
      audio.currentTime = seconds;   // before the metadata has loaded, this sets where playback will start
      started = true;
      showTime();
      showCue();
      if (audio.readyState < 1) {
        audio.addEventListener('loadedmetadata', function () {
          if (Math.abs(audio.currentTime - seconds) > 1) audio.currentTime = seconds;
        }, { once: true });
      }
      self.play();
    };
    self.play = function () {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    };

    play.addEventListener('click', function () { if (audio.paused || audio.ended) self.play(); else audio.pause(); });
    back.addEventListener('click', function () { audio.currentTime = Math.max(0, audio.currentTime - 15); });
    forward.addEventListener('click', function () { audio.currentTime = Math.min(duration() || Infinity, audio.currentTime + 15); });
    speed.addEventListener('click', function () {
      var r = SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length] || 1;
      audio.playbackRate = audio.defaultPlaybackRate = r;
      showSpeed();
    });
    close.addEventListener('click', function () {
      audio.pause();
      closed = true;
      self.updateDock();
      play.focus();   // the bar's × is gone, so focus goes to the player's own play button, back in its place
    });
    seek.addEventListener('pointerdown', function () { dragging = true; });
    seek.addEventListener('input', function () {
      audio.currentTime = Number(seek.value);
      showTime();
    });
    seek.addEventListener('change', function () { dragging = false; });

    audio.addEventListener('play', function () {
      all.forEach(function (p) { if (p !== self) { if (!p.audio.paused) p.audio.pause(); p.clearCue(); } });
      var previous = active;
      active = self;
      started = true;
      closed = false;
      if (previous && previous !== self) previous.updateDock();
      self.updateDock();
      showCue();
      mediaSession();
    });
    audio.addEventListener('pause', showState);
    audio.addEventListener('playing', showState);
    audio.addEventListener('play', showState);
    audio.addEventListener('ended', function () { showState(); self.updateDock(); });
    audio.addEventListener('timeupdate', function () { showTime(); showCue(); });
    audio.addEventListener('seeked', function () { showTime(); showCue(); });
    audio.addEventListener('loadedmetadata', showTime);
    audio.addEventListener('durationchange', showTime);
    audio.addEventListener('ratechange', showSpeed);
    var failed = function () {
      var src = audio.currentSrc || (audio.querySelector('source') || {}).src;
      message.hidden = false;
      message.innerHTML = 'The recording could not be loaded. ';
      if (src) {
        var a = document.createElement('a');
        a.href = src;
        a.textContent = 'Open the audio file';
        message.appendChild(a);
      }
    };
    audio.addEventListener('error', failed);
    Array.prototype.forEach.call(audio.querySelectorAll('source'), function (s) { s.addEventListener('error', failed); });

    // the phone's lock screen and the keyboard's media keys
    function mediaSession() {
      if (!('mediaSession' in navigator) || typeof MediaMetadata !== 'function') return;
      var book = document.querySelector('.site-title');
      navigator.mediaSession.metadata = new MediaMetadata({ title: title, artist: book ? book.textContent.trim() : '' });
      var handlers = {
        play: function () { self.play(); },
        pause: function () { audio.pause(); },
        seekbackward: function () { back.click(); },
        seekforward: function () { forward.click(); },
        seekto: function (d) { if (d.seekTime != null) audio.currentTime = d.seekTime; },
      };
      Object.keys(handlers).forEach(function (k) { try { navigator.mediaSession.setActionHandler(k, handlers[k]); } catch (e) {} });
    }

    showTime();
    showState();
    showSpeed();
    all.push(self);
  }

  players.forEach(function (outer) { new Player(outer); });

  // A timecode in a transcript plays its recording from that moment. Without JavaScript it is a link to the player.
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a.timecode');
    if (!link) return;
    var id = link.hash.slice(1);
    var player = all.filter(function (p) { return p.audio.id === id; })[0];
    if (!player) return;
    event.preventDefault();
    player.playFrom(Number(link.getAttribute('data-seconds')));
  });
})();
