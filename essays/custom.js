/*
# @name: custom.js
# @creation_date: 2025-06-23
# @license: The MIT License <https://opensource.org/licenses/MIT>
# @author: Simon Bowie <simon.bowie.19@gmail.com>
# @purpose: custom JavaScript for various functions to enhance the Juncture publication
# @acknowledgements:
# https://css-tricks.com/lets-create-a-custom-audio-player/
*/

// THE BOOK HAS MOVED: send every visitor of the Juncture version to the new home page. Only Juncture loads this
// file; the static edition at hearhere.matteringpress.org does not.
if (/(^|\.)juncture-digital\.org$/.test(location.hostname)) {
  location.replace('https://hearhere.matteringpress.org/');
}

// WRAP TRANSCRIPT SECTIONS OF THE PAGE IN A DIV WITH A SPECIFIC CLASS
document.addEventListener('DOMContentLoaded', () => {
  const h1s = document.querySelectorAll('h1');
  let transcriptHeader = null;

  for (let i = 0; i < h1s.length; i++) {
    if (h1s[i].textContent.trim() === 'Transcript') {
      transcriptHeader = h1s[i];
      const nextH1 = h1s[i + 1] || null;

      const wrapper = document.createElement('div');
      wrapper.className = 'transcript';

      let node = transcriptHeader.nextSibling;
      while (node && node !== nextH1) {
        const nextNode = node.nextSibling;
        wrapper.appendChild(node);
        node = nextNode;
      }

      transcriptHeader.parentNode.insertBefore(wrapper, transcriptHeader.nextSibling);
      break;
    }
  }
});

// FIND AUDIO TIMECODES IN HTML AND ADD LINKS TO JUMP TO THAT POINT IN THE AUDIO
document.addEventListener('DOMContentLoaded', () => {
  wrapTimecodesWithLinks();
});

function wrapTimecodesWithLinks() {
  const timecodeRegex = /\[(\d{2}):(\d{2}):(\d{2})\]/;

  // Select all <p> elements
  const strongs = document.querySelectorAll('p');

  strongs.forEach(p => {
    const match = p.textContent.match(timecodeRegex);

    if (match) {
      const [fullMatch, hh, mm, ss] = match;
      const totalSeconds = parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss);

      // Create the <a> element
      const a = document.createElement('a');
      a.href = '#';
      a.setAttribute('onclick', `seekAudio(event, ${totalSeconds})`);
      a.textContent = fullMatch; // Show [00:10:13] as visible text

      // Replace the timecode inside the <p> with the <a>
      p.innerHTML = p.innerHTML.replace(fullMatch, a.outerHTML);
    }
  });
}

// JUMP TO THE POINT SPECIFIED IN THE AUDIO 
function seekAudio(event, seconds, index = 0) {
  event.preventDefault();
  const audios = document.querySelectorAll('audio.podcast-player');
  const audio = audios[index];
  if (audio) {
    audio.currentTime = seconds;
    audio.play();
  }
}

// MODERN AUDIO PLAYER OPTIMISED FOR PODCASTS
(() => {
  // Inject Font Awesome (once)
  if (!document.getElementById('fa-css')) {
    const faLink = document.createElement('link');
    faLink.id = 'fa-css';
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(faLink);
  }

  const style = document.createElement('style');
  style.textContent = `
    .audio-player {
      background: #1e1e1e;
      border-radius: 15px;
      padding: 20px 30px;
      width: 80%;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: white;
      margin: 20px auto;
      font-family: 'Roboto', sans-serif;
    }
    .controls {
      display: flex;
      justify-content: center;
      gap: 30px;
    }
    button {
      background: #2a2a2a;
      border: none;
      color: white;
      font-size: 28px;
      padding: 10px 16px;
      border-radius: 50%;
      cursor: pointer;
      transition: background 0.3s ease;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    button:hover {
      background: #3d3d3d;
    }
    button:focus {
      outline: none;
      box-shadow: 0 0 8px #f6a945;
    }
    .speed-btn {
      font-size: 18px;
      width: auto;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: 600;
    }
    .progress-container {
      width: 100%;
      height: 8px;
      background: #333;
      border-radius: 4px;
      cursor: pointer;
      position: relative;
    }
    .progress {
      height: 100%;
      background: #f6a945;
      width: 0%;
      border-radius: 4px;
      transition: width 0.1s linear;
    }
    .time {
      font-size: 12px;
      color: #bbb;
      display: flex;
      justify-content: space-between;
      font-variant-numeric: tabular-nums;
    }
  `;
  document.head.appendChild(style);

  const players = document.querySelectorAll('audio.podcast-player');

  players.forEach((audio, index) => {
    // Create wrapper
    const container = document.createElement('div');
    container.className = 'audio-player';
    audio.parentNode.insertBefore(container, audio);
    container.appendChild(audio);

    const controls = document.createElement('div');
    controls.className = 'controls';

    const speeds = [1, 1.25, 1.5, 1.75, 2];
    let speedIndex = 0;

    function createFAButton(faClass, aria, title = '') {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', aria);
      if (title) btn.title = title;
      const icon = document.createElement('i');
      icon.className = faClass;
      btn.appendChild(icon);
      return btn;
    }

    const backBtn = createFAButton('fas fa-backward', 'Back 10s', 'Back 10s');
    const playBtn = createFAButton('fas fa-play', 'Play', 'Play/Pause');
    const forwardBtn = createFAButton('fas fa-forward', 'Forward 10s', 'Forward 10s');

    const speedBtn = document.createElement('button');
    speedBtn.className = 'speed-btn';
    speedBtn.setAttribute('aria-label', 'Playback speed');
    speedBtn.textContent = '1x';

    controls.append(backBtn, playBtn, forwardBtn, speedBtn);
    container.appendChild(controls);

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    const progress = document.createElement('div');
    progress.className = 'progress';
    progressContainer.appendChild(progress);
    container.appendChild(progressContainer);

    const time = document.createElement('div');
    time.className = 'time';
    const currentTimeEl = document.createElement('span');
    currentTimeEl.textContent = '0:00';
    const durationEl = document.createElement('span');
    durationEl.textContent = '0:00';
    time.append(currentTimeEl, durationEl);
    container.appendChild(time);

    // Play/pause toggle
    function setPlayIcon(playing) {
      const icon = playBtn.querySelector('i');
      icon.className = playing ? 'fas fa-pause' : 'fas fa-play';
    }

    // Format time
    function formatTime(t) {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // Event Listeners
    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play();
        setPlayIcon(true);
      } else {
        audio.pause();
        setPlayIcon(false);
      }
    });

    backBtn.addEventListener('click', () => {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    });

    forwardBtn.addEventListener('click', () => {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    });

    speedBtn.addEventListener('click', () => {
      speedIndex = (speedIndex + 1) % speeds.length;
      audio.playbackRate = speeds[speedIndex];
      speedBtn.textContent = speeds[speedIndex] + 'x';
    });

    audio.addEventListener('loadedmetadata', () => {
      durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      const pct = (audio.currentTime / audio.duration) * 100;
      progress.style.width = `${pct}%`;
      currentTimeEl.textContent = formatTime(audio.currentTime);
    });

    progressContainer.addEventListener('click', (e) => {
      const width = progressContainer.clientWidth;
      const clickX = e.offsetX;
      audio.currentTime = (clickX / width) * audio.duration;
    });

    // Initialize play icon
    setPlayIcon(false);
  });
  
  scanAndAddCueMarkers();

})();

// SHOW REPOSITORY IMAGES DIRECTLY IF JUNCTURE'S IIIF IMAGE SERVICE IS UNAVAILABLE
(() => {
  const repository = 'gh:mattering-press/Hear-Here-Spatial-Practices/';
  const ref = new URLSearchParams(location.search).get('ref') || 'main';
  const rawBase = `https://raw.githubusercontent.com/mattering-press/Hear-Here-Spatial-Practices/${encodeURIComponent(ref)}/`;
  let checking = false;
  let useFallback = false;

  const directUrl = source => source?.startsWith(repository)
    ? rawBase + source.slice(repository.length).split('/').map(encodeURIComponent).join('/')
    : null;

  function showDirectImages() {
    document.querySelectorAll('ve-header[background^="gh:"]').forEach(header => {
      if (header.dataset.imageFallback) return;
      const url = directUrl(header.getAttribute('background'));
      if (!url) return;
      header.dataset.imageFallback = 'true';
      header.style.backgroundImage = `url("${url}")`;
      header.style.backgroundPosition = 'center';
      header.style.backgroundSize = 'cover';
      header.style.backgroundRepeat = 'no-repeat';
    });

    document.querySelectorAll('ve-media[src^="gh:"]').forEach(media => {
      if (media.dataset.imageFallback) return;
      const url = directUrl(media.getAttribute('src'));
      if (!url) return;
      media.dataset.imageFallback = 'true';

      const figure = document.createElement('figure');
      const side = media.hasAttribute('right') ? 'right' : media.hasAttribute('left') ? 'left' : 'center';
      figure.className = `media-fallback media-fallback-${side}`;
      figure.style.setProperty('--media-fallback-width', media.getAttribute('width') || (side === 'center' ? '100%' : '50%'));

      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';

      const image = document.createElement('img');
      image.src = url;
      image.alt = media.getAttribute('alt') || media.getAttribute('caption') || '';
      image.loading = 'lazy';
      link.appendChild(image);
      figure.appendChild(link);

      const caption = media.getAttribute('caption');
      if (caption) {
        const label = document.createElement('figcaption');
        label.textContent = caption;
        figure.appendChild(label);
      }

      media.after(figure);
      media.style.display = 'none';
    });

    // Multi-image .ve-media (grid gallery): one "gh:... caption="..."" entry per list item.
    document.querySelectorAll('ve-media:not([src])').forEach(media => {
      if (media.dataset.imageFallback) return;
      const items = galleryItems(media);
      if (!items.length) return;
      media.dataset.imageFallback = 'true';

      const gallery = document.createElement('div');
      gallery.className = 'media-fallback-gallery';
      items.forEach(item => {
        const figure = document.createElement('figure');
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener';
        const image = document.createElement('img');
        image.src = item.url;
        image.alt = item.caption;
        image.loading = 'lazy';
        link.appendChild(image);
        figure.appendChild(link);
        gallery.appendChild(figure);
      });

      media.after(gallery);
      media.style.display = 'none';
    });
  }

  function galleryItems(media) {
    return Array.from(media.querySelectorAll('li'))
      .map(li => {
        const text = li.textContent.replace(/[“”]/g, '"').trim();
        const url = directUrl(text.split(/\s+/)[0]);
        const caption = (text.match(/caption="([^"]*)"/) || [])[1] || '';
        return url ? { url, caption } : null;
      })
      .filter(Boolean);
  }

  function firstRepositorySource() {
    const image = document.querySelector('ve-header[background^="gh:"], ve-media[src^="gh:"]');
    if (image) return image.getAttribute('background') || image.getAttribute('src');
    const item = Array.from(document.querySelectorAll('ve-media:not([src]) li'))
      .map(li => li.textContent.trim().split(/\s+/)[0])
      .find(source => source.startsWith(repository));
    return item || null;
  }

  function checkImageService() {
    if (checking || useFallback) return;
    const source = firstRepositorySource();
    if (!source) return;
    checking = true;
    fetch(`https://iiif.juncture-digital.org/${source}/manifest.json`, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`IIIF returned ${response.status}`);
      })
      .catch(() => {
        useFallback = true;
        showDirectImages();
      });
  }

  const observer = new MutationObserver(() => useFallback ? showDirectImages() : checkImageService());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkImageService, { once: true });
  } else {
    checkImageService();
  }
})();

// RETRIEVE TIMECODES FROM THE PAGE AND INSERT CUE MARKERS IN THE AUDIO PLAYER AT THOSE TIMECODES
function scanAndAddCueMarkers() {
  const playerContainer = document.querySelector('.audio-player');
  if (!playerContainer) return;

  const audio = playerContainer.querySelector('audio');
  const progressContainer = playerContainer.querySelector('.progress-container');
  if (!audio || !progressContainer) return;

  const cueTags = Array.from(document.querySelectorAll('p')).filter(p =>
    /^\[(\d{2}):(\d{2}):(\d{2})\]$/.test(p.textContent.trim())
  );

  function addMarkers() {
    const duration = audio.duration;
    if (!duration || isNaN(duration)) return;

    cueTags.forEach(p => {
      const match = p.textContent.trim().match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
      if (!match) return;

      const [_, hh, mm, ss] = match.map(Number);
      const seconds = hh * 3600 + mm * 60 + ss;
      const pct = (seconds / duration) * 100;

      const marker = document.createElement('div');
      marker.className = 'cue-marker';
      marker.title = p.textContent;
      marker.style.position = 'absolute';
      marker.style.top = 0;
      marker.style.bottom = 0;
      marker.style.width = '5px';
      marker.style.background = '#f6a945';
      marker.style.left = `${pct}%`;
      marker.style.pointerEvents = 'none'; 
      marker.style.zIndex = 1;                    

      marker.addEventListener('click', () => {
        audio.currentTime = seconds;
        audio.play();
      });

      progressContainer.appendChild(marker);
    });
  }

  if (!isNaN(audio.duration) && audio.duration > 0) {
    addMarkers();
  } else {
    audio.addEventListener('loadedmetadata', addMarkers, { once: true });
  }
}

// REWRITE VE-HEADER CSS
(function () {

  const CSS = `
    .flex.items-center.ml-4 {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 0.25rem !important;
    }
    .flex.items-center.ml-4 > .text-4xl {
      line-height: 1.1 !important;
      letter-spacing: -0.01em !important;
    }
    .flex.items-center.ml-4 > div:last-child {
      color: white !important;
      font-size: 1.5rem !important;
      font-weight: 400 !important;
      letter-spacing: 0.22em !important;
      text-transform: uppercase !important;
      font-style: italic !important;
    }
  `;

  function inject() {
    const header = document.querySelector('ve-header[subtitle]');
    if (!header) return;

    const shadow = header.shadowRoot?.querySelector('ve-navbar')?.shadowRoot;
    if (!shadow || shadow.querySelector('#custom-navbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'custom-navbar-styles';
    style.textContent = CSS;
    shadow.appendChild(style);
  }

  [0, 100, 300, 600, 1000, 2000].forEach(delay => setTimeout(inject, delay));

})();

// RESOLVE REPOSITORY-HOSTED VIDEOS, LINKS AND PDF BOOKLETS
// Juncture renders a repository at juncture-digital.org/<owner>/<repository>/...[?ref=<branch>],
// so files are resolved against whichever repository and branch is being viewed (staging or production).
(() => {
  const PDFJS_VERSION = '3.11.174';
  const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/`;

  function repository() {
    const [owner, name] = location.pathname.split('/').filter(Boolean);
    const ref = new URLSearchParams(location.search).get('ref') || 'main';
    return location.hostname.endsWith('juncture-digital.org') && owner && name ? { owner, name, ref } : null;
  }

  const encodePath = path => path.split('/').map(encodeURIComponent).join('/');

  // jsDelivr serves files with their proper media type (needed for video playback and PDF links).
  function cdnUrl(path) {
    const repo = repository();
    return repo
      ? `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.name}@${repo.ref}/${encodePath(path)}`
      : `/${encodePath(path)}`;
  }

  // GitHub raw files update within minutes and allow cross-origin reads.
  function rawUrl(path) {
    const repo = repository();
    return repo
      ? `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.ref}/${encodePath(path)}`
      : `/${encodePath(path)}`;
  }

  function resolveLinks() {
    document.querySelectorAll('a[data-repo-href]:not([href])').forEach(link => {
      link.href = cdnUrl(link.dataset.repoHref);
    });
  }

  function resolveVideos() {
    document.querySelectorAll('video[data-repo-src]').forEach(video => {
      if (video.dataset.resolved) return;
      video.dataset.resolved = 'true';
      const path = video.dataset.repoSrc;
      if (video.dataset.repoPoster) video.poster = cdnUrl(video.dataset.repoPoster);
      [cdnUrl(path), rawUrl(path)].filter((url, i, all) => all.indexOf(url) === i).forEach(url => {
        const source = document.createElement('source');
        source.src = url;
        source.type = 'video/mp4';
        video.appendChild(source);
      });
      video.load();
    });
  }

  let pdfjsPromise = null;
  function loadPdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfjsPromise) {
      pdfjsPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${PDFJS_BASE}pdf.min.js`;
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.js`;
          resolve(window.pdfjsLib);
        };
        script.onerror = () => reject(new Error('Could not load the PDF viewer'));
        document.head.appendChild(script);
      });
    }
    return pdfjsPromise;
  }

  async function fetchPdf(path) {
    for (const url of [rawUrl(path), cdnUrl(path)]) {
      try {
        const response = await fetch(url);
        if (response.ok) return new Uint8Array(await response.arrayBuffer());
      } catch (error) {
        // try the next source
      }
    }
    throw new Error('Could not load the PDF');
  }

  async function renderPdf(figure) {
    const pages = document.createElement('div');
    pages.className = 'pdf-embed-pages';
    pages.setAttribute('role', 'region');
    pages.setAttribute('aria-label', figure.dataset.title || 'PDF document');
    pages.tabIndex = 0;
    const status = document.createElement('div');
    status.className = 'pdf-embed-status';
    status.textContent = 'Loading…';
    pages.appendChild(status);
    figure.insertBefore(pages, figure.firstChild);

    try {
      const [pdfjsLib, data] = await Promise.all([loadPdfjs(), fetchPdf(figure.dataset.repoPdf)]);
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      status.remove();

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          drawPage(pdf, entry.target);
        });
      }, { root: pages, rootMargin: '800px 0px' });

      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        const viewport = page.getViewport({ scale: 1 });
        const holder = document.createElement('div');
        holder.className = 'pdf-embed-page';
        holder.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
        holder.dataset.page = number;
        holder.setAttribute('aria-label', `Page ${number} of ${pdf.numPages}`);
        pages.appendChild(holder);
        observer.observe(holder);
      }
    } catch (error) {
      status.textContent = 'The booklet could not be displayed here. Use the link below to open it.';
    }
  }

  async function drawPage(pdf, holder) {
    const page = await pdf.getPage(Number(holder.dataset.page));
    const base = page.getViewport({ scale: 1 });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const scale = (holder.clientWidth || base.width) * pixelRatio / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    holder.appendChild(canvas);
    holder.style.aspectRatio = '';
  }

  function resolvePdfs() {
    document.querySelectorAll('figure.pdf-embed[data-repo-pdf]').forEach(figure => {
      if (figure.dataset.resolved) return;
      figure.dataset.resolved = 'true';
      renderPdf(figure);
    });
  }

  function resolveAll() {
    resolveLinks();
    resolveVideos();
    resolvePdfs();
  }

  new MutationObserver(resolveAll).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resolveAll, { once: true });
  } else {
    resolveAll();
  }
})();
