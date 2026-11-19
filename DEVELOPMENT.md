# Development and deployment workflow

This repository is the only source for the publication. Juncture renders it
directly from GitHub, so there is no build step and no separate staging
repository.

- Repository: `mattering-press/Hear-Here-Spatial-Practices`
- Production branch: `main`
- Production site: `https://juncture-digital.org/mattering-press/Hear-Here-Spatial-Practices`
- Branch preview: add `?ref=<branch>` to any page URL (see below)

## How it fits together

```text
Local feature branch
    | git push origin <branch>
    v
Feature branch on GitHub  ->  Juncture branch preview (?ref=<branch>)
    |
    | review the preview, then merge a pull request
    v
main on GitHub  ->  production site
```

`main` is always the published version. Every change reaches it through a pull
request from a feature branch, and the commit that was previewed is the commit
that is merged.

## Starting a piece of work

Branch from the latest `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c <feature-branch>
```

Use a branch name without `/` (for example `walk-page`, not `jules/walk-page`).
Juncture splits the GitHub URL on slashes to find the branch, so a name with a
slash cannot be previewed. If a tool creates a branch with a slash, push it
under a flat name instead: `git push -u origin HEAD:<flat-name>`.

Longer-running work, such as the collage index on `collage-index`, lives on its
own branch and usually in its own worktree. Bring in changes from `main` with a
merge (not a rebase, because the branch is already pushed):

```sh
git fetch origin
git merge origin/main
```

## Previewing a branch

1. Commit on the feature branch and push it: `git push origin <branch>`.
2. Open the page you changed with `?ref=<branch>`:

   ```text
   https://juncture-digital.org/mattering-press/Hear-Here-Spatial-Practices/?ref=<branch>
   https://juncture-digital.org/mattering-press/Hear-Here-Spatial-Practices/essays/walk.md?ref=<branch>
   ```

3. Check it on desktop and on a phone. Internal links keep `?ref=<branch>`, so
   reviewers can click around and stay on the branch.
4. If a change to `custom.css`, `custom.js` or a page does not show up, add
   `&refresh=true` to the URL. Juncture caches the files it fetches from GitHub.

What a preview uses from the branch:

- the Markdown pages, and `custom.css` and `custom.js`;
- Markdown images (`![](/media/…)`), Markdown links and other relative `src` and
  `href` values, which Juncture rewrites to the branch.

What it always takes from `main`:

- `.ve-media gh:…` images and `.ve-header` backgrounds, because the `gh:` syntax
  has no branch;
- the direct-image fallback in `custom.js` and the hard-coded audio URLs;
- any URL built in custom JavaScript that does not use `window.REF`.

So a new image file referenced with `gh:` only appears once it is on `main`.
Reference it as a Markdown image while previewing, or accept the gap and check
it after merging.

A preview URL is public, like the branch itself on GitHub. Do not push anything
that should not be seen.

## Publishing to production

1. Preview the pushed branch as above.
2. Open a pull request from the feature branch to `main`.
3. Merge it once the preview has been approved.
4. Check the production URL after the merge. Add `?refresh=true` once if the old
   version is still showing.
5. Delete the feature branch on GitHub and locally.

Never push directly to `main`, and never copy files into `main` by hand. The
pull request is the record of what was published.

## Checking the renderer locally

A generic static-file server does not reproduce Juncture's Markdown rendering,
URL rewriting or asset handling, so it is not a sufficient check. The branch
preview is the reference. Juncture's renderer (`serve.py` in
`juncture-digital/juncture`) can be run locally to test without pushing, but its
local mode does not resolve this repository's paths on its own; it needs a small
wrapper that sets the owner, repository and branch.

The Juncture compatibility rules in `AGENTS.md` apply to every change.

## Static twin

The static twin is a plain static copy of the whole book, built from the same Markdown with Pandoc,
so that the book does not depend on Juncture alone. During the parallel run Juncture stays the public
site, and every page of the twin tells search engines not to index it (the `NOINDEX` setting at the
top of `kit/build.mjs`). The Markdown is not changed for the twin; the build reads Juncture's syntax.

To build and preview it locally you need Node.js 20.11 or later and Pandoc 3.8:

```sh
cd kit
npm ci          # once, and again after package-lock.json changes
npm run build   # writes ../_site/ in about ten seconds
npm run check   # every internal link and local file in _site/ exists
npm run serve   # http://localhost:8080/
npm run serve -- --base /Hear-Here-Spatial-Practices/   # the address layout of GitHub Pages
```

If a page uses a Juncture construct the twin cannot render, the build stops and names the file and
line. Images without alt text are listed as warnings.

The Markdown view: next to every page's `index.html` the build writes `index.md`, the page as clean Pandoc
Markdown with front matter and no Juncture syntax, and `publication.md` at the site root holds the whole
book in reading order with absolute URLs (from `siteUrl` in `build.mjs`). The HTML is built from that
Markdown, so the two cannot drift apart. Every page has a "Page / Markdown" switch of plain links. The
format of the Markdown media blocks is in `kit/CONTRACT.md`.

What is in `kit/`:

- `build.mjs`: the build, with its few settings at the top
- `convert.mjs`: turns Juncture's `.ve-*` lines and its raw HTML (audio, iframes, videos) into Pandoc Markdown
- `filters/`: Lua filters, one job each. `to-markdown.lua` is stage 1 (writes the Markdown view); `figures`, `embeds`, `cards`, `transcript`, `links` and `contract` are stage 2 (Markdown view to HTML and `page.json`)
- `template.html`: the HTML around every page
- `assets/`: `site.css` (colours, fonts and spacing are set at its top), `zoom.js`, `seek.js`
- `images.mjs`: resized images and the tiles for zooming
- `check.mjs`, `serve.mjs`: the link check and the local server
- `CONTRACT.md`: the `page.json` and `publication.json` files that other frontends can read

GitHub Actions (`.github/workflows/static-twin.yml`) builds and checks the twin on every push and pull
request. On `main` it also deploys `_site/` to GitHub Pages
(`https://mattering-press.github.io/Hear-Here-Spatial-Practices/`), but only once Pages is enabled in
the repository settings with "GitHub Actions" as the source; until then the deploy job is skipped.
`_site/` is never committed.

## Plan: stable links, versions and print companions

Agreed with the publisher on 2026-11-19. The static twin does not implement all of this yet; it is the plan the build must follow.

- **Views.** Every page is offered as plain links that work without JavaScript: the rendered page, a Markdown view of its converted Pandoc Markdown, and later site-level Collage and List views. Media appear in the Markdown view as standard image syntax and `:::` blocks containing ordinary links.
- **Versioned text links.** Each public release lives at a frozen address, for example `/v1/essays/aya_nassar/#p12`. Paragraphs are numbered cleanly in every release. Links that people copy or share always carry the version; plain addresses such as `/essays/aya_nassar/` mean "latest". A page in an older version shows a short notice linking to the same passage in the newest version, matched by its text. Only releases are public: corrections collect on GitHub until the next release.
- **Exact quotes.** Links can add a text fragment (`#p12:~:text=…`) so the browser highlights the quoted words. The stylesheet styles `:target` and `::target-text`.
- **Media addresses are unversioned.** Every image, audio and video item gets its own page at a permanent, word-based address, such as `/see/plumbline`, `/listen/boulder` or `/watch/<name>`. Audio and video addresses may carry a start time (`#t=12:40`). If a file is replaced, the address stays and the item page notes the change.
- **Print.** Printed captions carry the item's address, and a QR code generated from the same address is always printed with it, because a printed link cannot be clicked. The colophon states which online version a printed edition corresponds to.
- **Shared media.** Images, tiles and audio are stored once and shared by all versions, so each release adds only its pages.
- **Two version numbers.** The book has `v1.0`, `v1.1`, `v2.0` and so on, following the text. The build kit has `kit-v0.x`, following design and behaviour. Each book release records the kit version that built it. All published versions are rebuilt with the current kit, so their text and paragraph numbers never change. Paragraph numbering is defined by the content in `kit/CONTRACT.md`, never by the template. Archived snapshots keep the exact design of their day.
- **DOIs and archiving.** Book and chapter DOIs are registered through Thoth and point to the latest version. Each release is tagged in Git and archived as a fixed snapshot: the site package, a web archive file, the whole-book Markdown and the media masters, deposited with Zenodo and through Thoth, plus Wayback Machine captures of every page.

## House style for the web edition

A summary of the Mattering Press house style (Formatting & Style Guide, August 2025) as it applies to the build. The guide itself is not kept in this public repository; ask the publisher for it.

- **Citation:** MHRA-based author-date. In the text: `(Nassar 2026: para. 12)`, with paragraph numbers used where there are no pages. Reference list in MHRA bibliography form: single quotation marks, chapter titles in sentence case, book titles in italics, online sources as `<URL> [accessed 19 November 2026]`. No stock CSL style matches exactly, so the build will carry its own, tested against the guide's examples.
- **Figures:** numbered `Fig. 2.3` (chapter, then image), with the photographer or source in the caption. Item pages show the figure number beside their word-based address.
- **Text:** British spelling (-ise), single quotation marks with double ones for quotes inside quotes, en dashes with spaces for parenthetical clauses. This also applies to the site's own interface text.
- **Images online:** our own rule, not the guide's. Each image is published in several widths (800, 1200, 1600 and 2400 px), JPEG at about quality 82, chosen by the browser through `srcset`, with deep zoom from the full-resolution original.
