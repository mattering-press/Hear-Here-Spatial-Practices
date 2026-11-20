// Zoomable figures. Every <figure data-tiles="…/info.json"> gets a Zoom button that opens the image's
// static IIIF tiles in a full-window <dialog>. OpenSeadragon (assets/osd/) is loaded only when a dialog is
// first opened. Escape or the Close button closes the dialog and puts the focus back on the Zoom button.
// Without JavaScript the figure is a plain image with its caption.
(function () {
  var figures = document.querySelectorAll('figure[data-tiles]');
  if (!figures.length || typeof HTMLDialogElement !== 'function') return;
  var assets = new URL('./', document.currentScript.src);
  var dialog, title, stage, viewer, opener, loading;

  function loadViewer() {
    return loading || (loading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = new URL('osd/openseadragon.min.js', assets).href;
      script.onload = resolve;
      script.onerror = function () { loading = null; reject(new Error('OpenSeadragon did not load')); };
      document.head.appendChild(script);
    }));
  }

  function makeDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'zoom-dialog';
    dialog.setAttribute('aria-labelledby', 'zoom-dialog-title');
    dialog.innerHTML = '<div class="zoom-dialog__bar"><p class="zoom-dialog__title" id="zoom-dialog-title"></p>' +
      '<button type="button" class="zoom-dialog__close">Close</button></div><div class="zoom-dialog__viewer"></div>';
    title = dialog.querySelector('.zoom-dialog__title');
    stage = dialog.querySelector('.zoom-dialog__viewer');
    dialog.querySelector('.zoom-dialog__close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('close', function () {
      if (viewer) { viewer.destroy(); viewer = null; }
      stage.textContent = '';
      if (opener) opener.focus();
    });
    document.body.appendChild(dialog);
  }

  function open(figure, button) {
    if (!dialog) makeDialog();
    opener = button;
    title.textContent = button.dataset.label;
    dialog.showModal();
    var info = new URL(figure.getAttribute('data-tiles'), document.baseURI);
    Promise.all([loadViewer(), fetch(info).then(function (r) { return r.json(); })]).then(function (results) {
      if (!dialog.open || opener !== button) return;
      var tiles = results[1];
      // info.json is static and cannot know where the site is hosted, so its @id is set here from its own URL.
      tiles['@id'] = new URL('.', info).href.replace(/\/$/, '');
      viewer = OpenSeadragon({
        element: stage, tileSources: tiles, prefixUrl: new URL('osd/images/', assets).href,
        showNavigator: false, showFullPageControl: false, visibilityRatio: 0.5
      });
    }).catch(function () { stage.textContent = 'The zoomable image could not be loaded.'; });
  }

  figures.forEach(function (figure) {
    var caption = figure.querySelector('figcaption');
    var label = (caption && caption.textContent.trim()) || figure.querySelector('img').alt || 'Image';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'zoom-button';
    button.dataset.label = label;
    button.textContent = 'Zoom';
    var hidden = document.createElement('span');
    hidden.className = 'visually-hidden';
    hidden.textContent = ': ' + label;
    button.appendChild(hidden);
    button.addEventListener('click', function () { open(figure, button); });
    figure.appendChild(button);
  });
})();
