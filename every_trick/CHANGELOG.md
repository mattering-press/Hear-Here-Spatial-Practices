# every_trick_in_the_book: what’s new

Every version of every_trick_in_the_book, newest first, with what changed in it.

The toolkit’s versions are numbered separately from the versions of the books it makes. A book’s versions follow its
text, such as version 0.1 of *Hear Here: Spatial Practices*, its first public version. The toolkit’s versions follow
the design and what the pages do, and are always written with the toolkit’s name, such as every_trick_in_the_book 1.0.0.
Every version of a book is shown with the current version of the toolkit, so a frozen version keeps its text but
takes on the current design.

The middle number goes up when something readers see or use changes, the last one for fixes that change nothing a
reader sees. How to add a version: ‘Versions of the book and of every_trick’ in `DEVELOPMENT.md`.

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
