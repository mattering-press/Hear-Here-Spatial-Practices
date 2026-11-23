# Development and deployment workflow

This repository is the only source for the publication. Since version 0.1 (2026-11-20) the public site is the
static edition built by everytrickinthebook in `everytrick/`; Juncture, which rendered the first version, is
retired and forwards its visitors to the new site.

- Repository: `mattering-press/Hear-Here-Spatial-Practices`
- Production branch: `main`
- Production site: `https://hearhere.matteringpress.org/` (GitHub Pages, built by GitHub Actions from `main`)
- Frozen versions: `https://hearhere.matteringpress.org/v<id>/`, listed in `versions.json`
- Branch previews: open (unlisted) on Cloudflare Pages, or private for a `private-` branch (see "Previews")

## How it fits together

```text
Local feature branch
    | git push origin <branch>
    v
Feature branch on GitHub  ->  preview on Cloudflare Pages
    |
    | review the preview, then merge a pull request
    v
main on GitHub  ->  GitHub Actions build  ->  https://hearhere.matteringpress.org/
```

`main` is always the published working text. Every change reaches it through a pull request from a feature
branch. When the branch was previewed, the commit that was previewed is the commit that is merged.

## Starting a piece of work

Branch from the latest `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c <feature-branch>
```

Use a branch name without `/` (for example `walk-page`, not `jules/walk-page`).
Preview addresses are made from branch names, so keep them short and flat. If a tool creates a branch with a slash, push it
under a flat name instead: `git push -u origin HEAD:<flat-name>`.

Longer-running work, such as the collage index on `collage-index`, lives on its
own branch and usually in its own worktree. Bring in changes from `main` with a
merge (not a rebase, because the branch is already pushed):

```sh
git fetch origin
git merge origin/main
```

## Previewing a branch on Juncture (retired)

Until version 0.1 branches were previewed on Juncture as below. Juncture now forwards every page to the new site, so
use the previews instead (see "Previews").

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

1. Review the pushed branch in its preview (see "Previews"), on desktop and on a phone. The
   publisher may waive the preview for a change; the pull request is still needed.
2. Open a pull request from the feature branch to `main`.
3. Merge it once the preview has been approved, or waived, and the checks on the pull request have passed.
4. Check the production site, `https://hearhere.matteringpress.org/`, once the "Static twin" run on `main` has
   deployed it, a few minutes after the merge.
5. Delete the feature branch on GitHub, which also deletes its previews, and locally.

Never push directly to `main`, and never copy files into `main` by hand. The
pull request is the record of what was published.

## Checking a change locally

`npm run build` and `npm run serve` in `everytrick/` (see "Static twin" below) show the site at `http://localhost:8080/`,
made by the same build as the previews and the public site. Check the pages you changed there before pushing, at
desktop and phone widths. The preview adds only the real hosting.

## Static twin

The static twin is a plain static copy of the whole book, built from the same Markdown with Pandoc,
so that the book does not depend on Juncture alone. Since version 0.1 (2026-11-20) it is the public site,
open to search engines (the `NOINDEX` setting at the top of `everytrick/build.mjs` is off). Existing pages keep
Juncture's syntax, which the build reads; new content may use the Pandoc conventions in `everytrick/CONTRACT.md`.

To build and preview it locally you need Node.js 20.11 or later, Pandoc 3.8 and poppler, which renders the book's PDF
documents (`brew install poppler` on a Mac, `poppler-utils` on Debian and Ubuntu; see "Documents and zines"):

```sh
cd everytrick
npm ci          # once, and again after package-lock.json changes
npm run build   # writes ../_site/ in about ten seconds
npm run build:preview  # the same, with the Media Index's editing view, as on the previews
npm run check   # every internal link and local file in _site/ exists
npm run test:csl  # the house citation style against the style guide's examples
npm run serve   # http://localhost:8080/
npm run serve -- --base /Hear-Here-Spatial-Practices/   # under a path, as on a GitHub Pages address without a custom domain
```

If a page uses a Juncture construct the twin cannot render, the build stops and names the file and
line. Images without alt text are listed as warnings.

The Markdown view: next to every page's `index.html` the build writes `index.md`, the page as clean Pandoc
Markdown with front matter and no Juncture syntax, and `publication.md` at the site root holds the whole
book in reading order with absolute URLs (from `siteUrl` in `build.mjs`). The HTML is built from that
Markdown, so the two cannot drift apart. Every page has a Page / Markdown switch of plain links in its header (see
"Header" below). "Markdown" leads to `markdown/` beside the page: the same header and footer, with `index.md` shown at a reading
width and a link to download it. `publication/` at the root of each edition does the same for `publication.md`, the
whole book; its switch stays on "Markdown", and "Page" leads back to the page the reader came from (a line of
script in the template reads it from the referrer), or to the home page. The format of the Markdown media blocks is in `everytrick/CONTRACT.md`.

The frame of every page:

- **Header.** A bar that is the same on every page and keeps one row at every width from 320 px: the book's title (a
  link to the home page), the menu, and at the right end the tools: the views switch, search and "Aa". The menu is the
  home page's (`README.md`), followed by "media index" and "references" (the Media Index, shared by all versions,
  and the References page of the version being read; their words are `FRAME.menu` at the top of
  `everytrick/build.mjs`); the menus in the other pages' `.ve-header` lines are ignored. Where the whole menu does
  not fit beside the title and the tools, it folds into a menu button (☰, named "Menu") at the start of the tools,
  which opens a panel listing every entry (`everytrick/assets/menu.js`): opening it moves the focus to its first
  entry, Escape closes it and puts the focus back on the button, and a click or tap outside, or Tab past its last
  entry, closes it. The button is a `<details>`, so without JavaScript it opens and closes all the same. The width at
  which the menu folds is a container query in `everytrick/assets/site.css` ("the menu button"), in rem, so that it
  follows the reader's text size: this book's bar needs 62.2rem (995 px at the usual size, measured on 2026-11-23),
  so the menu shows from 63rem (1008 px) and folds below; measure again and change it when the menu changes. On phones
  the title and the tools get smaller; at 320 px the title ends in an ellipsis. The views switch is a round-ended pill
  of icons, each a plain link with its name for screen readers and in a tooltip: Page (a sheet) and Markdown (the
  Markdown mark), and later Collage, the third segment it is made for (its icon waits in a comment in
  `everytrick/template.html`). Below the bar, the page's title, over the picture of its own `.ve-header` line,
  cropped to a band of the same height on every page. A page reached through a card names its section above its title
  (Podcasts, Events), and that section is marked in the menu. To give a page its own header picture, change the
  picture in its `.ve-header` line.
- **Search.** A magnifier beside "Aa" leads to the edition's search page, `search/` (see "Plan: search").
- **Settings.** The "Aa" button at the end of the bar opens the reader's settings (`everytrick/assets/settings.js`):
  text size in four steps (90, 100, 115 and 130 per cent; the whole page scales, the text column with it) and colours:
  System (the preset, which follows the reader's device), Light or Dark. The browser keeps the choice
  (`localStorage`), and a line in the template's `<head>` applies it before the page is drawn. The dark colours are
  set in `everytrick/assets/site.css`, below the light ones; the publisher's logo turns white in dark mode.
- **Footer.** The publisher's logo (the long one; the icon alone on phones), a credit line with the licence, the
  book's version line (with links to all versions, to the Media Index and to the References page of the same version)
  and the toolkit's line. They are set in `FRAME` at the top of `everytrick/build.mjs`, with the logos in
  `media/publisher/`; the `.ve-footer` lines in the pages are ignored.

What is in `everytrick/`:

- `build.mjs`: the build, with its few settings at the top
- `versions.mjs`: reads the version registry (`versions.json` at the repository root), takes each version's text from its Git tag, and matches paragraphs between versions
- `convert.mjs`: turns Juncture's `.ve-*` lines and its raw HTML (audio, iframes, videos) into Pandoc Markdown, and works out each edition's reading order
- `register.mjs`: reads and writes the media register (`media/register.csv`), matches every item on the pages to its line, drafts names for new items, names each item's rights ("In Copyright") and makes the build's checks of the register (see "The media register")
- `documents.mjs`: where a document's pages come from (a PDF of the repository, rendered with poppler, or a zine copied into `media/zines/`), and the text of a PDF, page by page (see "Documents and zines")
- `media-pages.mjs`: the HTML of the item pages' facts, a document's text and download on its page, the Media Index, its editing view and the pages that forward short and former addresses
- `filters/`: Lua filters, one job each. `items.lua` and `to-markdown.lua` are stage 1 (`items` lists the page's media items for the register; `to-markdown` writes the Markdown view); `figures`, `embeds` (players, videos, embeds, and documents: a cover on an essay page, the row of pages on the document's own page), `cards`, `transcript`, `links`, `citations`, `paragraphs`, `cues` (marks transcript paragraphs with their times from a recording's cue file), `margins` and `contract` are stage 2 (Markdown view to HTML and `page.json`)
- `citations.mjs`: prepares the bibliography for `filters/citations.lua`, writes the build's report on citations, the
  HTML of the References page, its downloads and the texts of its Copy menus (see "References and citations")
- `ris.mjs`: turns a CSL-JSON entry into RIS, which Pandoc cannot write, for the References page
- `csl/`: `mattering-press.csl`, the house citation style, and its test (`csl/test/`); and four styles of the official
  CSL repository, unchanged, for the References page's Copy menus: `apa.csl`, `chicago-author-date.csl`,
  `modern-language-association.csl` and `harvard-cite-them-right.csl` (source, commit and licence in
  `everytrick/NOTICE.md`; to update them, copy them again from a newer commit and change `CSL_COMMIT` in
  `citations.mjs` and the commit in `NOTICE.md`)
- `scripts/to-citation-keys.mjs`: for the switch, shows how the plain-text citations would become Pandoc citations
- `scripts/align.mjs`: times a podcast transcript's paragraphs against its recordings with whisper.cpp, on the editor's computer, and writes the cue files and a report (see "Plan: podcast player and transcript")
- `scripts/number-media.mjs` (`npm run number-media -- <version>`): numbers the media items of a frozen version that have no number yet, in its reading order, and writes the register (see "Freezing a version for review or release")
- `scripts/fetch-zine.mjs` (`npm run fetch-zine -- <identifier>`): copies a zine's page images from archive.org into `media/zines/<identifier>/`, once, on the editor's computer (see "Documents and zines")
- `template.html`: the HTML around every page. It links the stylesheet and scripts with `?v=` and a hash of their contents, so that browsers fetch them again after every change instead of keeping an old copy
- `assets/`: `site.css` (colours, fonts and spacing are set at its top), `search.js` (the search page; see "Plan: search"), `place.js` (keeps the reader's place for the search page's ×), `zoom.js` (the pictures' Zoom buttons, the zoom viewer and the pause button of animations, and the documents' Open buttons and their viewer, in a dialog or on the document's own page; see "Plan: image display and the zoom viewer" and "Documents and zines"), `player.js` (the podcast player and its docked bar; see "Plan: podcast player and transcript"), `citations.js`, `paragraphs.js` (copies a paragraph's link; points the version notice at the passage being read), `margins.js` (sets margin notes in the margin on wide screens), `media-index.js` (the Media Index's filters, and the editing view's fields, checks and change sheet), `menu.js` (the header's menu button), `references.js` (the References page's Copy buttons and their menu)
- `images.mjs`: resized images (each zoomable picture in several widths for `srcset`) and the tiles for zooming; an animated GIF becomes an animated WebP and a still; each page of a document gets tiles and two widths (400 and 800 px)
- `audio.mjs`: reads the length of an MP3 from the file, for the podcast players
- `check.mjs`, `serve.mjs`: the link check (including every page of every document; it also confirms that every
  edition has its search index, and its References page with the downloads and the Copy menus' texts, each with every
  work) and the local server
- `CONTRACT.md`: the `page.json`, `publication.json` and `media.json` files that other frontends can read, the paragraph rule and the media items
- `package.json`: the toolkit's name and version (see "Versions of the book and of everytrick" below)
- `CHANGELOG.md`: every version of the toolkit and what changed in it

GitHub Actions (`.github/workflows/static-twin.yml`) builds and checks the twin on every push and pull
request, and uploads every pushed branch as a preview (see "Previews"). It installs Pandoc and poppler, and fetches the
whole history with its tags, so that it can build the frozen versions. On `main` it also deploys `_site/` to GitHub
Pages, which serves it at `https://hearhere.matteringpress.org/` (the deploy is skipped if Pages is not enabled
with "GitHub Actions" as its source). `_site/` is never committed. On every branch but `main` its build step sets
`EVERYTRICK_PREVIEW=true`, which adds the Media Index's editing view (`/media-index/edit/`, see "The media
register") to the build; a build of `main`, which is what GitHub Pages publishes, never has it. `npm run
build:preview` (or `EVERYTRICK_PREVIEW=true npm run build`) does the same locally.

### The media register

Every picture, recording, video and document of the book is a media item with a permanent number (the plan:
"Plan: media register, item pages and the Media Index"; the details: "Media items" in `everytrick/CONTRACT.md`).
The items are listed in `media/register.csv`, one line each, which GitHub shows as a table you can search. The
columns are `number`, `kind` (`see`, `listen`, `watch` or `read`), `name`, `source` (the file in the repository, or the
address elsewhere), `since` (the version it entered with), `credit`, `rights`, `rights_note`, `cite_as` (how to cite
the item's own source), `title`, `former_names` and `former_sources`. Captions and alt text stay in the pages; the
register holds only what the pages cannot.

What readers see: every caption starts with the item's number, a small pill that leads to the item's own page
(`/see/boulder-font/`); a recording has a small caption line below its player with its number and title. The zoom
viewer shows the number before the caption. Each item's page shows the item, its caption, its credit, its rights and
how to cite its source, every place it appears, the version it entered with, when it was first published and when its
file last changed, where it is stored and served from, and its files. `/37/` forwards to item 37's page. The Media Index, `/media-index/` (linked in every footer), lists every
item, with its credit and rights, and filters by kind and by where items are served from; `media.json` holds the same
list as data. Credit, rights and source are shown only when they are filled in: no public page says that one is
missing, not evaluated or unknown (the publisher, 2026-11-23). Only the editing view's checks say what is missing.

How editors change it, on a branch like any other change:

- **Rename an item:** change its `name` and add the old name to `former_names` (separate several with spaces). The old
  address keeps forwarding to the new one. A name is lower-case letters and digits with hyphens (`boulder-font`), and
  each name, current or former, is used once in the book.
- **Credit an item:** write the whole credit in `credit`, exactly as it should show, for example `Photo: Jane Doe`. It
  appears after the caption wherever the item is shown, and on its page. Permission letters and contact details stay
  out of the repository, which is public.
- **Give an item's rights:** write in `rights` the address of a statement of rightsstatements.org, such as
  `http://rightsstatements.org/vocab/InC/1.0/` (In Copyright), or of a Creative Commons licence, such as
  `https://creativecommons.org/licenses/by/4.0/` (CC BY 4.0), CC0 or the Public Domain Mark. The item's page shows its
  name, "In Copyright" or "CC BY 4.0", linked to the address. Fill it in only when the rights are clear, and otherwise
  leave it empty: never write Copyright Not Evaluated or Copyright Undetermined, which the build refuses. `rights_note`
  holds a few words or a link, shown after the rights (item 1 links to the Historic England Archive's terms for using
  its images). Permission letters and contact details stay out of the repository.
- **Say how to cite an item's source:** `cite_as` holds how to cite the item's own source in the house style, with
  what is known of its maker, title, date and holder, for example
  `Clarke Fitzgerald, ‘The Plumb Line and the City’ (1971), Coventry Cathedral`. The item's page shows it as "Source".
  Never guess a maker or a date: leave it empty instead.
- **Title an item:** only for an item whose pages give it no caption (an embedded film, the zines on archive.org): its
  `title` names it in the Media Index and on its page, and for a video or an embed also in its caption line.
- **Replace a file or an address:** write the new one in `source` and add the old one to `former_sources` (a space
  inside a path is written `%20`). The item keeps its number and its address, and the versions that used the old file
  still find it.
- **New items** need no line: the build drafts a name from the caption and shows a dashed "new" pill until the next
  version is frozen. To choose a name before then, add a line with `number` and `since` left empty.
- **Describe a picture at length** (optional): for a picture that carries an argument, such as an artist's map or an
  archive photograph, write a block directly after it in the page (after its `.ve-media` line too), with one or more
  paragraphs, and who wrote it in `by` (which may be left out):

  ```markdown
  ::: {.description by="Jane Doe"}
  What a reader who cannot see the picture needs to follow its argument.
  :::
  ```

  The page shows a quiet "Description by Jane Doe" under the caption, which opens to the text; the item's page shows it
  in full below the picture. It is never numbered as a paragraph. A picture without one shows nothing, and no check
  asks for one. After a gallery it belongs to the gallery's last picture; after anything that is not a picture the
  build stops.
- **Numbers** are never typed by hand: `npm run number-media -- <version>` gives them when a version is frozen (see
  "Freezing a version for review or release"). A number never changes and is never given again, also when its item
  is withdrawn: never delete a line.

The build stops, with a message saying what to do, when a registered item's file has gone from the repository and
from every frozen version, when a numbered item is on no page any more (its file or address changed), when two items
share a name, when an item of a frozen version has no number, or when an item's rights are not the address of a
rightsstatements.org statement or a Creative Commons licence.

**The editing view** (`/media-index/edit/`, on previews only, never on the public site) is the Media Index with fields
for each item's name and credit, its rights (a choice of the common rightsstatements.org statements and Creative
Commons licences, which writes the address, or any other such address typed in) and their note, how to cite its
source, the caption and alt text of each place it appears in the latest text (for a picture also a long description and
who wrote it, both optional), and a comment. Beside each item, checks
follow what you type: no alt text, alt text that repeats the caption, no credit, no rights (or an address that is not
a statement or a licence), no source to cite, used on no page, and a name that is not allowed or already taken. These
checks are the only place that marks what is missing; a long description is never asked for. Your edits stay in your browser, also when you reload the page;
nothing is saved anywhere else. When you are done, "Hand over changes" opens a sheet that lists only what changed, item
by item ("caption on Hear Here Podcast: Catherine Hahn (essays/catherine_hahn.md): “…” → “…”", "rights: (empty) →
“http://rightsstatements.org/vocab/InC/1.0/” (In Copyright)", and the comments), with Copy and Download (.md); someone
applies it on a branch; a long description is in it only when one is filled in, as the block to write after the
picture. "Clear all edits" puts every field back as the pages and the register have it.

**First published and last changed.** Each item's page says when the item was first published, the day of the earliest
commit in which a page (`README.md`, `essays/*.md`) refers to its file or address, current or former, and when its file
last changed, the day of the latest commit that changed it (current or former; for a zine, the folder of its copied
pages). An item served from elsewhere (YouTube, Vimeo, the BBC, archive.org) has only the first. Both are read from
the Git history at every build (`everytrick/history.mjs`, two passes over the history for all items); GitHub Actions
fetches the whole history. A shallow clone has no dates: the item pages leave the rows out and the build says so in its
warnings. To date an item's earlier file correctly, list it in `former_sources`.

### Documents and zines

A document is a media item of kind `read` whose pages the build shows as pictures, in the zoom viewer (the plan:
"Plan: documents and zines"; the data: "Documents" in `everytrick/CONTRACT.md`). There are two kinds:

- **A PDF in the repository**, such as the walk's booklet (`media/events/walking_sitting_sketching.pdf`), linked from an
  `::: {.embed}` block (or, in Juncture's syntax, a `<figure class="pdf-embed" data-repo-pdf=…>`). At every build poppler
  renders its pages at 250 dpi (`pdftoppm`) and reads its text page by page (`pdftotext`): each block of text on a page is
  a paragraph, or several where a short line ends a sentence (a line of dialogue); a hyphen at the end of a line is kept
  (`non-visible`); the page's number at its foot is left out. To change the booklet, replace the PDF (keeping its name, or
  as "Replace a file or an address" says in "The media register" above) and build. The PDF itself is the download.
- **A zine on archive.org**, such as the Experimental Zine Index, embedded with archive.org's reader
  (`https://archive.org/details/<identifier>/mode/2up`), whose pages have been copied into `media/zines/<identifier>/`
  (`page-001.jpg` …, and `zine.json`, which says where they came from and when). The register's source stays the
  archive.org address: the item is archive.org's, which keeps the original, and the download leads there. Its text is
  not shown, because archive.org's text recognition cannot read a flattened zine reliably; it shows its caption or
  title, and later a description written by an editor.

A `read` item that is neither (another site's reader) stays an embed, as before.

**Fetching or refreshing a zine.** On your own computer, in `everytrick/`, run `npm run fetch-zine -- <identifier>`,
the part of the zine's archive.org address after `/details/` (`npm run fetch-zine -- trauma-body-and-home`; add
`--dry-run` to see what it would fetch). It downloads the item's "Single Page Processed JP2 ZIP" (about 12 MB), checks it
against the MD5 that archive.org lists, leaves out any page that archive.org's scandata marks as not part of the book,
and writes each page as a JPEG at full size and quality 85, replacing the pages that were there. On a Mac it needs only
what macOS has (`sips` reads the JPEG 2000 pages), and OpenJPEG for the pages `sips` cannot read, such as blank pages
stored as palette images (`brew install openjpeg`); elsewhere it needs OpenJPEG and unzip (`sudo apt-get install
libopenjp2-tools unzip` on Debian and Ubuntu). Commit `media/zines/<identifier>/` on a branch and build: the build makes
the tiles and the smaller images. To correct a zine, correct it on archive.org and run the script again. The build never
fetches anything from archive.org.

**Adding a document.** Put the PDF in `media/` and link it from a page in an `::: {.embed}` block (the link first, then
the caption), or, for a zine on archive.org, embed its reader and fetch its pages as above. It gets its number when the
next version is frozen, like any other item.

### Paragraph numbers

Every reading paragraph has a number, shown small in the left margin, so that readers and reviewers can cite a
passage as "para. 12". Hovering over a paragraph, or reaching its number with the Tab key, shows a ¶ beside the
number: clicking it copies a link to that paragraph, and on a frozen version the link carries the version
(`…/v0.9-review2/essays/aya_nassar/#p12`). A link to a paragraph highlights it for a moment when it opens.

What gets a number is decided by the text alone, never by the design, so the numbers stay the same whenever the
site is rebuilt:

- every paragraph of text gets the next number, including paragraphs in quotations and each turn of speech in a
  transcript;
- a list counts as one paragraph and gets one number, however many items it has;
- headings, pictures and their captions (and their long descriptions), audio and video players, picture galleries, the
  cards that lead to other pages, notes in the margin, the reference list at the end of a chapter, and the header and
  footer get no number;
- a paragraph that holds only a timecode such as `[00:10:13]`, or only a picture, gets no number;
- a short line on its own, such as **Addendum** or `[music]`, is a paragraph like any other and gets a number.

The precise rule is in `everytrick/CONTRACT.md` ("Paragraph numbers"). A rule never changes once a version has been
frozen with it, because that version would be renumbered: a new rule comes with a new contract version, and each
frozen version keeps the rule it was frozen under (`contract` in `versions.json`). Version 0.1 is numbered by
contract 0.3, which gave each list item its own number. Contract 0.6 (every_trick_in_the_book 1.14.0) added long
descriptions to the blocks that get no number; no page had one before, so no number changed. The build prints how many paragraphs each page has. To hide the
numbers (the ¶ link stays), set `--paragraph-numbers: 0` at the top of `everytrick/assets/site.css`.

### Versions and the version stamp

The book's versions are listed in `versions.json` at the root of the repository. The site's root always shows the
current text, labelled "Latest text, unreleased". Each listed version is built as well, at its own address,
`/v<id>/` (for example `/v0.9-review2/essays/aya_nassar/`), from the text of its Git tag but with the current toolkit,
so all versions share the current design; each keeps the paragraph rule it was frozen under. Pictures, video and other media are stored once
and shared by all versions; a version adds only its pages, about 1.5 MB. A media file that a tag uses but that is
no longer in the repository is taken from the tag.

Every page of a frozen version starts with a notice: "You are reading version 0.9, second peer review, frozen on
20 November 2026. Read the latest text." For an older release, the notice points to the newest release instead.
Its link goes to the same page in the newer text and, where it can, to the same passage: the build matches each
paragraph to the newer text by its words (the same text, or text that shares most of its word pairs), and the
link follows the paragraph in the address or the one the reader last scrolled to. A paragraph that was deleted
or rewritten beyond recognition leads to the nearest paragraph before it that was matched.

Every page's footer shows the book's version and its date, with a link to `/versions/`, which lists every version.
The line below it names the version of everytrickinthebook that built the page (see "Versions of the book and
of everytrick"). The same stamp, `version` for the book and `everytrickinthebook` for the toolkit, is in `publication.json`, every
`page.json` and the front matter of the Markdown view.

Each entry in `versions.json` has:

| field | meaning |
|---|---|
| `id` | the version in the address, e.g. `0.9-review2`: a digit first, then letters, digits, dots and hyphens |
| `tag` | the Git tag that holds its text, e.g. `v0.9-review2` |
| `label` | how pages name it, e.g. `Version 0.9, second peer review` |
| `date` | the day it was frozen or released, e.g. `2026-11-20` |
| `status` | `review` (frozen for peer review) or `release` (published) |
| `contract` | the contract current when it was frozen (`CONTRACT` in `everytrick/build.mjs`, e.g. `0.7`): its paragraph rule numbers this version, so its numbers never change |
| `annotations` | `hypothesis` to open its pages for annotation with Hypothesis (below), otherwise `none` |
| `hypothesisGroup` | the ID of the private Hypothesis group for its reviewers |

Hypothesis is loaded only on the pages of a version whose `annotations` is `hypothesis`, never on the latest text
or on a release, and its sidebar starts closed. With `hypothesisGroup` set, the client is configured with
`groupsAllowlist`, so its group menu offers only that group (and no "Public"). This does not admit anyone: a
reviewer must be a member of the group to see or post in it.

### Versions of the book and of everytrick

The book and everytrickinthebook, the toolkit that builds it, have separate version numbers. The site never
shows one without saying which it is: the book's version is written with its label, the toolkit's with its name.

The toolkit's name is one word in lower case, everytrickinthebook, and everytrick for short, the same in prose, in
its web address (`everytrick.org`, with `everytrickinthebook.org` leading to it) and on GitHub
(`github.com/everytrick/everytrickinthebook`). Agreed with the publisher on 2026-11-23, because hyphens are ugly in
an address and confusing beside the underscores the name had; until 1.14.0 it was every_trick_in_the_book, in
`every_trick/`. The history keeps the old name: the changelog's earlier entries, the contract's earlier versions and
frozen versions such as version 0.1. The keys under which a reader's browser keeps their settings and place still
begin with `every-trick-`, so that nobody loses them; readers never see these keys.

| | the book | the toolkit |
|---|---|---|
| follows | the text | the design and what the pages do |
| written | `Version 0.1, first public version` (its `label`) | `everytrickinthebook 1.0.0`, never "version 1.0.0" alone |
| set in | `versions.json`, each version with its Git tag (`v0.1`) | `version` in `everytrick/package.json` |
| what changed | the text of each frozen version, online at `/v<id>/` | `everytrick/CHANGELOG.md` |
| on the site | the footer's version line, the version notice, `/versions/` | the footer's credit line, linked to the toolkit's home and to `everytrick/CHANGELOG.md` |
| in the data | `version` in `page.json`, `publication.json` and the Markdown view | `everytrickinthebook` in the same files |

Every version of the book is built with the current toolkit, so a frozen version keeps its text but takes on the
current design.

A change to the toolkit bumps its version and adds an entry to its list of changes, in the same commit:

1. In `everytrick/`, run `npm version <minor|patch> --no-git-tag-version` (it updates `package-lock.json` too):
   - `1.x.0`, the minor number, when what readers see or what the pages do changes: the template, the stylesheet,
     the scripts, or the HTML the filters write;
   - `1.x.y`, the patch number, for fixes that change nothing a reader sees: the build, its checks, its report;
   - `1.0.0` marked the switch from Juncture to the static edition (20 November 2026).
2. Add the version at the top of `everytrick/CHANGELOG.md`: its number as the heading, the date, and what changed, in a
   few plain sentences written for editors and readers rather than developers.

The footer's two links are set at the top of `everytrick/build.mjs`: `TOOLKIT_HOME`, the toolkit's home, and
`TOOLKIT_CHANGES`, its list of changes. The format of `page.json` and `publication.json`, and the paragraph rule,
have their own version, `CONTRACT` in `build.mjs` and `everytrick/CONTRACT.md`.

### Freezing a version for review or release

Freezing a version gives its text a permanent address. The text is taken from a Git tag, so later changes on
`main` do not reach it. Only the owner decides to freeze a version.

1. Make sure the text to freeze is on `main` and its build is green.
2. Tag that commit and push the tag (tags are never moved or deleted once pushed):

   ```sh
   git switch main
   git pull --ff-only origin main
   git tag -a v0.9-review2 -m "Version 0.9, second peer review"
   git push origin v0.9-review2
   ```

3. On a new branch, add the version to the `versions` list in `versions.json` (the `example` there shows the
   fields), then build and check locally:

   ```json
   {
     "id": "0.9-review2",
     "tag": "v0.9-review2",
     "label": "Version 0.9, second peer review",
     "date": "2026-11-20",
     "status": "review",
     "contract": "0.7",
     "annotations": "hypothesis",
     "hypothesisGroup": "<group ID>"
   }
   ```

4. Number the version's new media items. In `everytrick/`, run `npm run number-media -- 0.9-review2` (with
   `--dry-run` first to see what it will do, without writing). Every item of the version that has no number yet gets
   the next one, in the version's reading order, with `since` set to the version; an item without a line in
   `media/register.csv` gets one, with a name drafted from its caption: check those names now, since they become
   permanent addresses (see "The media register"). Build and check again (the build stops if an item of a frozen
   version has no number), and commit `media/register.csv` together with the version's entry in `versions.json`.
5. Push the branch, open a pull request, and merge it when the build is green. Once GitHub Pages is enabled, the
   version appears at `/v0.9-review2/`.

For a review with Hypothesis, before step 3:

1. Sign in at `https://hypothes.is`, open "Groups" and create a private group (for example "Hear Here, second
   review").
2. Its invite link looks like `https://hypothes.is/groups/<ID>/<name>`; the `<ID>` part is the group ID for
   `hypothesisGroup`.
3. Send the reviewers the invite link and the address of the frozen version. Each reviewer needs a free
   Hypothesis account, joins the group through the invite link, then opens the frozen version, opens the sidebar
   (the arrow at the right edge) and logs in. Their annotations go to the group, which only its members can read.
   Reviewers should use this sidebar, built into the page, rather than the Hypothesis browser extension, so that
   the group setting applies.

To end the annotation period, set `annotations` to `none` in a later commit; the annotations stay in the group.
To retract a version, remove its entry; its address then stops working, so do this only for a mistake.

### References and citations

The book has one bibliography, `references/bibliography.json` (CSL-JSON), with every work that a chapter's reference list
names, entered once. Keys are the first author's surname and the year in plain ASCII (`becker2007`, `puigdelabellacasa2017`),
with a letter where one author has two works in a year (`stengers2005a`); a web page without author or date is keyed by
its site (`jacobinnd`). Each entry's `custom.typed` records where it is typed (page and text as Pandoc reads it). The
house style is `everytrick/csl/mattering-press.csl`, adapted from the MHRA styles of the official CSL repository; its header
lists the changes, and `npm run test:csl` checks it against the style guide's examples.

During the parallel run the essays keep their typed citations and reference lists, and the build links them:

- citations such as `(Becker, 2007)`, `(Becker 2007: 74)`, `(Puwar and Sharma, 2012; Stengers et al, 2014)` and years in
  brackets whose author is named in the sentence (`Fryer (1984)`, `(2017:147)`) are matched by surname and year. The text
  in the brackets becomes a link, and the reference, formatted in the house style, opens in a popup on hover, keyboard
  focus or tap. Without JavaScript the link goes to the reference;
- a link goes to the entry in the page's own typed list, or, when the page cites a work its list does not have, to the
  work's entry on the References page of the same version (below);
- the build prints, per page, the citations found, linked and not matched (with file, line and a hint), the years in
  brackets it read as dates, the paragraphs of typed lists that are not bibliography entries, and the entries no page
  cites; and, for each version, how many citations lead to their page's own list and how many to the References page.
  Correct the essay, or add the work to the bibliography, and build again.

The References page, `/references/`, lists every work in the bibliography once, formatted in the house style and in
the order of its reference lists (by author, then year), each with an anchor made from its key (`/references/#hall2001`).
Under each work: every passage that cites it, as page title and paragraph ("Introduction, para. 12"), linked to the
citation itself (`/essays/introduction/#cite-hall2001-1`), and every page whose typed list includes it, linked to the
entry there. Each frozen version has its own (`/v0.1/references/`), because which passages cite a work, and their
numbers, differ between versions. Every footer links to the References page of its version. All the references are
formatted in one citeproc run over the whole bibliography, so the year letters (Stengers 2005a and 2005b) are the
book's, on the References page and in the popups alike; the typed lists show what their authors typed (Podcasts types
"Stengers (2005)" for 2005a). When generated lists replace the typed ones, they must keep the book's letters: citeproc
run on one page's list alone gives 2005a no letter where 2005b is not on the same page.

Copying and downloading (the publisher, 2026-11-23): beside each work on the References page a Copy button opens a short
menu that copies the reference as plain text in Mattering Press' house style, APA (7th edition), Chicago (author-date),
MLA (9th edition) or Harvard (Cite Them Right), or as a BibTeX or RIS entry, and the status line at the foot of the
window says what was copied ("Copied: APA"). The house style is the reference as the page shows it, with the book's
year letters. The other four are made at build time by citeproc with the official CSL repository's styles in
`everytrick/csl/` (`formatReferences` in `citations.mjs`), each in the locale its guide is written for (Harvard in
British English, the others in American), with their year letters and their dashes for a repeated author switched
off: each work is given as it stands on its own, as a reference manager copies one, because a letter such as 2005a only
tells two works of this book apart. BibTeX is Pandoc's (`-t bibtex`, with the DOI and the date accessed added, which
it leaves out), RIS comes from `everytrick/ris.mjs`. The texts are in `references/formatted.json` beside the page,
which `everytrick/assets/references.js` loads only when the reader first comes to a Copy button; the buttons and their
menu are made by that script, so the page stays light, they are in no search index, and without JavaScript there are
none. The menu is a menu button: ↓ or Enter opens it, ↑ ↓ Home End move, Enter copies, Escape closes it, focus goes
back to the button. The explainer at the top of the page links the whole bibliography to download, as
`references/bibliography.bib` (BibTeX), `references/bibliography.ris` (RIS) and `references/bibliography.json`
(CSL-JSON, without the build's `custom` field), in each edition's own `references/` folder, beside its References page:
an edition's bibliography comes from its own tag, as its References page does. `npm run check` confirms that each has
every work. The formats of these files are in `everytrick/CONTRACT.md`.

At the switch to the static edition, `node scripts/to-citation-keys.mjs` prints the change that turns the typed
citations into Pandoc citations (`[@becker2007, p. 74]`, `[-@fryer1984]` where the author is named in the sentence) and
replaces each typed list with the list that citeproc generates. It is a dry run: it prints a diff and changes nothing.

## Previews

Every push to any branch also uploads that branch's build to Cloudflare Pages as a preview. Previews are open: anyone
with the address can look, without signing in, as anyone can read the branch's Markdown on GitHub. A branch whose name
starts with `private-` gets a private preview instead, behind Cloudflare Access, for the rare case that needs one.
Previews are throwaway: they are not versions, never enter `versions.json`, and are deleted with their branch.

- **Where:** each branch has a stable address showing its latest push, `https://<branch>.hearhere-preview.pages.dev`
  (`hearhere-private` for a private branch), and every push also gets its own address that stays as it was until
  deleted, for comparing iterations side by side. The workflow run's summary on GitHub lists both.
- **Who can see them:** an open preview, anyone with its address. Addresses are made from branch names, which are
  public on GitHub, so an open preview is unlisted, not hidden. A private preview, only the email addresses on that
  project's Access list: a visitor enters their email and receives a one-time code; no account or password is needed.
- **Search engines:** every preview is sent with `X-Robots-Tag: noindex, nofollow` (a `_headers` file uploaded with
  it, never with the public site), so search engines leave previews out even if a link to one is posted somewhere.
- **Editing view:** a preview also has the Media Index's editing view, `/media-index/edit/` (see "The media
  register"), which the public site never has: the workflow builds it only for branches other than `main`.
- **Cleanup:** deleting a branch on GitHub deletes its previews (`.github/workflows/preview-cleanup.yml`). Old
  previews of a branch that is kept can be deleted by running that workflow by hand.
- **Setup:** the repository secrets `CLOUDFLARE_API_TOKEN` (an account token with only "Cloudflare Pages: Edit",
  renewed yearly) and `CLOUDFLARE_ACCOUNT_ID`. The first push creates the open project `hearhere-preview`, whose
  production branch is one that never deploys, so every deployment, `main` included, is a preview. Its Access policy
  for preview deployments is off (Workers & Pages, `hearhere-preview`, Settings, General).
- **Private previews, set up once before the first `private-` branch:** in the Cloudflare dashboard, Workers & Pages,
  create a project named `hearhere-private` (Direct Upload) with production branch `cloudflare-production-unused`;
  then in its Settings, General, enable the Access policy for preview deployments, and in Zero Trust, Access,
  Applications, set the policy of the application this created to allow the email addresses of the people who may
  see it. The workflow never creates this project: a `private-` branch is not previewed until it exists, and a
  private preview that opens without signing in is deleted at once and the run fails.
- **Confidentiality:** the repository is public, so a branch's Markdown can be read on GitHub, `private-` branches
  included. A private preview hides the rendered site, not the source; embargoed material needs a separate private
  repository.

## Plan: stable links, versions and print companions

Agreed with the publisher on 2026-11-19. The static twin does not implement all of this yet; it is the plan the build must follow.

- **Views.** Every page is offered as plain links that work without JavaScript: the rendered page, a Markdown view of its converted Pandoc Markdown, and later site-level Collage and List views. The header's switch holds them as a pill of icons with their names, Page and Markdown now, made for a third segment, Collage (the publisher, 2026-11-23; see "Header" above); the List view is the Media Index, which the menu and every footer link to. Media appear in the Markdown view as standard image syntax and `:::` blocks containing ordinary links.
- **Versioned text links.** Each public release lives at a frozen address, for example `/v1/essays/aya_nassar/#p12`. Paragraphs are numbered cleanly in every release. Links that people copy or share always carry the version; plain addresses such as `/essays/aya_nassar/` mean "latest". A page in an older version shows a short notice linking to the same passage in the newest version, matched by its text. Only releases are public: corrections collect on GitHub until the next release. Paragraphs are numbered per chapter, the same unit as the chapter DOIs.
- **Exact quotes.** Links can add a text fragment (`#p12:~:text=…`) so the browser highlights the quoted words. The stylesheet styles `:target` and `::target-text`.
- **Media addresses are unversioned.** Every image, audio and video item gets its own page at a permanent, word-based address, such as `/see/plumbline`, `/listen/boulder` or `/watch/<name>`. Audio and video addresses may carry a start time (`#t=12:40`). If a file is replaced, the address stays and the item page notes the change.
- **Print.** Printed captions carry the item's address, and a QR code generated from the same address is always printed with it, because a printed link cannot be clicked. The colophon states which online version a printed edition corresponds to.
- **Shared media.** Images, tiles and audio are stored once and shared by all versions, so each release adds only its pages.
- **Two version numbers.** The book has `v1.0`, `v1.1`, `v2.0` and so on, following the text. everytrickinthebook, the toolkit, has its own numbers (`1.0.0`), following design and behaviour, and `everytrick/CHANGELOG.md` lists them with what changed. Each book release records the toolkit version that built it. All published versions are rebuilt with the current toolkit, so their text and paragraph numbers never change. Paragraph numbering is defined by the content in `everytrick/CONTRACT.md`, never by the template. Archived snapshots keep the exact design of their day.
- **DOIs and archiving.** Book and chapter DOIs are registered through Thoth and point to the latest version. Each release is tagged in Git and archived as a fixed snapshot: the site package, a web archive file, the whole-book Markdown and the media masters, deposited with Zenodo and through Thoth, plus Wayback Machine captures of every page.

## Plan: additions from reviewing Entreluma

Agreed with the publisher on 2026-11-19 after reviewing Entreluma, a static successor to Juncture by its original developer. We borrow ideas only: its repositories have no licence, so none of its code is copied.

- **Links that drive the media.** A link in the text can zoom an image to a detail or move audio and video to a moment. These are real links to the media item pages, using the standard media-fragment addresses `#xywh=x,y,w,h` (an image region) and `#t=12:40` (a time), for example `/see/plumbline#xywh=1200,800,600,400` and `/listen/boulder#t=12:40`. With JavaScript they act in place on the current page; without it, in print (as QR codes) and in archives they open the item page at that region or moment. Transcript timecodes use the same mechanism.
- **Retiring old addresses.** At the switch the site gets a "page not found" page that looks the requested address up in a redirect map and forwards the reader, so old Juncture links and any later renamed page still reach the right place.
- **Search.** Full-text search across the book with Pagefind, which builds its index at build time and needs no server. Built as agreed in "Plan: search".
- **Checks before publishing.** The build reports problems in plain language for authors and editors: missing alt text, unmatched citations, broken links, oversized images and a size limit for image tiles. During the parallel run these are warnings; from release 1.0, errors that stop a release.

## Plan: media data decisions

Agreed with the publisher on 2026-11-19. These fix the data; players and viewers are chosen later, in the design phase, and stay swappable because they read only these files. The audio player is settled in "Plan: podcast player and transcript".

- **Timings in WebVTT.** Transcript and word timings for audio and video live in standard WebVTT files next to each media file, never in the Markdown. Paragraph timecodes in the transcripts stay as they are. Word-level timings, when wanted, come from a one-off forced alignment of the existing, edited transcript against the audio. The same files serve as captions and as searchable text in archives.
- **`/read/<name>` for documents.** PDFs and other documents get item pages at `/read/<name>`, alongside `/see`, `/listen` and `/watch`. Page links use `#page=3`. At build time each document's pages are also rendered as images, so pages can be zoomed and linked like any image, with a download of the original file. The viewer and the text are settled in "Plan: documents and zines".
- **IIIF manifests for all images.** The build writes a IIIF Presentation 3 manifest for every image, image set and document, next to the static tiles. Any IIIF viewer (OpenSeadragon, Clover, Mirador, storytelling viewers), Tapestry and other projects can then show the book's images without changes.

## Plan: podcast player and transcript

Agreed with the publisher on 2026-11-21, after a reviewer's notes on the first proposal. Aya Nassar's episode
(`essays/aya_nassar.md`) is the test page for editorial accuracy as well as for playback. Players for video and
documents are planned separately; this plan settles audio. Status: steps 1 to 3 are built; on 2026-11-22 the publisher
made paragraph timing the standard for every podcast page, with the alignment report saying which cues need a person
to listen.

- **The player stays in the page**, under "Podcast", built on the browser's `<audio>`, so that it plays without
  JavaScript. `filters/embeds.lua` writes it with the recording's length, which the build reads from the MP3 itself
  (`everytrick/audio.mjs`); `assets/player.js` adds the controls: play, time and length, position, back and forward
  15 seconds, speed, and "Follow text" where the transcript has cues. On a narrow player (a phone; the publisher,
  2026-11-22) the controls are one line, play, time, position, "More" (⋯) and, when docked, ×; back, forward, speed
  and Follow text wait in a small panel that "More" opens, which also says what is playing. They are the same
  buttons in both layouts, so nothing moves when the player docks.
- **Docked bar.** While a recording plays, or is paused part-way, and its player is out of view, the player sits as a
  bar at the foot of the window, with the title and the speaker and paragraph being heard ("Aya Nassar · para. 17").
  Docking is a class on the player: the `<audio>` element and the buttons never move in the page, so playback
  continues and keyboard focus stays on the button that had it; the player keeps its space, so the page does not
  jump. The bar's × stops playback and puts the player back. Phones get lock-screen controls (Media Session).
- **Follow text** is off until the reader turns it on. Then the page scrolls to each new cue (it jumps instead when
  the reader asks for less motion). Any scrolling of the reader's own (wheel, touch, keys, the scroll bar, a link
  within the page) turns it off until they press it again; the page's own scrolling never does. No global keyboard
  shortcuts, and the cue being heard is not announced to screen readers.
- **Cues: paragraph by paragraph.** Each recording may have a cue file beside it,
  `media/audio/<recording>.paragraphs.vtt` (WebVTT), with one cue per transcript paragraph. Cues hold the paragraph's
  words, not its number, because numbers change from release to release while media files are shared by every
  version; the build finds each cue's paragraph by its words, which also tells it which recording a paragraph belongs
  to (the addendum needs no markup). The page marks each timed paragraph (`data-cue-for`, `data-cue-start`,
  `data-cue-end` on its `div.para`) rather than loading a separate track: simpler, and the player reads it directly.
  The paragraph being heard is marked on the transcript's rule in the accent colour, and a ▸ on the rule plays from it.
  Until a recording has cues, its written timecodes (`[00:05:35]`) are its cues and show as links that play from
  that moment. Once it has cues, the timecode lines are left out of the page, because every paragraph has its own ▸
  (the publisher, 2026-11-22). They stay in the Markdown and in the Markdown view, as the editors' record, and
  `scripts/align.mjs` checks its timings against them when it first times a recording.
- **Making the cues** (`everytrick/scripts/align.mjs`, run once on the editor's computer, not in the build):
  whisper.cpp transcribes the recording offline with a time for every word, and those words are matched against the
  edited transcript. Speaker labels, bracketed directions, timecodes and unnumbered lines are not matched. Words heard
  between two paragraphs that the text changed or does not have (one speaker's edited ending, the next one's
  lead-in) are split at the longest pause among them, and the paragraph starts after it. The script writes the cue
  file (never over one that exists, which is the editor's) and a report: first what needs attention (untimed
  paragraphs, a start moved more than 5 seconds by words the text does not have, more than 5.5 seconds of such talk
  kept with the paragraph before, paragraphs heard less than 60% as
  written, cues too fast or too slow for speech, 10 seconds or more of talk inside a cue that the text leaves out,
  talk before the first or after the last paragraph, written timecodes more than 3 seconds off), then when each
  paragraph starts, the written timecodes checked, and the places where text and recording differ, grouped as words
  that look or sound alike, heard but not in the text, in the text but not heard, and rephrased. `--json <file>` writes
  the same findings for scripts.
- **Correcting a cue:** change its start time in the `.vtt` file. **Leaving a passage untimed:** delete its cue and
  write `NOTE untimed: <its first words>` in its place. An untimed paragraph has no ▸, and nothing is marked while it
  plays. When the text changes, the build warns about cues that no longer match a paragraph.
- **Captions** come from the same word times in a second file, `<recording>.captions.vtt`, cut at sentence and clause
  breaks, naming the speaker on every cue and keeping sound directions. The build checks them for readability: at most
  two lines of about 42 characters, 1–7 seconds a cue, at most about 20 characters a second. For an audio-only podcast
  the transcript meets the accessibility requirement (WCAG 1.2.1); captions serve archives, podcast apps and video.
- **Test protocol on Aya Nassar's page:** the first and last passage of each recording (para. 6 and 75; para. 76 and
  79 for the addendum, which must play from its own file); a speaker's turn over several paragraphs (paras. 8–14,
  and 61–69 across `[00:31:44]`); the organ direction beside the first timecode (para. 16, its direction inside
  para. 28, and the unnumbered "[organ continues…]" line, which stays untimed); the seven written timecodes within
  about 2 seconds; and the docked bar (playback continues as it docks, focus stays put, scrolling turns Follow off
  until asked, on a phone and with the keyboard alone).
- **Order of work:** 1. player and docked bar, with the written timecodes as cues; 2. the alignment script, and Aya
  Nassar's cue file once it has been checked by ear against the protocol; 3. cue files for every podcast page, with
  the build's warnings; 4. captions with the readability check; 5. if editing `.vtt` files by hand proves awkward, a
  timing mode on the preview (`?timing`) to set a paragraph's start while listening. Where the audio is hosted is
  unchanged and still to be decided.

## Plan: margin notes

Agreed with the publisher on 2026-11-19. Text notes and media in the margin are built (`everytrick/filters/margins.lua`, `everytrick/assets/margins.js`): a margin note may hold pictures, animated GIFs, video and audio players, and one that holds only media has no note number (example: the cover beside para. 1 of the home page). Media in the margin are media items with their own numbers, like any other (everytrickinthebook 1.11.0). The print and EPUB forms are not built yet.

- **What:** short notes, links and small media thumbnails in a right-hand margin column. Paragraph numbers keep the left margin.
- **Where they live in the source:** directly after the paragraph they belong to (`::: {.margin}` … `:::`), or attached to a word (`[given by Germany in 1962]{.margin}`). They are never stored by paragraph number, so they move with their paragraph from version to version. While Juncture still renders the site, write them as `<aside class="margin" markdown="1">…</aside>`, which the build converts.
- **Layout on wide screens:** notes float in the margin starting level with their paragraph. When the margin is crowded, later notes are pushed down, so the text column never gets gaps. A marker in the text and the same mark on the note highlight together on hover and focus. Notes show in full (the publisher's preset, 2026-11-20). Setting `--margin-note-lines` in `everytrick/assets/site.css` above 0 makes long notes show that many lines, then "more".
- **Phones, no JavaScript and screen readers:** a note stays in reading order directly after its paragraph, as a labelled aside.
- **Print and EPUB:** decided per note: an endnote, a small figure with address and QR code, or web-only.
- **Numbering:** text notes are numbered per chapter (`n1`, `n2`), matching the endnote numbers they get in print; media in the margin are media items like any other, with their own numbers and item addresses (see "Plan: media register, item pages and the Media Index"; the publisher, 2026-11-22, replacing `Fig. 2.3` numbers); plain links are not numbered; paragraph numbers ignore the margin. Details in `everytrick/CONTRACT.md`.

## Plan: image display and the zoom viewer

Agreed with the publisher on 2026-11-22. It settles how pictures sit in the page and how they are viewed; the data
stays as "Plan: media data decisions" fixes it. Built in everytrickinthebook 1.10.0 (22 November 2026), except the
`.compare` class, which is for later.

- **In the page a picture is a plain image**: an `<img>` with `srcset` in 800, 1200, 1600 and 2400 px (JPEG at about
  quality 82, as "Images online" in the house style says) and a `sizes` value that matches the width it is shown at.
  It works without JavaScript, prints and archives. IIIF tiles and OpenSeadragon are only for the zoom viewer.
- **Widths.** `.left` and `.right`: half the text column, as before (`width=` still sets another share). No class:
  the text column. `.wide`: 64rem, the width of the page's opening and its footer (less their side margins, so the
  picture lines up with the title in the bar and the logo in the footer). `.full`: the whole window, used
  sparingly. Captions of wide and full pictures keep the text column's width. A margin note beside a wide or full
  picture moves below it. On phones every picture is as wide as the text column. In the legacy `.ve-media` lines,
  `wide` and `full` are written like `left` and `right`.
- **Nothing covers the picture.** "⤢ Zoom" sits at the right end of the caption line (in a gallery whose pictures are
  too narrow for a caption and the button side by side, it has the line below each picture to itself). Clicking the
  picture also opens the viewer (with a zoom cursor); the button is the figure's only keyboard stop. Without JavaScript
  the picture links to its largest image, and to its item page once item pages exist (it does since
  everytrickinthebook 1.11.0; on the item page itself it links to the largest image).
- **Tall pictures** are never taller than about 80% of the window. The build writes each picture's proportions into
  the page, so the stylesheet sizes the picture and its caption without JavaScript.
- **Galleries** are justified rows: every picture keeps its proportions, its share of the row follows its shape, and
  nothing is cropped. A gallery of two pictures is two pictures side by side.
- **Animations** get a pause button, which swaps the animation for its first frame (the still the build already
  makes). Readers who ask for less motion see the still, as before. Animations do not zoom.
- **The viewer** is a full-window dialog on a dark ground, its controls in the shape of the podcast player's.
  - Top bar: the picture's place in the sequence ("3 / 12"), its caption and credit on one line (tap to read all), and
    Close. Bottom bar: zoom out, zoom in, fit; full screen; previous and next.
  - All zoomable pictures of a page are one sequence in page order (OpenSeadragon's sequence mode); a gallery is a run
    within it.
  - Keyboard: ← and → for previous and next, + and − to zoom, Escape to close. Focus goes back to the picture's Zoom
    button.
  - Phones: when the whole picture is in view, a sideways swipe goes to the next or previous picture; when zoomed in,
    it moves the picture (the publisher, 2026-11-22). The ‹ › buttons always work.
  - The picture already loaded in the page shows at once, and the tiles sharpen it as they arrive. For readers who
    ask for less motion, zooming jumps instead of gliding.
  - Not used: OpenSeadragon's reference strip and collection mode. Later, a `.compare` class may show two pictures side
    by side in one viewer, zooming together (OpenSeadragon's multi-image).

## Plan: documents and zines

Agreed with the publisher on 2026-11-22 (option A of three: page images with the text beside them, rather than
PDF.js or the browser's own PDF reader). It builds the `/read/<name>` item pages of "Plan: media data decisions".
Built in everytrickinthebook 1.13.0 (23 November 2026); how editors use it is in "Documents and zines" above. Settled
while building, where the plan was silent: spreads are shown where the viewer is at least 600 px wide and wider than it
is tall (a phone, or a tablet held upright, shows one page at a time); the viewer on a document's own page sits in the
page, as wide as the page's opening, where the mouse wheel and a vertical swipe scroll the page until the pages are zoomed
in; the address follows the pages as the reader turns them (`#page=6`); Home and End go to the first and last pages; on
an essay page the cover is at most 20rem wide; the walk booklet's caption loses its closing "Open the booklet (PDF)" link,
which the download replaces. Changed by the publisher on 2026-11-23: the two pages of a spread meet without a gap, and a
soft shadow on each page towards the spine, with a one-pixel hairline at the spine, shows that they are two (an
OpenSeadragon overlay in the viewport's coordinates, `div.viewer__spine`, so that it zooms and moves with the pages and
stays in full screen; a single page and the cover alone have none; its look is in `everytrick/assets/site.css`); and
the text of a document is searched (below).

- **Pages in the zoom viewer.** A document's pages are page images with zoom tiles, shown in the image viewer as
  two-page spreads on wide screens (the cover alone, then 2–3, 4–5 …) and one page at a time on phones, with a thin bar:
  ‹ 4–5 / 21 ›, Zoom, Full screen, Text, Download. Keyboard and swipe work as for pictures.
- **The text** of a document is plain HTML on its `/read/` page, below the viewer, one section per page headed
  "Page 3" (anchor `#page-3`; links that open the viewer at a page use `#page=3`), so that it can be searched, read
  aloud, translated and copied. Search (the publisher, 2026-11-23): only the pages' text of a document's `/read/` page,
  not its facts or buttons, is in the latest text's search index, each page labelled "page 3" where an essay's
  paragraphs are "para. 12", and a result leads to `#page-3` (see "Plan: search"). The zines have no text to find. In the viewer, Text swaps the pages on screen for their text. A PDF made on a computer
  gives clean text; a scan or a flattened zine does not (archive.org's text recognition of the zine index is
  unusable), so it shows its caption, and later a description written by an editor.
- **On an essay page** a document is a figure: its cover with the caption, and on the caption line Open (the viewer,
  in place), Text (its text on the `/read/` page) and the download with its size.
- **Without JavaScript** the `/read/` page shows the pages as plain images in a row you can scroll, then the text.
- **The walk booklet** (`media/events/walking_sitting_sketching.pdf`, 21 A5 pages) is rendered at build time with
  poppler (`pdftoppm`, `pdftotext`; GitHub Actions installs it). The original PDF is the download.
- **The two zines on archive.org** (the Experimental Zine Index and House of Hope) are copied in once: a script fetches
  each item's page images and stores them as JPEGs in `media/zines/<archive.org identifier>/`, and the build makes our
  own tiles from them. archive.org stays the source and the archived copy, and the download links to it. To correct a
  zine, correct it on archive.org and run the script again. Readers never wait on archive.org's image service, which
  failed for the zine index when tested on 2026-11-22.

## Plan: media register, item pages and the Media Index

Agreed with the publisher on 2026-11-22. Every media item has one permanent number, kept in a register, and every
number a reader sees is made from it. It replaces chapter-based figure numbers (`Fig. 2.3`) on the web; print keeps
them, worked out for the printed route. Built in everytrickinthebook 1.11.0 (23 November 2026), except print, which
waits for the print edition; how editors use it is in "The media register" above.

- **The register** is one table in the repository with a line per item: its number, its kind (`see`, `listen`,
  `watch` or `read`, the words of its address), its name, its file or address, the version it entered with, its
  credit, its rights and how to cite its source, and its former names and files. Nothing else is stored: captions,
  sizes and where an item appears are read from the pages at every build. A title is stored only for an item whose
  pages give it none.
- **Numbers** are given when a version is frozen, to the items of that version that have none, in its reading order.
  A number never changes and is never reused, also when its item is withdrawn. Version 0.1's 70 items are numbered
  1–70 in its reading order. An item not yet in a frozen version shows "new" where its number will be. The register
  is not versioned: text is versioned, media items are objects with permanent addresses.
- **One item, one number.** The same file or address on another page is the same item and shows the same number.
  A replaced file is added to its item's line, so older versions still find it.
- **Names** are the readable part of an item's address (`/see/boulder-font`), drafted from the captions and edited by
  the publisher. A name can change: the old one is kept as a former name and keeps forwarding.
- **Short addresses.** `/37/` forwards to item 37's page. It is the address printed with an item, short enough to type
  from paper (the publisher, 2026-11-22).
- **What readers see.** Every caption starts with the item's number, a small pill that links to its item page. In the
  viewer the number stands before the caption, and "3 / 12" is only the picture's place in the sequence. Authors link
  to an item by its name (`[the boulder from Bethlehem](/see/boulder-font)`), never by its number, so no typed number
  can go stale. An item can be cited like a paragraph, against the book: "(Puwar 2026: item 37)" (the publisher,
  2026-11-23, replacing "(Hahn 2026: item 37)"; see "Plan: copying citations").
- **Item pages** at `/see/<name>/`, `/listen/<name>/`, `/watch/<name>/` and `/read/<name>/` show the item (the
  zoomable picture, the player or the document), its number, its caption or captions, its credit, its rights and its
  source, every place it appears, the version it entered with, where it is stored and where it is served from.
- **Credit** is the item's own field in the register (the publisher, 2026-11-22), shown after its caption wherever it
  appears and on its item page.
- **Rights** (the publisher, 2026-11-23) are a standard address in the register's `rights`: a statement of
  rightsstatements.org or a Creative Commons licence. The item page shows its label linked to the address ("In
  Copyright", "CC BY 4.0"), followed by `rights_note`, a few words or a link, when there is one; `media.json` carries
  both. Rights are filled in only where they are clear: In Copyright for item 1 (Historic England Archive, whose terms
  of use are its note), for House of Hope (item 42: its archive.org page allows no reproduction without the artist's
  written permission) and for the YouTube, Vimeo and BBC videos. Every other item is left empty, never "Copyright Not
  Evaluated". Permission letters and contact details never go in the repository.
- **How to cite the source** (the publisher, 2026-11-23): `cite_as` in the register says how to cite the item's own
  source in the house style, with its maker, title, date and holder
  (`Clarke Fitzgerald, ‘The Plumb Line and the City’ (1971), Coventry Cathedral`), and the item page shows it as
  "Source". It was filled in only where a caption already named maker and date (items 7, 10, 24 and 64). A later change
  will use it for a "Cite this item" line.
- **Public pages never show a missing field** (the publisher, 2026-11-23). Credit, rights and source appear on item
  pages, in the Media Index and in captions only when they are filled in, and nothing public says "not evaluated",
  "none", "unknown" or "missing". Only the editing view marks what is missing, in its checks beside each item.
- **The Media Index** (`/media-index/`) is a page of the book that lists every item by number, with a thumbnail, its
  title, kind and address, where it appears (links to the item in its page), the version it entered with, where it
  is stored and where it is served from, and its credit and rights when it has them. It can be filtered by kind and by
  where items are served from; without JavaScript it is a plain list. It is the "List" view of "Plan: stable links",
  and the footer links to it.
- **Search** finds the items of the Media Index (the publisher, 2026-11-23): each entry's title and address are in
  the latest text's search index, and a result leads to the entry (`/media-index/#item-37`), labelled "item 37" where
  a page shows "para. 12" (see "Plan: search"). Its other facts (where it appears, its version, where it is stored
  and served from) are left out, and so are the item pages, whose words the Media Index holds (except the text of a
  document's pages, see "Plan: documents and zines"), the short and former addresses and the editing view. The Media
  Index and the item pages are shared by every version, so a frozen version's search does not have them.
- **The editing view** (`/media-index/edit/`) is built on previews only, never on the public site. It is the same list
  with fields for the name, the credit, the rights (a choice of the common rightsstatements.org statements and Creative
  Commons licences, plus any other address typed in) and their note, how to cite the source, the caption and alt text
  of each appearance, and a comment, and checks beside each item: no alt text, alt text that repeats the caption, no
  credit, no rights, no source to cite, used on no page. Edits stay in the browser; "Hand over changes" gives a change
  sheet that lists only what changed, which someone applies on a branch. Later, perhaps: saving straight to GitHub,
  and lasting comments through a private Hypothesis group. The repository is public, so permission letters and
  contact details stay out of it.
- **Print** (one route, fixed): figures are numbered `Fig. 6.4` when the route is exported (the chapter's place in that
  route, then the item's place in the chapter), never stored. Links to items in the text become "(Fig. 6.4)", the
  item's short address and a QR code are printed with it, and the list of illustrations gives both numbers. Not built
  until the print edition.
- **First published and last changed** (a reviewer's suggestion, accepted by the publisher, 2026-11-23; built in
  everytrickinthebook 1.14.0): item pages say when the item was first published and, for an item whose file is the
  book's, when that file last changed, both from the Git history, in the house style ("27 August 2025"); an item served
  from elsewhere (YouTube, Vimeo, the BBC, archive.org) shows only the first. `media.json` has both (contract 0.6).
  Without the whole history the rows are left out and the build warns.
- **Long descriptions** (a reviewer's suggestion, accepted by the publisher, 2026-11-23; built in
  everytrickinthebook 1.14.0): a picture that carries an argument (an artist's map, an archive photograph) may have
  a longer description, written by an author or an editor and credited to them, as `::: {.description by="Name"}` …
  `:::` directly after the picture. The page shows it as a quiet "Description" disclosure under the caption, linked to
  the picture for screen readers (`aria-details`); the item page shows it in full under the picture. It is never
  numbered (the paragraph rule of contract 0.6). It is optional: never shown or flagged as missing anywhere, not even in
  the editing view's checks; the editing view has an optional field for it, and for its writer, at each appearance.
  None is written yet.
- **Checks.** The build stops when a registered item's file or address has changed or gone, when an item of a frozen
  version has no number, and when an item's rights are not a statement or licence address (or say Copyright Not
  Evaluated or Copyright Undetermined). **Freezing** gains a step: number the version's new items and commit the
  register with the version's entry in `versions.json`.

## Plan: the References page

Agreed with the publisher on 2026-11-22. The bibliography already works as a register for works: each is entered once,
with a permanent key. Built in everytrickinthebook 1.12.0 (23 November 2026), with copying each reference and
downloading the bibliography (the publisher, 2026-11-23), except the Zotero library, which is for later; how it works
is in "References and citations" above.

- **One page for the whole book**, `/references/`, lists every work in the bibliography once, formatted in the house
  style, each with an anchor made from its key (`/references/#hall2001`). Under each work: every passage that cites it
  (page and paragraph) and every page whose reference list includes it. The footer links to it.
- **Citations** link to the work in their page's own reference list when the page lists it, and otherwise to its entry
  on the References page, no longer to the first page in reading order that lists it. The popups stay.
- **Year letters** (Stengers 2005a and 2005b) are fixed for the whole book, also once reference lists are generated
  page by page.
- **Search** finds the works of the References page (the publisher, 2026-11-23): each edition's index has its own
  References page, and a work found there is listed by itself, labelled as the text cites it ("Stengers 2005a",
  from citeproc in the house style; its key if citeproc gives none), with a link to its entry
  (`/references/#stengers2005a`; see "Plan: search"). The lists of the passages and pages under each work are left
  out, so that searching a page's title does not list every work it cites.
- **Copy a reference** (the publisher, 2026-11-23): beside each work a Copy button opens a short menu that copies it as
  plain text in Mattering Press' house style (as the page shows it), APA (7th edition), Chicago (author-date), MLA
  (9th edition) or Harvard (Cite Them Right), or as a BibTeX or RIS entry, and says what it copied ("Copied: APA").
  The other styles are made at build time by Pandoc's citeproc with the styles of the official CSL repository, pinned
  to a commit. It works with the keyboard and on phones; without JavaScript there are no buttons. The buttons are
  interface, not reading text, and are kept out of the search index.
- **Downloads** (the publisher, 2026-11-23): the explainer at the top of the page links the whole bibliography as
  BibTeX, RIS and CSL-JSON, in each edition's `references/` folder, beside its References page. Its words: "All 71
  works in the book’s bibliography, in Mattering Press’ house style. Under each work are the passages that cite it,
  which lead to the citation in the text, and the pages whose reference lists include it. Copy any reference in
  another style with the Copy button beside it, or download them all as BibTeX, RIS or CSL-JSON." (the number is
  counted at every build; the page names the house style "Mattering Press’ house style" throughout).
- **In the menu** (the publisher, 2026-11-23): the header's menu ends with "media index" and "references" on every
  page (see "Header" above).
- **Later, perhaps** (the publisher, 2026-11-22: "keep it for later"): references edited in a Zotero group library and
  handed over to `references/bibliography.json` on a branch.

## Plan: copying citations

Agreed with the publisher on 2026-11-23. It gathers what earlier plans
promised: a "Cite this" panel and "copy quote with citation" (notes of 19 November), exact quotes as text fragments
("Plan: stable links, versions and print companions"), citing a media item like a paragraph ("Plan: media register,
item pages and the Media Index") and the house style's `(Nassar 2026: para. 12)`. Not built yet.

- **The ¶ stays as it is.** One click copies the link to the paragraph, with the version in it on a frozen version
  (see "Paragraph numbers"). Every new way of copying works like it: one click copies, and the status line says what
  was copied. Nothing is added to the left margin, which already holds the number, the ¶ and, in transcripts, the ▸.
- **Who wrote a page.** Each page names its authors in its front matter, in Pandoc's `author:` field, and its
  interviewers in `interviewer:` (the role CSL and MHRA 7.11 give the person who conducts a published interview), so a
  podcast credits both the person interviewed and the interviewer (the publisher, 2026-11-23). Everyone who made a
  page is named in its citation (the publisher, 2026-11-23): the podcasts' producer in `producer:` (a CSL role) and
  their transcription editor in `transcript-editor:`, which the house style renders as "transcript ed. by", a role
  CSL lacks; `npm run test:csl` checks both. `convert.mjs` keeps a
  front-matter block at the top of a legacy page. The names go into `page.json` (a new contract version; the paragraph
  rule does not change) and later to Thoth. The book's own data (editor, publisher, year, licence) stay in `build.mjs`.
  The build warns about a page that has numbered paragraphs but no author.
  An event page is credited to Nirmal Puwar together with the event's collaborators (the publisher, 2026-11-23); the
  names for each page are being confirmed with Nirmal Puwar before they are entered.
- **Quotes.** Selecting words in numbered paragraphs shows a small bar at the foot of the window, on every screen,
  with two labelled buttons, "Copy quote" and "Copy citation". The bar never sits beside the selection, where the
  phone's own menu and Hypothesis's Annotate button appear, so it works on any page that loads Hypothesis, including
  latest-text or release pages if Hypothesis is later opened there, for teaching for example (the publisher,
  2026-11-23). It leaves the right edge free for Hypothesis's sidebar and sits above the docked player. "Copy quote"
  copies:

  > ‘Cairo is a very dusty city’ (Nassar 2026: para. 55)
  >
  > Nassar, Aya, ‘Hear Here Podcast: Aya Nassar’, interviewed by Nirmal Puwar, in *Hear Here: Spatial Practices*,
  > ed. by Nirmal Puwar, version 0.1 (Mattering Press, 2026) <https://hearhere.matteringpress.org/v0.1/essays/aya_nassar/>
  > [accessed 23 November 2026]

  "Copy citation" copies the same without the quote. A selection over several paragraphs gives "paras 55–56". The
  quote is the words as selected, without paragraph numbers, ▸ or margin notes. The clipboard gets formatted text
  (italics, live links) and plain text, so it pastes well into a word processor and into a plain field.
- **The link to the exact words.** The address of the quoted words is the paragraph with a text fragment
  (`…/v0.1/essays/aya_nassar/#p55:~:text=Cairo%20is%20a%20very%20dusty%20city`), so the browser highlights them;
  browsers without text fragments land on the paragraph. In formatted text the in-text citation, "(Nassar 2026:
  para. 55)", is itself that link, and the reference ends with the chapter's address, later its DOI, as a reference
  should. Plain text cannot hold a hidden link, so there the passage's address follows on a line of its own (the
  publisher, 2026-11-23).
- **"Cite" under the page title** opens a panel (a popover, like the text size and colours): the in-text citation, set
  to the paragraph in the address or the one being read (the reading position `paragraphs.js` already keeps for the
  version notice), the reference, the link, a copy button for each, and downloads of the page's reference as BibTeX,
  RIS and CSL-JSON. Keyboard users cite a passage here. Without JavaScript the same reference stands in a "How to cite
  this page" section at the end of the page, which also serves print and archives.
- **From the latest text.** A citation always names a version. Copied on the latest text, it cites the newest release
  wherever the passage is unchanged there (the build matches paragraphs by their words, as for the version notice),
  with that release's paragraph number and address. A passage that is new or changed since is cited as "latest text,
  unreleased", and the status line says that its number may still change (the publisher, 2026-11-23). The ¶ link is
  unchanged.
- **Media items** are cited against the book, since their numbers belong to the book (the publisher, 2026-11-23):
  `(Puwar 2026: item 37)`, the item's title and credit, the book's reference, and the item's short address (`/37/`).
  "Cite" sits in the zoom viewer's top bar, and each item page has a "Cite this item" box. The number pill in a caption
  stays a link to the item page. Later, perhaps: a recording cited at a moment (`#t=12:40`).
- **Works in the bibliography.** Each entry on the References page, and each citation popup, gets "Copy reference",
  which copies the work's reference in the house style. Downloads of the whole bibliography stay for later (see "Plan:
  the References page").
- **Made at build time.** References are written by citeproc with the house style, so they match the reference lists;
  the browser adds only the accessed date. `npm run test:csl` gains a chapter, a podcast with its interviewer and a
  media item. The same data give every page Google Scholar `citation_*` tags and a JSON-LD block.
- **Order of work:** 1. authors in the pages, the page metadata, the Cite panel, Copy quote and Copy citation, from
  `main`; 2. media items and bibliography entries, once the media register and the References page (pull requests
  #32–#34) are on `main`. Each step is a minor version of every_trick_in_the_book.

## Plan: search

Agreed with the publisher on 2026-11-22 and built in everytrickinthebook 1.9.0, with Pagefind 1.6.0 (a pinned
dependency of `everytrick/`; MIT licence).

- **A search page, not a pop-up.** Every page has a magnifier in its header that leads to `search/`. A search has an
  address (`search/?q=dust`) that can be shared and works with the back button, and Pagefind loads only on that page.
  A pop-up over the current page could be added later on top of the page.
- **Closing search.** A × at the top right of the search page leads back to the page search was opened from, at the
  place the reader last stopped scrolling below its header (`everytrick/assets/place.js`, on every page, keeps it
  for the tab in `sessionStorage`), because the browser's Back button is not evident to every reader and the
  magnifier makes readers scroll to the top. It works after following a result and coming back too; Escape does the
  same when the field is empty. Without JavaScript the × leads to the home page. Asked for by the publisher on
  2026-11-22.
- **Results lead to paragraphs.** Our own small script (`everytrick/assets/search.js`), not Pagefind's ready-made
  box, lists each page found with up to three of its paragraphs: number (para. 12), the words around the ones
  found, marked, and a link to `#p12`. It uses the site's stylesheet, so it follows the reader's text size and
  colours. A list page lists its entries instead, each labelled in the page's Pagefind meta (`entry-<id>`): the
  Media Index's results are its items, "item 37", with a link to `#item-37`, and the References page's its works,
  as the text cites them ("Stengers 2005a"), with a link to `#stengers2005a`.
- **Only the reading text.** The template marks `<main>` of real pages for indexing (`data-pagefind-body`) and the
  page's title as the result's title. The Markdown views, `publication/`, `versions/` and `search/` are not indexed.
  Cards are left out (`data-pagefind-ignore`, set by `filters/cards.lua`), so the words in a card are found on the
  page it leads to; a page with only cards (Events) has nothing to find. Transcripts, captions and alt text are in.
  Each edition's References page is in its index, and the Media Index in the latest text's; the media items' own
  pages, their short and former addresses and the editing view are in none (see "Plan: media register, item pages
  and the Media Index" and "Plan: the References page"). The References page's Copy buttons are interface, made by its
  script, so no index has them; the header, the menu panel included, is outside `<main>`. The text of a document's
  pages is in the latest text's index too, from its `/read/` page: only the text (`<div class="document-pages"
  data-pagefind-body>`), each page a place of its own labelled "page 3" (`entry-page-3`) with a link to `#page-3`;
  the page's facts, buttons and "Page 3" headings are left out (see "Plan: documents and zines").
- **Each edition searches itself.** The latest text and every frozen version get their own index (`pagefind/`) and
  search page (`/v0.1/search/`), so results in a frozen version lead to its permanent paragraph numbers. A frozen
  version's search page has a link that searches the latest text for the same words. Each index adds about 0.6 MB.
- **Without JavaScript** the search page says so and points to the whole book in Markdown, where the browser's own
  Find in page works.
- **Build and check.** `build.mjs` makes the indexes as its last step, so GitHub Actions and the previews need no
  change, and reports how many pages each holds. `check.mjs` confirms every edition has its search page and index.
- **Later.** WebVTT captions join the index when they exist (the media item pages stay out: the Media Index holds
  their words); filters (by section, or by route once "several routes" is settled) can be added with
  `data-pagefind-filter`.

## Plan, not yet confirmed: several routes through a book

Discussed with the publisher on 2026-11-21. **Not confirmed and not built.** It waits until the materials that go into the new chapters are known; review it then, settle the open questions below, and only then mark it agreed.

The idea: a book can have more than one table of contents. Each is a route of its own, with its own chapters holding different material, not just the same pages in another order. For this book: route A by kind of material (Podcasts, Events, Experimental index, Conversations, Songs) and route B by object (Acorns, Rocks, and others to come).

- **Three kinds of page.** *Material* (a podcast episode, an event, a conversation, a song, the zine index) has its own address, paragraph numbers, reference list and later DOI, and belongs to no route; it can appear in several. *A chapter* (Podcasts, Acorns) is a page with its own text that gathers material, with cards and, if wanted, extracts and media from material pages. *A route* is a list of chapters in order. `essays/podcasts.md` is already a chapter in this sense; route B adds new chapter pages.
- **All routes are equal.** One is marked as the route a reader starts on; none is "the" contents with the others as extras.
- **Declared on the home page.** Each route is a heading with the class `route` followed by the list of its chapters, the starting one with `start=true`:

  ```markdown
  # Materials {.route start=true}

  - [Podcasts](./essays/podcasts.md)
  - [Events](./essays/events.md)

  # Objects {.route}

  - [Acorns](./essays/acorns.md)
  - [Rocks](./essays/rocks.md)
  ```

- **Books with one table of contents.** A home page without `.route` headings works exactly as now (the menu is the route). A second route is opt-in.
- **Order and sections per route.** The build works out a reading order, previous and next, and the section label of each page once per route, with today's rule (the chapters in turn, each followed by the pages its cards lead to). A page can be in Podcasts on one route and in Rocks on the other.
- **What readers see.** The home page shows the book's title, cover and introduction, then every route's contents, the starting route first. The header has a route switch beside the menu ("Materials | Objects"), plain links like the Page / Markdown switch, and the menu shows the chapters of the current route. A chapter page belongs to one route and always shows it. A material page on several routes shows the route the reader came from (with JavaScript; without it, the starting route) and names its places ("In Podcasts · in Rocks"). Switching route on a material page stays on the page if the other route has it, otherwise goes to that route's contents.
- **Paragraph numbers.** Every page numbers its own text, chapter pages included. Extracts keep their source's numbers ("Nassar, para. 12–18") and link back to it; they do not count in the chapter's series. That is a new rule for extracts only, in a new contract version; the numbering of existing pages does not change. Routes reorder pages, not paragraphs, so a paragraph's number is the same on every route.
- **Extracts are named, not numbered** (note added 2026-11-22). An extract should point at its passage by a name given to that passage in its source page, not by paragraph numbers (`#p12-p18`), because those move when the source changes above the passage, and the chapter would then silently show other paragraphs. The build works out the numbers for the extract's label ("Nassar, paras 12–18") at every build. This matters only if chapters show extracts (open question 2).
- **References.** Stay at the end of each page. An extract brings the references cited in its paragraphs. A citation whose work its page does not list links to its entry on the References page (see "Plan: the References page").
- **Media.** Every media item keeps its one number from the media register on every route; lists of media follow the route's order (see "Plan: media register, item pages and the Media Index").
- **Build and contract.** `publication.json` gets `routes`, each with its own reading order; `readingOrder` stays and means the starting route. Each route gets its own `publication.md`. An extract block (`::: {.extract from="essays/aya_nassar.md#p12-p18"}`) is filled in from the source page. The contract and the toolkit's version go up.

Open questions:

1. The word readers see for a route: "route", "contents", "way through" or another.
2. Whether chapter pages show extracts and media from material pages, or only cards. Cards alone are the smaller job.
3. Which pages get DOIs: only the contributions, or also chapter pages with authored text.
4. File names: `essays/acorn.md` is the Acorn event, so the Acorns chapter needs another name, or the event page is renamed with a redirect.

## House style for the web edition

A summary of the Mattering Press house style (Formatting & Style Guide, August 2025) as it applies to the build. The guide itself is not kept in this public repository; ask the publisher for it.

- **Citation:** MHRA-based author-date. In the text: `(Nassar 2026: para. 12)`, with paragraph numbers used where there are no pages. Reference list in MHRA bibliography form: single quotation marks, chapter titles in sentence case, book titles in italics, online sources as `<URL> [accessed 19 November 2026]`. No stock CSL style matches exactly, so the build will carry its own, tested against the guide's examples.
- **Figures:** on the web every media item shows its own number from the media register, and its item page gives it beside its word-based address. In print, figures are numbered `Fig. 6.4` (chapter, then image) for the printed route when it is exported, with the item's short address and QR code (the publisher, 2026-11-22, replacing `Fig. 2.3` everywhere; see "Plan: media register, item pages and the Media Index"). The photographer or source goes in the caption: the item's credit.
- **Text:** British spelling (-ise), single quotation marks with double ones for quotes inside quotes, en dashes with spaces for parenthetical clauses. This also applies to the site's own interface text.
- **Images online:** our own rule, not the guide's. Each image is published in several widths (800, 1200, 1600 and 2400 px), JPEG at about quality 82, chosen by the browser through `srcset`, with deep zoom from the full-resolution original.
