# Page data, contract 0.1

The build writes JSON beside the HTML so that other frontends (the collage index, a Tapestry export) can
read the book without parsing HTML: `publication.json` at the site root and a `page.json` beside every
`index.html`. `contract` gives the version of this format. Later 0.x versions may add fields; a field
will not change its meaning without a new version.

URLs that stay inside the site are relative to the site root, the folder that holds `publication.json`
(resolve them with `new URL(url, siteRoot)`), even inside a `page.json`. Other URLs are absolute.
Text values are plain text, not HTML.

## publication.json

| field | value |
|---|---|
| `contract` | `"0.1"` |
| `title`, `subtitle` | from the header of the home page (`README.md`) |
| `creators` | list of names |
| `publisher` | name |
| `language` | language code, `"en"` |
| `url` | where the site is published (the `siteUrl` setting in `build.mjs`); the Markdown view `publication.md` uses it for its absolute URLs |
| `markdown` | `"publication.md"` |
| `readingOrder` | every page once, as `{ id, url, title }`: the home page; then each page in the home page's menu, followed by the pages its cards lead to (depth first); then any other page, alphabetically |

## page.json

| field | value |
|---|---|
| `contract` | `"0.1"` |
| `id` | the page's Markdown file, e.g. `"essays/walk.md"`; `"README.md"` for the home page |
| `url` | e.g. `"essays/walk/"`; `"./"` for the home page |
| `title`, `subtitle` | from the page's header; `subtitle` is `null` when there is none |
| `markdown` | the page's Markdown view, e.g. `"essays/walk/index.md"` |
| `headings` | `{ level, text, id }` in page order; `level` is the HTML level (2 to 6), `id` the fragment for `url#id` |
| `figures` | `{ image, width, height, tiles, alt, caption }`: `image` is 1600 px on the long edge, `width` and `height` are its size, `tiles` is a IIIF `info.json` or `null`; `alt` and `caption` are `""` when missing |
| `audio` | `{ url, title }`; `url` is the MP3 on GitHub, which supports range requests |
| `video` | `{ url, title, kind }`; `kind` is `youtube`, `vimeo`, `file` (a video file in the site) or `embed` (any other embedded page, such as the Internet Archive or the BBC); `url` is the address given in the Markdown |
| `links` | links in the page's text (not its menu or footer) to other pages, as `{ id, url, text }`, each target once, in order of first appearance |

## Zoom tiles

`tiles` points at a static IIIF Image API 2 level-0 `info.json` with 512 px JPEG tiles. Its `@id` is
`"."` because the build cannot know where the site will be hosted: before handing it to a viewer, set it
to the absolute URL of the folder that holds `info.json`, without a trailing slash, as `assets/zoom.js`
does.

## Markdown view

Every `index.html` has an `index.md` beside it, and the site root has `publication.md` with all pages in
reading order. They are written by the build from the book's source, in Pandoc Markdown with a YAML
front matter (`title`, `subtitle`, `lang`), and contain no Juncture syntax. `index.md` uses URLs relative to
itself; `publication.md` uses absolute URLs and starts each page with its title as a level-1 heading.
Media are written as:

- zoomable images: `![caption](images/x-1600.jpg){.zoom .right width="75%" alt="…"}` (`.left` or `.right` optional)
- `::: {.video}` and `::: {.embed}`: a div that starts with an ordinary link to the video or embedded page (a
  video file, a PDF); any text after the link is the caption
- `::: {.audio}`: a div with a link to the MP3
- `::: {.gallery}`: a div of zoomable images; `::: {.cards}`: a list of links, each with a picture and a title
- transcript timecodes such as `[00:10:13]` stay as plain text

The only raw HTML that remains is the third-party smartframe script embeds in `essays/spotting_colours.md`.
