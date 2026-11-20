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
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

local audio, video = {}, {}

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

local function audio_player(div)
  local link = first_link(div)
  local title = pandoc.utils.stringify(link.content)
  local id = 'audio-' .. (#audio + 1)
  audio[#audio + 1] = { url = link.target, title = title, element = id }
  local url = lib.esc(link.target)
  return pandoc.RawBlock('html', table.concat {
    '<audio id="', id, '" controls preload="none" aria-label="', lib.esc(title), '">\n',
    '<source src="', url, '" type="audio/mpeg">\n',
    '<p>Your browser does not support HTML5 audio. <a href="', url, '">Download the audio</a>.</p>\n</audio>' })
end

local function figure(div, class)
  local link, rest = first_link(div)
  local a = div.attributes
  local title = pandoc.utils.stringify(link.content)
  local url, style = link.target, {}
  local k = class == 'video' and kind(url) or (url:match('%.pdf$') and 'pdf' or 'embed')
  local caption = #rest > 0 and html(rest) or ('<a href="' .. lib.esc(link.target) .. '">' .. html { pandoc.Plain(link.content) } .. '</a>')
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
    '<figure class="', figure_class, '"', #style > 0 and (' style="' .. lib.esc(table.concat(style, '; ')) .. '"') or '', '>\n',
    inner, '\n<figcaption>', caption, '</figcaption>\n</figure>' })
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
  return doc
end
