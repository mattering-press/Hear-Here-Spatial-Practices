-- The page's media items, in page order, for the media register (register.mjs; "Plan: media register, item pages and
-- the Media Index" in DEVELOPMENT.md). An item is a picture (zoomable or animated, in a gallery or not), an audio
-- player, a video or an embed (an archive.org film or zine, the BBC player, a PDF). Card thumbnails, the pictures behind
-- page titles and video posters are not items. It runs on the converted page (convert.mjs: the .twin-* divs, and any
-- .video, .embed or .audio div written in Pandoc's syntax) at the start of stage 1, and on its own in
-- scripts/number-media.mjs, and leaves the page as it is. The list goes as JSON to the file that -M items-out names:
--   [{ kind, source, src, caption, alt, title, rotation, poster, block }]
-- kind     see, listen, watch or read: the word of the item's address (/see/<name>/)
-- source   what the register calls the item (lib.media_source): a repository path, or a normalised address
-- src      the address as the page gives it
-- caption  the caption, plain text ("" when the page gives none); alt: a picture's alt text; title: the title the page
--          gives a player or an embed (the audio's title, an iframe's title), "" when it gives none
-- rotation a picture's turn (convert.mjs); poster: a video file's poster picture (a repository path), or nil
-- block    the item alone, as Markdown in the converted page's form, for its item page: not floated, a picture .wide
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

local items = {}

local function plain(blocks) return (pandoc.utils.stringify(pandoc.Blocks(blocks)):gsub('%s+', ' '):gsub('^ ', ''):gsub(' $', '')) end

-- An embed is a document to read when it is a PDF or one of archive.org's book readers (the zines, in "2up" or "1up"
-- mode); anything else embedded (an archive.org film, the BBC's player) is watched.
local function embed_kind(url)
  if url:match('%.[Pp][Dd][Ff]$') or url:match('%.[Pp][Dd][Ff][?#]') then return 'read' end
  if url:match('archive%.org/') and url:match('/mode/%d+up') then return 'read' end
  return 'watch'
end

-- the item alone, for its item page: no side or share of the column; a picture as wide as the page's opening
local function block_of(div, picture)
  local copy = div:clone()
  copy.attributes.side, copy.attributes.width = nil, nil
  if picture then copy.attributes.side = 'wide' end
  copy.classes = copy.classes:filter(function(c) return c ~= 'left' and c ~= 'right' end)
  return pandoc.write(pandoc.Pandoc({ copy }), 'markdown-smart', { wrap_text = 'wrap-none' })
end

local function add(kind, src, fields, div, picture)
  -- a picture's src is already a repository path (convert.mjs); other addresses are links as the page has them
  local source = picture and src or lib.media_source(src, 'repo')
  local item = { kind = kind, src = src, source = source, caption = fields.caption or '', alt = fields.alt or '',
    title = fields.title or '', rotation = fields.rotation or '0', poster = div.attributes.poster, block = block_of(div, picture) }
  items[#items + 1] = item
end

-- A .video, .embed or .audio div in Pandoc's syntax: its first link is the item, the rest its caption.
local function plain_div(div, kind)
  local first = div.content[1]
  local link = first and (first.t == 'Para' or first.t == 'Plain') and first.content[1]
  if not link or link.t ~= 'Link' then return end
  local rest = { table.unpack(div.content, 2) }
  local k = kind == 'embed' and embed_kind(link.target) or kind == 'video' and 'watch' or 'listen'
  add(k, link.target, { caption = plain(rest), title = pandoc.utils.stringify(link.content) }, div, false)
end

function Pandoc(doc)
  lib.init(doc.meta)
  doc.blocks:walk {
    traverse = 'topdown',
    Div = function(div)
      local a, c = div.attributes, div.classes
      if c:includes('twin-figure') then
        add('see', a.src, { caption = a.caption, alt = a.alt, rotation = a.rotation }, div, true)
      elseif c:includes('twin-audio') then
        add('listen', a.src, { title = a.title }, div, false)
      elseif c:includes('twin-video') then
        add('watch', a.src, { caption = plain(div.content), title = a.title }, div, false)
      elseif c:includes('twin-embed') then
        add(embed_kind(a.src), a.src, { caption = plain(div.content), title = a.title }, div, false)
      elseif c:includes('video') then plain_div(div, 'video')
      elseif c:includes('embed') then plain_div(div, 'embed')
      elseif c:includes('audio') then plain_div(div, 'audio')
      end
    end,
  }
  local out = pandoc.utils.stringify(doc.meta['items-out'] or '')
  if out ~= '' then
    local f = assert(io.open(out, 'w'))
    f:write(#items > 0 and pandoc.json.encode(items) or '[]')
    f:close()
  end
  return nil
end
