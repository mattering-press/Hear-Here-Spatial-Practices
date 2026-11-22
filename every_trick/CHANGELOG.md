# every_trick_in_the_book: what’s new

Every version of every_trick_in_the_book, newest first, with what changed in it.

The toolkit’s versions are numbered separately from the versions of the books it makes. A book’s versions follow its
text, such as version 0.1 of *Hear Here: Spatial Practices*, its first public version. The toolkit’s versions follow
the design and what the pages do, and are always written with the toolkit’s name, such as every_trick_in_the_book 1.0.0.
Every version of a book is shown with the current version of the toolkit, so a frozen version keeps its text but
takes on the current design.

The middle number goes up when something readers see or use changes, the last one for fixes that change nothing a
reader sees. How to add a version: ‘Versions of the book and of every_trick’ in `DEVELOPMENT.md`.

## 1.7.0

22 November 2026. Search.

- Every page has a magnifier in its header, beside "Aa", that leads to the search page. It lists the pages the words
  are found on, best first, and on each page up to three paragraphs with their number (para. 12) and the words
  around the ones found, marked. Each links straight to its paragraph.
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
