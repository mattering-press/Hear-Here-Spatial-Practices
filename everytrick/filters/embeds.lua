-- SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
-- Stage 2, audio, video and other embeds. In the page's Markdown each is a div holding an ordinary link
-- (a caption may follow it):
--   ::: {.audio}     a link to an MP3: becomes an <audio> player with native controls
--   ::: {.video}     a link to a YouTube or Vimeo page, or to a video file: becomes a <figure> with an
--                    <iframe> (or a <video>)
--   ::: {.embed}     a link to a page to embed (archive.org, …): an <iframe> in a <figure>; a link to a PDF
--                    gets an <object> that shows the PDF where the browser can
-- Every iframe gets a title (the link text). The figure's caption is the text that follows the link, or
-- the link itself, which still works when the embed is blocked. MP3s are not copied into the site: their
-- links point at raw.githubusercontent.com, which answers range requests, so the player can seek.
-- Raw HTML that is left (smartframe script embeds) passes through unchanged.
-- Each player, video and embed is a media item (register.mjs): its anchor (item-37, or item-<name> before it has a
-- number) is the id of its figure or player, and its caption line starts with its number pill and ends with its credit
-- (lib.caption_line). A video or embed whose page gives it no caption shows the register's title, where it has one, as
-- the link's text and the iframe's title. An audio player has a small caption line of its own below it, with the pill
-- and the recording's title:
--   <p class="media-caption"><a class="item-number" href="../../listen/podcast-aya-nassar/" aria-label="Item 29">29</a> Hear Here Podcast: Aya Nassar</p>
-- An embed that is a document whose pages the build shows (documents.mjs: a PDF of the repository, a zine copied from
-- archive.org) is not embedded: on an essay page it is a figure with its cover, and its caption line has Text and its
-- download (assets/zoom.js adds Open, which opens the viewer); on its item page, /read/<name>/, it is the row of its
-- pages, which zoom.js turns into the viewer (see document_figure below).
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

local audio, video, items = {}, {}, {}

-- the media item a link is, its anchor on this page, and its entry for page.json
local function item_of(url)
  local source = lib.media_source(url, 'site')
  local item = lib.item(source)
  if not item then return nil, nil end
  local anchor = lib.anchor(item)
  items[#items + 1] = { anchor = anchor, source = source, label = item.label, kind = item.kind, name = item.name, url = item.url }
  return item, anchor
end
local function id_attr(anchor) return anchor and (' id="' .. anchor .. '"') or '' end

local function html(blocks)  -- blocks -> HTML, with paragraphs as plain text
  local plain = {}
  for _, b in ipairs(blocks) do plain[#plain + 1] = b.t == 'Para' and pandoc.Plain(b.content) or b end
  return (pandoc.write(pandoc.Pandoc(plain), 'html'):gsub('\n', ' '):gsub('%s+$', ''))
end

local function first_link(div)
  local first = div.content[1]
  local link = first and (first.t == 'Para' or first.t == 'Plain') and first.content[1]
  if not link or link.t ~= 'Link' then
    error('a ' .. div.classes[1] .. ' block must start with a link (' .. lib.page .. ')')
  end
  local rest = { table.unpack(div.content, 2) }
  return link, rest
end

local function site_relative(url)  -- for page.json: URLs inside the site are relative to the site root
  return url:sub(1, #lib.root) == lib.root and url:sub(#lib.root + 1) or url
end

local function kind(url)
  if url:match('^https?://[^/]*youtube') then return 'youtube' end
  if url:match('^https?://[^/]*vimeo%.com/') then return 'vimeo' end
  if url:match('%.mp4$') or url:match('%.webm$') or url:match('%.m4v$') then return 'file' end
  return 'embed'
end

local function player(link)
  local url = link.target
  local yt, vimeo, hash = url:match('youtube%.com/watch%?v=([%w_-]+)'), url:match('vimeo%.com/(%d+)'), url:match('vimeo%.com/%d+/(%w+)')
  if yt then return 'https://www.youtube-nocookie.com/embed/' .. yt end
  if vimeo then return 'https://player.vimeo.com/video/' .. vimeo .. (hash and ('?h=' .. hash) or '') end
  return url
end

-- A podcast player: the browser's own <audio> with its controls, in a <div class="player"> that assets/player.js
-- turns into the site's player (and the bar that docks at the foot of the window). data-duration, in seconds, is the
-- recording's length, read from the file by build.mjs, so that the player can show it before anything is loaded.
local function audio_player(div)
  local link = first_link(div)
  local title = pandoc.utils.stringify(link.content)
  local id = 'audio-' .. (#audio + 1)
  local info = lib.audio(link.target)
  local duration = info and tonumber(info.duration)
  audio[#audio + 1] = { url = link.target, title = title, element = id }
  local item, anchor = item_of(link.target)
  local url = lib.esc(link.target)
  return pandoc.RawBlock('html', table.concat {
    '<div class="player"', id_attr(anchor), ' data-for="', id, '"', duration and string.format(' data-duration="%.1f"', duration) or '', '>\n',
    '<audio id="', id, '" controls preload="none" aria-label="', lib.esc(title), '">\n',
    '<source src="', url, '" type="audio/mpeg">\n',
    '<p>Your browser does not support HTML5 audio. <a href="', url, '">Download the audio</a>.</p>\n</audio>\n</div>',
    item and ('\n<p class="media-caption">' .. lib.caption_line(item, lib.esc(title)) .. '</p>') or '' })
end

-- ---- Documents ----------------------------------------------------------------------------------------------------
-- the icons of the caption line's buttons, drawn like assets/zoom.js's
local ICONS = {
  text = '<path d="M3 4h10M3 8h10M3 12h6.5"/>',
  download = '<path d="M8 2.5v8M4.75 7.25 8 10.5l3.25-3.25M3 13.5h10"/>',
  external = '<path d="M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v4h-9v-9h4"/>',
}
local function icon(name) return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' .. ICONS[name] .. '</svg>' end
local function num(n) return (string.format('%.4f', n):gsub('0+$', ''):gsub('%.$', '')) end
local function srcset_of(page)
  local list = {}
  for _, c in ipairs(page.srcset) do list[#list + 1] = lib.join(lib.root, c.url) .. ' ' .. c.width .. 'w' end
  return lib.esc(table.concat(list, ', '))
end

-- On an essay page: the cover, which leads to the document's page (and opens the viewer, with JavaScript), and the caption
-- line with Text and the download (the PDF, or the original on archive.org); zoom.js puts Open before them. Search leaves
-- the buttons out (data-pagefind-ignore): their words are not the page's text.
--   <figure id="item-64" class="document" style="--ratio: 0.7073" data-document="../../read/walking-sitting-sketching/document.json">
--     <a class="figure-picture document__cover" href="../../read/walking-sitting-sketching/"><img … alt="Cover of …"></a>
--     <figcaption><a class="item-number" …>64</a> … <span class="document__actions" data-pagefind-ignore><a class="figure-button document__text"
--       href="../../read/walking-sitting-sketching/#text">Text</a> <a class="figure-button document__download" href="…" download>PDF, 0.9 MB</a></span></figcaption>
--   </figure>
-- On its item page: the row of its pages (each <li id="page=3">, so that #page=3 finds it without JavaScript), which
-- zoom.js turns into the viewer, and the caption line; the text and the download follow (build.mjs, media-pages.mjs).
--   <figure id="item-64" class="document is-page" style="--ratio: 0.7073"><div class="document-viewer" data-document="…">
--     <ol class="document-strip" aria-label="The 21 pages" tabindex="0"><li id="page=1"><img … alt="Page 1"></li> …</ol>
--   </div><figcaption>…</figcaption></figure>
local function document_figure(item, anchor, doc, caption)
  local cover = doc.pages[1]
  local style = ' style="--ratio: ' .. num(cover.width / cover.height) .. '"'
  local page, json, title = lib.esc(lib.join(lib.root, doc.page)), lib.esc(lib.join(lib.root, doc.json)), lib.esc(doc.title)
  if lib.item_page then
    local pages = {}
    for i, p in ipairs(doc.pages) do
      pages[#pages + 1] = '<li id="page=' .. i .. '"><img src="' .. lib.esc(lib.join(lib.root, p.srcset[1].url)) .. '" srcset="' .. srcset_of(p) ..
        '" sizes="(max-width: 40rem) 80vw, 24rem" width="' .. p.width .. '" height="' .. p.height .. '" alt="Page ' .. i .. '"' .. (i > 3 and ' loading="lazy"' or '') .. '></li>'
    end
    return pandoc.RawBlock('html', table.concat {
      '<figure', id_attr(anchor), ' class="document is-page"', style, '>\n',
      '<div class="document-viewer" data-document="', json, '">\n<ol class="document-strip" aria-label="The ', #doc.pages, ' pages" tabindex="0">\n',
      table.concat(pages, '\n'), '\n</ol>\n</div>\n',
      '<figcaption>', lib.caption_line(item, caption), '</figcaption>\n</figure>' })
  end
  local dl = doc.download
  local download = dl.external
    and ('<a class="figure-button document__download" href="' .. lib.esc(dl.url) .. '">' .. icon('external') .. lib.esc(dl.label) .. '<span class="visually-hidden">: the original</span></a>')
    or ('<a class="figure-button document__download" href="' .. lib.esc(lib.join(lib.root, dl.url)) .. '" download>' .. icon('download') .. '<span class="visually-hidden">Download the </span>' ..
      lib.esc(dl.label) .. ', ' .. lib.esc(dl.size) .. '</a>')
  local text = '<a class="figure-button document__text" href="' .. page .. '#text">' .. icon('text') .. 'Text<span class="visually-hidden">: ' .. title .. '</span></a>'
  local img = cover.srcset[#cover.srcset]
  return pandoc.RawBlock('html', table.concat {
    '<figure', id_attr(anchor), ' class="document"', style, ' data-document="', json, '">\n',
    '<a class="figure-picture document__cover" href="', page, '"><img src="', lib.esc(lib.join(lib.root, img.url)), '" srcset="', srcset_of(cover), '" sizes="20rem" width="',
    cover.width, '" height="', cover.height, '" alt="Cover of ', title, '" loading="lazy"></a>\n',
    '<figcaption>', lib.caption_line(item, caption), ' <span class="document__actions" data-pagefind-ignore>', text, ' ', download, '</span></figcaption>\n</figure>' })
end

local function figure(div, class)
  local link, rest = first_link(div)
  local a = div.attributes
  local title = pandoc.utils.stringify(link.content)
  local url, style = link.target, {}
  local k = class == 'video' and kind(url) or (url:match('%.pdf$') and 'pdf' or 'embed')
  local item, anchor = item_of(url)
  local doc = class == 'embed' and item and item.kind == 'read' and lib.document(item.name)
  if doc then return document_figure(item, anchor, doc, #rest > 0 and html(rest) or lib.esc(doc.title)) end
  local named = #rest == 0 and item and (item.title or '') ~= ''   -- no caption on the page: the register's title
  if named then title = item.title end
  local caption = #rest > 0 and html(rest) or ('<a href="' .. lib.esc(link.target) .. '">' .. (named and lib.esc(title) or html { pandoc.Plain(link.content) }) .. '</a>')
  if a.width and not a.height then style[#style + 1] = '--figure-width: ' .. a.width end
  local figure_class = (class == 'video' and 'video-embed' or k == 'pdf' and 'pdf-embed' or 'embed')
  for _, c in ipairs(div.classes) do
    if c ~= class then figure_class = figure_class .. ' ' .. c end
  end
  local inner
  if k == 'file' then
    local poster = a.poster and (' poster="' .. lib.esc(a.poster) .. '"') or ''
    inner = '<video controls playsinline preload="metadata" src="' .. lib.esc(url) .. '"' .. poster .. ' title="' .. lib.esc(title) .. '"></video>'
  elseif k == 'pdf' then
    inner = '<object data="' .. lib.esc(url) .. '" type="application/pdf" title="' .. lib.esc(title) .. '">' ..
      '<p class="pdf-fallback"><a href="' .. lib.esc(url) .. '">Open “' .. lib.esc(title) .. '” (PDF)</a></p></object>'
  else
    if (a.width or ''):match('^%d+$') and (a.height or ''):match('^%d+$') then
      style[#style + 1] = '--embed-ratio: ' .. a.width .. ' / ' .. a.height
    elseif a.height then
      style[#style + 1] = '--embed-height: ' .. a.height .. (a.height:match('^%d+$') and 'px' or '')
    end
    inner = '<iframe src="' .. lib.esc(player(link)) .. '" title="' .. lib.esc(title) .. '" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>'
  end
  if k ~= 'pdf' then video[#video + 1] = { url = site_relative(url), title = title, kind = k } end
  return pandoc.RawBlock('html', table.concat {
    '<figure', id_attr(anchor), ' class="', figure_class, '"', #style > 0 and (' style="' .. lib.esc(table.concat(style, '; ')) .. '"') or '', '>\n',
    inner, '\n<figcaption>', lib.caption_line(item, caption), '</figcaption>\n</figure>' })
end

function Pandoc(doc)
  lib.init(doc.meta)
  -- One top-down pass, so that page.json lists audio and video in the order they appear on the page.
  doc.blocks = doc.blocks:walk {
    traverse = 'topdown',
    Div = function(div)
      if div.classes:includes('audio') then return audio_player(div), false end
      if div.classes:includes('video') then return figure(div, 'video'), false end
      if div.classes:includes('embed') then return figure(div, 'embed'), false end
    end,
  }
  lib.add(doc, 'audio', audio)
  lib.add(doc, 'video', video)
  lib.add(doc, 'items', items)
  return doc
end
