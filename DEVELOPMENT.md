# Development and deployment workflow

This repository is the only source for the publication. Since version 0.1 (2026-11-20) the public site is the
static edition built by every_trick_in_the_book in `every_trick/`; Juncture, which rendered the first version, is
retired and forwards its visitors to the new site.

- Repository: `mattering-press/Hear-Here-Spatial-Practices`
- Production branch: `main`
- Production site: `https://hearhere.matteringpress.org/` (GitHub Pages, built by GitHub Actions from `main`)
- Frozen versions: `https://hearhere.matteringpress.org/v<id>/`, listed in `versions.json`
- Branch previews: private, on Cloudflare Pages (see "Private previews")

## How it fits together

```text
Local feature branch
    | git push origin <branch>
    v
Feature branch on GitHub  ->  private preview on Cloudflare Pages
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
use the private previews instead (see "Private previews").

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

1. Review the pushed branch in its private preview (see "Private previews"), on desktop and on a phone. The
   publisher may waive the preview for a change; the pull request is still needed.
2. Open a pull request from the feature branch to `main`.
3. Merge it once the preview has been approved, or waived, and the checks on the pull request have passed.
4. Check the production site, `https://hearhere.matteringpress.org/`, once the "Static twin" run on `main` has
   deployed it, a few minutes after the merge.
5. Delete the feature branch on GitHub, which also deletes its previews, and locally.

Never push directly to `main`, and never copy files into `main` by hand. The
pull request is the record of what was published.

## Checking a change locally

`npm run build` and `npm run serve` in `every_trick/` (see "Static twin" below) show the site at `http://localhost:8080/`,
made by the same build as the previews and the public site. Check the pages you changed there before pushing, at
desktop and phone widths. The private preview adds only the real hosting.

## Static twin

The static twin is a plain static copy of the whole book, built from the same Markdown with Pandoc,
so that the book does not depend on Juncture alone. Since version 0.1 (2026-11-20) it is the public site,
open to search engines (the `NOINDEX` setting at the top of `every_trick/build.mjs` is off). Existing pages keep
Juncture's syntax, which the build reads; new content may use the Pandoc conventions in `every_trick/CONTRACT.md`.

To build and preview it locally you need Node.js 20.11 or later and Pandoc 3.8:

```sh
cd every_trick
npm ci          # once, and again after package-lock.json changes
npm run build   # writes ../_site/ in about ten seconds
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
Markdown, so the two cannot drift apart. Every page has a "Page / Markdown" switch of plain links. The
format of the Markdown media blocks is in `every_trick/CONTRACT.md`.

What is in `every_trick/`:

- `build.mjs`: the build, with its few settings at the top
- `versions.mjs`: reads the version registry (`versions.json` at the repository root), takes each version's text from its Git tag, and matches paragraphs between versions
- `convert.mjs`: turns Juncture's `.ve-*` lines and its raw HTML (audio, iframes, videos) into Pandoc Markdown
- `filters/`: Lua filters, one job each. `to-markdown.lua` is stage 1 (writes the Markdown view); `figures`, `embeds`, `cards`, `transcript`, `links`, `citations`, `paragraphs`, `margins` and `contract` are stage 2 (Markdown view to HTML and `page.json`)
- `citations.mjs`: prepares the bibliography for `filters/citations.lua` and writes the build's report on citations
- `csl/`: `mattering-press.csl`, the house citation style, and its test (`csl/test/`)
- `scripts/to-citation-keys.mjs`: for the switch, shows how the plain-text citations would become Pandoc citations
- `template.html`: the HTML around every page. It links the stylesheet and scripts with `?v=` and a hash of their contents, so that browsers fetch them again after every change instead of keeping an old copy
- `assets/`: `site.css` (colours, fonts and spacing are set at its top), `zoom.js`, `seek.js`, `citations.js`, `paragraphs.js` (copies a paragraph's link; points the version notice at the passage being read), `margins.js` (sets margin notes in the margin on wide screens)
- `images.mjs`: resized images and the tiles for zooming
- `check.mjs`, `serve.mjs`: the link check and the local server
- `CONTRACT.md`: the `page.json` and `publication.json` files that other frontends can read, and the paragraph rule
- `package.json`: the toolkit's name and version (see "Versions of the book and of every_trick" below)
- `CHANGELOG.md`: every version of the toolkit and what changed in it

GitHub Actions (`.github/workflows/static-twin.yml`) builds and checks the twin on every push and pull
request, and uploads every pushed branch as a private preview (see "Private previews"). It fetches the whole
history with its tags, so that it can build the frozen versions. On `main` it also deploys `_site/` to GitHub
Pages, which serves it at `https://hearhere.matteringpress.org/` (the deploy is skipped if Pages is not enabled
with "GitHub Actions" as its source). `_site/` is never committed.

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
- headings, pictures and their captions, audio and video players, picture galleries, the cards that lead to other
  pages, notes in the margin, the reference list at the end of a chapter, and the header and footer get no number;
- a paragraph that holds only a timecode such as `[00:10:13]`, or only a picture, gets no number;
- a short line on its own, such as **Addendum** or `[music]`, is a paragraph like any other and gets a number.

The precise rule is in `every_trick/CONTRACT.md` ("Paragraph numbers"). A rule never changes once a version has been
frozen with it, because that version would be renumbered: a new rule comes with a new contract version, and each
frozen version keeps the rule it was frozen under (`contract` in `versions.json`). Version 0.1 is numbered by
contract 0.3, which gave each list item its own number. The build prints how many paragraphs each page has. To hide the
numbers (the ¶ link stays), set `--paragraph-numbers: 0` at the top of `every_trick/assets/site.css`.

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
The line below it names the version of every_trick_in_the_book that built the page (see "Versions of the book and
of every_trick"). The same stamp, `version` for the book and `kit` for the toolkit, is in `publication.json`, every
`page.json` and the front matter of the Markdown view.

Each entry in `versions.json` has:

| field | meaning |
|---|---|
| `id` | the version in the address, e.g. `0.9-review2`: a digit first, then letters, digits, dots and hyphens |
| `tag` | the Git tag that holds its text, e.g. `v0.9-review2` |
| `label` | how pages name it, e.g. `Version 0.9, second peer review` |
| `date` | the day it was frozen or released, e.g. `2026-11-20` |
| `status` | `review` (frozen for peer review) or `release` (published) |
| `contract` | the contract current when it was frozen (`CONTRACT` in `every_trick/build.mjs`, e.g. `0.4`): its paragraph rule numbers this version, so its numbers never change |
| `annotations` | `hypothesis` to open its pages for annotation with Hypothesis (below), otherwise `none` |
| `hypothesisGroup` | the ID of the private Hypothesis group for its reviewers |

Hypothesis is loaded only on the pages of a version whose `annotations` is `hypothesis`, never on the latest text
or on a release, and its sidebar starts closed. With `hypothesisGroup` set, the client is configured with
`groupsAllowlist`, so its group menu offers only that group (and no "Public"). This does not admit anyone: a
reviewer must be a member of the group to see or post in it.

### Versions of the book and of every_trick

The book and every_trick_in_the_book, the toolkit that builds it, have separate version numbers. The site never
shows one without saying which it is: the book's version is written with its label, the toolkit's with its name.

| | the book | the toolkit |
|---|---|---|
| follows | the text | the design and what the pages do |
| written | `Version 0.1, first public version` (its `label`) | `every_trick_in_the_book 1.0.0`, never "version 1.0.0" alone |
| set in | `versions.json`, each version with its Git tag (`v0.1`) | `version` in `every_trick/package.json` |
| what changed | the text of each frozen version, online at `/v<id>/` | `every_trick/CHANGELOG.md` |
| on the site | the footer's version line, the version notice, `/versions/` | the footer's credit line, linked to the toolkit's home and to `every_trick/CHANGELOG.md` |
| in the data | `version` in `page.json`, `publication.json` and the Markdown view | `kit` in the same files |

Every version of the book is built with the current toolkit, so a frozen version keeps its text but takes on the
current design.

A change to the toolkit bumps its version and adds an entry to its list of changes, in the same commit:

1. In `every_trick/`, run `npm version <minor|patch> --no-git-tag-version` (it updates `package-lock.json` too):
   - `1.x.0`, the minor number, when what readers see or what the pages do changes: the template, the stylesheet,
     the scripts, or the HTML the filters write;
   - `1.x.y`, the patch number, for fixes that change nothing a reader sees: the build, its checks, its report;
   - `1.0.0` marked the switch from Juncture to the static edition (20 November 2026).
2. Add the version at the top of `every_trick/CHANGELOG.md`: its number as the heading, the date, and what changed, in a
   few plain sentences written for editors and readers rather than developers.

The footer's two links are set at the top of `every_trick/build.mjs`: `TOOLKIT_HOME`, the toolkit's home, and
`TOOLKIT_CHANGES`, its list of changes. The format of `page.json` and `publication.json`, and the paragraph rule,
have their own version, `CONTRACT` in `build.mjs` and `every_trick/CONTRACT.md`.

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
     "contract": "0.4",
     "annotations": "hypothesis",
     "hypothesisGroup": "<group ID>"
   }
   ```

4. Push the branch, open a pull request, and merge it when the build is green. Once GitHub Pages is enabled, the
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
house style is `every_trick/csl/mattering-press.csl`, adapted from the MHRA styles of the official CSL repository; its header
lists the changes, and `npm run test:csl` checks it against the style guide's examples.

During the parallel run the essays keep their typed citations and reference lists, and the build links them:

- citations such as `(Becker, 2007)`, `(Becker 2007: 74)`, `(Puwar and Sharma, 2012; Stengers et al, 2014)` and years in
  brackets whose author is named in the sentence (`Fryer (1984)`, `(2017:147)`) are matched by surname and year. The text
  in the brackets becomes a link, and the reference, formatted in the house style, opens in a popup on hover, keyboard
  focus or tap. Without JavaScript the link goes to the reference;
- a link goes to the entry in the page's own typed list, or, when the page cites a work its list does not have, to the
  entry on the first page in reading order that lists it. That is simpler than a separate references page, and every
  work in the bibliography is listed on some page;
- the build prints, per page, the citations found, linked and not matched (with file, line and a hint), the years in
  brackets it read as dates, the paragraphs of typed lists that are not bibliography entries, and the entries no page
  cites. Correct the essay, or add the work to the bibliography, and build again.

At the switch to the static edition, `node scripts/to-citation-keys.mjs` prints the change that turns the typed
citations into Pandoc citations (`[@becker2007, p. 74]`, `[-@fryer1984]` where the author is named in the sentence) and
replaces each typed list with the list that citeproc generates. It is a dry run: it prints a diff and changes nothing.

## Private previews

Every push to any branch also uploads that branch's build to Cloudflare Pages as a private preview, behind
Cloudflare Access. Previews are throwaway: they are not versions, never enter `versions.json`, and are deleted with
their branch.

- **Where:** each branch has a stable address showing its latest push, `https://<branch>.<project>.pages.dev`, and
  every push also gets its own address that stays as it was until deleted, for comparing iterations side by side.
  The workflow run's summary on GitHub lists both.
- **Who can see them:** only the email addresses on the project's Access list. A visitor enters their email and
  receives a one-time code; no account or password is needed.
- **Search engines:** they cannot reach previews, which are behind Access. (Builds no longer carry `noindex`
  since version 0.1.)
- **Cleanup:** deleting a branch on GitHub deletes its previews (`.github/workflows/preview-cleanup.yml`). Old
  previews of a branch that is kept can be deleted by running that workflow by hand.
- **Setup:** the repository secrets `CLOUDFLARE_API_TOKEN` (an account token with only "Cloudflare Pages: Edit",
  renewed yearly) and `CLOUDFLARE_ACCOUNT_ID`. The first push creates the project `hearhere-preview`, whose
  production branch is one that never deploys, so every deployment, `main` included, is a preview covered by
  Access.
- **Protecting previews with Access, once:** in the Cloudflare dashboard open Workers & Pages, then the
  `hearhere-preview` project, then Settings, General, and enable the Access policy for preview deployments. Then in
  Zero Trust, Access, Applications, edit the application this created and set its policy to allow the email
  addresses of the people who may see previews.
- **Confidentiality:** the repository is public, so a branch's Markdown can be read on GitHub. Previews hide the
  rendered site, not the source; embargoed material needs a separate private repository.

## Plan: stable links, versions and print companions

Agreed with the publisher on 2026-11-19. The static twin does not implement all of this yet; it is the plan the build must follow.

- **Views.** Every page is offered as plain links that work without JavaScript: the rendered page, a Markdown view of its converted Pandoc Markdown, and later site-level Collage and List views. Media appear in the Markdown view as standard image syntax and `:::` blocks containing ordinary links.
- **Versioned text links.** Each public release lives at a frozen address, for example `/v1/essays/aya_nassar/#p12`. Paragraphs are numbered cleanly in every release. Links that people copy or share always carry the version; plain addresses such as `/essays/aya_nassar/` mean "latest". A page in an older version shows a short notice linking to the same passage in the newest version, matched by its text. Only releases are public: corrections collect on GitHub until the next release. Paragraphs are numbered per chapter, the same unit as the chapter DOIs.
- **Exact quotes.** Links can add a text fragment (`#p12:~:text=…`) so the browser highlights the quoted words. The stylesheet styles `:target` and `::target-text`.
- **Media addresses are unversioned.** Every image, audio and video item gets its own page at a permanent, word-based address, such as `/see/plumbline`, `/listen/boulder` or `/watch/<name>`. Audio and video addresses may carry a start time (`#t=12:40`). If a file is replaced, the address stays and the item page notes the change.
- **Print.** Printed captions carry the item's address, and a QR code generated from the same address is always printed with it, because a printed link cannot be clicked. The colophon states which online version a printed edition corresponds to.
- **Shared media.** Images, tiles and audio are stored once and shared by all versions, so each release adds only its pages.
- **Two version numbers.** The book has `v1.0`, `v1.1`, `v2.0` and so on, following the text. every_trick_in_the_book, the toolkit, has its own numbers (`1.0.0`), following design and behaviour, and `every_trick/CHANGELOG.md` lists them with what changed. Each book release records the toolkit version that built it. All published versions are rebuilt with the current toolkit, so their text and paragraph numbers never change. Paragraph numbering is defined by the content in `every_trick/CONTRACT.md`, never by the template. Archived snapshots keep the exact design of their day.
- **DOIs and archiving.** Book and chapter DOIs are registered through Thoth and point to the latest version. Each release is tagged in Git and archived as a fixed snapshot: the site package, a web archive file, the whole-book Markdown and the media masters, deposited with Zenodo and through Thoth, plus Wayback Machine captures of every page.

## Plan: additions from reviewing Entreluma

Agreed with the publisher on 2026-11-19 after reviewing Entreluma, a static successor to Juncture by its original developer. We borrow ideas only: its repositories have no licence, so none of its code is copied.

- **Links that drive the media.** A link in the text can zoom an image to a detail or move audio and video to a moment. These are real links to the media item pages, using the standard media-fragment addresses `#xywh=x,y,w,h` (an image region) and `#t=12:40` (a time), for example `/see/plumbline#xywh=1200,800,600,400` and `/listen/boulder#t=12:40`. With JavaScript they act in place on the current page; without it, in print (as QR codes) and in archives they open the item page at that region or moment. Transcript timecodes use the same mechanism.
- **Retiring old addresses.** At the switch the site gets a "page not found" page that looks the requested address up in a redirect map and forwards the reader, so old Juncture links and any later renamed page still reach the right place.
- **Search.** Full-text search across the book with Pagefind, which builds its index at build time and needs no server.
- **Checks before publishing.** The build reports problems in plain language for authors and editors: missing alt text, unmatched citations, broken links, oversized images and a size limit for image tiles. During the parallel run these are warnings; from release 1.0, errors that stop a release.

## Plan: media data decisions

Agreed with the publisher on 2026-11-19. These fix the data; players and viewers are chosen later, in the design phase, and stay swappable because they read only these files.

- **Timings in WebVTT.** Transcript and word timings for audio and video live in standard WebVTT files next to each media file, never in the Markdown. Paragraph timecodes in the transcripts stay as they are. Word-level timings, when wanted, come from a one-off forced alignment of the existing, edited transcript against the audio. The same files serve as captions and as searchable text in archives.
- **`/read/<name>` for documents.** PDFs and other documents get item pages at `/read/<name>`, alongside `/see`, `/listen` and `/watch`. Page links use `#page=3`. At build time each document's pages are also rendered as images, so pages can be zoomed and linked like any image, with a download of the original file.
- **IIIF manifests for all images.** The build writes a IIIF Presentation 3 manifest for every image, image set and document, next to the static tiles. Any IIIF viewer (OpenSeadragon, Clover, Mirador, storytelling viewers), Tapestry and other projects can then show the book's images without changes.

## Plan: margin notes

Agreed with the publisher on 2026-11-19. Text notes are built (`every_trick/filters/margins.lua`, `every_trick/assets/margins.js`); media in the margin and the print and EPUB forms are not built yet.

- **What:** short notes, links and small media thumbnails in a right-hand margin column. Paragraph numbers keep the left margin.
- **Where they live in the source:** directly after the paragraph they belong to (`::: {.margin}` … `:::`), or attached to a word (`[given by Germany in 1962]{.margin}`). They are never stored by paragraph number, so they move with their paragraph from version to version. While Juncture still renders the site, write them as `<aside class="margin" markdown="1">…</aside>`, which the build converts.
- **Layout on wide screens:** notes float in the margin starting level with their paragraph. When the margin is crowded, later notes are pushed down, so the text column never gets gaps. A marker in the text and the same mark on the note highlight together on hover and focus. Notes show in full (the publisher's preset, 2026-11-20). Setting `--margin-note-lines` in `every_trick/assets/site.css` above 0 makes long notes show that many lines, then "more".
- **Phones, no JavaScript and screen readers:** a note stays in reading order directly after its paragraph, as a labelled aside.
- **Print and EPUB:** decided per note: an endnote, a small figure with address and QR code, or web-only.
- **Numbering:** text notes are numbered per chapter (`n1`, `n2`), matching the endnote numbers they get in print; media in the margin are figures with `Fig. 2.3` numbers and their own item addresses; plain links are not numbered; paragraph numbers ignore the margin. Details in `every_trick/CONTRACT.md`.

## House style for the web edition

A summary of the Mattering Press house style (Formatting & Style Guide, August 2025) as it applies to the build. The guide itself is not kept in this public repository; ask the publisher for it.

- **Citation:** MHRA-based author-date. In the text: `(Nassar 2026: para. 12)`, with paragraph numbers used where there are no pages. Reference list in MHRA bibliography form: single quotation marks, chapter titles in sentence case, book titles in italics, online sources as `<URL> [accessed 19 November 2026]`. No stock CSL style matches exactly, so the build will carry its own, tested against the guide's examples.
- **Figures:** numbered `Fig. 2.3` (chapter, then image), with the photographer or source in the caption. Item pages show the figure number beside their word-based address.
- **Text:** British spelling (-ise), single quotation marks with double ones for quotes inside quotes, en dashes with spaces for parenthetical clauses. This also applies to the site's own interface text.
- **Images online:** our own rule, not the guide's. Each image is published in several widths (800, 1200, 1600 and 2400 px), JPEG at about quality 82, chosen by the browser through `srcset`, with deep zoom from the full-resolution original.
