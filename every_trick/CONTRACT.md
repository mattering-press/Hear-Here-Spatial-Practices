# Page data, contract 0.4

The build writes JSON beside the HTML so that other frontends (the collage index, a Tapestry export) can
read the book without parsing HTML: `publication.json` at the root of each edition and a `page.json` beside every
`index.html`. `contract` gives the version of this format and of the paragraph rule below. Later 0.x versions may
add fields; a field will not change its meaning without a new version.

URLs that stay inside the site are relative to the edition's root, the folder that holds its `publication.json`
(resolve them with `new URL(url, editionRoot)`), even inside a `page.json`. Other URLs are absolute.
Text values are plain text, not HTML, except the `html` of a reference.

Changes: 0.2 adds `references` to page.json. 0.3 adds paragraph numbers (the rule below, and `paragraphs` in
page.json), the version stamp (`version` and `kit` in page.json, publication.json and the Markdown view's front
matter), `versions` in publication.json, and frozen versions, each an edition of its own. 0.4 numbers a whole list as
one paragraph, and numbers each frozen version by the rule of the contract it was frozen under (`contract` in
`versions.json`, `paragraphRule` in page.json and publication.json); in the Markdown view's front matter the toolkit's
version is `every_trick_in_the_book` (it was `kit`).

## Editions

The root of the site is the working text, "latest, unreleased". Every version listed in `versions.json` at the
root of the repository is built as well, from the text of its Git tag but with the current toolkit, into its own
folder, `v<id>/` (for example `v0.9-review2/essays/aya_nassar/`). Each such edition has its own
`publication.json`, `publication.md` and pages. Images, tiles, video, PDF files, the stylesheet and the scripts are
stored once, at the site's root, and shared by all editions, so inside a frozen version their URLs start with `../`
(`../images/x-1600.jpg`); resolved against the edition's root, they point at the shared copy. `versions/` at the
site's root lists every edition.

## Paragraph numbers

The reading paragraphs of each page are numbered from 1, in page order, as `p1`, `p2` and so on. The chapter is the
unit: today every page is one chapter, and every chapter has its own DOI, so a citation reads "(Nassar 2026: para.
12)" and the link `/v1/essays/aya_nassar/#p12`. If a chapter is ever split over several pages, or one page holds
several chapters, numbering follows the chapter and starts again at 1 in each chapter. The number
depends only on the page's content, as its Markdown view (`index.md`) has it, never on the template or the
stylesheet. Every version is rebuilt with the current toolkit, so a frozen version is numbered by the rule of the
contract it was frozen under (`contract` in its entry in `versions.json`), and a rule never changes within a contract
version: changing it would renumber the paragraphs of frozen versions and break every citation of them. The rule
below is contract 0.4's. Contract 0.3, which numbers version 0.1, differs only for lists (see the list item below).

Numbered, wherever they are (at the top level, in block quotes, in the transcript, in any other div that is not
listed below):

- every paragraph of text;
- a list, as a whole: a bulleted, numbered or definition list, with everything in it (several paragraphs in an
  item, nested lists), is one paragraph. Its normalised text is the text of its items in order (for a definition
  list, each term followed by its definitions). Under contract 0.3 each paragraph of a list item got its own
  number instead, and so did each item of a nested list, in order;
- a line block (lines starting with `|`) counts as one paragraph.

Not numbered:

- headings, the page's title and subtitle, its menu and its footer;
- the reference list: everything after a heading whose text is "References" (any level, any case), up to the
  next heading of the same or a higher level;
- media and their captions: a paragraph that is only an image (a figure), and the `.video`, `.embed`, `.audio`,
  `.gallery` and `.cards` blocks;
- a paragraph without words: only images, only raw HTML (the smartframe embeds), only a transcript timecode
  such as `[00:10:13]`, or nothing left once normalised (below);
- tables, code blocks, horizontal rules and raw HTML blocks;
- page metadata: a list before the page's first heading in which every item starts with a bold label ending in a
  colon (`- **Recording date:** 5 April 2025`);
- labels and stage directions on a line of their own: a paragraph whose whole text is one bracketed note
  (`[music]`, `[laughter]`; timecodes are covered above), or a paragraph of at most six words that ends with a
  colon (`Addendum:`) or is entirely in bold or italics (`**Addendum**`).

So a speaker's turn in a transcript (`**AYA NASSAR:** …`) is one paragraph and is numbered, while a stage direction
or a label on a line of its own is not. A paragraph's number
in a block quote continues the count of the text around it.

The normalised text of a paragraph is its plain text (no markup, link targets or images), in lower case, with
punctuation (ASCII punctuation, typographic quotes, dashes, the ellipsis, bullets, guillemets, ¶, §, primes),
control characters and no-break or thin spaces replaced by spaces, runs of spaces made one, and no space at either
end: `‘Dust’ – as Aya says…` becomes `dust as aya says`. Its `text_hash` is the first 12 hexadecimal digits of the
SHA-1 of the normalised text (UTF-8).

In the HTML a numbered paragraph is

```html
<div id="p12" class="para"><p><a class="para-link" href="#p12" data-n="12" aria-label="Paragraph 12"></a>…</p></div>
```

and a list is `<div id="p12" class="para para-list"><a class="para-link" …></a><ul>…</ul></div>`, with the link
before the list (under contract 0.3 each list item's text is numbered, without a `<p>`). The link has no text: the stylesheet shows `data-n` in the margin and a ¶ on
hover and focus, so that copied text and text fragments (`#p12:~:text=…`) see only the paragraph's words.
`assets/paragraphs.js` copies the paragraph's address, with the version in it, on a frozen version.

On a frozen version every page starts with a notice, `<aside class="version-notice">`, whose link
`<a class="version-notice__link" href="…" data-paragraphs='{"p12": "p14", …}'>` goes to the same page in the newer
text (the latest text, or for an older release the newest release). `data-paragraphs` maps each of the page's
paragraphs to the matching paragraph there (see `every_trick/versions.mjs`).

## Poems

Poetry is cited by line, not by paragraph ("ll. 12–14"), so poems have their own block and line numbers.

- A poem is written as a block: `::: {.poem #river}` … `:::`, usually with Pandoc's line syntax (`| ` at the start
  of each line), which keeps every line break and leading space. Ordinary paragraphs inside the block also work:
  each of their lines counts.
- In the chapter's paragraph numbering the whole poem is one paragraph, so editing a poem never shifts the
  paragraph numbers around it.
- Inside the poem, every non-empty line is numbered from 1, in order: `<poem id>-l1`, `<poem id>-l2` and so on,
  for example `#river-l12`. The poem id is the block's own id (`#river`), or `poem1`, `poem2` … in page order when
  it has none. Give a poem an id when it should keep its line addresses across versions in which other poems are
  added before it. Empty lines and stanza breaks are not numbered.
- Each line is `<span class="line" id="river-l12" data-line="12">`. In `page.json` the poem's paragraph entry has
  `poem` (its id) and `lines` (how many).
- Sound: a recording of a poem gets a WebVTT file next to its audio, with one cue per line or stanza whose
  identifier is the line address (`river-l12`, or a range `river-l12-l14`). Several readings of one poem each have
  their own file, all pointing at the same line addresses. Players and highlighting are a design matter for later.

## Margin notes and their numbers

A margin note is written directly after its paragraph as `::: {.margin}` … `:::`. It may hold text, or media:
pictures, animated GIFs, galleries, video and audio players, written as anywhere else on the page. A note that holds
only media is `<aside id="m1" class="margin margin-media">` (`m1`, `m2` … in page order), with no number and no mark
in the text; figure numbers for them are not built yet. In the HTML a text note is `<aside id="n1" class="margin" aria-label="Note 1">`, and
its mark in the text, at the end of the paragraph before it, is `<a class="margin-mark" id="n1-mark" href="#n1">1</a>`.

- Paragraph numbers ignore the margin entirely: adding, moving or removing a margin item never changes them.
- Text notes in the margin are numbered from 1 in each chapter, in order of their place in the text, as `n1`, `n2`
  and so on, with a small matching mark in the text. In print and EPUB a margin note becomes an endnote, and house
  style numbers endnotes per chapter, so "note 3" means the same note online and in print.
- Images, audio and video in the margin are figures: they take the chapter's figure numbering (`Fig. 2.3`) and
  their own item address (`/see/<name>`, `/listen/<name>`, `/watch/<name>`).
- Plain links in the margin are not numbered.

## publication.json

| field | value |
|---|---|
| `contract` | `"0.4"`, the version of this format |
| `paragraphRule` | the contract whose paragraph rule numbered this edition: `"0.4"` for the latest text, the `contract` of its entry in `versions.json` for a frozen version (`"0.3"` for version 0.1) |
| `title`, `subtitle` | from the header of the home page (`README.md`) |
| `creators` | list of names |
| `publisher` | name |
| `language` | language code, `"en"` |
| `url` | where this edition is published: the `siteUrl` setting in `build.mjs`, followed by `v<id>/` for a frozen version; the Markdown view `publication.md` uses it for its absolute URLs |
| `markdown` | `"publication.md"` |
| `version` | this edition: `{ id, label, date, status }`. `status` is `latest` for the working text (`id` `"latest"`, `label` `"Latest text, unreleased"`, `date` the day of its last commit), or `review` or `release` for a frozen version, with the `id`, `label` and `date` (`YYYY-MM-DD`) of its entry in `versions.json` |
| `kit` | the version of every_trick_in_the_book, the toolkit that built the site (`version` in `every_trick/package.json`; `every_trick/CHANGELOG.md` lists what changed in each), e.g. `"1.0.0"`. It is numbered separately from the book's version, `version` |
| `versions` | every edition, the latest text first, then the frozen versions, newest first: `{ id, label, date, status, url }`, `url` relative to this edition's root (`"./"` for itself) |
| `readingOrder` | every page once, as `{ id, url, title }`: the home page; then each page in the home page's menu, followed by the pages its cards lead to (depth first); then any other page, alphabetically |

## page.json

| field | value |
|---|---|
| `contract`, `paragraphRule` | as in publication.json |
| `id` | the page's Markdown file, e.g. `"essays/walk.md"`; `"README.md"` for the home page |
| `url` | e.g. `"essays/walk/"`; `"./"` for the home page |
| `title`, `subtitle` | from the page's header; `subtitle` is `null` when there is none |
| `version`, `kit` | as in publication.json |
| `markdown` | the page's Markdown view, e.g. `"essays/walk/index.md"` |
| `headings` | `{ level, text, id }` in page order; `level` is the HTML level (2 to 6), `id` the fragment for `url#id` |
| `paragraphs` | the numbered paragraphs (see "Paragraph numbers"), `{ id, n, text_hash }` in page order: `id` is the fragment (`"p12"`), `n` the number (12), `text_hash` the hash of its normalised text, the same in every version where the paragraph's text is the same |
| `figures` | `{ image, width, height, tiles, alt, caption }`: `image` is 1600 px on the long edge, `width` and `height` are its size, `tiles` is a IIIF `info.json` or `null`; `alt` and `caption` are `""` when missing |
| `audio` | `{ url, title }`; `url` is the MP3 on GitHub, which supports range requests |
| `video` | `{ url, title, kind }`; `kind` is `youtube`, `vimeo`, `file` (a video file in the site) or `embed` (any other embedded page, such as the Internet Archive or the BBC); `url` is the address given in the Markdown |
| `links` | links in the page's text (not its menu or footer) to other pages, as `{ id, url, text }`, each target once, in order of first appearance; citation links are not included |
| `references` | works from the book's bibliography (`references/bibliography.json`) that the page cites or lists, as `{ key, html, url, citations }`: first those cited, in order of first citation, then the rest of the page's typed reference list. `key` is the entry's id in the bibliography (`hall2001`); `html` is the reference formatted in the house style, as an HTML fragment (`<em>`, `<span>`, `<a>`); `url` is the entry in a typed reference list, on this page if its list has it, otherwise on the first page in reading order that does (`essays/introduction/#ref-hall2001`); `citations` are the ids of the citation links in this page's text that point to it (`cite-hall2001-1`), `[]` when the page only lists it |

## Zoom tiles

`tiles` points at a static IIIF Image API 2 level-0 `info.json` with 512 px JPEG tiles. Its `@id` is
`"."` because the build cannot know where the site will be hosted: before handing it to a viewer, set it
to the absolute URL of the folder that holds `info.json`, without a trailing slash, as `assets/zoom.js`
does.

## Markdown view

Every `index.html` has an `index.md` beside it, and the root of each edition has `publication.md` with all
pages in reading order. They are written by the build from the book's source, in Pandoc Markdown with a YAML
front matter (`title`, `subtitle`, `lang`, and the version stamp: `version` with `id`, `label`, `date` and `status`,
and `every_trick_in_the_book`, the toolkit's version, which page.json and publication.json call `kit`), and contain
no Juncture syntax. `index.md` uses URLs relative to
itself; `publication.md` uses absolute URLs and starts each page with its title as a level-1 heading.
Media are written as:

- zoomable images: `![caption](images/x-1600.jpg){.zoom .right width="75%" alt="…"}` (`.left` or `.right` optional)
- animated images (from an animated GIF): `![caption](images/x.webp){.animated alt="…"}`, an animated WebP that does not
  zoom; in the HTML its first frame, `images/x-still.jpg`, is shown to readers who ask for less motion. In `page.json`
  its `tiles` is `null`
- `::: {.video}` and `::: {.embed}`: a div that starts with an ordinary link to the video or embedded page (a
  video file, a PDF); any text after the link is the caption
- `::: {.audio}`: a div with a link to the MP3
- `::: {.gallery}`: a div of zoomable images; `::: {.cards}`: a list of links, each with a picture and a title
- transcript timecodes such as `[00:10:13]` stay as plain text

The only raw HTML that remains is the third-party smartframe script embeds in `essays/spotting_colours.md`.

## Citations in the HTML

During the parallel run the Markdown keeps its plain-text citations and typed reference lists. The build links them
(`filters/citations.lua`); the text of the page does not change:

- a citation is `<a class="citation" id="cite-<key>-<n>" href="…#ref-<key>" data-popover="ref-popover-<key>"
  aria-describedby="ref-text-<key>">` around the text inside its brackets, as typed (`Hall, 2001`, `2017:147`);
- an entry of a typed reference list that is in the bibliography is `<div id="ref-<key>" class="typed-reference">`;
  a paragraph holding two entries has an empty `<span id="ref-<key>">` for the second;
- the references the page cites are at the end of `<main>`, each in
  `<div id="ref-popover-<key>" class="citation-popover" popover="manual">` with the formatted reference in
  `<p id="ref-text-<key>">`; `assets/citations.js` shows them.
