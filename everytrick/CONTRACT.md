# Page data, contract 0.10

The build writes JSON beside the HTML so that other frontends (the collage index, a Tapestry export) can
read the book without parsing HTML: `publication.json` at the root of each edition, a `page.json` beside every
`index.html`, `media.json` at the root of the site, with every media item, and a `document.json` for every document
whose pages the build shows. `contract` gives the version of this format and of the paragraph rule below. Later 0.x
versions may add fields; a field will not change its meaning without a new version.

URLs that stay inside the site are relative to the edition's root, the folder that holds its `publication.json`
(resolve them with `new URL(url, editionRoot)`), even inside a `page.json`. Other URLs are absolute.
Text values are plain text, not HTML, except the `html` of a reference.

Changes: 0.2 adds `references` to page.json. 0.3 adds paragraph numbers (the rule below, and `paragraphs` in
page.json), the version stamp (`version` and the toolkit's version in page.json, publication.json and the Markdown view's front
matter), `versions` in publication.json, and frozen versions, each an edition of its own. 0.4 numbers a whole list as
one paragraph, and numbers each frozen version by the rule of the contract it was frozen under (`contract` in
`versions.json`, `paragraphRule` in page.json and publication.json); the toolkit's version is
`every_trick_in_the_book` in page.json, publication.json and the Markdown view's front matter (it was `kit`). 0.5 adds
media items (below): every picture, recording, video and document has a number from the media register and a page
of its own; `items` in page.json, `media.json` at the root of the site, and the items' anchors and number pills in
the HTML. Media in the margin are items with their own numbers, no longer figures with the chapter's numbering. An
item may have a credit, rights (the address of a rightsstatements.org statement or a Creative Commons licence, with a
note) and how to cite its own source, in the register and in `media.json`; empty ones are never shown. 0.5 also gives
each edition a References page, `references/`, which lists every work of the bibliography (see "Citations in the
HTML"): a reference's `url` in page.json, like the citation's link, points at the work's entry there
(`references/#hall2001`) when the page's own typed list lacks the work, where it pointed at the first page in reading
order whose list has it, and puts beside it the edition's bibliography to download, as CSL-JSON, BibTeX and RIS, and
`formatted.json`, every work in the styles of the page's Copy menus (every_trick_in_the_book 1.12.0). 0.5 also adds
documents (every_trick_in_the_book 1.13.0; see "Documents"): a PDF of the repository, or a zine copied from
archive.org, is shown as its pages, each with zoom tiles, and has `read/<name>/document.json`; media.json gains `pages`
and `document`; and a document is no longer listed in page.json's `video`, where an archive.org reader was an `embed`.
The paragraph rule of 0.5 is 0.4's, unchanged. 0.6 (every_trick_in_the_book 1.14.0) adds long descriptions of pictures (see
"Long descriptions"): their block is added to the paragraph rule's list of blocks that are not numbered, and they are
`description` and `description_by` in page.json's `figures` and in media.json's `appearances`; and media.json gains
`first_published` and `last_changed` for each item. No frozen version was numbered by contract 0.5's rule. 0.7
renames the toolkit's version `everytrickinthebook` in page.json, publication.json, media.json, document.json,
formatted.json and the Markdown view's front matter, with the toolkit's new name (everytrickinthebook 1.15.0); it
changes nothing else, and its paragraph rule is 0.6's, unchanged. 0.8 (everytrickinthebook 1.16.0) adds the back
matter (see "Back matter"): `part` in page.json and in each entry of publication.json's `readingOrder`, which the back
matter's pages close, and `backmatter` in publication.json; the References page and the Media Index become one page,
References and media (`about/references-and-media/`), so a reference's `url` in page.json, like a citation's link,
points at `about/references-and-media/#<key>` where it pointed at `references/#<key>`; a page may give its title in a
YAML front matter; its paragraph rule is 0.6's, unchanged. 0.9 (everytrickinthebook 1.17.0) adds credits, who
made each page, written at the top of its Markdown (see "Credits"), and how each page and the book are cited:
`credits` and `citation` in page.json, `editors` and `citation` in publication.json, and in the HTML the page's
citation data, its How to cite section and the tags for Google Scholar (see "Citing the book"); its paragraph rule is
0.6's, unchanged. 0.10 (everytrickinthebook 1.19.0) cites the book as written by its author rather than edited
(`authors` in publication.json, in place of `editors`; a page is a chapter in an authored book), and adds to the front
matter the day a page's event was held or its podcast recorded and a list of everyone else who made it (see "Front
matter and credits"): `date` and `credit_list` in page.json, and a Credits section in the HTML; its paragraph rule is
0.6's, unchanged.

## Editions

The root of the site is the working text, "latest, unreleased". Every version listed in `versions.json` at the
root of the repository is built as well, from the text of its Git tag but with the current toolkit, into its own
folder, `v<id>/` (for example `v0.9-review2/essays/aya_nassar/`). Each such edition has its own
`publication.json`, `publication.md`, About this book (`about/`, with References and media, and `references/` with the
bibliography to download) and pages.
Images, tiles, video, PDF files, the documents' data, the stylesheet and the scripts are stored once, at the site's
root, and shared by all editions, so inside a frozen version
their URLs start with `../` (`../images/x-1600.jpg`); resolved against the edition's root, they point at the shared
copy. `versions/` at the site's root lists every edition.

## Paragraph numbers

The reading paragraphs of each page are numbered from 1, in page order, as `p1`, `p2` and so on. The chapter is the
unit: today every page is one chapter, and every chapter has its own DOI, so a citation reads "(Nassar 2026: para.
12)" and the link `/v1/essays/aya_nassar/#p12`. If a chapter is ever split over several pages, or one page holds
several chapters, numbering follows the chapter and starts again at 1 in each chapter. The number
depends only on the page's content, as its Markdown view (`index.md`) has it, never on the template or the
stylesheet. Every version is rebuilt with the current toolkit, so a frozen version is numbered by the rule of the
contract it was frozen under (`contract` in its entry in `versions.json`), and a rule never changes within a contract
version: changing it would renumber the paragraphs of frozen versions and break every citation of them. The rule
below is contract 0.6's, which 0.7, 0.8, 0.9 and 0.10 kept unchanged: contract 0.4's, which 0.5 kept unchanged, with long descriptions added to the blocks that are
not numbered (no page of 0.4 or 0.5 had one). Contract 0.3, which numbers version 0.1, differs only for lists (see the
list item below).

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
- a picture's long description, the `.description` block after it (from contract 0.6; see "Long descriptions");
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
paragraphs to the matching paragraph there (see `everytrick/versions.mjs`).

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
only media is `<aside id="m1" class="margin margin-media">` (`m1`, `m2` … in page order), with no note number and no
mark in the text; the media in it are media items, each with its own number (see "Media items"). In the HTML a text note is `<aside id="n1" class="margin" aria-label="Note 1">`, and
its mark in the text, at the end of the paragraph before it, is `<a class="margin-mark" id="n1-mark" href="#n1">1</a>`.

- Paragraph numbers ignore the margin entirely: adding, moving or removing a margin item never changes them.
- Text notes in the margin are numbered from 1 in each chapter, in order of their place in the text, as `n1`, `n2`
  and so on, with a small matching mark in the text. In print and EPUB a margin note becomes an endnote, and house
  style numbers endnotes per chapter, so "note 3" means the same note online and in print.
- Images, audio and video in the margin are media items like any other: each shows its own number from the media
  register in its caption line and has its own item page (`/see/<name>/`, `/listen/<name>/`, `/watch/<name>/`).
- Plain links in the margin are not numbered.

## Back matter

The back matter (EPUB's `backmatter`, JATS's `<back>`; British usage calls it end matter), which readers know as
"About this book", follows the book's text in every edition and closes every reading order. Its overview, `about/`,
leads to its four parts: Contributors & acknowledgements (`about/contributors/`, from `about/contributors.md`, with the
author's thanks from `about/acknowledgements.md` added under the heading "Acknowledgements" when that file holds any),
the Colophon (`about/colophon/`, from `about/colophon.md`), How to cite this book (`about/how-to-cite/`, from
`about/how-to-cite.md`, with the book's reference and the downloads for a reference manager filled in by the build in
its empty divs `::: cite-book` and `::: cite-downloads`) and References and media (`about/references-and-media/`, see
"Citations in the HTML" and "Media items"). Contributors & acknowledgements and the Colophon's own text (Making this
book and the publisher's statement) are reading text: they have page.json, a Markdown view and paragraph numbers, and
are in the edition's search index and in `publication.md`. What the build writes after the Colophon's text, the book's
licence and the versions and kit (`<div class="colophon__built" data-pagefind-ignore>`), is not reading text: it is not
numbered, not indexed and not in the Markdown view; nor is the overview. A version frozen before the Colophon existed
takes it from the latest text. A page that moved into the back matter keeps its old file and address in the versions
that had it there (version 0.1 has `essays/contributors.md`); in the latest text its old address forwards to the new
one. The addresses used before contract 0.8, `references/` (in each edition) and `media-index/`, forward to References
and media, keeping the fragment (`references/#hall2001` to `about/references-and-media/#hall2001`, `media-index/` to
`#media`); the bibliography's downloads stay in `references/`.

## publication.json

| field | value |
|---|---|
| `contract` | `"0.10"`, the version of this format |
| `paragraphRule` | the contract whose paragraph rule numbered this edition: `"0.10"` for the latest text, the `contract` of its entry in `versions.json` for a frozen version (`"0.3"` for version 0.1) |
| `title`, `subtitle` | from the header of the home page (`README.md`) |
| `creators` | list of names |
| `authors` | the book's authors as its citations name them, CSL names: `{ family, given }` (`PUBLICATION` in `build.mjs`); until contract 0.10, `editors` |
| `citation` | how this edition of the book is cited: `{ text, reference }`, `text` as the text cites it, without brackets (`"Puwar 2026"`), and `reference` its reference in the house style, as plain text, without the date accessed (see "Citing the book") |
| `publisher` | name |
| `language` | language code, `"en"` |
| `url` | where this edition is published: the `siteUrl` setting in `build.mjs`, followed by `v<id>/` for a frozen version; the Markdown view `publication.md` uses it for its absolute URLs |
| `markdown` | `"publication.md"` |
| `version` | this edition: `{ id, label, date, status }`. `status` is `latest` for the working text (`id` `"latest"`, `label` `"Latest text, unreleased"`, `date` the day of its last commit), or `review` or `release` for a frozen version, with the `id`, `label` and `date` (`YYYY-MM-DD`) of its entry in `versions.json` |
| `everytrickinthebook` | the version of everytrickinthebook, the toolkit that built the site (`version` in `everytrick/package.json`; `everytrick/CHANGELOG.md` lists what changed in each), e.g. `"1.0.0"`. It is numbered separately from the book's version, `version` |
| `versions` | every edition, the latest text first, then the frozen versions, newest first: `{ id, label, date, status, url }`, `url` relative to this edition's root (`"./"` for itself) |
| `readingOrder` | every page once, as `{ id, url, title, part }`: the home page; then each page in the home page's menu, followed by the pages its cards lead to (depth first); then any other page, alphabetically; and last the pages of the back matter, in its order. `part` is `"backmatter"` for those, `"body"` for the others |
| `backmatter` | the back matter (see "Back matter"): `{ title, url, sections }`: `title` is `"About this book"`, `url` its overview (`"about/"`), `sections` its parts in order as `{ id, title, url }`: a back matter page by its `id` in `readingOrder` (`"about/contributors.md"`, `"about/colophon.md"`), and `"references-and-media"` for References and media |

## page.json

| field | value |
|---|---|
| `contract`, `paragraphRule` | as in publication.json |
| `id` | the page's Markdown file, e.g. `"essays/walk.md"`; `"README.md"` for the home page |
| `url` | e.g. `"essays/walk/"`; `"./"` for the home page |
| `title`, `subtitle` | from the page's header (its `.ve-header` line, or `title` and `subtitle` in a YAML front matter at the start of its Markdown); `subtitle` is `null` when there is none |
| `part` | `"backmatter"` for a page of the back matter, `"body"` for the others |
| `version`, `everytrickinthebook` | as in publication.json |
| `credits` | who made the page (see "Front matter and credits"): `{ author, interviewer, producer, transcript-editor }`, each a list of CSL names (`{ family, given }`, or `{ literal }` for a group), the roles it has; `{}` for a page without credits. The home page's are the book's authors, `{ author }` |
| `date` | the day the page's event was held or its podcast recorded: `{ kind, date }`, `kind` `"held"` or `"recorded"`, `date` `YYYY-MM-DD`; `null` when the page gives none |
| `credit_list` | everyone else who made the page, as its Credits section lists them: `{ role, who }` in its order, both plain text as written (`{ "role": "Film", "who": "Jon Randle, Mindriot Productions" }`); `[]` when it has none |
| `citation` | how the page is cited: `{ text, reference }` as in publication.json (`"Nassar 2026"`; a passage adds its paragraph, "(Nassar 2026: para. 12)") |
| `markdown` | the page's Markdown view, e.g. `"essays/walk/index.md"` |
| `headings` | `{ level, text, id }` in page order; `level` is the HTML level (2 to 6), `id` the fragment for `url#id` |
| `paragraphs` | the numbered paragraphs (see "Paragraph numbers"), `{ id, n, text_hash }` in page order: `id` is the fragment (`"p12"`), `n` the number (12), `text_hash` the hash of its normalised text, the same in every version where the paragraph's text is the same |
| `items` | the media items on the page (see "Media items"), `{ number, kind, name, url, anchor, after }` in page order: `number` is the item's number (37), or `null` for an item not numbered yet; `kind` is `see`, `listen`, `watch` or `read`; `name` the readable part of its address; `url` its item page, relative to the edition's root (`"see/boulder-font/"`, `"../see/boulder-font/"` in a frozen version); `anchor` the fragment of the item on this page (`"item-37"`, for `url#anchor`); `after` the numbered paragraph before it (`"p76"`), or `null`. An item's credit, rights and source are in `media.json` |
| `figures` | `{ image, width, height, tiles, alt, caption, description, description_by }`: `image` is 1600 px on the long edge, `width` and `height` are its size, `tiles` is a IIIF `info.json` or `null`; `alt` and `caption` are `""` when missing; `description` is its long description as plain text, its paragraphs separated by a blank line (`"\n\n"`), and `description_by` who wrote it, both `""` when it has none (see "Long descriptions") |
| `audio` | `{ url, title }`; `url` is the MP3 on GitHub, which supports range requests |
| `video` | `{ url, title, kind }`; `kind` is `youtube`, `vimeo`, `file` (a video file in the site) or `embed` (any other embedded page, such as the Internet Archive or the BBC); `url` is the address given in the Markdown. A document whose pages the build shows (see "Documents") is not listed: `items` has it, with `kind` `read` |
| `links` | links in the page's text (not its menu or footer) to other pages, as `{ id, url, text }`, each target once, in order of first appearance; citation links are not included |
| `references` | works from the book's bibliography (`references/bibliography.json`) that the page cites or lists, as `{ key, html, url, citations }`: first those cited, in order of first citation, then the rest of the page's typed reference list. `key` is the entry's id in the bibliography (`hall2001`); `html` is the reference formatted in the house style, as an HTML fragment (`<em>`, `<span>`, `<a>`); `url` is the entry in this page's typed reference list if the list has it (`essays/introduction/#ref-hall2001`), otherwise the work's entry on the edition's References and media (`about/references-and-media/#hall2001`); `citations` are the ids of the citation links in this page's text that point to it (`cite-hall2001-1`), `[]` when the page only lists it |

## Front matter and credits

A page may start with a front matter, a block at the very top of its Markdown file, before anything else:
`convert.mjs` reads it and leaves it out of the page's text, so it is not numbered and does not show as written. It
may give the page's title and subtitle (for a page in Pandoc's conventions, in place of a `.ve-header` line), who made
it, for its citations, the day it was held or recorded, and a list of everyone else who made it:

```markdown
---
author:
  - Nassar, Aya
interviewer:
  - Puwar, Nirmal
producer:
  - Whitley, Duncan
transcript-editor:
  - Phung, Phavine
recorded: 2025-04-05
---
```

```markdown
---
author:
  - Burley, Stuart
  - Puwar, Nirmal
held: 2024-03-02
credits:
  - In collaboration with: Greg Muldoon (Food Union), Christine Eade (POD outside(R) Zine Fest) and the Coventry Cathedral Events Team
  - Readers at the communal read around the rock: Ashjan Ajan, Muna Dajani and Mahsa Alami Fariman
---
```

- The roles are `author`, `interviewer`, `producer` and `transcript-editor`, in any order; a role may list several
  names, one a line (`  - Family, Given`), or one name on its own line (`producer: Whitley, Duncan`). Any other role
  stops the build. Lines starting with `#` are comments.
- A name is written family name first, then a comma and the given names (`Alami Fariman, Mahsa`), so that compound
  family names are never guessed; a name without a comma is a group's and is kept as it is written.
- The authors are cited ("Nassar 2026"); the house style names the others after the page's title ("interviewed by
  N. Puwar, prod. by D. Whitley, transcript ed. by P. Phung"), and the other styles each in their own way.
- Authors are written in alphabetical order of family name (Nirmal Puwar, 24 November 2026); the build keeps the
  order they are written in.
- `held:` (an event) or `recorded:` (a podcast) is a day, `YYYY-MM-DD`. The house style writes it after the page's
  title, before the other credits ("held on 2 March 2024", "recorded 5 April 2025"); the year of the citation stays
  the year the version was published.
- `duration:` is a recording's length, minutes and seconds (`duration: 38:28`), with an addendum's after a `+`
  (`duration: 38:28 + 1:51`). The page's note at the top of its margin shows it after the day it was recorded
  ("Recorded 5 April 2025 · 38 min 28 sec, with an addendum of 1 min 51 sec"); it is not in citations or in the page
  data, and a frozen version does not take it from the latest text.
- `credits:` lists everyone else who made the page, one `  - Role: who` a line, the role and the names written as they
  should show. They are shown, in that order, in a Credits section at the end of the page, which search finds; they
  are not in citations. Who made a film or a photograph is the media item's credit, in the register.
- A page without authors is cited by its title, and the build warns about it when it has numbered paragraphs. A
  frozen version's text cannot change, so a page of a frozen version takes the credits, the day and the credits list
  of the same page in the latest text when it has none.

## Citing the book

Every page is cited as a chapter of the book, with its credits, and the home page as the book, written by its
`authors` (see "Plan: copying citations" in `DEVELOPMENT.md`; `cite.mjs`). Each is formatted in every citation style a
reader can choose in the settings (`house`, `apa`, `chicago`, `mla`, `harvard`). The house style's in-text citation adds
a passage's paragraph, `(Nassar 2026: para. 12)` or `(Nassar 2026: paras 12–14)`; a media item is cited against the
book, `Item 37, ‘…’, in N. Puwar, Hear Here: Spatial Practices, …`, and in the text `(Puwar 2026: item 37)`. The
reference names the version (`version 0.1`, or `latest text, unreleased`) and ends with the date accessed.

- **In the HTML** every page has, before `</body>`, `<script type="application/json" class="cite-data">`, which
  `assets/cite.js` reads: `{ version, home, site, styles, page, book, items, formatted, release }`. `styles` lists the
  citation styles, `{ id, label, short, locale }`. `page` and `book` are `{ url, styles, bibtex, ris }`: `url` the
  page's or the edition's absolute address; `styles`, for each style's id, `{ html, text, cite, one, range }`: the
  reference as an HTML fragment and as plain text, the in-text citation (`"(Nassar 2026)"`), and the same with one
  paragraph and with two, whose numbers are `999999`, and `999998` and `999999` (`"(Nassar 2026: para. 999999)"`);
  `bibtex` and `ris` the page's entry for a reference manager. Their date accessed is written as 31 December 9999
  (`9999-12-31` in BibTeX, `9999/12/31/` in RIS), in each style's form, for the script to put in the day the reader
  copies. `items` has the media items on the page, by the address of their page (`"see/boulder-font/"`):
  `{ url, styles, number, citeAs, intext }`, `styles` with only `html` and `text`, and `intext` the in-text citation
  in each style. On the latest text `release`, for a page that is in the newest release, is `{ id, label, page, same }`:
  the page there, and `same`, which maps this page's paragraphs to those with the same text there (`{ "p12": "p14" }`).
  `formatted` is the edition's `references/formatted.json`. An item's page has the same element, with `item`.
- **formatted.json** gives each work, beside its plain text in each style, `html`: `{ <style id>: html }`, the
  reference formatted, for a reader who copies formatted text.
- **How to cite this page**, `<section class="how-to-cite">` at the end of `<main>`, gives the in-text citation and the
  reference in the house style without JavaScript (`assets/cite.js` shows the reader's style); `<span class="cite-today">`
  holds the date accessed. It is left out of the search index.
- **For Google Scholar** each page's `<head>` has `<meta name="citation_title">`, `citation_author` (or
  `citation_editor` for the book), `citation_publication_date`, `citation_inbook_title` and `citation_book_title`,
  `citation_publisher`, `citation_language` and `citation_fulltext_html_url`, and a JSON-LD block (schema.org `Chapter`
  in a `Book`, or the `Book`).

## Media items

Every picture (zoomable or animated, in a gallery or not), recording, video and document of the book is a media item;
card thumbnails, the pictures behind page titles and video posters are not. Each item has one line in the media
register, `media/register.csv` in the repository (CSV with a header row, which GitHub shows as a table):

| column | value |
|---|---|
| `number` | the item's permanent number, given when a version is frozen (`npm run number-media -- <version>`), in that version's reading order and page order, the first appearance of an item winning; empty until then. A number never changes and is never given again, also when its item is withdrawn, so the numbers run from 1 without gaps |
| `kind` | `see` (pictures), `listen` (recordings), `watch` (video files, YouTube, Vimeo, archive.org films, the BBC's player) or `read` (documents: PDFs, archive.org's book reader): the first word of its address |
| `name` | the readable part of its address, `/see/<name>/`: lower-case letters (a–z) and digits, with hyphens between words. Each name, and each former name, is used once in the book |
| `source` | what the item is: the repository path of its file (`media/podcasts/POD06_Boulder.jpg`), or its address elsewhere, normalised: `https://www.youtube.com/watch?v=<id>`, `https://vimeo.com/<id>/<hash>`, `https://archive.org/details/<identifier>` (for its embed and details addresses alike), any other address as given. The same source on several pages, or in several versions, is one item |
| `since` | the version it entered with (`0.1`), set with its number |
| `credit` | its credit, the whole text as it is shown (`Photo: …`), or empty |
| `rights` | its rights, as the address of a statement of rightsstatements.org (`http://rightsstatements.org/vocab/InC/1.0/`, In Copyright) or of a Creative Commons licence (`https://creativecommons.org/licenses/by/4.0/`, CC BY 4.0; any version, CC0 and the Public Domain Mark too), or empty until they are clear. Copyright Not Evaluated and Copyright Undetermined are not used: the build stops on them, and on any other address |
| `rights_note` | a few words or a link shown after the rights (a web address in it becomes a link), or empty |
| `cite_as` | how to cite the item's own source, in the house style, with what is known of its maker, title, date and holder (`Clarke Fitzgerald, ‘The Plumb Line and the City’ (1971), Coventry Cathedral`), or empty |
| `title` | a title, only for an item whose pages give it no caption (an embedded film, the zines) |
| `former_names` | its earlier names, separated by spaces: their addresses forward to the current one |
| `former_sources` | its earlier files or addresses, separated by spaces (a space inside a path is written `%20`), so that the versions that used them still find the item |

Captions, alt text, sizes and where an item appears are read from the pages at every build. An item without a line is
"new": the build drafts its name from its caption until a line gives it one. The build stops when a registered item's
file is neither in the repository nor in any frozen version, when a numbered item is on no page of any version (its file
or address changed without `former_sources` saying so), when two items share a name, or when an item of a frozen
version has no number.

Item pages are at the root of the site, shared by every edition: `/<kind>/<name>/` (`/see/boulder-font/`). Every
numbered item has a short address, `/<number>/` (`/37/`), and every former name keeps its address,
`/<kind>/<former name>/`: small pages that forward to the item's page (a `<meta http-equiv="refresh">`, a canonical
link, `noindex` and a visible link). The Media Index, the second part of `about/references-and-media/` (`#media`) in
every edition, lists every item, each as `<li id="item-37" class="media-entry">`.

In the HTML of a page, an item's figure, or its player's `<div class="player">`, has the item's anchor as its id:
`item-<number>` (`item-37`), or `item-<name>` while it has no number; the same item a second time on a page is
`item-37-2`. Its caption line starts with its number pill:

```html
<figcaption><a class="item-number" href="../../see/boulder-font/" aria-label="Item 37">37</a> The baptismal font in Coventry Cathedral</figcaption>
```

An item not numbered yet has `<a class="item-number is-new" href="…" aria-label="New item, not yet numbered">new</a>`.
The credit follows the caption, as `<span class="item-credit"> · Photo: …</span>`, when the item has one. The rights
are shown on the item's page and in the Media Index, the source on the item's page, never in the caption line; an empty
credit, rights or source is never shown. A picture without a caption gets a caption line for its pill; an audio player
is followed by `<p class="media-caption">` with the pill and the recording's title. On the item's own page the pill is a `<span>`. In a frozen version the pills lead to the shared item pages
(`../../../see/boulder-font/` from `v0.1/essays/catherine_hahn/`). Without JavaScript a picture links to its item page
(`<a class="figure-picture" href="…/see/boulder-font/" data-largest="…">`; on the item page, to its largest image).

## media.json

At the root of the site, every media item, for other frontends. Its URLs are relative to the site's root.

| field | value |
|---|---|
| `contract`, `everytrickinthebook` | as in publication.json |
| `title`, `url` | the book's title, and where the site is published |
| `items` | every item, the numbered ones by number, then the new ones in order of first appearance: `{ number, kind, name, source, since, credit, rights, rights_label, rights_note, cite_as, title, url, short, caption, former_names, former_sources, stored, served, first_published, last_changed, pages, document, appearances }` |

- `number`, `kind`, `name`, `source`, `since`, `credit`, `rights`, `rights_note`, `cite_as`, `title`, `former_names`,
  `former_sources`: as in the register (`number` and `since` are `null` for a new item, `credit`, `rights`,
  `rights_note`, `cite_as` and `title` are `""` when empty, the former ones are lists)
- `rights_label`: the name of its rights, as its page shows it: `"In Copyright"`, `"CC BY 4.0"`, `"CC BY 2.0 UK"`,
  `"CC0 1.0"`; `""` when `rights` is empty
- `url`: its item page (`"see/boulder-font/"`); `short`: its short address (`"37/"`), `null` for a new item
- `caption`: its caption where it is shown (in the latest text, or else in the newest frozen version that has it), plain
  text
- `stored`, `served`: where it is kept and where readers' browsers get it from, for people: `"this repository"`,
  `"Internet Archive"`, `"YouTube"` …; `"our own site"`, `"GitHub, as a raw file"`, `"archive.org"` … (a zine copied from
  archive.org is stored on the Internet Archive and served from our own site)
- `first_published`, `last_changed`: days (`YYYY-MM-DD`) from the repository's Git history, as the item's page shows
  them ("First published", "Last changed"). `first_published` is the day of the earliest commit whose change to a page
  (`README.md`, `essays/*.md`) adds a reference to the item: its file, its address, or a former one (`former_sources`),
  in any form a page writes it. `last_changed` is the day of the latest commit that changed its file, current or former
  (for a zine copied from archive.org, the folder of its pages); `null` for an item served from elsewhere (YouTube,
  Vimeo, the BBC, archive.org), whose file is not the book's. Days are commit dates. Both are `null` when the build had
  no whole history (a shallow clone), and the item's page leaves the row out
- `pages`, `document`: for a document whose pages the build shows, how many pages it has and its data
  (`"read/walking-sitting-sketching/document.json"`, see "Documents"); `null` for any other item
- `appearances`: every place it appears, in every edition, `{ edition, page, url, anchor, after, caption, alt }`:
  `edition` is `"latest"` or a version's id, `page` the page's Markdown file, `url` the page with the item's anchor
  (`"v0.1/essays/catherine_hahn/#item-37"`), `after` the numbered paragraph before it, `caption` and `alt` as that page
  has them, and `description` and `description_by`, its long description there, as in page.json's `figures` (`""`
  when there is none)

## Long descriptions

A picture that carries an argument (an artist's map, an archive photograph) may have a long description, written by an
author or an editor, which sits in the page beside the caption, as alt text does. It is optional: where none is
written, nothing is shown and nothing says so. In the Markdown it is a block directly after the picture:

```markdown
![Artist map drawn by Catherine Hahn](../../images/x-1600.jpg){.zoom .wide alt="…"}

::: {.description by="Jane Doe"}
One or more paragraphs.
:::
```

after a `.ve-media` line in a page in Juncture's syntax too. `by`, who wrote it, may be left out. A block after a
gallery belongs to the gallery's last picture; a block after anything else stops the build. It is never numbered (see
"Paragraph numbers"). In the HTML of a page it is a disclosure at the end of the picture's caption line, which the
picture's `img` names with `aria-details`:

```html
<img … aria-details="item-34-description">
<figcaption>…<details class="description" id="item-34-description"><summary>Description by Jane Doe</summary><div class="description__text"><p>…</p></div></details></figcaption>
```

("Description" alone when it has no `by`). On the item's page it is shown in full below the picture, as
`<section class="item-description" id="item-34-description">` with the heading "Description" and, when credited, "By
Jane Doe". The zoom viewer leaves it out of its caption.

## Documents

A document is a media item of kind `read` whose pages the build shows: a PDF of the repository, whose pages it renders
and whose text it reads, page by page, or a zine on archive.org whose page images have been copied into the repository
(`media/zines/<identifier>/`). Each has its data at the root of the site, beside its item page:
`read/<name>/document.json` (`read/walking-sitting-sketching/document.json`). Its URLs are relative to the site's root,
like media.json's.

| field | value |
|---|---|
| `contract`, `everytrickinthebook` | as in publication.json |
| `number`, `name`, `title`, `source` | the item's number (`null` until it has one), name and source, as in media.json, and its title: the register's, or else the title its page gives it |
| `url` | its item page, `"read/<name>/"`; the site's root is as many folders up from `document.json` as `url` has |
| `download` | `{ url, label, size }`: the original. For a PDF its file in the site (`"media/events/walking_sitting_sketching.pdf"`), `label` `"PDF"` and `size` in bytes; for a zine the item on archive.org, `label` `"archive.org"` and `size` `null` |
| `copy` | for a zine, `{ folder, fetched }`: the folder in the repository that holds the copied pages and the day they were fetched (`YYYY-MM-DD`); `null` for a PDF |
| `text` | `true` when the pages have text (a PDF), `false` when they have none that can be shown (a zine) |
| `pages` | every page in order, `{ n, width, height, tiles, info, image, thumb, text }`: `n` from 1; `width` and `height` the size of its tiles' full image; `tiles` its zoom tiles' `info.json` (see "Zoom tiles") and `info` the same `info.json`, so that a viewer need not fetch it; `image` and `thumb` the page 800 and 400 px wide (JPEG); `text` the page's text as a list of paragraphs, plain text (`[]` for a page without text), or `null` for a document without text |

In the HTML of a page, a document is
`<figure id="item-64" class="document" data-document="../../read/walking-sitting-sketching/document.json">` with its
cover (`<a class="figure-picture document__cover" href="…/read/walking-sitting-sketching/">`) and its caption line, which
ends with `<span class="document__actions">`: Text, a link to its text on its page (`…/read/walking-sitting-sketching/#text`),
and the download; `assets/zoom.js` puts Open first. On its item page, the figure (`class="document is-page"`) holds
`<div class="document-viewer" data-document="…">` with the row of its pages, `<ol class="document-strip">`, each page a
`<li id="page=3">`, so that `#page=3` finds the page without JavaScript; with JavaScript the viewer takes its place and
opens at that page. Below it, the text: `<section id="text">`, holding, in `<div class="document-pages"
data-pagefind-body>`, `<section class="document-page" id="page-3" data-pagefind-meta="entry-page-3:page 3">` for each
page of a PDF, headed `Page 3`; then `<section id="download">`. Only that `div` of the page is in the latest text's
search index, each page a result's place labelled `page 3`.

## Zoom tiles

`tiles` points at a static IIIF Image API 2 level-0 `info.json` with 512 px JPEG tiles. Its `@id` is
`"."` because the build cannot know where the site will be hosted: before handing it to a viewer, set it
to the absolute URL of the folder that holds `info.json`, without a trailing slash, as `assets/zoom.js`
does.

## Markdown view

Every `index.html` has an `index.md` beside it, and the root of each edition has `publication.md` with all
pages in reading order. They are written by the build from the book's source, in Pandoc Markdown with a YAML
front matter (`title`, `subtitle`, `lang`, and the version stamp: `version` with `id`, `label`, `date` and `status`,
and `everytrickinthebook`, the toolkit's version), and contain
no Juncture syntax. `index.md` uses URLs relative to
itself; `publication.md` uses absolute URLs and starts each page with its title as a level-1 heading.
Media are written as:

- zoomable images: `![caption](images/x-1600.jpg){.zoom .right width="75%" alt="…"}`, with one class for where the
  picture sits, or none: `.left` or `.right` (half the text column, or the share `width` gives), `.wide` (as wide as the
  page's opening and its footer) or `.full` (the whole window; `width` is ignored for these two); without one, the text
  column. In the HTML the picture is offered in several widths (`srcset`); `image` in `page.json` stays the 1600 px copy
- animated images (from an animated GIF): `![caption](images/x.webp){.animated alt="…"}`, an animated WebP that does not
  zoom; in the HTML its first frame, `images/x-still.jpg`, is shown to readers who ask for less motion, and to anyone
  who presses its Pause button. In `page.json` its `tiles` is `null`
- `::: {.video}` and `::: {.embed}`: a div that starts with an ordinary link to the video or embedded page (a
  video file, a PDF); any text after the link is the caption. An `.embed` whose link is a document whose pages the build
  shows (a PDF of the repository, or archive.org's reader of a zine whose pages are copied into the repository; see
  "Documents") is shown as that document, with its cover and its viewer; its Markdown is the same
- `::: {.audio}`: a div with a link to the MP3. When the MP3 has a cue file beside it, `<recording>.paragraphs.vtt`
  (WebVTT, one cue per transcript paragraph, holding the paragraph's words), the HTML marks each timed paragraph with
  `data-cue-for` (the player's id), `data-cue-start` and `data-cue-end` (seconds). Cues are matched to paragraphs by
  their words, never by number, so they never affect the paragraph rule
- `::: {.description by="…"}`: a picture's long description, directly after it (see "Long descriptions")
- `::: {.gallery}`: a div of zoomable images; `::: {.cards}`: a list of links, each with a picture and a title
- transcript timecodes such as `[00:10:13]` stay as plain text

The only raw HTML that remains is the third-party smartframe script embeds in `essays/spotting_colours.md`.

## Citations in the HTML

During the parallel run the Markdown keeps its plain-text citations and typed reference lists. The build links them
(`filters/citations.lua`); the text of the page does not change:

- a citation is `<a class="citation" id="cite-<key>-<n>" href="#ref-<key>" data-popover="ref-popover-<key>"
  aria-describedby="ref-text-<key>">` around the text inside its brackets, as typed (`Hall, 2001`, `2017:147`), when
  the page's own typed list has the work, and has `href="<the edition's root>about/references-and-media/#<key>"` when it does not;
- an entry of a typed reference list that is in the bibliography is `<div id="ref-<key>" class="typed-reference">`;
  a paragraph holding two entries has an empty `<span id="ref-<key>">` for the second;
- the references the page cites are at the end of `<main>`, each in
  `<div id="ref-popover-<key>" class="citation-popover" popover="manual">` with the formatted reference in
  `<p id="ref-text-<key>">`; `assets/citations.js` shows them.

The References, the first part of References and media, `about/references-and-media/` in each edition
(`v0.1/about/references-and-media/` for version 0.1), list every work
of that edition's bibliography once, formatted in the house style without the dash for a repeated author, in the order
of the house style's reference list (by author, then year, then key, so that `stengers2005a` comes before
`stengers2005b`). Each work is `<li id="<key>" class="reference">` in `<ul class="reference-list">`, so that
`about/references-and-media/#hall2001` finds it, with the reference in `<p class="reference__text">` and, in
`<dl class="reference__where">`, "Cited in": a link to each passage of the edition that cites it, named by page title
and paragraph (`Introduction, para. 12`; a citation outside the numbered paragraphs is named by the margin note it is
in, `Introduction, note 3`, or else by the paragraph before it, `Introduction, after para. 11`), pointing at the
citation (`../../essays/introduction/#cite-hall2001-1`; a paragraph that cites the work twice is named once), and
"Listed in": a link to the work in each typed reference list that has it (`../../essays/podcasts/#ref-hall2001`), both in
reading order. A row is left out when it would be empty. All the references of an edition are formatted in one
citeproc run over its whole bibliography, so their year letters (`2005a`, `2005b`) are the same on every page and on
the References page.

In `references/` at the root of each edition (where the References page was until contract 0.8; its `index.html` now
forwards) are the edition's bibliography and the texts of its Copy menus, every work in the page's order:

- `bibliography.json`: the bibliography in CSL-JSON, as `references/bibliography.json` in the repository (or in the
  version's tag) has it, without `custom`, which records for the build where each entry is typed in the pages;
- `bibliography.bib`: the same in BibTeX, as Pandoc writes it, with `doi` and `urldate` added where a work has them;
- `bibliography.ris`: the same in RIS, with the tags in the places Zotero's RIS translator reads them, the entry's key
  as `ID`, UTF-8 and the specification's CRLF line ends;
- `formatted.json`: `{ contract, everytrickinthebook, version, styles, works }`. `styles` lists the forms of the
  Copy menu in its order, each `{ id, label, short }` (the menu's name and the confirmation's: `APA (7th edition)`,
  `APA`), with the address of its CSL file and the `locale` it is formatted in for a citation style, and `entry: true`
  for an entry of a reference manager. `works` holds, for each key, the work in each form as plain text: `house` (the
  house style as the page shows it, with the book's year letters), `apa`, `chicago`, `mla` and `harvard` (each work
  formatted on its own, without year letters or dashes for a repeated author, as a reference manager copies it), and
  `bibtex` and `ris` (the entry as in the files above, with `\n` line ends).

The list of the References, `<div class="references">`, names `formatted.json` in `data-copy` (`../../references/formatted.json`) and the forms of the
menu in `data-copy-styles` (JSON); `assets/references.js` makes the Copy buttons from them, so they are not part of
the page's HTML.
