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
//
// Documents (filters/embeds.lua writes them; the plan is in DEVELOPMENT.md, "Plan: documents and zines") open in the same
// viewer, which shows their pages' tiles (read/<name>/document.json lists the pages, their tiles and their text).
//  * On an essay page a document is <figure class="document" data-document="…/document.json">: its cover, and on its
//    caption line Text and its download, before which "⤢ Open" is put here. Open, or a click on the cover, opens the
//    viewer in a full-window dialog at the cover; on closing, the focus goes back to Open.
//  * On the document's own page (/read/<name>/) the viewer is in the page, in place of the row of pages that readers
//    without JavaScript get (<div class="document-viewer">). It opens at the page in the address (#page=3) and keeps
//    the address on the page shown. In the page, its keys work while it has the focus, a vertical swipe scrolls the page
//    unless the pages are zoomed in, and the mouse wheel scrolls the page (with Ctrl or ⌘ it zooms).
//  * Pages are shown two by two, as spreads, where the viewer is wider than it is tall (the cover alone, then 2–3, 4–5 …:
//    OpenSeadragon with two tiled images side by side), one at a time where it is not (a phone). The two pages of a spread
//    meet, without a gap, and a soft shadow on each page towards the spine, with a hairline at the spine itself, shows
//    that they are two (div.viewer__spine, an overlay placed in the viewport's coordinates, so that it zooms and moves
//    with the pages). A single page and the cover alone have none.
//  * Its bar: ‹ 4–5 / 21 ›, zoom out, zoom in, fit, full screen, Text (the text of the pages on screen in place of their
//    pictures, and back again) and the download. Keys, swipes and less motion as for pictures; Home and End go to the
//    first and the last pages.
(function () {
  var script = document.currentScript;
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ZOOM = 1.6;      // one press of zoom in or zoom out
  var SWIPE = 40;      // px a finger moves sideways to turn to the next picture
  var SPINE = 0.06;    // how far the shadow at a spread's spine reaches into each page, in the narrower page's width
  var assets = new URL('./', script.src);
  var loading = null;  // OpenSeadragon, once it is asked for
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
    text: '<path d="M3 4h10M3 8h10M3 12h6.5"/>',                         // the same three as filters/embeds.lua's
    download: '<path d="M8 2.5v8M4.75 7.25 8 10.5l3.25-3.25M3 13.5h10"/>',
    external: '<path d="M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v4h-9v-9h4"/>',
  };
  function icon(name) { return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>'; }
  // the size of a file, for people, as the build writes it (media-pages.mjs, sizeText): "0.9 MB", "64 KB"
  function sizeOf(bytes) { return bytes >= 1e5 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1e3)) + ' KB'; }
  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }
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

  // A caption line holds the item's number pill, the caption and the item's credit (and a document's buttons): the viewer
  // shows each in its place.
  function captionText(caption) {
    if (!caption) return '';
    var copy = caption.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll('.item-number, .item-credit, .document__actions'), function (el) { el.parentNode.removeChild(el); });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }
  function creditText(caption) {
    var credit = caption && caption.querySelector('.item-credit');
    return credit ? credit.textContent.replace(/^\s*·\s*/, '').trim() : '';
  }
  function numberOf(caption) {
    var pill = caption && caption.querySelector('.item-number');
    if (!pill) return null;
    var isNew = pill.classList.contains('is-new'), text = isNew ? 'new' : pill.textContent.replace(/\D+/g, '');
    return { text: text, isNew: isNew, href: pill.getAttribute('href'), label: pill.getAttribute('aria-label') || (isNew ? 'New item, not yet numbered' : 'Item ' + text) };
  }

  documents();

  // ---- Zoomable pictures: the Zoom button, and the picture opens the viewer ----------------------------------------
  var figures = Array.prototype.slice.call(document.querySelectorAll('figure[data-tiles]'));
  if (!figures.length || typeof HTMLDialogElement !== 'function') return;
  var items = figures.map(function (figure, index) {
    var link = figure.querySelector('.figure-picture');
    var img = figure.querySelector('img');
    var caption = figure.querySelector('figcaption');
    var item = {
      figure: figure, img: img, caption: captionText(caption), alt: img ? img.alt : '', number: numberOf(caption),
      credit: creditText(caption),
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
  var viewer = null, current = 0, expanded = false, sources = null, previewTimer = 0, swipe = null, lastTap = 0;

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
  // (class viewer__label); label is its name for screen readers where the text alone would not say enough. It is kept
  // in map under its name (the pictures' viewer's buttons, or a document viewer's).
  function control(name, label, html, map) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'viewer__button viewer__' + name.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
    if (label) b.setAttribute('aria-label', label);
    b.innerHTML = (ICONS[name] ? icon(name) : '') + (html || '');
    (map || buttons)[name] = b;
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

  // ---- Documents: Open on an essay page, and the viewer, in a dialog or in the document's own page ---------------------
  function documents() {
    var covers = Array.prototype.slice.call(document.querySelectorAll('figure.document[data-document]'));
    var hosts = Array.prototype.slice.call(document.querySelectorAll('.document-viewer[data-document]'));
    if ((!covers.length && !hosts.length) || typeof window.fetch !== 'function') return;
    var loaded = {}, dialog = null, shown = null, from = null;
    var PAGE = /^#page=(\d+)$/;

    // A document's data (read/<name>/document.json), fetched once. Its URLs are relative to the site's root, as many
    // folders up from it as the document's own address (read/<name>/) has; each page's info.json gets its @id from there.
    function load(url) {
      var href = new URL(url, document.baseURI).href;
      return loaded[href] || (loaded[href] = fetch(href).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }).then(function (data) {
        var site = new URL(data.url.replace(/[^/]+/g, '..'), href);
        data.pages.forEach(function (page) {
          var info = JSON.parse(JSON.stringify(page.info));
          info['@id'] = new URL(page.tiles, site).href.replace(/\/info\.json$/, '');
          page.source = info;
        });
        data.href = /^[a-z][\w+.-]*:/i.test(data.download.url) ? data.download.url : new URL(data.download.url, site).href;
        return data;
      }).catch(function (e) {
        delete loaded[href];
        throw e;
      }));
    }

    // On an essay page: Open on the caption line, and the cover, open the viewer in a dialog, at the cover.
    if (typeof HTMLDialogElement === 'function') covers.forEach(function (figure) {
      var caption = figure.querySelector('figcaption');
      var actions = figure.querySelector('.document__actions') || caption;
      var cover = figure.querySelector('.document__cover');
      var button = el('button', 'figure-button document__open');
      button.type = 'button';
      button.innerHTML = icon('zoom') + 'Open';
      button.appendChild(hiddenText(': ' + (captionText(caption) || 'the document')));
      function open() { openDialog(figure, button); }
      button.addEventListener('click', open);
      actions.insertBefore(button, actions.firstChild);
      if (cover) {
        cover.removeAttribute('href');   // no longer a link or a keyboard stop: Open is
        cover.addEventListener('click', function (event) { event.preventDefault(); open(); });
      }
      figure.classList.add('is-openable');
    });

    function openDialog(figure, button) {
      if (!dialog) {
        dialog = el('dialog', 'viewer viewer--document');
        dialog.setAttribute('aria-labelledby', 'document-number document-caption');
        dialog.addEventListener('close', function () {
          if (document.fullscreenElement) quietly(document.exitFullscreen());
          if (shown) { shown.destroy(); shown = null; }
          dialog.textContent = '';
          root.classList.remove('has-viewer');
          // back to the document, and its Open button
          var box = from.figure.getBoundingClientRect();
          if (box.top < 0 || box.bottom > window.innerHeight) from.figure.scrollIntoView({ block: 'center' });
          from.button.focus({ preventScroll: true });
        });
        document.body.appendChild(dialog);
      }
      var caption = figure.querySelector('figcaption');
      from = { figure: figure, button: button };
      shown = documentViewer({ dialog: dialog, caption: captionText(caption), credit: creditText(caption), number: numberOf(caption) });
      dialog.appendChild(shown.frame);
      root.classList.add('has-viewer');
      dialog.showModal();
      shown.start(load(figure.getAttribute('data-document')), 1);
    }

    // On the document's own page: the viewer in place of the row of pages, at the page in the address (#page=3), which it
    // then keeps on the page shown. Until it is ready, and if it cannot be shown, the row stays.
    hosts.forEach(function (host) {
      var caption = host.parentNode.querySelector('figcaption');
      var at = PAGE.exec(location.hash);
      var viewer = documentViewer({
        inline: true, caption: captionText(caption),
        onPage: function (n) { if (history.replaceState) history.replaceState(null, '', '#page=' + n); },
      });
      host.appendChild(viewer.frame);
      viewer.start(load(host.getAttribute('data-document')), at ? Number(at[1]) : 1,
        function () { host.classList.add('is-live'); },
        function () { host.classList.remove('is-live'); host.removeChild(viewer.frame); });
      window.addEventListener('hashchange', function () {
        var m = PAGE.exec(location.hash);
        if (m) viewer.goToPage(Number(m[1]));
      });
    });
  }

  // One viewer of a document's pages. options: inline (in the page), or dialog (the dialog it is in) with the document's
  // caption, credit and number (numberOf) for its top bar; onPage(n), called with the first page shown after each turn.
  //   -> { frame, start(data, page, ready, failed), goToPage(n), destroy() }
  function documentViewer(options) {
    var buttons = {}, data = null, viewer = null, spreads = [], current = 0, double = false, reading = false, turned = false;
    var swipe = null, lastTap = 0, expanded = false, observer = null, gone = false;
    var spine = el('div', 'viewer__spine'), spineAt = null;   // the spine of the spread on screen: { x, reach }, or null
    var frame = el('div', 'viewer__frame viewer__frame--document' + (options.inline ? ' is-inline' : ''));
    var captionButton = null;
    if (!options.inline) {
      // top bar: the document's number, its caption and credit (click to read it all), Close
      var top = el('div', 'viewer__bar viewer__top');
      var number = options.number, pill = el('a', 'viewer__number' + (number && number.isNew ? ' is-new' : ''));
      pill.id = 'document-number';
      pill.hidden = !number;
      if (number) {
        pill.textContent = number.text;
        pill.setAttribute('aria-label', number.label);
        if (number.href) pill.href = number.href;
      }
      captionButton = el('button', 'viewer__caption');
      captionButton.type = 'button';
      captionButton.id = 'document-caption';
      captionButton.textContent = options.credit ? (options.caption ? options.caption + ' · ' : '') + options.credit : options.caption || '';
      captionButton.addEventListener('click', function () {
        expanded = !expanded;
        captionButton.classList.toggle('is-expanded', expanded);
        measure();
      });
      var close = control('close', 'Close', '<span class="viewer__label">Close</span>', buttons);
      close.autofocus = true;
      close.addEventListener('click', function () { options.dialog.close(); });
      top.appendChild(pill);
      top.appendChild(captionButton);
      top.appendChild(group('', [close]));
      frame.appendChild(top);
    }
    // the pages (OpenSeadragon), or their text
    var stage = el('div', 'viewer__stage');
    var canvas = el('div', 'viewer__canvas');
    var reader = el('div', 'viewer__reader');
    reader.hidden = true;
    reader.tabIndex = 0;
    reader.setAttribute('role', 'region');
    reader.setAttribute('aria-label', 'The text of the pages');
    var message = el('p', 'viewer__message');
    message.setAttribute('role', 'status');
    message.hidden = true;
    stage.appendChild(canvas);
    stage.appendChild(reader);
    stage.appendChild(message);
    // the bar: ‹ 4–5 / 21 ›; zoom out, zoom in, fit; full screen; Text and the download
    var bottom = el('div', 'viewer__bar viewer__bottom');
    var count = el('p', 'viewer__count');
    count.innerHTML = '<span aria-hidden="true"></span><span class="visually-hidden"></span>';
    bottom.appendChild(group('viewer__pages', [control('previous', 'Previous pages', '', buttons), count, control('next', 'Next pages', '', buttons)]));
    bottom.appendChild(group('', [control('zoomOut', 'Zoom out', '', buttons), control('zoomIn', 'Zoom in', '', buttons), control('fit', 'Fit the pages in view', 'Fit', buttons)]));
    var full = group('viewer__screen', [control('fullscreen', 'Full screen', '<span class="viewer__label">Full screen</span>', buttons)]);
    if (!document.fullscreenEnabled || typeof frame.requestFullscreen !== 'function') full.hidden = true;
    bottom.appendChild(full);
    var textButton = control('text', null, 'Text', buttons);
    textButton.setAttribute('aria-pressed', 'false');
    var download = el('a', 'viewer__button viewer__download');
    download.hidden = true;
    bottom.appendChild(group('', [textButton, download]));
    var live = el('p', 'visually-hidden');
    live.setAttribute('aria-live', 'polite');
    frame.appendChild(stage);
    frame.appendChild(bottom);
    frame.appendChild(live);
    ['previous', 'next', 'zoomOut', 'zoomIn', 'fit', 'text'].forEach(function (name) { setDisabled(buttons[name], true); });

    buttons.previous.addEventListener('click', function () { go(current - 1); });
    buttons.next.addEventListener('click', function () { go(current + 1); });
    buttons.zoomOut.addEventListener('click', function () { zoom(1 / ZOOM); });
    buttons.zoomIn.addEventListener('click', function () { zoom(ZOOM); });
    buttons.fit.addEventListener('click', function () { if (viewer && !reading && usable(buttons.fit)) viewer.viewport.goHome(); });
    buttons.fullscreen.addEventListener('click', function () {
      quietly(document.fullscreenElement ? document.exitFullscreen() : frame.requestFullscreen());
    });
    textButton.addEventListener('click', function () { if (data) setReading(!reading); });
    frame.addEventListener('keydown', onKey, true);
    document.addEventListener('fullscreenchange', onFullscreen);

    function start(promise, page, ready, failed) {
      message.textContent = 'Loading the pages…';
      message.hidden = false;
      measure();
      Promise.all([promise, loadViewer()]).then(function (results) {
        if (gone) return;
        data = results[0];
        if (ready) ready();
        setup(page || 1);
      }).catch(function () {
        message.textContent = 'The pages could not be loaded.';
        message.hidden = false;
        if (failed) failed();
      });
    }

    function setup(page) {
      message.hidden = true;
      var external = /^[a-z][\w+.-]*:/i.test(data.download.url);
      download.href = data.href;
      if (!external) download.setAttribute('download', '');
      download.innerHTML = icon(external ? 'external' : 'download') + '<span class="viewer__label">' + (external ? 'archive.org' : 'Download') + '</span>';
      download.setAttribute('aria-label', external ? 'The original, on archive.org' : 'Download the ' + data.download.label + (data.download.size ? ' (' + sizeOf(data.download.size) + ')' : ''));
      download.hidden = false;
      setDisabled(textButton, false);
      arrange(page);
      var o = {
        element: canvas, prefixUrl: new URL('osd/images/', assets).href,
        showNavigationControl: false, showSequenceControl: false, showReferenceStrip: false, showNavigator: false,
        visibilityRatio: 1, constrainDuringPan: true, minZoomImageRatio: 1, viewportMargins: { top: 12, right: 12, bottom: 12, left: 12 },
      };
      if (reduceMotion) {
        o.animationTime = 0;
        o.gestureSettingsTouch = { flickEnabled: false };
      }
      viewer = OpenSeadragon(o);
      viewer.canvas.setAttribute('role', 'img');
      viewer.addHandler('open', function () { markSpine(); showZoom(); touch(); });
      viewer.addHandler('open-failed', function () {
        message.textContent = 'These pages could not be loaded for zooming.';
        message.hidden = false;
      });
      function moved() { showZoom(); touch(); }
      viewer.addHandler('zoom', moved);
      viewer.addHandler('pan', moved);
      // the viewer changes size (full screen, a phone turned on its side): pages that were shown whole fill the new size,
      // once OpenSeadragon has done its own resizing (in the frame it raises this event in)
      viewer.addHandler('resize', function () {
        if (!viewer.world.getItemAt(0) || !atHome(0.05)) return;
        requestAnimationFrame(function () {
          if (!viewer) return;
          viewer.viewport.goHome(true);
          moved();
        });
      });
      // Swipes, as for pictures: while the pages are in view as a whole, a sideways swipe turns them; zoomed in, dragging
      // moves them. A double tap and drag zooms.
      viewer.addHandler('canvas-click', function (event) { if (event.quick) lastTap = Date.now(); });
      viewer.addHandler('canvas-press', function (event) {
        var zooming = event.pointerType !== 'mouse' && Date.now() - lastTap < 300;
        swipe = !zooming && viewer.world.getItemAt(0) && atHome(0.05) ? { x: event.position.x, y: event.position.y, touch: event.pointerType !== 'mouse' } : null;
      });
      viewer.addHandler('canvas-drag', function (event) {
        if (!swipe) return;
        if (!atHome(0.05)) { swipe = null; return; }
        event.preventDefaultAction = true;
      });
      viewer.addHandler('canvas-drag-end', function (event) {
        if (!swipe) return;
        var dx = event.position.x - swipe.x, dy = event.position.y - swipe.y, isTouch = swipe.touch;
        swipe = null;
        event.preventDefaultAction = true;
        if (isTouch && Math.abs(dx) > SWIPE && Math.abs(dx) > 1.5 * Math.abs(dy)) go(current + (dx < 0 ? 1 : -1));
      });
      viewer.addHandler('canvas-pinch', function () { swipe = null; });
      // in the page, the mouse wheel scrolls the page; with Ctrl or ⌘ (and a trackpad's pinch), and in full screen, it zooms
      if (options.inline) {
        viewer.addHandler('canvas-scroll', function (event) {
          var e = event.originalEvent;
          if (document.fullscreenElement === frame || e.ctrlKey || e.metaKey) return;
          event.preventDefaultAction = true;
          event.preventDefault = false;
        });
      }
      show(current, false);
      if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(function () {
          if (!viewer) return;
          if (spreading() !== double) {
            arrange(spreads[current][0] + 1);
            show(current, false);
          }
          measure();
        });
        observer.observe(stage);
      }
    }

    // two pages side by side where the viewer is wider than it is tall, and wide enough; one at a time otherwise
    function spreading() {
      var w = stage.clientWidth, h = stage.clientHeight;
      return w >= 600 && w >= h * 1.15;
    }
    // the spreads (or single pages), and the one that holds page `page`
    function arrange(page) {
      var n = data.pages.length, target = Math.max(1, Math.min(page, n)) - 1, i;
      double = spreading();
      spreads = [];
      if (double) {
        spreads.push([0]);
        for (i = 1; i < n; i += 2) spreads.push(i + 1 < n ? [i, i + 1] : [i]);
      } else {
        for (i = 0; i < n; i++) spreads.push([i]);
      }
      current = 0;
      spreads.forEach(function (spread, k) { if (spread.indexOf(target) >= 0) current = k; });
    }

    // spread `index`: its pages side by side, each as tall as the other, meeting at the spine; the count; the text, when
    // it is shown
    function show(index, announce) {
      current = index;
      var spread = spreads[index], n = data.pages.length, first = spread[0] + 1, last = spread[spread.length - 1] + 1;
      count.firstChild.textContent = (first === last ? first : first + '–' + last) + ' / ' + n;
      var said = (first === last ? 'Page ' + first : 'Pages ' + first + ' and ' + last) + ' of ' + n;
      count.lastChild.textContent = said;
      setDisabled(buttons.previous, index === 0);
      setDisabled(buttons.next, index === spreads.length - 1);
      if (viewer) {
        var x = 0, widths = spread.map(function (i) { return data.pages[i].width / data.pages[i].height; });
        spineAt = spread.length === 2 ? { x: widths[0], reach: SPINE * Math.min(widths[0], widths[1]) } : null;
        viewer.open(spread.map(function (i, k) {
          var item = { tileSource: JSON.parse(JSON.stringify(data.pages[i].source)), x: x, y: 0, height: 1 };
          x += widths[k];
          return item;
        }));
        viewer.canvas.setAttribute('aria-label', said);
      }
      if (reading) readPages();
      if (announce) live.textContent = said;
      if (turned && options.onPage) options.onPage(first);
    }
    // the shadow at the spine, once the spread's pages are open: in the viewport's coordinates, as tall as the pages and
    // reaching SPINE into each, so that OpenSeadragon zooms and moves it with them
    function markSpine() {
      viewer.removeOverlay(spine);
      if (spineAt) viewer.addOverlay({ element: spine, location: new OpenSeadragon.Rect(spineAt.x - spineAt.reach, 0, 2 * spineAt.reach, 1) });
    }
    function go(index) {
      if (!data || index < 0 || index >= spreads.length || index === current) return;
      turned = true;
      show(index, true);
    }
    function goToPage(n) {
      if (!data) return;
      var target = Math.max(1, Math.min(n, data.pages.length)) - 1;
      spreads.forEach(function (spread, k) { if (spread.indexOf(target) >= 0 && k !== current) show(k, true); });
    }

    // Text: the text of the pages on screen, in place of their pictures. A zine has none that can be shown.
    function setReading(on) {
      reading = on;
      textButton.setAttribute('aria-pressed', on ? 'true' : 'false');
      frame.classList.toggle('is-reading', on);
      reader.hidden = !on;
      if (on) readPages();
      showZoom();
      live.textContent = on ? 'The text of these pages' : 'The pictures of these pages';
    }
    function readPages() {
      reader.textContent = '';
      var inner = el('div', 'viewer__reader-inner');
      if (!data.text) {
        var title = el('p', 'viewer__reader-title');
        title.textContent = options.caption || data.title;
        var about = el('p');
        about.textContent = 'The pages of this zine are pictures, and the text that can be recognised in them is not reliable enough to show here. A description of each page will follow.';
        inner.appendChild(title);
        inner.appendChild(about);
      } else {
        spreads[current].forEach(function (i) {
          var page = data.pages[i], heading = el('h2', 'viewer__reader-heading');
          heading.textContent = 'Page ' + (i + 1);
          inner.appendChild(heading);
          if (!page.text || !page.text.length) {
            var none = el('p', 'viewer__reader-empty');
            none.textContent = 'No text on this page.';
            inner.appendChild(none);
          } else {
            page.text.forEach(function (text) { inner.appendChild(linked(text)); });
          }
        });
      }
      reader.appendChild(inner);
      reader.scrollTop = 0;
    }
    // a paragraph of plain text, with its web addresses as links
    function linked(text) {
      var p = el('p'), re = /https?:\/\/[^\s]*[^\s.,;:!?)’”'"]/g, at = 0, m;
      while ((m = re.exec(text))) {
        p.appendChild(document.createTextNode(text.slice(at, m.index)));
        var a = el('a');
        a.href = m[0];
        a.textContent = m[0];
        p.appendChild(a);
        at = m.index + m[0].length;
      }
      p.appendChild(document.createTextNode(text.slice(at)));
      return p;
    }

    // the pages are in view as a whole: the zoom is the home zoom and they have not been moved (within slack)
    function atHome(slack) {
      var vp = viewer.viewport, home = vp.getHomeBounds();
      return vp.getZoom() <= vp.getHomeZoom() * (1 + slack) && vp.getCenter().distanceTo(home.getCenter()) <= home.width * slack;
    }
    function showZoom() {
      var off = !viewer || reading || !viewer.world.getItemAt(0);
      setDisabled(buttons.fit, off);
      if (off) {
        setDisabled(buttons.zoomIn, true);
        setDisabled(buttons.zoomOut, true);
        return;
      }
      var vp = viewer.viewport, z = vp.getZoom();
      setDisabled(buttons.zoomIn, z >= vp.getMaxZoom() * 0.999);
      setDisabled(buttons.zoomOut, z <= vp.getMinZoom() * 1.001);
    }
    function zoom(factor) {
      if (!viewer || reading || !viewer.world.getItemAt(0) || !usable(factor > 1 ? buttons.zoomIn : buttons.zoomOut)) return;
      viewer.viewport.zoomBy(factor);
      viewer.viewport.applyConstraints();
    }
    // In the page, a vertical swipe scrolls the page while the pages are in view as a whole; once they are zoomed in
    // (and in full screen), the viewer takes every touch. While the page may take a swipe, OpenSeadragon's tracker is told
    // so (its cooperative gesture handling), so that it neither holds on to the finger nor warns when the page takes it.
    function touch() {
      if (!options.inline || !viewer) return;
      var share = !!(document.fullscreenElement !== frame && viewer.world.getItemAt(0) && atHome(0.05));
      viewer.canvas.style.touchAction = viewer.container.style.touchAction = share ? 'pan-y' : 'none';
      if (viewer.innerTracker && viewer.innerTracker.setCooperativeGestureHandling) viewer.innerTracker.setCooperativeGestureHandling(share);
    }

    function onKey(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || !data) return;
      var key = event.key;
      if (key === 'ArrowLeft' || key === 'ArrowRight') go(current + (key === 'ArrowRight' ? 1 : -1));
      else if ((key === 'Home' || key === 'End') && !reader.contains(event.target)) go(key === 'Home' ? 0 : spreads.length - 1);
      else if (key === '+' || key === '=') zoom(ZOOM);
      else if (key === '-' || key === '_' || key === '−') zoom(1 / ZOOM);
      else if (!/^[rRfF]$/.test(key)) return;   // OpenSeadragon's keys for turning and flipping the pages are not used
      event.preventDefault();
      event.stopPropagation();   // before OpenSeadragon, whose arrow keys would move the pages
    }
    function onFullscreen() {
      var on = document.fullscreenElement === frame, label = on ? 'Exit full screen' : 'Full screen';
      buttons.fullscreen.innerHTML = icon(on ? 'exitFullscreen' : 'fullscreen') + '<span class="viewer__label">' + label + '</span>';
      buttons.fullscreen.setAttribute('aria-label', label);
      touch();
    }
    // the caption in the top bar: one line, with an ellipsis where it is cut; a keyboard stop only where there is more
    function measure() {
      if (!captionButton) return;
      var cut = !expanded && captionButton.scrollWidth > captionButton.clientWidth + 1, more = expanded || cut;
      captionButton.tabIndex = more ? 0 : -1;
      captionButton.classList.toggle('is-cut', cut);
      if (more) captionButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      else captionButton.removeAttribute('aria-expanded');
    }
    function destroy() {
      gone = true;
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (observer) observer.disconnect();
      if (viewer) { viewer.destroy(); viewer = null; }
    }
    return { frame: frame, start: start, goToPage: goToPage, destroy: destroy };
  }
})();
