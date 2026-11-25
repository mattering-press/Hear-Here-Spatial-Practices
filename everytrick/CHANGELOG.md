# everytrickinthebook: what’s new

Every version of everytrickinthebook, newest first, with what changed in it. Until 1.14.0 it was called
every_trick_in_the_book, and the entries for those versions keep that name.

The toolkit’s versions are numbered separately from the versions of the books it makes. A book’s versions follow its
text, such as version 0.1 of *Hear Here: Spatial Practices*, its first public version. The toolkit’s versions follow
the design and what the pages do, and are always written with the toolkit’s name, such as everytrickinthebook 1.15.0.
Every version of a book is shown with the current version of the toolkit, so a frozen version keeps its text but
takes on the current design.

The middle number goes up when something readers see or use changes, the last one for fixes that change nothing a
reader sees. How to add a version: ‘Versions of the book and of everytrick’ in `DEVELOPMENT.md`.

## 1.24.0

25 November 2026. About this book is one page, and the menu has two plain entries (the publisher, 2026-11-25).

- **About this book** (`about/`, from `about.md`) is one page with sections: Contributors, Acknowledgements, How to
  cite, Making this book, Mattering Press, Licence and versions, and Everytrick & Co.
  It replaces the overview and the pages Contributors & acknowledgements, Colophon and How to cite this book, whose
  addresses are not forwarded. It has no paragraph numbers. The build fills in its empty divs (`::: acknowledgements`,
  `::: cite-book`, `::: cite-downloads`, `::: licence-and-versions`, `::: everytrick-and-co`); `about/colophon-note.md`
  is gone, since the publisher writes in `about.md` itself.
- **A contents list for the pages you consult**, About this book and Bibliography and items: on wide screens it
  heads the right-hand margin, where other pages have their note, stays in view as the page scrolls and marks the
  section being read (`assets/toc.js`); on narrow screens it stands above the text. On the About page it replaces the
  page's note and ends with its date; on Bibliography and items it has the Bibliography's initials, A to Z, each
  leading to the first work under it, and on narrow screens the Bibliography | Items switch stands in for it.
- **The menu** ends with two plain links, "about" and "bibliography" (Bibliography and items), in place of the
  "about" entry that opened a list; `FRAME.menu` names them.
- **The page's note** links "How to cite" to `about/#how-to-cite`.
- **Contract 0.11**: `backmatter.sections` in publication.json lists the two pages; the paragraph rule is 0.6's,
  unchanged. Version 0.1 keeps its numbered `essays/contributors/`.

## 1.23.0

25 November 2026. The latest text is called the working copy (the publisher, 2026-11-25).

- **Working copy, unreleased** replaces "Latest text, unreleased" wherever readers see it: the footer, the version
  line, the Colophon, the version notice ("Read the working copy"), search, citations of new or changed passages and
  the status line after copying. `label` in publication.json and page.json changes with it; `id` and `status` stay
  `latest`.
- How to cite this book explains the working copy, and that published versions give stable links.
- **The Bibliography's copy buttons are a quiet icon**: one "Copy citation" button a work was clutter (the
  publisher, 2026-11-25). Each work has a small copy icon, faint until the reader points at the work or reaches it by
  keyboard, and light but always visible on touch screens; the list's opening explains it once. A click still copies
  the reference in the reader's style, the status line says so, and the icon shows a tick for a moment.

## 1.22.0

24 November 2026. Citing is explained in one place, How to cite this book, in About this book (the publisher,
2026-11-24).

- **How to cite this book** (`about/how-to-cite/`, from `about/how-to-cite.md`) is a new part of About this book. It
  explains the citation settings, with how Formatted and Plain text differ, and how to cite the book, a section, a
  quote, a media item and a reference, how to link to a paragraph, and how citations follow the versions. The build
  fills in the book's reference, with Copy citation, and a button that opens the citation style
  (`::: cite-book`, `::: cite-downloads`). A version frozen before the page existed takes it from the latest text.
- **BibTeX and RIS** of the book and all its sections are two downloads on that page, and nowhere else.
- **How to cite this page** is gone from the end of every page on screen; it stays in print. The page's note keeps
  Copy citation, and its "How to cite" leads to the new page.
- **Copy citation** is the label of every Copy button of a citation: on item pages, in the citation popups and on the
  References page.
- **Bibliography and Items**: the References are called the Bibliography, the Media Index the Items, and References
  and media is Bibliography and items, wherever a reader sees the names (the publisher, 2026-11-25). The page's
  address is now `about/bibliography-and-items/` (its parts `#bibliography` and `#items`). The former address,
  `about/references-and-media/`, is not forwarded: it had been live for two days and nobody had used it. A chapter's
  own "References" list keeps its heading.
- **The Items' opening** says how items get their numbers (when a version is released; items added in between are
  marked new) and how many there are of each, and points to `media.json` for the same list as data.
- A link in a page's Markdown to a page the build makes, written as its address ending in `/`
  (`/about/references-and-media/#references`), stays an address in the site.

## 1.21.0

24 November 2026. A podcast's length moves into the page's note (the publisher, 2026-11-24).

- **`duration:` in a page's front matter** gives a recording's length (`duration: 37:57`, or `38:28 + 1:51` with an
  addendum). The page's note shows it after the day it was recorded: "Recorded 22 March 2025 · 37 min 57 sec".
- The podcasts' "Podcast duration" lines are taken out of the latest text. No numbered paragraph changes, and the page
  data are unchanged (contract 0.10).

## 1.20.0

24 November 2026. Citing steps back: the Cite button leaves the page's opening, and a quiet note at the top of the
margin says who made the page and when, with Copy citation and How to cite (the publisher, 2026-11-24).

- **The page's note.** A few lines in small type, written as a colophon rather than as data: who made the page, in
  their natural order ("Aya Nassar, in conversation with Nirmal Puwar"), the day it was held or recorded, the
  producer and transcript editor, and when the page last changed ("Last changed 24 November 2026", from the last
  commit that changed its file; on a frozen version "Version 0.1, released on 20 November 2026"). Then "Copy
  citation · How to cite". On wide screens it heads the right-hand margin, level with the text, and margin notes
  start below it; on narrow screens it stands above the text.
- **Copy citation copies in one click**, in the reader's style, like the ¶; the status line says so briefly
  ("Citation copied, in APA"). The Cite panel is gone. The home page's note leaves out the author, whom its opening
  already names.
- **How to cite** at the end of the page now says which style it is shown in, with a way to change it, and has the
  BibTeX and RIS entries that were in the panel.
- The podcasts' "Recording date" and "Interviewees" lines are taken out of the latest text, since the page's note
  gives them. No numbered paragraph changes.

## 1.19.0

24 November 2026. Citations as Nirmal Puwar confirmed them: the book is hers as its author, events and podcasts carry
their dates, and event pages list everyone who made them.

- **The book is cited as written by Nirmal Puwar**, not edited: Puwar, N., *Hear Here: Spatial Practices*, version 0.1
  (Mattering Press, 2026). A page is "…, in N. Puwar, *Hear Here: Spatial Practices*, …", and so is a media item. Every
  footer reads "by Nirmal Puwar", where it read "convened by Nirmal Puwar".
- **The day an event was held or a podcast recorded** follows the page's title in the house style: ‘Rocking It:
  Insider/Outsider Archives’, held on 2 March 2024, …; ‘Hear Here Podcast: Aya Nassar’, recorded 5 April 2025, …. The
  year of the citation stays the year the version was published. A page gives the day as `held:` or `recorded:` in its
  front matter.
- **A Credits section** at the end of a page lists everyone else who made it, by role: collaborators, readers,
  musicians, sketchers, film, photography, organisers, assistance. It comes from `credits:` in the page's front matter
  (`  - Film: Jon Randle, Mindriot Productions`). Search finds it; citations name only the authors.
- **The credits are Nirmal Puwar's** (24 November 2026), no longer a draft. Authors are in alphabetical order:
  (Burley and Puwar 2026), (Galetto and Puwar 2026), (Horspool and Perkins 2026); Acorn, with four, is (Chambers et
  al. 2026). The Acorn films are credited to Jon Randle, Mindriot Productions, and the walk booklet names its copy
  editor, Mouli Banerjee. Rocking It took place at the POD outside(R) Zine Fest.
- **The contract is shown beside the versions** (the publisher, 2026-11-24): every footer's credit line ends with the
  contract of the book's data, "built with everytrickinthebook 1.19.0 by SJMcH · contract 0.10", linked to
  `CONTRACT.md`; and the colophon's Versions and kit starts with all three: the text's version, the kit's and the
  data's contract (for a frozen version, also the contract whose rule numbers its paragraphs).
- The page data is contract 0.10: publication.json has `authors` in place of `editors`, and page.json gains `date` and
  `credit_list`. The paragraph rule is unchanged, so no paragraph has a new number.

## 1.18.0

23 November 2026. everytrick has a home of its own: everytrick.org.

- The footer’s credit, the colophon and the Versions page link the name everytrickinthebook to everytrick.org, where
  they linked to its repository on GitHub. The site says what everytrick is and how to get in touch; its code is
  still linked from there. everytrickinthebook.org leads to it too.

## 1.17.0

23 November 2026. Copying citations: quotes, pages, media items and references, in the reader's citation style. The
plan is "Plan: copying citations" in `DEVELOPMENT.md`.

- **The ¶ is unchanged.** It still copies the link to its paragraph in one click. Every new way of copying works like
  it: one click copies, and the status line at the foot of the window says what was copied.
- **Every copy is one block**: the quote, its citation and the reference in one paragraph, with the address inside the
  reference, between angle brackets, as MHRA has it.
- **Citation settings.** The settings ("Aa") have a citation style, Mattering Press (the preset), APA, Chicago, MLA or
  Harvard, and "Copy citations as", Formatted (the preset; italics and links, for a word processor) or Plain text (for
  an email, a form, or an app that would turn formatting into Markdown). Every copy on the site follows them.
- **Copy quote.** Selecting words in the text shows a Copy quote button at the foot of the window. It copies the words
  in quotation marks with their citation and the reference: ‘Cairo is a very dusty city’ (Nassar 2026: para. 55).
  Nassar, A., ‘Hear Here Podcast: Aya Nassar’, … <…/v0.1/essays/aya_nassar/#p55> [accessed 23 November 2026].
  Formatted, the citation is a link that highlights the quoted words when it is opened. A selection over several
  paragraphs is cited as paras 55–56; a selection that starts or ends inside a word takes the whole word. The button
  never sits beside the selection, where a phone's own menu and Hypothesis's Annotate button appear.
- **Cite**, under every page's title, cites the page as a whole. Its panel says so in a line of small type, and that
  selected words are cited with Copy quote; then come the page's reference in the reader's style, its in-text
  citation, a Copy button, the style with a link to the settings, and BibTeX and RIS for a reference manager.
- **The latest text cites the newest release.** A quote copied on the latest text whose paragraphs are unchanged in
  version 0.1 is cited there, with its numbers and address in that version; one that is new or changed since is cited
  as the latest text, unreleased, and the status line says that its number may still change. Cite cites the page in
  version 0.1.
- **How to cite this page**, at the end of every page, gives the citation and the reference, also without JavaScript,
  in print and in archives, in the reader's style.
- **Media items** are cited against the book, in one block: Item 37, ‘The baptismal font in Coventry Cathedral’, in N.
  Puwar, ed., Hear Here: Spatial Practices, version 0.1 (Mattering Press, 2026) <…/37/> [accessed …]. Each item's page
  has it under To cite, with its in-text citation, (Puwar 2026: item 37), and a Copy button, and the zoom viewer has a
  Cite button in its top bar.
- **The References page and the citation popups** copy a work in the reader's style in one click. The References page's
  Copy menu is gone; BibTeX and RIS are in its downloads.
- **Who made each page** is written at the top of its Markdown file (see "Credits" in `CONTRACT.md`): authors, and for
  the podcasts the interviewer, producer and transcription editor. The house style names the authors first and the
  others after the title: ‘Hear Here Podcast: Aya Nassar’, interviewed by N. Puwar, prod. by D. Whitley, transcript ed.
  by P. Phung. The credits on the pages are a draft until Nirmal Puwar has confirmed them.
- **For Google Scholar** every page has the `citation_…` tags and a JSON-LD block that describe it as a chapter of the
  book.
- The page data is contract 0.9: page.json gains `credits` and `citation`, publication.json `editors` and `citation`,
  and formatted.json each style's formatted text. The paragraph rule is unchanged, so no paragraph has a new number.

## 1.16.0

23 November 2026. About this book: one entry in the menu for what follows the book’s text, and a lighter footer. The
page data is now contract 0.8.

- What follows the book’s text is now About this book. Its overview, `about/`, says in a sentence what it holds and
  leads to its three parts, each with a line: Contributors & acknowledgements, the Colophon, and References and media.
  Every version of the book has them, and each of these pages says “About this book” above its title.
- The menu’s two last entries, “media index” and “references”, become one, “about”, so the menu has five entries again
  and stays on one line down to a narrower window (888 pixels at the usual text size, where it needed 1008). On a wide
  screen “about” opens a short list – About this book, Contributors & acknowledgements, Colophon, References and media
  – with the mouse or the keyboard: the arrow keys move through it, Escape closes it. In the menu of a narrower window
  the list is an indented group under “about”. Without JavaScript, “about” leads to the overview.
- Contributors & acknowledgements, `about/contributors/`, is the Contributors page, with room after it for the author’s
  own thanks under “Acknowledgements”, which shows only once they are written. Its old address leads there.
- The Colophon, `about/colophon/`, starts with “Making this book”, Mattering Press’ opening for the author to finish,
  and the publisher’s statement, “Mattering Press”; then the book’s licence, with a note that its media items may carry
  other rights, which the Media Index gives; and “Versions and kit”: the version being read and a link to all versions,
  the book’s open data, and the toolkit and its version, the typeface, the programs that make the site and their
  licences, and where it is hosted, after a few sentences of the publisher’s own if there are any.
- References and media, `about/references-and-media/`, is the References page and the Media Index on one page, the
  references first, with a small switch at the top to go to either part. Every work and every item keeps its anchor,
  its Copy menu, its downloads, its filters and the way search finds it. The old addresses, `references/` and
  `media-index/`, lead there, to the same work or item; the editing view of the Media Index stays where it was.
- Making this book, the publisher’s statement and the contributors are reading text: their paragraphs are numbered and
  search finds them. What the build writes on the Colophon, and the overview, are neither.
- The footer is lighter: the book’s title and licence, its version, and one link, “About this book”, instead of the
  links to all versions, the Media Index and the References page.
- A new page may give its title in a front matter at its start (`title: Colophon` between two lines of three hyphens)
  instead of a header line.
- In the book’s data the back matter closes the reading order in `publication.json` and the whole book in Markdown;
  each page is marked as part of the back matter or of the body (`part`, also in `page.json`), and `publication.json`
  lists the parts of About this book (`backmatter`). Citations and `page.json` lead to the References at their new
  address. That is contract 0.8; its paragraph rule is that of 0.7, so no paragraph’s number changes.

## 1.15.0

23 November 2026. A new name: everytrickinthebook, and everytrick for short.

- The toolkit is now called everytrickinthebook, one word in lower case, so that its name reads the same in prose,
  in its web address and on GitHub: everytrick.org, and github.com/everytrick. It was every_trick_in_the_book; the
  underscores could not go into a web address, and the hyphens that would have replaced them were ugly and confusing.
- The footer’s credit reads ‘built with everytrickinthebook 1.15.0 by SJMcH’, and its name links to the toolkit’s home
  at github.com/everytrick/everytrickinthebook. Screen readers still read it as ‘every trick in the book’.
- In the book’s data the toolkit’s version is now `everytrickinthebook`, where it was `every_trick_in_the_book`: in
  page.json, publication.json, media.json, the documents’ data, the bibliography’s formatted texts and the Markdown
  view’s front matter. That is contract 0.7, which changes nothing else.
- The toolkit’s folder in the book’s repository is `everytrick/`, where it was `every_trick/`.
- Readers keep their text size, colours and place in the book: those are still stored under their old keys.

## 1.14.0

23 November 2026. Item pages say when an item was first published and last changed; pictures may have a long
description. Both follow a reviewer’s suggestions. The page data is now contract 0.6.

- Every item page says when the item was **first published**, the day of the earliest change to the book’s pages that
  shows it (under its present file or address, or a former one), and, for an item whose file is ours, when that file
  **last changed**. A video on YouTube, Vimeo or the BBC, or a film on archive.org, shows only the first. Both come from
  the repository’s history at every build, and `media.json` has them too (`first_published`, `last_changed`). A build
  without the whole history leaves them out and says so.
- A picture that carries an argument, such as an artist’s map or an archive photograph, may have a **long
  description**, written directly after it as `::: {.description by="Name"}` … `:::` (after a `.ve-media` line too).
  On the page it is a quiet “Description” under the caption, “Description by Name” when it is credited, which opens to
  the text and which the picture names for screen readers; on the item’s page it is shown in full below the picture.
  It is never numbered as a paragraph (the paragraph rule of contract 0.6; no paragraph’s number changes). It is
  optional: nothing anywhere says that a picture has none, not even the editing view’s checks.
- The editing view of the Media Index has a field for a long description, and one for who wrote it, at each place a
  picture appears. The change sheet lists them only when they are filled in, as the block to write after the picture.

## 1.13.0

23 November 2026. Documents in the zoom viewer, with their text.

- The book’s documents – the walk’s booklet and the two zines, the Experimental Zine Index and *Trauma, Body and Home* –
  are shown as pictures of their pages, in the same viewer as the pictures. Where the viewer is wider than it is tall it
  shows two pages side by side, as a spread: the cover alone, then pages 2 and 3, 4 and 5, and so on; on a phone, one page
  at a time. The two pages of a spread meet without a gap, and a soft shadow on each page towards the spine, with a
  hairline at the spine itself, shows that they are two; it zooms and moves with the pages, also in full screen. A
  single page and the cover alone have none. Its bar shows which pages are on screen and how many there are (‹ 4–5 / 21 ›), and has zoom out, zoom in and
  fit, full screen, Text and the download. The arrow keys, the + and − keys and a swipe on a phone work as for pictures;
  Home and End go to the first and the last pages.
- On an essay page a document is its cover, with its number and its caption below it, and three buttons: Open, which
  opens the viewer at the cover without leaving the page; Text, which leads to its text; and the download, with its size.
  They take the place of archive.org’s readers on the Experimental index and on the page of Mahsa Alami Fariman, Ahmadreza
  Hakiminejad and Heba N. Sabboubeh, and of the PDF reader on the walk’s page. The pages’ Markdown is unchanged; the
  booklet’s caption no longer ends with a link to open the PDF, since the download takes its place. Search finds a
  document by its caption, not by the words of its buttons.
- Each document’s own page, such as `/read/walking-sitting-sketching/`, has the viewer, then the document’s text, page by
  page, each headed ‘Page 3’ with an address of its own (`#page-3`), then its download. A link ending in `#page=5` opens
  the viewer at page 5, and the address follows the pages as the reader turns them. Without JavaScript the page shows
  the pages as pictures in a row that scrolls sideways, then the text.
- In the viewer, Text shows the text of the pages on screen in place of their pictures, and the pictures again. The
  booklet’s text is read from its PDF when the site is built. The zines’ pages are pictures, and the text that archive.org
  recognises in them is not reliable enough to show, so for now each shows its title and says that a description of each
  page will follow.
- The zines’ pages are copied from archive.org into the repository, in `media/zines/`, so readers no longer wait on
  archive.org’s own reader, which failed for the zine index on 22 November. archive.org keeps the originals, and the
  zines’ download leads there. After a zine has been corrected on archive.org, `npm run fetch-zine -- <identifier>` copies
  its pages again.
- The Media Index shows each document’s cover, and lists the zines as served from our own site. A document’s page says
  how many pages it has, and where its pages come from, and `read/<name>/document.json` holds its pages, their zoom tiles
  and their text as data.
- Search finds the words of a document’s text: the booklet’s page on its own (`/read/walking-sitting-sketching/`) is in
  the latest text’s search, with only its text, each page of it shown as ‘page 3’ where a page of the book shows
  ‘para. 12’, leading to that page’s text (`#page-3`). The page’s facts and buttons are not searched, and the zines,
  which have no text, are not either.
- Building the site now needs poppler for the booklet (`brew install poppler` on a Mac, `poppler-utils` on Debian and
  Ubuntu); GitHub Actions installs it.

## 1.12.0

23 November 2026. A References page for the whole book, from which any reference can be copied in five styles or for
a reference manager, and a header that keeps one row at every width.

- The References page, `/references/`, lists every work in the book’s bibliography once, in the house style and in the
  order of its reference lists, alphabetical by author. Each work has an address of its own, made from its key:
  `/references/#hall2001`. Under each work are the passages that cite it, named by page and paragraph (‘Introduction,
  para. 12’), each leading to the citation itself, and the pages whose reference lists include it, each leading to the
  work in that list.
- Beside each work, a Copy button opens a short menu that copies the reference as plain text in Mattering Press’ house
  style, APA (7th edition), Chicago (author-date), MLA (9th edition) or Harvard (Cite Them Right), or as a BibTeX or
  RIS entry for a reference manager. A short line at the foot of the window says what was copied (‘Copied: APA’). The
  menu works with the keyboard (↓ and ↑, Enter, Escape) and by touch. The house style is the reference as the page
  shows it; the other styles are made when the site is built, with Pandoc and the styles of the official Citation
  Style Language repository, and give each work as it stands on its own, as a reference manager copies it, so without
  the year letters (2005a) that only tell this book’s works apart. Without JavaScript there are no Copy buttons, and
  search leaves them out.
- The whole bibliography can be downloaded from the explainer at the top of the References page, as BibTeX, RIS or
  CSL-JSON. Each version of the book has its own, beside its References page (`/references/bibliography.bib`,
  `/v0.1/references/bibliography.ris`).
- Each frozen version has its own References page, such as `/v0.1/references/`, because which passages cite a work,
  and their paragraph numbers, can differ from one version to the next.
- Every footer links to the References page of its version, beside the Media Index.
- Search finds the works on the References page by their author, title or any other part of the reference. Each work
  found is shown as the text cites it, such as "Stengers 2005a", where a page of the book shows "para. 12", with a
  link straight to its entry. The passages and pages listed under a work are not searched, so that searching a page's
  title does not list every work it cites. Each version searches its own References page.
- A citation whose work is not in its page’s own reference list now leads to the work on the References page, instead
  of to the first page in reading order that lists it. A citation whose work is in its page’s list still leads there,
  and the popups are unchanged. `page.json` follows the same rule. For now every page lists all the works it cites, so
  no citation leads to the References page yet.
- A citation of a work that is in the bibliography but in no page’s reference list is now linked as well, to the
  References page; the build used to report it as not linked.
- A link to a citation marks it, and its paragraph lights up for a moment, as for a link to a paragraph. When a page
  opens at a citation, the citation’s popup waits until the reader asks for it, so that it does not cover the passage.
- The year letters, such as Stengers 2005a and 2005b, are given once for the whole book, on the References page and in
  the popups alike. The reference lists typed in the pages show what their authors typed.
- The build says, for each version, how many citations lead to their page’s own reference list and how many to the
  References page.
- The menu in the header ends with ‘media index’ and ‘references’ on every page, leading to the Media Index and to the
  References page of the version being read.
- Where the whole menu does not fit beside the book’s title and the buttons (below about 1,000 pixels wide at the usual
  text size, sooner at larger sizes), it folds into a menu button (☰) beside the other buttons, which opens a panel
  with every entry. Escape, or a click or tap outside, closes it; without JavaScript it opens and closes all the same.
- The Page / Markdown switch is smaller: a round-ended pill of two icons, each named for screen readers and in a
  tooltip, made to take a third view, the Collage, later.
- The header keeps one row at every width from 320 pixels: on phones about 376 to 415 pixels wide, ‘Aa’ no longer
  drops to a second row. On the smallest phones the book’s title ends in an ellipsis.

## 1.11.0

23 November 2026. Every picture, recording, video and document has a number and a page of its own, and the book has a
Media Index.

- Every media item of the book – each picture, recording, video and document – has a permanent number, kept in the
  media register, `media/register.csv`, which GitHub shows as a table. Numbers are given when a version is frozen, in
  its reading order, and never change: the 70 items of version 0.1 are numbered 1 to 70. An item added since shows
  "new" until the next version is frozen.
- Every caption starts with the item's number, in a small pill that leads to the item's own page. A recording has a
  small caption line of its own below its player, with its number and its title. In the zoom viewer the number stands
  before the caption.
- Each item has its own page, at an address made of its kind and a short name: `/see/boulder-font/`,
  `/listen/podcast-catherine-hahn/`, `/watch/family-talk/`, `/read/house-of-hope/`. It shows the item, its number, its
  caption, its credit, its rights and source, every place it appears (with a link to it there), the version it entered
  the book with, where it is stored and where it is served from, and its files to download. These pages are shared by
  every version of the book, so a frozen version's numbers lead to the same pages.
- Every numbered item also has a short address to type from paper: `/37/` leads to item 37. When an item is renamed,
  its old address keeps leading to it.
- The Media Index, `/media-index/`, lists every item by number, with a small picture, its title, its address, where it
  appears, the version it entered with, where it is stored and served from, and its credit and rights when it has
  them. It can be filtered by kind and by where items are served from; without JavaScript it is a plain list. Every
  footer links to it, beside "All versions". `media.json` at the root of the site holds the same list as data, and
  every page's `page.json` lists the items on that page.
- Search finds the items of the Media Index by their title or caption and by their address. The Media Index is then
  among the pages found, and each item found on it is shown as "item 37" (or "new item"), where a page of the book
  shows "para. 12", with a link straight to its entry. The rest of an entry (where it appears, its version, where it is
  stored and served from) is not searched, so that searching a page's title does not list every item on that page.
  The Media Index is shared by every version of the book, so only the latest text's search has it. The item pages, the
  short addresses and the editing view are not searched: the Media Index holds their words.
- An item's credit is kept in the register, written exactly as it should show ("Photo: …"), and appears after its
  caption wherever the item is shown, and on its page.
- The register can say what the rights of an item are, as the address of a standard statement: one of
  rightsstatements.org's, such as In Copyright, or a Creative Commons licence, such as CC BY 4.0. The item's page shows
  the statement's name, linked to it, followed by a short note where the register has one. Rights are filled in only
  where they are clear: so far In Copyright for item 1, from the Historic England Archive, for House of Hope and for
  the videos on YouTube, Vimeo and the BBC.
- The register can also say how to cite an item's own source, its maker, title, date and holder, in the house style,
  such as "Clarke Fitzgerald, ‘The Plumb Line and the City’ (1971), Coventry Cathedral". The item's page shows it as
  "Source".
- Credit, rights and source appear only when they are filled in: no public page says that one is missing, not
  evaluated or unknown. `media.json` carries all three for every item.
- Videos and embedded documents whose pages give them no caption now show their real title, from the register (for
  the films and zines on archive.org, their title there), instead of "Embedded content from archive.org".
- Without JavaScript, clicking a picture opens its item page; on the item page, its largest image.
- Previews, never the public site, have an editing view of the Media Index, `/media-index/edit/`: fields for each
  item's name and credit, its rights (chosen from the common statements and licences, or another one's address typed
  in) and their note, how to cite its source, the caption and alt text of each place it appears, and a comment, with
  checks beside each item (no alt text, alt text that repeats the caption, no credit, no rights, no source to cite,
  used on no page). These checks are the only place that says what is missing. Edits stay in the browser; "Hand over
  changes" gives a sheet listing only what changed, to copy or download and apply on a branch.
- The build stops, saying what to do, when a registered item's file has gone or its address has changed, when two
  items share a name, when an item of a frozen version has no number, or when an item's rights are not the address of
  a rightsstatements.org statement or a Creative Commons licence. `npm run number-media -- <version>` numbers a
  version's new items when it is frozen.
- The page data is contract 0.5 (`CONTRACT.md`); its paragraph rule is unchanged, so no paragraph has a new number.

## 1.10.0

22 November 2026. Pictures in several widths, Zoom on the caption line and a new zoom viewer.

- Every zoomable picture is published in several widths, 800, 1200, 1600 and 2400 pixels (never wider than the
  original), and the browser takes the one the reader's screen needs. The build says how much these widths add to the
  images. Resized pictures are saved at quality 82, as the house style asks.
- Pictures can be wider than the text: `wide` makes a picture as wide as the page's opening and its footer, `full` as
  wide as the window. They are written like `left` and `right`, on a `.ve-media` line or as a class in Pandoc's syntax
  (`{.zoom .wide}`). The caption keeps the width of the text, and a margin note beside such a picture moves below it.
  On phones every picture is as wide as the text.
- A tall picture is never taller than about four fifths of the window, and its caption is as wide as the picture.
- Nothing covers a picture any more: ⤢ Zoom sits at the right end of the caption line, and clicking the picture opens
  the viewer too. Without JavaScript the picture is a link to its largest image.
- Galleries are justified rows: every picture keeps its shape, its share of a row follows its shape, and nothing is
  cropped. A gallery of two pictures is two pictures side by side. On phones a gallery's pictures are one below the
  other.
- An animation, such as the cover beside the first paragraph of the home page, has a Pause button that shows its first
  frame instead. Readers who ask their device for less motion start on that still, and can press Play.
- The zoom viewer fills the window, on a dark ground, with buttons shaped like the podcast player's. All the zoomable
  pictures of a page are one sequence. The top bar says which picture you are on (3 / 12) and gives its caption, which
  opens in full when you click or tap it; the bottom bar has zoom out, zoom in, fit, full screen, previous and next.
  The arrow keys go to the previous and next picture, + and − zoom, and Escape closes the viewer and goes back to the
  Zoom button of the picture you saw last. On a touch screen a sideways swipe turns to the next picture while the whole
  picture is in view, and moves the picture once you have zoomed in. The picture already in the page shows at once
  while the sharper tiles arrive. For readers who ask for less motion, zooming jumps instead of gliding.
- The link check also checks every width of every picture.

## 1.9.0

22 November 2026. Search.

- Every page has a magnifier in its header, beside "Aa", that leads to the search page. It lists the pages the words
  are found on, best first, and on each page up to three paragraphs with their number (para. 12) and the words
  around the ones found, marked. Each links straight to its paragraph. Results follow the typing, so the search
  field, a pill like the header's buttons, has no Search button.
- A × at the top right of the search page closes it: it leads back to the page search was opened from, at the
  place the reader last stopped to read (not the top of the page they scrolled up to for the magnifier), also after
  following a result and coming back. Escape does the same when the search field is empty. Without JavaScript, or
  when search was opened from outside the book, the × leads to the home page.
- The words searched for are kept in the page's address (`search/?q=dust`), so a search can be shared or bookmarked.
- Each frozen version searches its own text, at its own address (`/v0.1/search/`), so results lead to that
  version's paragraph numbers. Its search page has a link that searches the latest text for the same words.
- Only the reading text of the pages is searched: not the Markdown views, the whole book in Markdown or the versions
  page, and not the cards that lead to other pages, so the words in a card are found on the page it leads to.
- The index is made by Pagefind 1.6.0 when the site is built and needs no server. The search page loads it only when
  it is used. Without JavaScript the page points to the whole book in Markdown, for the browser's own Find in page.
- The build reports how many pages each index holds, and names any page with nothing to find (Events, which has only
  cards). The check confirms that every edition has its search page and index.
- On small phones the header's items sit a little closer together, so that the title, the Page / Markdown switch,
  search and "Aa" still fit on one row (from 360 pixels wide).

## 1.8.0

22 November 2026. A player inside a transcript keeps all its controls.

- The player switches to its one-line form with the ⋯ button only when it is really narrow, as on a phone or in the
  margin. A player placed inside a transcript, such as the addendum on Aya Nassar's page, now shows all its controls
  on a wide screen, like the player above it.
- A small link below a player can lead to another one further down the page: on Aya Nassar's page, "Listen to
  Addendum" goes to the addendum's player. In the Markdown it is a short line in italics, `*[Listen to Addendum](#addendum){.listen-link}*`,
  which, like other short labels, gets no paragraph number.

## 1.7.0

22 November 2026. No more timecode lines in timed transcripts.

- A transcript whose recording is timed paragraph by paragraph no longer shows the written timecodes, such as
  [00:16:32], between its paragraphs: the ▸ beside every paragraph does their job. They stay in the Markdown, and in
  transcripts that are not timed yet they still play the recording from that moment.

## 1.6.0

22 November 2026. One line on phones, and every podcast timed.

- On a phone the player is a single line: play, time, position, a ⋯ button and, at the foot of the window, ×. Back,
  forward, speed and "Follow text" are in the small panel the ⋯ button opens, which also says what is playing. Wider
  screens keep every control in the line.
- Every podcast transcript is timed paragraph by paragraph, so each page has the ▸ on the transcript's rule and
  follows the recording paragraph by paragraph.
- `scripts/align.mjs` now starts its report with what needs a person to listen: untimed paragraphs, starts it is
  unsure of, cues too fast or too slow for speech, talk left out of the text, and written timecodes that disagree.
- The build's check of paragraph numbers also counts paragraphs that carry cue times; before, it skipped them.
- A paragraph's cue now starts after the pause between it and the paragraph before, not on the edited last words of
  the paragraph before, which is where several cues started on Monica Brown's and Catherine Hahn's pages.

## 1.5.0

21 November 2026. Transcripts timed paragraph by paragraph.

- A podcast whose recording has a cue file (`media/audio/<recording>.paragraphs.vtt`) has every transcript paragraph
  timed. A ▸ on the transcript's rule beside each paragraph plays the recording from there, the paragraph being heard
  is marked on the rule, and "Follow text" follows paragraph by paragraph. A paragraph left untimed has no ▸ and is not
  marked. The first page with cues is Aya Nassar's, including its addendum, which plays from its own recording.
- `scripts/align.mjs` makes the cue files: on your own computer, whisper.cpp transcribes the recording with a time
  for every word, and those words are matched against the edited transcript. It also writes a report for the editor
  with each paragraph's start, the written timecodes checked, and the places where text and recording differ.
- The build finds each cue's paragraph by its words, so cues survive renumbering between versions, and it warns when a
  cue no longer matches any paragraph.

## 1.4.0

21 November 2026. A podcast player that stays with you.

- Podcast pages have their own player: play, the time and the length of the recording (shown before anything has
  loaded), a position bar, back and forward 15 seconds, and speed. Without JavaScript the browser's own player is
  still there.
- While a recording plays and you read on, the player waits at the foot of the window as a slim bar, with the title
  and the speaker and paragraph you are hearing. It does not interrupt playback or move the keyboard focus, and its ×
  stops the recording and puts the player back. On phones the recording can also be paused from the lock screen.
- "Follow text" scrolls the transcript along with the recording, from one timecode to the next, and marks the passage
  being heard on the transcript's rule. It is off until you turn it on, and scrolling the page yourself turns it off
  again.

## 1.3.0

21 November 2026. A way back from the whole book in Markdown.

- The whole book in Markdown (`publication/`) has the Page / Markdown switch too. "Page" leads back to the page you
  came from, or to the home page if you arrived from somewhere else.

## 1.2.0

21 November 2026. A first clean-up of how the site looks.

- Every page has the same header: a bar with the book's title, the menu and the Page / Markdown switch, then the
  page's title over its header picture in a band of the same height on every page, so nothing moves when you go from
  page to page. A podcast or event page names its section above its title, and the section is marked in the menu.
- Margin notes can hold pictures, animated GIFs, video and audio players as well as text. A note that holds only
  media has no number. An animated GIF plays as a much smaller animated WebP, and stands still for readers who ask
  for less motion.
- The Markdown view is a page of its own, with the same header and footer and the Markdown at a reading width; the
  `index.md` file is still beside every page. The whole book in Markdown has such a page too, `publication/`, beside
  `publication.md`.
- The footer shows the publisher's logo (the icon alone on phones), a credit line and the licence, from files in the
  repository rather than images on other sites.
- Easier reading: a narrower text column, regular instead of light type, headings as written instead of in lower
  case, captions as small text under the picture, quieter timecodes and transcripts.
- Cards look the same whether or not their picture has alt text. Before, a picture without alt text sat inside the
  title, framed by a red line.
- On phones the header takes less room and the Markdown view is readable.
- The toolkit's version is called `every_trick_in_the_book` in the data, as in `every_trick_in_the_book: "1.2.0"`: in the
  front matter of the Markdown files, `page.json` and `publication.json` (it was `kit`).
- On a page with little text the footer sits at the bottom of the window, not halfway up.
- Readers can set the text size (four steps) and the colours (System, the preset, which follows their device; Light;
  Dark) with the "Aa" button in the bar. The browser remembers the choice. Without JavaScript the button is hidden,
  and browser zoom and the device's own settings still work.

## 1.1.0

20 November 2026

- A list counts as one paragraph, with one number and one link, however many items it has (contract 0.4). Before,
  every item had its own number.
- Frozen versions keep the numbers they were frozen with: each is numbered by the rule of the contract it was frozen
  under, so version 0.1 still numbers each list item.

## 1.0.0

20 November 2026. The first version since the static edition replaced Juncture as the book’s public site.

- The footer names the toolkit with its version: ‘built with every_trick_in_the_book 1.0.0 by SJMcH’. The name links
  to the toolkit’s home, the number to this list. The book’s version line above it no longer mentions the toolkit, so
  the two numbers are not confused.
- Screen readers still hear ‘every trick in the book’, and copying the footer no longer copies the name twice.
- The versions page says that the site’s design comes from the toolkit, whose versions are numbered separately.
- The toolkit’s folder is called every_trick (it was kit), and its `package.json` names it every_trick_in_the_book
  (it was hear-here-static-twin).

## 0.5.0

20 November 2026

- The stylesheet and scripts are linked with a fingerprint of their content (`site.css?v=…`), so a reader whose browser
  kept an older copy still gets the styles a new page needs. Before, a margin note could show without its styles.

## 0.4.0

20 November 2026

- Margin notes. A note written right after its paragraph (`::: {.margin}`) is numbered per page (n1, n2 …) with a
  matching mark in the text, and the two highlight together. On wide screens the note sits in the right-hand margin,
  level with its paragraph; on phones, without JavaScript and for screen readers it follows its paragraph. Paragraph
  numbers ignore the margin.

## 0.3.0

20 November 2026. Version 0.1 of *Hear Here: Spatial Practices*, its first public version, was released with it.

- Paragraph numbers. Every reading paragraph is numbered by a rule that depends only on the text, written down in
  `CONTRACT.md`, so the numbers stay the same whenever the site is rebuilt. The ¶ beside a number copies a link to
  the paragraph. Page metadata, labels and stage directions are not numbered.
- Poems. A poem counts as one paragraph of its chapter and numbers its own lines, so poetry can be cited by line.
- Versions. A book’s frozen versions are built from their Git tags, each at its own address. A notice on every page
  of a frozen version leads to the same passage in the newer text, and the versions page lists every version. A
  review version can be opened for annotation in a private Hypothesis group.
- The version stamp. Every footer, `page.json`, `publication.json` and Markdown view gives the book’s version and
  the toolkit’s.
- The name every_trick_in_the_book, a credit in every footer, and the licences (`LICENSE`, `NOTICE.md`).

The number 0.3.0 was set when paragraph numbers and versions were added; the changes that followed on the same day,
up to the release of the book’s version 0.1, kept it.

## Before 0.3.0

19–20 November 2026. The toolkit was built as the static twin of *Hear Here*, while Juncture still served the
public site. These versions were not numbered.

- Pandoc, Lua filters and one template turn the book’s Markdown into a static site, with resized images, zoom tiles,
  a Markdown view of every page, and `page.json` and `publication.json` for other frontends.
- The house citation style, tested against the style guide’s examples. Citations are linked to the bibliography and
  show their reference in a popup.
