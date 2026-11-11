(() => {
  const root = document.querySelector('#collage-prototype');
  if (!root) return;

  const chapterFilters = root.querySelector('[data-chapter-filters]');
  const typeFilters = root.querySelector('[data-type-filters]');
  const collageView = root.querySelector('[data-collage-view]');
  const collageGrid = root.querySelector('[data-collage-grid]');
  const listView = root.querySelector('[data-list-view]');
  const listGroups = root.querySelector('[data-list-groups]');
  const status = root.querySelector('[data-index-status]');
  const groupSelect = root.querySelector('[data-list-group-by]');
  const dialog = root.querySelector('[data-index-dialog]');
  const frame = root.querySelector('[data-dialog-frame]');
  const dialogTitle = root.querySelector('[data-dialog-title]');
  const externalLink = root.querySelector('[data-dialog-external]');
  const rootPrefix = window.location.pathname.includes('/essays/')
    ? window.location.pathname.split('/essays/')[0]
    : '';
  const dataUrl = new URL('./collage-data.json', window.location.href);
  dataUrl.searchParams.set('fmt', 'txt');
  dataUrl.searchParams.set('refresh', 'true');

  let data;
  let activeItemId = null;
  let openedFromIndex = false;
  let returnFocusId = null;

  fetch(dataUrl)
    .then(response => {
      if (!response.ok) throw new Error(`Could not load index data (${response.status})`);
      return response.json();
    })
    .then(indexData => initialise(indexData))
    .catch(error => {
      status.textContent = `The spatial index could not load: ${error.message}`;
    });

  function contentUrl(path) {
    // Juncture serves this repository below /owner/repository; local development uses /.
    const url = new URL(`${rootPrefix}${path}`, window.location.origin);
    if (window.REF && window.REF !== 'main') url.searchParams.set('ref', window.REF);
    return url.href;
  }

  function mediaUrl(path) {
    // Match Juncture's handling of repository images in rendered Markdown.
    const repository = window.PREFIX || rootPrefix.replace(/^\//, '');
    const ref = window.REF || 'main';
    return repository
      ? new URL(`https://raw.githubusercontent.com/${repository}/${ref}${path}`).href
      : contentUrl(path);
  }

  function freshSeed() {
    if (window.crypto?.getRandomValues) return window.crypto.getRandomValues(new Uint32Array(1))[0];
    return Math.floor(Math.random() * 0x100000000);
  }

  function initialise(indexData) {
    data = indexData;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('seed') || !/^\d+$/.test(url.searchParams.get('seed'))) {
      url.searchParams.set('seed', String(freshSeed()));
      history.replaceState({ spatialIndex: true }, '', url);
    }

    addFilters(chapterFilters, 'chapter', data.chapters, 'All chapters');
    addFilters(typeFilters, 'type', data.contentTypes, 'All materials');

    root.querySelectorAll('[data-view-mode]').forEach(button => {
      button.addEventListener('click', () => setState({ view: button.dataset.viewMode }));
    });
    groupSelect.addEventListener('change', render);
    root.querySelector('[data-clear-filters]').addEventListener('click', () => {
      setState({ chapter: 'all', type: 'all' });
    });
    root.querySelector('[data-reshuffle]').addEventListener('click', () => {
      setState({ seed: String(freshSeed()), view: 'collage' });
    });
    root.addEventListener('click', event => {
      const link = event.target.closest('a[data-open-item]');
      if (!link || !root.contains(link) || event.defaultPrevented ||
          event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      returnFocusId = link.dataset.openItem;
      openedFromIndex = true;
      setState({ item: link.dataset.openItem });
    });
    root.querySelector('[data-dialog-close]').addEventListener('click', closeDialog);
    frame.addEventListener('load', prepareEssayFrame);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeDialog();
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });
    window.addEventListener('popstate', () => {
      openedFromIndex = false;
      render();
    });
    render();
  }

  function addFilters(container, group, options, allLabel) {
    [{ id: 'all', label: allLabel }, ...options].forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'index-filter';
      button.dataset.filterValue = option.id;
      button.textContent = option.label;
      button.addEventListener('click', () => setState({ [group]: option.id }));
      container.append(button);
    });
  }

  function state() {
    const params = new URL(window.location.href).searchParams;
    const value = (key, options) => options.includes(params.get(key)) ? params.get(key) : 'all';
    return {
      chapter: value('chapter', ['all', ...data.chapters.map(item => item.id)]),
      type: value('type', ['all', ...data.contentTypes.map(item => item.id)]),
      view: params.get('view') === 'list' ? 'list' : 'collage',
      item: params.get('item'),
      seed: Number(params.get('seed')) >>> 0
    };
  }

  function setState(changes, replace = false) {
    const url = new URL(window.location.href);
    Object.entries(changes).forEach(([key, value]) => {
      if (value == null || (key !== 'seed' && (value === 'all' || value === 'collage'))) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    history[replace ? 'replaceState' : 'pushState']({ spatialIndex: true }, '', url);
    render();
  }

  function render() {
    const selected = state();
    const visible = data.items.filter(item =>
      (selected.chapter === 'all' || item.chapters.includes(selected.chapter)) &&
      (selected.type === 'all' || item.contentTypes.includes(selected.type))
    );
    const essays = visible.filter(item => item.kind === 'essay');
    const arranged = shuffle(visible, hash(`${selected.seed}|${selected.chapter}|${selected.type}`));

    const fragments = arranged.map((item, index) => makeFragment(item, index, selected.seed));
    if (!essays.length) {
      const empty = document.createElement('p');
      empty.className = 'index-empty index-collage-empty';
      empty.textContent = 'No entries match this combination. Try another chapter or material.';
      fragments.push(empty);
    }
    collageGrid.replaceChildren(...fragments);
    renderList(essays);
    collageView.hidden = selected.view !== 'collage';
    listView.hidden = selected.view !== 'list';
    root.querySelector('[data-reshuffle]').hidden = selected.view !== 'collage';
    root.querySelectorAll('[data-view-mode]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.viewMode === selected.view))
    );
    updatePressed(chapterFilters, selected.chapter);
    updatePressed(typeFilters, selected.type);

    const chapter = data.chapters.find(item => item.id === selected.chapter)?.label || 'All chapters';
    const type = data.contentTypes.find(item => item.id === selected.type)?.label || 'All materials';
    status.textContent = `${essays.length} ${essays.length === 1 ? 'entry' : 'entries'} · ${chapter} / ${type}`;
    syncDialog(selected.item);
  }

  function updatePressed(container, id) {
    container.querySelectorAll('button').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.filterValue === id))
    );
  }

  function hash(text) {
    let value = 2166136261;
    for (const character of text) {
      value ^= character.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function random(seed) {
    let value = seed;
    return () => {
      value = (value + 0x6D2B79F5) | 0;
      let result = Math.imul(value ^ (value >>> 15), 1 | value);
      result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
      return ((result ^ (result >>> 14)) >>> 0) / 0x100000000;
    };
  }

  function shuffle(items, seed) {
    const output = [...items];
    const next = random(seed);
    for (let index = output.length - 1; index > 0; index--) {
      const other = Math.floor(next() * (index + 1));
      [output[index], output[other]] = [output[other], output[index]];
    }
    return output;
  }

  function labels(item) {
    const chapters = item.chapters.map(id => data.chapters.find(entry => entry.id === id)?.label || id);
    const types = item.contentTypes.map(id => data.contentTypes.find(entry => entry.id === id)?.label || id);
    return `${chapters.join(' · ')} / ${types.join(' · ')}`;
  }

  function makeFragment(item, index, seed) {
    const next = random(hash(`${seed}|${item.id}`));
    const element = document.createElement(item.kind === 'image' ? 'figure' : item.kind === 'quote' ? 'aside' : 'article');
    element.className = `index-fragment index-fragment--${item.kind} index-fragment--${item.presentation || 'loose'}`;
    element.dataset.itemId = item.id;
    const spans = item.kind === 'essay'
      ? { feature: [6, 7], document: [4, 5], image: [4, 6], text: [3, 4] }[item.presentation || 'image']
      : item.kind === 'image' ? [3, 4] : [3, 5];
    element.style.setProperty('--span', String(spans[Math.floor(next() * spans.length)]));
    element.style.setProperty('--shift', `${Math.round((next() - 0.5) * 34)}px`);
    element.style.setProperty('--tilt', `${((next() - 0.5) * 3).toFixed(2)}deg`);

    if (item.kind === 'image') {
      const image = document.createElement('img');
      image.src = mediaUrl(item.image.src);
      image.alt = '';
      image.loading = index < 3 ? 'eager' : 'lazy';
      const caption = document.createElement('figcaption');
      caption.textContent = item.image.caption;
      element.append(image, caption);
      return element;
    }

    if (item.kind === 'quote') {
      const text = document.createElement('blockquote');
      text.textContent = `“${item.quote}”`;
      const credit = document.createElement('p');
      credit.className = 'index-fragment-credit';
      credit.textContent = item.credit;
      if (item.destination) {
        const link = itemLink(item);
        link.className = 'index-quote-link';
        link.append(text, credit);
        element.append(link);
      } else {
        element.append(text, credit);
      }
      return element;
    }

    const link = itemLink(item);
    link.className = 'index-card-link';
    if (item.image) {
      const image = document.createElement('img');
      image.src = mediaUrl(item.image.src);
      image.alt = item.image.alt || '';
      image.loading = index < 3 ? 'eager' : 'lazy';
      link.append(image);
    }
    const meta = document.createElement('span');
    meta.className = 'index-card-labels';
    meta.textContent = labels(item);
    const title = document.createElement('h2');
    title.textContent = item.title;
    const excerpt = document.createElement('p');
    excerpt.className = 'index-card-excerpt';
    excerpt.textContent = item.excerpt;
    const cue = document.createElement('span');
    cue.className = 'index-card-cue';
    cue.textContent = item.audio ? 'Listen & read ↗' : 'Explore ↗';
    link.append(meta, title, excerpt, cue);
    element.append(link);
    return element;
  }

  function itemLink(item) {
    const link = document.createElement('a');
    link.href = contentUrl(item.destination);
    link.dataset.openItem = item.id;
    return link;
  }

  function renderList(items) {
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'index-empty';
      empty.textContent = 'No entries match this combination. Try another chapter or material.';
      listGroups.replaceChildren(empty);
      return;
    }
    const groupBy = groupSelect.value;
    const options = groupBy === 'chapter' ? data.chapters : data.contentTypes;
    const groups = options.filter(option => items.some(item =>
      (groupBy === 'chapter' ? item.chapters : item.contentTypes).includes(option.id)
    )).map(option => {
      const section = document.createElement('section');
      section.className = 'index-list-group';
      const heading = document.createElement('h2');
      heading.textContent = option.label;
      const list = document.createElement('ul');
      items.filter(item => (groupBy === 'chapter' ? item.chapters : item.contentTypes).includes(option.id))
        .forEach(item => {
          const row = document.createElement('li');
          const link = itemLink(item);
          link.textContent = item.title;
          const meta = document.createElement('span');
          meta.className = 'index-list-meta';
          meta.textContent = ` — ${labels(item)}`;
          row.append(link, meta);
          list.append(row);
        });
      section.append(heading, list);
      return section;
    });
    listGroups.replaceChildren(...groups);
  }

  function syncDialog(itemId) {
    const item = data.items.find(entry => entry.id === itemId && entry.destination);
    if (!item) {
      if (dialog.open) dialog.close();
      frame.removeAttribute('src'); // Stop audio and other media when the reading room closes.
      activeItemId = null;
      if (returnFocusId) {
        root.querySelector(`[data-open-item="${returnFocusId}"]`)?.focus();
        returnFocusId = null;
      }
      return;
    }
    if (activeItemId === item.id && dialog.open) return;
    activeItemId = item.id;
    const destination = contentUrl(item.destination);
    dialogTitle.textContent = item.title || item.credit;
    externalLink.href = destination;
    frame.title = `Read ${item.title || item.credit}`;
    frame.src = destination;
    if (!dialog.open) dialog.showModal();
    root.querySelector('[data-dialog-close]').focus();
  }

  function prepareEssayFrame() {
    try {
      const document = frame.contentDocument;
      if (!document?.head) return;
      // The reading room supplies its own title and exit; remove repeated page chrome.
      const style = document.createElement('style');
      style.textContent = 've-header, ve-footer { display: none !important; } audio[controls] { display: block; max-width: 100%; margin: 1rem 0; }';
      document.head.append(style);
      document.querySelectorAll('audio:not([controls])').forEach(audio => {
        if (!audio.closest('.audio-player')) audio.controls = true;
      });

      const target = decodeURIComponent(frame.contentWindow.location.hash.slice(1));
      if (!target) return;
      // Juncture renders many Markdown headings without IDs, so match their text.
      [0, 300, 1000].forEach(delay => window.setTimeout(() => {
        try {
          const requested = target.replace(/-/g, ' ').toLowerCase();
          const heading = [...frame.contentDocument.querySelectorAll('h1,h2,h3,h4,h5,h6')]
            .find(node => node.textContent.trim().toLowerCase() === requested);
          const found = frame.contentDocument.getElementById(target) || heading;
          if (found) {
            const top = found.getBoundingClientRect().top + frame.contentWindow.scrollY - 25;
            frame.contentWindow.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
          }
        } catch (_) { /* Cross-origin navigation keeps the native fragment. */ }
      }, delay));
    } catch (_) { /* Cross-origin navigation keeps the essay's own layout. */ }
  }

  function closeDialog() {
    if (openedFromIndex) {
      openedFromIndex = false;
      history.back();
    } else {
      setState({ item: null }, true);
    }
  }
})();
