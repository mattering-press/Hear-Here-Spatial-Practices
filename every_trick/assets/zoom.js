// Pictures (filters/figures.lua writes them; the plan is in DEVELOPMENT.md, "Plan: image display and the zoom viewer").
//
// A zoomable picture, <figure data-tiles="…/info.json">, gets "⤢ Zoom" at the right end of its caption line, which
// opens the zoom viewer; clicking the picture opens it too. The button is the figure's only keyboard stop: the
// picture's link (to its item page, or to its largest image, data-largest), which is what readers without JavaScript
// get, is taken out.
//
// The viewer is a full-window <dialog> on a dark ground, with controls in the shape of the podcast player's. It shows
// the picture's static IIIF tiles with OpenSeadragon (assets/osd/, loaded when the viewer is first opened), and all
// the zoomable pictures of the page are one sequence in page order (OpenSeadragon's sequence mode), so a gallery is a
// run within it.
//  * Top bar: the picture's place in the sequence ("3 / 12"), its item number (the pill of its caption line, a link to
//    its item page), its caption and credit on one line (click or tap it to read it all), and Close. Bottom bar: zoom
//    out, zoom in, fit; full screen; previous and next.
//  * Keys: ← and → previous and next, + and − zoom, Escape closes. On closing, the focus goes to the Zoom button of the
//    picture shown last, scrolled into view.
//  * Touch: while the whole picture is in view, a sideways swipe goes to the next or previous picture; once it is zoomed
//    in, dragging moves it. The ‹ › buttons always work.
//  * The picture already loaded in the page shows at once, and the tiles take its place once they have all arrived.
//    For readers who ask for less motion, zooming jumps instead of gliding.
//  * Not used: OpenSeadragon's own buttons, its reference strip and its collection mode.
//
// An animation, <figure class="animated">, gets a pause button on its caption line, which swaps the animation for its
// first frame (the still that the build makes); readers who ask for less motion start on the still.
(function () {
  var script = document.currentScript;
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ZOOM = 1.6;      // one press of zoom in or zoom out
  var SWIPE = 40;      // px a finger moves sideways to turn to the next picture
  var ICONS = {
    zoom: '<path d="M9 2.5h4.5V7M13.5 2.5 9 7M7 13.5H2.5V9M2.5 13.5 7 9"/>',
    pause: '<path class="is-solid" d="M4 2.5h2.75v11H4zM9.25 2.5H12v11H9.25z"/>',
    play: '<path class="is-solid" d="M4.5 2.25v11.5l9-5.75z"/>',
    close: '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>',
    zoomIn: '<path d="M8 2.75v10.5M2.75 8h10.5"/>',
    zoomOut: '<path d="M2.75 8h10.5"/>',
    fullscreen: '<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>',
    exitFullscreen: '<path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"/>',
    previous: '<path d="M10.25 2.75 5 8l5.25 5.25"/>',
    next: '<path d="M5.75 2.75 11 8l-5.25 5.25"/>',
  };
  function icon(name) { return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>'; }
  function hiddenText(text) {
    var span = document.createElement('span');
    span.className = 'visually-hidden';
    span.textContent = text;
    return span;
  }

  // ---- Animations: a pause button on the caption line -------------------------------------------------------------
  Array.prototype.forEach.call(document.querySelectorAll('figure.animated'), function (figure) {
    var still = figure.querySelector('picture source');   // the first frame, which the stylesheet's media query shows
    if (!still) return;
    var paused = reduceMotion;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'figure-button';
    function show() {
      still.media = paused ? 'all' : 'not all';   // the still, or the animation
      button.innerHTML = icon(paused ? 'play' : 'pause') + (paused ? 'Play' : 'Pause');
      button.appendChild(hiddenText(' the animation'));
    }
    button.addEventListener('click', function () { paused = !paused; show(); });
    figure.insertBefore(button, figure.querySelector('figcaption'));
    show();
  });

  // ---- Zoomable pictures: the Zoom button, and the picture opens the viewer ----------------------------------------
  var figures = Array.prototype.slice.call(document.querySelectorAll('figure[data-tiles]'));
  if (!figures.length || typeof HTMLDialogElement !== 'function') return;
  var assets = new URL('./', script.src);
  // A caption line holds the item's number pill, the caption and the item's credit: the viewer shows each in its place.
  function captionText(caption) {
    if (!caption) return '';
    var copy = caption.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll('.item-number, .item-credit'), function (el) { el.parentNode.removeChild(el); });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }
  function numberOf(caption) {
    var pill = caption && caption.querySelector('.item-number');
    if (!pill) return null;
    var isNew = pill.classList.contains('is-new'), text = isNew ? 'new' : pill.textContent.replace(/\D+/g, '');
    return { text: text, isNew: isNew, href: pill.getAttribute('href'), label: pill.getAttribute('aria-label') || (isNew ? 'New item, not yet numbered' : 'Item ' + text) };
  }
  var items = figures.map(function (figure, index) {
    var link = figure.querySelector('.figure-picture');
    var img = figure.querySelector('img');
    var caption = figure.querySelector('figcaption');
    var credit = caption && caption.querySelector('.item-credit');
    var item = {
      figure: figure, img: img, caption: captionText(caption), alt: img ? img.alt : '', number: numberOf(caption),
      credit: credit ? credit.textContent.replace(/^\s*·\s*/, '').trim() : '',
      tiles: figure.getAttribute('data-tiles'),
      largest: (link && (link.getAttribute('data-largest') || link.getAttribute('href'))) || (img && img.getAttribute('src')),
    };
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'figure-button zoom-button';
    button.innerHTML = icon('zoom') + 'Zoom';
    button.appendChild(hiddenText(': ' + (item.caption || item.alt || 'picture ' + (index + 1))));
    button.addEventListener('click', function () { open(index); });
    figure.insertBefore(button, caption);   // before the caption, which flows beside it: the right end of its first line
    if (link) {
      link.removeAttribute('href');           // no longer a link or a keyboard stop: the Zoom button is
      link.addEventListener('click', function (event) { event.preventDefault(); open(index); });
    }
    figure.classList.add('is-zoomable');
    item.button = button;
    return item;
  });

  // ---- The viewer --------------------------------------------------------------------------------------------------
  var dialog, frame, count, numberLink, captionButton, stage, canvas, preview, message, live, buttons = {};
  var viewer = null, current = 0, expanded = false, loading = null, sources = null, previewTimer = 0, swipe = null, lastTap = 0;

  function loadViewer() {
    return loading || (loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = new URL('osd/openseadragon.min.js', assets).href;
      s.onload = resolve;
      s.onerror = function () { loading = null; reject(new Error('OpenSeadragon did not load')); };
      document.head.appendChild(s);
    }));
  }

  // Every picture's info.json, fetched once. It is static and cannot know where the site is hosted, so its @id is set
  // here from its own URL. A picture whose tiles cannot be read is shown from its largest image instead.
  function loadSources() {
    return sources || (sources = Promise.all(items.map(function (item) {
      var info = new URL(item.tiles, document.baseURI);
      return fetch(info).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }).then(function (tiles) {
        tiles['@id'] = new URL('.', info).href.replace(/\/$/, '');
        return tiles;
      }).catch(function () {
        return { type: 'image', url: new URL(item.largest, document.baseURI).href };
      });
    })));
  }

  // a button of the viewer: its icon, if it has one, and its text (html), which may give way on a narrow screen
  // (class viewer__label); label is its name for screen readers where the text alone would not say enough
  function control(name, label, html) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'viewer__button viewer__' + name.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
    if (label) b.setAttribute('aria-label', label);
    b.innerHTML = (ICONS[name] ? icon(name) : '') + (html || '');
    buttons[name] = b;
    return b;
  }
  function quietly(promise) { if (promise && promise.catch) promise.catch(function () {}); }
  function group(className, list) {
    var g = document.createElement('div');
    g.className = 'viewer__group' + (className ? ' ' + className : '');
    list.forEach(function (b) { g.appendChild(b); });
    return g;
  }
  function setDisabled(b, off) {
    if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
  }
  function usable(b) { return b.getAttribute('aria-disabled') !== 'true'; }

  function makeDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'viewer';
    dialog.setAttribute('aria-labelledby', 'viewer-count viewer-number viewer-caption');
    frame = document.createElement('div');   // what goes full screen (a dialog itself cannot)
    frame.className = 'viewer__frame';
    // top bar: "3 / 12", the item's number, the caption, Close
    var top = document.createElement('div');
    top.className = 'viewer__bar viewer__top';
    count = document.createElement('p');
    count.className = 'viewer__count';
    count.id = 'viewer-count';
    count.innerHTML = '<span aria-hidden="true"></span><span class="visually-hidden"></span>';
    numberLink = document.createElement('a');   // the pill of the picture's caption line: a link to its item page
    numberLink.className = 'viewer__number';
    numberLink.id = 'viewer-number';
    numberLink.hidden = true;
    captionButton = document.createElement('button');
    captionButton.type = 'button';
    captionButton.className = 'viewer__caption';
    captionButton.id = 'viewer-caption';
    captionButton.addEventListener('click', function () { setExpanded(!expanded); });
    var close = control('close', 'Close', '<span class="viewer__label">Close</span>');
    close.autofocus = true;
    close.addEventListener('click', function () { dialog.close(); });
    top.appendChild(count);
    top.appendChild(numberLink);
    top.appendChild(captionButton);
    top.appendChild(group('', [close]));
    // the picture: OpenSeadragon's canvas, and the picture from the page over it until the tiles have arrived
    stage = document.createElement('div');
    stage.className = 'viewer__stage';
    canvas = document.createElement('div');
    canvas.className = 'viewer__canvas';
    preview = document.createElement('img');
    preview.className = 'viewer__preview';
    preview.alt = '';
    preview.hidden = true;
    message = document.createElement('p');
    message.className = 'viewer__message';
    message.setAttribute('role', 'status');
    message.hidden = true;
    stage.appendChild(canvas);
    stage.appendChild(preview);
    stage.appendChild(message);
    // bottom bar: zoom out, zoom in, fit; full screen; previous, next
    var bottom = document.createElement('div');
    bottom.className = 'viewer__bar viewer__bottom';
    var fit = control('fit', 'Fit the whole picture in view', 'Fit');
    bottom.appendChild(group('', [control('zoomOut', 'Zoom out'), control('zoomIn', 'Zoom in'), fit]));
    var full = group('viewer__screen', [control('fullscreen', 'Full screen', '<span class="viewer__label">Full screen</span>')]);
    if (!document.fullscreenEnabled || typeof frame.requestFullscreen !== 'function') full.hidden = true;
    bottom.appendChild(full);
    var pages = group('viewer__pages', [control('previous', 'Previous picture'), control('next', 'Next picture')]);
    if (items.length < 2) { pages.hidden = true; count.hidden = true; }
    bottom.appendChild(pages);
    live = document.createElement('p');
    live.className = 'visually-hidden';
    live.setAttribute('aria-live', 'polite');
    [top, stage, bottom, live].forEach(function (el) { frame.appendChild(el); });
    dialog.appendChild(frame);

    buttons.zoomOut.addEventListener('click', function () { zoom(1 / ZOOM); });
    buttons.zoomIn.addEventListener('click', function () { zoom(ZOOM); });
    fit.addEventListener('click', function () { if (viewer) viewer.viewport.goHome(); });
    buttons.fullscreen.addEventListener('click', function () {
      quietly(document.fullscreenElement ? document.exitFullscreen() : frame.requestFullscreen());
    });
    buttons.previous.addEventListener('click', function () { go(current - 1); });
    buttons.next.addEventListener('click', function () { go(current + 1); });
    document.addEventListener('fullscreenchange', showFullscreen);
    dialog.addEventListener('keydown', onKey, true);
    dialog.addEventListener('close', onClose);
    window.addEventListener('resize', function () { if (dialog.open) measureCaption(); });
    document.body.appendChild(dialog);
  }

  function open(index) {
    if (!dialog) makeDialog();
    current = index;
    message.hidden = true;
    show(index, false);
    root.classList.add('has-viewer');
    dialog.showModal();
    measureCaption();
    Promise.all([loadViewer(), loadSources()]).then(function (results) {
      if (dialog.open && !viewer) start(results[1]);
    }).catch(function () {
      message.textContent = 'The zoom viewer could not be loaded.';
      message.hidden = false;
    });
  }

  function onClose() {
    if (document.fullscreenElement) quietly(document.exitFullscreen());
    if (viewer) { viewer.destroy(); viewer = null; }
    canvas.textContent = '';
    root.classList.remove('has-viewer');
    // back to the picture shown last, and its Zoom button
    var item = items[current], box = item.figure.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) item.figure.scrollIntoView({ block: 'center' });
    item.button.focus({ preventScroll: true });
  }

  // the bars and the picture from the page, for picture `index`; announce says it to screen readers (not on opening,
  // when the dialog's name says it)
  function show(index, announce) {
    var item = items[index], n = items.length;
    count.firstChild.textContent = (index + 1) + ' / ' + n;
    count.lastChild.textContent = 'Picture ' + (index + 1) + ' of ' + n;
    var number = item.number;
    numberLink.hidden = !number;
    numberLink.textContent = number ? number.text : '';
    numberLink.classList.toggle('is-new', !!(number && number.isNew));
    if (number && number.href) numberLink.href = number.href; else numberLink.removeAttribute('href');
    if (number) numberLink.setAttribute('aria-label', number.label); else numberLink.removeAttribute('aria-label');
    var text = item.caption || item.alt;
    if (item.credit) text = text ? text + ' · ' + item.credit : item.credit;
    captionButton.textContent = text;
    captionButton.hidden = !text;
    expanded = false;
    captionButton.classList.remove('is-expanded');
    labelCanvas();
    setDisabled(buttons.previous, index === 0);
    setDisabled(buttons.next, index === n - 1);
    showPreview(item);
    if (announce) live.textContent = 'Picture ' + (index + 1) + ' of ' + n + (number ? ', ' + number.label.toLowerCase() : '') + (text ? ': ' + text : '');
  }

  // OpenSeadragon's canvas, which takes the focus for moving the picture with ↑ ↓ and W A S D, is named by the alt text
  function labelCanvas() {
    if (!viewer || !viewer.canvas) return;
    var item = items[current];
    viewer.canvas.setAttribute('role', 'img');
    viewer.canvas.setAttribute('aria-label', item.alt || item.caption || 'Picture ' + (current + 1));
  }

  // the caption: one line, with an ellipsis where it is cut; click or tap to read it all. It is a keyboard stop only
  // where there is more to read.
  function setExpanded(on) {
    expanded = on;
    captionButton.classList.toggle('is-expanded', on);
    measureCaption();
  }
  function measureCaption() {
    var cut = !expanded && captionButton.scrollWidth > captionButton.clientWidth + 1;
    var more = expanded || cut;
    captionButton.tabIndex = more ? 0 : -1;
    captionButton.classList.toggle('is-cut', cut);
    if (more) captionButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    else captionButton.removeAttribute('aria-expanded');
  }

  function showPreview(item) {
    clearTimeout(previewTimer);
    var img = item.img;
    if (img && img.complete && img.naturalWidth) {
      preview.src = img.currentSrc || img.src;
      preview.classList.remove('is-gone');
      preview.hidden = false;
    } else {
      preview.hidden = true;
      preview.removeAttribute('src');
    }
  }
  function hidePreview() {
    if (preview.hidden || preview.classList.contains('is-gone')) return;
    preview.classList.add('is-gone');   // fades out (at once for less motion)
    previewTimer = setTimeout(function () { preview.hidden = true; }, reduceMotion ? 0 : 400);
  }

  function showFullscreen() {
    var on = document.fullscreenElement === frame, label = on ? 'Exit full screen' : 'Full screen';
    buttons.fullscreen.innerHTML = icon(on ? 'exitFullscreen' : 'fullscreen') + '<span class="viewer__label">' + label + '</span>';
    buttons.fullscreen.setAttribute('aria-label', label);
  }

  // the whole picture is in view: the zoom is the home zoom and the picture has not been moved (within slack)
  function atHome(slack) {
    var vp = viewer.viewport, home = vp.getHomeBounds();
    return vp.getZoom() <= vp.getHomeZoom() * (1 + slack) && vp.getCenter().distanceTo(home.getCenter()) <= home.width * slack;
  }
  function showZoom() {
    if (!viewer || !viewer.world.getItemAt(0)) return;
    var vp = viewer.viewport, z = vp.getZoom();
    setDisabled(buttons.zoomIn, z >= vp.getMaxZoom() * 0.999);
    setDisabled(buttons.zoomOut, z <= vp.getMinZoom() * 1.001);
  }
  function zoom(factor) {
    if (!viewer || !viewer.world.getItemAt(0) || !usable(factor > 1 ? buttons.zoomIn : buttons.zoomOut)) return;
    viewer.viewport.zoomBy(factor);
    viewer.viewport.applyConstraints();
  }
  function go(index) {
    if (index < 0 || index >= items.length || index === current) return;
    if (viewer) viewer.goToPage(index);   // its 'page' event shows it
    else { current = index; show(index, true); measureCaption(); }
  }

  function onKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    var key = event.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight') go(current + (key === 'ArrowRight' ? 1 : -1));
    else if (key === '+' || key === '=') zoom(ZOOM);
    else if (key === '-' || key === '_' || key === '−') zoom(1 / ZOOM);
    else if (!/^[rRfF]$/.test(key)) return;   // OpenSeadragon's keys for turning and flipping the picture are not used
    event.preventDefault();
    event.stopPropagation();   // before OpenSeadragon, whose arrow keys would move the picture
  }

  function start(list) {
    var options = {
      element: canvas,
      tileSources: list.map(function (source) { return JSON.parse(JSON.stringify(source)); }),
      sequenceMode: true, initialPage: current,
      prefixUrl: new URL('osd/images/', assets).href,
      showNavigationControl: false, showSequenceControl: false, showReferenceStrip: false, showNavigator: false,
      visibilityRatio: 1, constrainDuringPan: true, minZoomImageRatio: 1,
    };
    if (reduceMotion) {   // zooming and moving jump instead of gliding
      options.animationTime = 0;
      options.gestureSettingsTouch = { flickEnabled: false };
    }
    viewer = OpenSeadragon(options);
    labelCanvas();
    viewer.addHandler('page', function (event) {
      current = event.page;
      message.hidden = true;
      show(current, true);
      measureCaption();
    });
    viewer.addHandler('open', function () {
      var image = viewer.world.getItemAt(0);
      showZoom();
      if (image) image.whenFullyLoaded(function () { if (viewer && viewer.world.getItemAt(0) === image) hidePreview(); });
    });
    viewer.addHandler('open-failed', function () {
      message.textContent = 'This picture could not be loaded for zooming.';
      message.hidden = false;
    });
    // the reader zooms or moves the picture: the tiles show at once, without the picture from the page over them
    function moved() { if (viewer.world.getItemAt(0) && !atHome(0.001)) hidePreview(); showZoom(); }
    viewer.addHandler('zoom', moved);
    viewer.addHandler('pan', moved);
    // Swipes. While the whole picture is in view, a drag does not move it: on a touch screen (or with a pen) a sideways
    // one turns to the next or previous picture. A double tap and drag zooms, as OpenSeadragon has it.
    viewer.addHandler('canvas-click', function (event) { if (event.quick) lastTap = Date.now(); });
    viewer.addHandler('canvas-press', function (event) {
      var zooming = event.pointerType !== 'mouse' && Date.now() - lastTap < 300;
      swipe = !zooming && viewer.world.getItemAt(0) && atHome(0.05) ? { x: event.position.x, y: event.position.y, touch: event.pointerType !== 'mouse' } : null;
    });
    viewer.addHandler('canvas-drag', function (event) {
      if (!swipe) return;
      if (!atHome(0.05)) { swipe = null; return; }   // zoomed in meanwhile (a pinch): dragging moves the picture
      event.preventDefaultAction = true;
    });
    viewer.addHandler('canvas-drag-end', function (event) {
      if (!swipe) return;
      var dx = event.position.x - swipe.x, dy = event.position.y - swipe.y, touch = swipe.touch;
      swipe = null;
      event.preventDefaultAction = true;
      if (touch && Math.abs(dx) > SWIPE && Math.abs(dx) > 1.5 * Math.abs(dy)) go(current + (dx < 0 ? 1 : -1));
    });
    viewer.addHandler('canvas-pinch', function () { swipe = null; });
  }
})();
