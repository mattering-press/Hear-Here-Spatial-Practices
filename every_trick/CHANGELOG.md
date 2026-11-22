# every_trick_in_the_book: what’s new

Every version of every_trick_in_the_book, newest first, with what changed in it.

The toolkit’s versions are numbered separately from the versions of the books it makes. A book’s versions follow its
text, such as version 0.1 of *Hear Here: Spatial Practices*, its first public version. The toolkit’s versions follow
the design and what the pages do, and are always written with the toolkit’s name, such as every_trick_in_the_book 1.0.0.
Every version of a book is shown with the current version of the toolkit, so a frozen version keeps its text but
takes on the current design.

The middle number goes up when something readers see or use changes, the last one for fixes that change nothing a
reader sees. How to add a version: ‘Versions of the book and of every_trick’ in `DEVELOPMENT.md`.

## 1.9.0

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
