# everytrickinthebook

everytrickinthebook by SJMcH, a Mattering toolkit: every trick in the book for making books.

Its home is https://everytrick.org/, its code https://github.com/everytrick/everytrickinthebook. Its versions, and what changed in each, are listed in
`CHANGELOG.md`.

everytrickinthebook was founded by Julien McHardy (Studio Julien McHardy, SJMcH), and made for
Mattering Press, its first publisher.

Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. Should the studio cease to
exist, its rights and its role as maintainer pass to Julien McHardy. Contributors keep the copyright of what they
contribute; they are named in `CONTRIBUTORS.md` and on https://everytrick.org/.

The name is written as one word in lower case, `everytrickinthebook`, and `everytrick` for short in running text,
so that it reads the same in prose, in web addresses and on GitHub: `everytrick.org` (with `everytrickinthebook.org`
leading to it) and `github.com/everytrick`. Until version 1.14.0 it was written `every_trick_in_the_book`. Its parts
are named like folders: `everytrick/markdown`, `everytrick/conventions`, `everytrick/plain` (the open default style)
and `sjmch/styles` (the designed styles).

## Licences

- **The toolkit** (the build, filters, scripts, template and `everytrick/plain`, the default style in this folder):
  GNU Affero General Public License, version 3 or any later version (AGPL-3.0-or-later), see `LICENSE`, with the
  two additional terms under "Additional terms for the toolkit" below. You may use, change and share it, also
  commercially. If you share it, publish sites built with a changed toolkit, or offer it to others as a service,
  you must make your version of the toolkit available under the same licence, and keep its credit.
  The versions published between 23 and 27 November 2026 (up to 1.25.0) were offered under the Mozilla Public
  License 2.0; everything since is under the AGPL alone.
- **`everytrick/markdown`, `everytrick/conventions` and the documentation** (`CONTRACT.md`, `CHANGELOG.md` and
  the writing conventions): Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
- **The house citation style** (`csl/mattering-press.csl`): CC BY-SA 3.0, as required by the Citation Style
  Language styles it is adapted from; see the file's header.
- **The other citation styles** in `csl/`, with which the References page offers each reference to copy: `apa.csl`
  (APA, 7th edition), `chicago-author-date.csl` (Chicago, 18th edition, author-date),
  `modern-language-association.csl` (MLA, 9th edition) and `harvard-cite-them-right.csl` (Harvard, Cite Them Right,
  12th edition). They are unchanged copies of the styles of the official Citation Style Language repository,
  https://github.com/citation-style-language/styles, taken at commit `edc263cf0e4b09ed184f8a9e1e1de23deb2a7a9e`
  (23 November 2026), and are licensed by their authors, who are named in each file's header, under the Creative
  Commons Attribution-ShareAlike 3.0 Unported licence (CC BY-SA 3.0), https://creativecommons.org/licenses/by-sa/3.0/.
  The build switches off their year letters and repeated-author dashes in a working copy; the files stay as they are.
- **`sjmch/styles`** (the designed reading, collage and other styles by Studio Julien McHardy, published
  separately): all rights reserved; licensed by arrangement with the studio.
- **Books made with the toolkit** keep their own licence; *Hear Here: Spatial Practices* is published by
  Mattering Press under CC BY 4.0.
- **Pandoc**, which the build runs as a separate program, is under its own licence (GPL).
- **Pagefind**, which the build runs to make the search index and whose search script the site serves
  (`pagefind/`), is under the MIT licence; its licence is copied next to the index.
- **OpenSeadragon**, the zoom viewer whose script the site serves (`assets/osd/`), is under the BSD 3-Clause licence;
  its licence is copied next to it.
- **Roboto**, the typeface the site serves (`assets/fonts/`, from the Fontsource package), is under the SIL Open Font
  License 1.1; its licence is copied next to it.

The colophon of each edition (about/colophon/) names these, with their versions and licences.

## Additional terms for the toolkit

These two terms are added to the AGPL under its section 7.

1. **What stays yours (an additional permission).** A book, a press's configuration and a press's styling are not
   part of the toolkit, and the AGPL does not reach them merely because the toolkit builds or shows them:
   - a book's text, media, data and settings, and the pages the toolkit makes from them, apart from the toolkit's
     own files (its scripts, style sheet and template) that are copied into a site;
   - style sheets, fonts, logos and images that a press or a book adds, in files of its own, to give its sites
     their look.

   Changes to the toolkit's own files, its default style sheet included, are changes to the toolkit and are shared
   under the AGPL.
2. **The credit stays (section 7(b)).** Keep this notice, `CONTRIBUTORS.md` and the licence line at the top of each
   file in every copy of the toolkit. Every site made with the toolkit, changed or not, keeps the credit the build
   writes: the name everytrickinthebook, "by SJMcH", linked to https://everytrick.org/, in the site's footer or
   colophon or a place as easy to find. A changed version says that it is changed.

## Names

"everytrickinthebook", "everytrick", its former name "every_trick_in_the_book" and "SJMcH" are names of Studio
Julien McHardy; the licences above do not grant use of these names for other products (AGPL section 7(e)). A changed
version that is published as a toolkit of its own takes another name, and says that it is based on
everytrickinthebook.

## Contributing

Other presses are welcome to use the toolkit, to adapt it and to send their improvements and new parts back. How
that works, and the sign-off each contribution carries, is in `CONTRIBUTING.md`. Everyone who contributes is named
in `CONTRIBUTORS.md` and on https://everytrick.org/.
