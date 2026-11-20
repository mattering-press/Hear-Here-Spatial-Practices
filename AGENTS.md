# Agent instructions

- For browser-based work, use a separate test Chromium instance controlled with Playwright. The user's main browser may be used for previews when the user explicitly authorizes it.
- Follow the development and deployment workflow in `DEVELOPMENT.md`.
- Since version 0.1 (2026-11-20) the public site is the static edition at https://hearhere.matteringpress.org/, built from `main` by GitHub Actions and published on GitHub Pages. Juncture is retired: every Juncture page forwards to the new home page (`essays/custom.js`).
- This repository is the only source of history. Make changes on a feature branch, push it to `origin`, review it in its private preview on Cloudflare Pages (the address is in the workflow run's summary), and reach `main` only through a pull request.
- Never push directly to `main`. Use short branch names without `/`; preview addresses are made from branch names.
- The build is every_trick_in_the_book (by SJMcH, a Mattering toolkit) in `every_trick/`: Pandoc, Lua filters, one template. Run `npm ci && npm run build && npm run check` in `every_trick/` before pushing. Its rules for content (paragraph numbers, poems, citations, versions) are in `every_trick/CONTRACT.md`; the plan and house style are in `DEVELOPMENT.md`. Every change to `every_trick/` bumps the toolkit's version and adds an entry to `every_trick/CHANGELOG.md` in the same commit. The book's versions and the toolkit's are numbered separately and never shown without their name ("Versions of the book and of every_trick" in `DEVELOPMENT.md`).
- Frozen versions (Git tags listed in `versions.json`) are permanent: never move or delete a pushed tag, and never change a numbering rule in `every_trick/CONTRACT.md` within a contract version.
- The collage index is developed on the `collage-index` branch. Keep it out of `main` until it is ready, and merge `origin/main` into it to stay current.
- Content no longer has to render on Juncture. Existing pages still use Juncture's `.ve-*` syntax, which the build converts; new content may use the Pandoc conventions in `every_trick/CONTRACT.md`. The section below is kept as a record of that legacy syntax.

## Juncture (retired 2026-11-20): legacy syntax and quirks

Kept for reference. Juncture no longer serves this book, so none of this is a requirement any more; it explains the `.ve-*` lines in existing pages, which `every_trick/convert.mjs` turns into Pandoc Markdown.

This site has no build step. Juncture v2 (the `juncture-digital.org` server plus the `juncture-digital` web components) renders the Markdown in this repository on every request. Every change must work when served that way, including custom pages such as the collage index and its modal overlays. A change that only works on a static file server or in a local preview is not finished.

The rules below were checked on 2026-11-18 against Juncture's source (`serve.py` in `juncture-digital/juncture`, and `juncture-digital/web-components`) and against the live site. Re-check the ones marked "status" before relying on them.

### Page structure

- Start every page with `.ve-style ./custom.css`, `.ve-script ./custom.js`, `.ve-header` and `.ve-footer` (the root `README.md` uses `./essays/custom.css` and `./essays/custom.js`). Juncture inlines only the first `.ve-style` and the first `.ve-script` on a page and ignores any others.
- Keep each paragraph on a single line. Juncture displays only the first line of a hard-wrapped plain-text paragraph and drops the rest, also inside a raw HTML `<p>`. It also removes tokens that look like Wikidata IDs (`Q5`, `Q12`) from paragraph text.
- Internal links must end in `.md` and be relative or root-absolute (`./acorn.md`, `/essays/acorn.md`). Juncture rewrites these `href` values to `/<owner>/<repo>/…` and adds `?ref=<branch>` on branch previews, so never hard-code the repository path in a link. A link without `.md` redirects to the Juncture app shell.
- Raw HTML blocks, `<style>` and inline `<script>` pass through unchanged and may be used for custom components.

### Extra files and JavaScript

- Juncture serves only Markdown at page URLs. A relative URL to a `.css`, `.js` or `.json` file redirects to the app shell on production, also with `?fmt=txt` (that form only works on a local Juncture server).
- Juncture rewrites every non-`http` `src` attribute in the page to `raw.githubusercontent.com`. So `<script src="./x.js">` does not run (GitHub serves it as plain text) and `<iframe src="/essays/x.md">` does not load the rendered page. Set such URLs from JavaScript.
- To load extra repository files, fetch them in JavaScript from `/gh-file/<owner>/<repo>/<path>?ref=<ref>` (same origin, correct content type) or from `https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>`. Build the URL from `window.PREFIX` (`owner/repo`) and `window.REF` (branch), which Juncture sets on every page.
- URLs created in JavaScript are not rewritten. Prefix page links with `/${window.PREFIX}` and add `?ref=${window.REF}` when the ref is not `main`.
- Essay pages can be shown in a same-origin `<iframe>` (Juncture sends no frame-blocking headers), which is what a modal overlay needs.
- `ve-header`, `ve-media` and the other `ve-*` elements render inside shadow DOM and upgrade after page load. Page CSS does not reach inside them; `custom.js` injects styles into the header's shadow root for that reason.
- `custom.css` and `custom.js` load on every page. Scope new CSS under a root id or class. `custom.js` currently injects an unscoped `button { … }` rule that affects every button on pages that load it.

### Media

- Tag arguments must be bare URLs. A Markdown link (`[url](url)`) as an argument breaks the tag.
- Images: `.ve-media gh:mattering-press/Hear-Here-Spatial-Practices/<path> [left|right] [width=75%] caption="…" alt="…"`. This is Juncture's supported syntax and must stay.
- Status: Juncture's IIIF image service (`iiif.juncture-digital.org`) failed for every image until its maintainer repaired it on 2026-11-18. That evening all 52 images on this site were confirmed rendering through Juncture's own viewer again. The maintainer has said Juncture is supported but not under active development, so a future outage may again take time to fix.
- `custom.js` keeps a fallback that shows an image straight from GitHub when its manifest request fails, and does nothing when the service answers. Keep this fallback even while the service works (the site owner's decision), and do not replace the `.ve-media` tags with HTML.
- Card thumbnails and plain inline images: Markdown `![alt](/media/…)`. Juncture rewrites these to the raw GitHub URL of the current repository and branch.
- YouTube: `.ve-media https://www.youtube.com/watch?v=<id> [left|right] [width=75%] [caption="…"]`. Only the `watch?v=` form works, not `youtu.be` or `/embed/` URLs.
- Vimeo: `.ve-media https://vimeo.com/<id>` works for public videos only. Unlisted videos (the ones that need an `h=` hash) cannot use `.ve-media`; embed them with `<figure class="video-embed"><iframe src="https://player.vimeo.com/video/<id>?h=<hash>" …></iframe><figcaption>…</figcaption></figure>`.
- Other embeds: `.ve-iframe <url> [left|right] [height=…]`. It has no fullscreen support and is square unless `height` is given, so prefer the `video-embed` figure for video that `.ve-media` cannot play.
- `gh:` image references, the image fallback and the audio URLs point at the production repository's `main` branch. New media files referenced this way therefore appear only once they are on `main`, not in a branch preview.

### Checking a change

- Preview a pushed branch in the real renderer at `https://juncture-digital.org/mattering-press/Hear-Here-Spatial-Practices/<path>.md?ref=<branch>` (details in `DEVELOPMENT.md`). Add `&refresh=true` if CSS or JavaScript looks stale; Juncture caches the files it fetches.
- Check the rendered page in the test Chromium at desktop and mobile widths, and read the browser console: a broken `ve-*` tag usually shows up there as a failed request rather than as a visible error.
