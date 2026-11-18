.ve-header 'Hear Here: Spatial Index' gh:mattering-press/Hear-Here-Spatial-Practices/media/generic/Plumbline_detail_01.jpg
    - [about](/)
    - [experimental zine index](/essays/index.md)

.ve-footer
    - Published by [![Mattering Press](https://www.matteringpress.org/wp-content/themes/matteringpress/img/mattering-press.png)](https://www.matteringpress.org/)
    - [![CC BY](https://licensebuttons.net/l/by/4.0/88x31.png)](https://creativecommons.org/licenses/by/4.0/)

<main id="collage-prototype" class="spatial-index" aria-labelledby="index-title">
  <header class="index-heading">
    <div class="index-heading-top"><span>Hear Here / Spatial Practices</span><span>Index of encounters · 01—04</span></div>
    <p class="index-kicker">An open, rearranging archive</p>
    <h1 id="index-title">An index<br><em>in space</em></h1>
    <p class="index-intro">Follow a chapter, trace a form, or wander. Each selection brings the materials into a different arrangement.</p>
  </header>

  <div class="index-controls" aria-label="Index controls">
    <fieldset class="filter-group">
      <legend>01 / Chapter</legend>
      <div class="filter-options" data-chapter-filters></div>
    </fieldset>

    <fieldset class="filter-group">
      <legend>02 / Material</legend>
      <div class="filter-options" data-type-filters></div>
    </fieldset>

    <div class="index-actions">
      <fieldset class="view-switch">
        <legend>03 / View</legend>
        <div class="filter-options">
          <button class="index-filter" type="button" data-view-mode="collage" aria-pressed="true">Spatial</button>
          <button class="index-filter" type="button" data-view-mode="list" aria-pressed="false">List</button>
        </div>
      </fieldset>
      <div class="index-action-buttons">
        <button class="index-text-button" type="button" data-reshuffle aria-label="Rearrange the spatial collage">↻ Rearrange</button>
        <button class="index-text-button" type="button" data-clear-filters>Clear filters</button>
      </div>
    </div>
  </div>

  <div class="index-results-heading">
    <p class="index-status" data-index-status aria-live="polite" role="status">Loading index items…</p>
    <p class="index-note">Select a fragment to read · images and quotations also mark the space</p>
  </div>

  <section data-collage-view aria-label="Spatial collage results">
    <div class="index-collage" data-collage-grid></div>
  </section>

  <section data-list-view aria-label="Index results in a list" hidden>
    <div class="list-view-controls">
      <label for="list-group-by">Group the list by</label>
      <select id="list-group-by" data-list-group-by>
        <option value="chapter">Chapter</option>
        <option value="type">Content type</option>
      </select>
    </div>
    <div class="index-list" data-list-groups></div>
  </section>

  <dialog class="index-dialog" data-index-dialog aria-labelledby="index-dialog-title">
    <div class="index-dialog-shell">
      <header class="index-dialog-heading">
        <div><span class="index-dialog-kicker">Hear Here / Reading room</span><h2 id="index-dialog-title" data-dialog-title></h2></div>
        <div class="index-dialog-actions">
          <a data-dialog-external target="_blank" rel="noopener">Open full page ↗</a>
          <button type="button" data-dialog-close aria-label="Close reading room">Close ×</button>
        </div>
      </header>
      <iframe data-dialog-frame title="Selected essay" loading="lazy"></iframe>
    </div>
  </dialog>
</main>

<script>
(async () => {
  const pageUrl = window.location.href;
  const assetUrl = name => {
    const url = new URL(`./${name}`, pageUrl);
    url.searchParams.set('fmt', 'txt');
    url.searchParams.set('refresh', 'true');
    return url;
  };
  const status = document.querySelector('[data-index-status]');

  try {
    const [cssResponse, jsResponse] = await Promise.all([
      fetch(assetUrl('collage.css')),
      fetch(assetUrl('collage.js'))
    ]);
    if (!cssResponse.ok || !jsResponse.ok) {
      throw new Error(`Asset request failed (${cssResponse.status}, ${jsResponse.status})`);
    }

    const style = document.createElement('style');
    style.textContent = await cssResponse.text();
    document.head.append(style);

    const script = document.createElement('script');
    script.textContent = await jsResponse.text();
    document.body.append(script);
  } catch (error) {
    if (status) status.textContent = `The spatial index could not load: ${error.message}`;
  }
})();
</script>
