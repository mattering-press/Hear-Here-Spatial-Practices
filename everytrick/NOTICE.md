# everytrickinthebook

everytrickinthebook by SJMcH, a Mattering toolkit: every trick in the book for making books.

Its home is https://github.com/everytrick/everytrickinthebook. Its versions, and what changed in each, are listed in
`CHANGELOG.md`.

Copyright © 2026 Studio Julien McHardy (SJMcH). Made for Mattering Press, its first publisher.

The name is written as one word in lower case, `everytrickinthebook`, and `everytrick` for short in running text,
so that it reads the same in prose, in web addresses and on GitHub: `everytrick.org` (with `everytrickinthebook.org`
leading to it) and `github.com/everytrick`. Until version 1.14.0 it was written `every_trick_in_the_book`. Its parts
are named like folders: `everytrick/markdown`, `everytrick/conventions`, `everytrick/plain` (the open default style)
and `sjmch/styles` (the designed styles).

## Licences

- **The toolkit** (the build, filters, scripts, template and `everytrick/plain`, the default style in this folder):
  Mozilla Public License 2.0, see `LICENSE`. You may use, change and share it, also commercially; changes to these
  files must be shared under the same licence, and this notice must be kept.
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
  separately): free for non-commercial use, with a paid licence for commercial use.
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

## Contributing

To keep the option of offering commercial licences, contributions to the toolkit and the styles are accepted under
a short contributor agreement with Studio Julien McHardy. Please get in touch before sending changes.

"everytrickinthebook", "everytrick", its former name "every_trick_in_the_book" and "SJMcH" are names of Studio
Julien McHardy; the licences above do not grant use of these names for other products.
