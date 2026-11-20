-- Stage 1 of every page: the converted Juncture Markdown (see convert.mjs) -> the clean Pandoc Markdown of the
-- page's Markdown view. It reads the twin-* divs and writes the plain forms:
--   ![caption](images/x-1600.jpg){.zoom .right width="75%" alt="…"}      a zoomable image
--   ::: {.video} / ::: {.embed}   a div holding an ordinary link to the video or embedded page
--   ::: {.audio}                  a div holding a link to the MP3
--   ::: {.cards}                  a list of links, each with a picture and a title
-- URLs are rewritten to the site's: relative to the page, or (publication.md) absolute, depending on -M root.
-- The headings of the text start at level 2. With -M title-heading=true (publication.md, which holds every page)
-- the page starts with its title as a level-1 heading, and its subtitle in italics; index.md has the title in
-- its front matter instead, with the version stamp (version: id, label, date, status; kit). Heading ids are left
-- out (Pandoc makes them again when it reads the Markdown).
-- Stage 2 (figures, embeds, cards, transcript and the other filters) turns this Markdown into HTML.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

local function class_list(...)
  local list = {}
  for _, c in ipairs { ... } do if c then list[#list + 1] = c end end
  return list
end

-- A zoomable image: its 1600 px copy, with the caption as the image text.
local function figure(div)
  local a = div.attributes
  local img = lib.image('figure', a.src, a.rotation)
  local attrs = { { 'alt', a.alt or '' } }
  if a.width then table.insert(attrs, 1, { 'width', a.width }) end
  return pandoc.Para { pandoc.Image(lib.words(a.caption), lib.site_url(img.url), '', pandoc.Attr('', class_list('zoom', a.side), attrs)) }
end

local function target(a) return (lib.fix_link(a.src)) or a.src end

-- .twin-video, .twin-embed: the first paragraph is the link, the rest is the caption.
local function embed(div, class, default_title)
  local a = div.attributes
  local blocks = { pandoc.Para { pandoc.Link(lib.words(a.title or default_title), target(a)) } }
  for _, b in ipairs(div.content) do blocks[#blocks + 1] = b end
  local classes = class_list(class, a.side)
  for _, c in ipairs(div.classes) do
    if not c:match('^twin%-') then classes[#classes + 1] = c end
  end
  local attrs = {}
  for _, key in ipairs { 'width', 'height' } do if a[key] then attrs[#attrs + 1] = { key, a[key] } end end
  if a.poster then attrs[#attrs + 1] = { 'poster', lib.site_url(lib.image('poster', a.poster, 0).url) } end
  return pandoc.Div(blocks, pandoc.Attr('', classes, attrs))
end

local function host(url) return url:match('^https?://([^/:?#]+)') or 'another site' end

-- Cards: "# Contents {.cards}" with "## Title {href=…}" headings, each followed by one picture, becomes a
-- heading and a list of links that each hold the picture and the title.
local function only_image(block)
  if block.t ~= 'Para' and block.t ~= 'Plain' then return nil end
  local content = block.content:filter(function(el) return el.t ~= 'Space' and el.t ~= 'SoftBreak' end)
  return #content == 1 and content[1].t == 'Image' and content[1] or nil
end

local function ignored(block)
  io.stderr:write('warning ' .. lib.page .. ': text in a card section is not shown: ' .. pandoc.utils.stringify(block):sub(1, 60) .. '\n')
end

local function cards(blocks)
  local out, i = {}, 1
  while i <= #blocks do
    local b = blocks[i]
    if b.t == 'Header' and b.classes:includes('cards') then
      if #b.content > 0 then
        b.classes = b.classes:filter(function(c) return c ~= 'cards' end)
        out[#out + 1] = b
      end
      local level, items = b.level, {}
      i = i + 1
      while i <= #blocks and not (blocks[i].t == 'Header' and blocks[i].level <= level) do
        local h = blocks[i]
        i = i + 1
        if h.t ~= 'Header' then ignored(h) else
          local img
          while i <= #blocks and blocks[i].t ~= 'Header' do
            local found = not img and only_image(blocks[i])
            if found then img = found else ignored(blocks[i]) end
            i = i + 1
          end
          local inner = pandoc.Inlines {}
          if img then
            local entry = lib.image('card', lib.resolve(img.src), 0)
            inner:insert(pandoc.Image(img.caption, lib.site_url(entry.url)))
            inner:insert(pandoc.Space())
          end
          inner:extend(h.content)
          local href = h.attributes.href
          items[#items + 1] = { pandoc.Plain { href and pandoc.Link(inner, href) or pandoc.Span(inner) } }
        end
      end
      out[#out + 1] = pandoc.Div({ pandoc.BulletList(items) }, pandoc.Attr('', { 'cards' }))
    else
      out[#out + 1] = b
      i = i + 1
    end
  end
  return out
end

-- Transcript timecodes stay visible as they are: [00:10:13], not \[00:10:13\].
local function timecode(para)
  local first = para.content[1]
  if first and first.t == 'Str' and first.text:match('^%[%d%d:%d%d:%d%d%]$') then
    para.content[1] = pandoc.RawInline('markdown', first.text)
    return para
  end
end

-- <sup>th</sup> arrives as raw inlines; make it Pandoc's superscript, which the Markdown writes as ^th^.
local function scripts(inlines)
  local out, i = pandoc.Inlines {}, 1
  while i <= #inlines do
    local el = inlines[i]
    local tag = el.t == 'RawInline' and el.format == 'html' and el.text:match('^<(su[pb])>$')
    local close
    if tag then
      for j = i + 1, #inlines do
        if inlines[j].t == 'RawInline' and inlines[j].text == '</' .. tag .. '>' then close = j break end
      end
    end
    if close then
      local content = pandoc.Inlines {}
      for j = i + 1, close - 1 do content:insert(inlines[j]) end
      out:insert((tag == 'sup' and pandoc.Superscript or pandoc.Subscript)(content))
      i = close + 1
    else
      out:insert(el)
      i = i + 1
    end
  end
  return out
end

local function plain_image(img)
  if img.classes:includes('zoom') or lib.generated[img.src] then return nil end
  local path = lib.resolve(img.src)
  if not path then return nil end
  img.src = lib.site_url(lib.image('inline', path, 0).url)
  return img
end

-- Raw HTML that stays (the smartframe script embeds): Pandoc reads "<script …></script><smartframe-embed …>…" as
-- a script block and a paragraph of raw inlines. Write them as one raw HTML block, as they were on one line.
local function raw_html(blocks)
  local out = {}
  for _, b in ipairs(blocks) do
    local only_raw = b.t == 'Para' and #b.content > 0 and not b.content:find_if(function(el) return el.t ~= 'RawInline' or el.format ~= 'html' end)
    if only_raw then b = pandoc.RawBlock('html', pandoc.utils.stringify(b.content:map(function(el) return pandoc.Str(el.text) end))) end
    local last = out[#out]
    if b.t == 'RawBlock' and b.format == 'html' and last and last.t == 'RawBlock' and last.format == 'html' and last.text:match('^<script') then
      out[#out] = pandoc.RawBlock('html', last.text .. b.text)
    else
      out[#out + 1] = b
    end
  end
  return out
end

function Pandoc(doc)
  lib.init(doc.meta)
  local blocks = cards(raw_html(doc.blocks))

  -- headings: the text's top level becomes 2, below the title
  local top = 7
  pandoc.Blocks(blocks):walk { Header = function(h) top = math.min(top, h.level) end }
  blocks = pandoc.Blocks(blocks):walk {
    Header = function(h)
      h.identifier = ''
      if top < 7 then h.level = math.max(2, math.min(6, h.level + 2 - top)) end
      return h
    end,
    Image = plain_image,
    Link = function(link)
      local url = lib.fix_link(link.target)
      if url then link.target = url; return link end
    end,
    Inlines = scripts,
    Para = timecode,
    Div = function(div)
      if div.classes:includes('twin-figure') then return figure(div) end
      if div.classes:includes('twin-gallery') then return pandoc.Div(div.content, pandoc.Attr('', { 'gallery' })) end
      if div.classes:includes('twin-video') then
        local src = div.attributes.src
        return embed(div, 'video', src:match('youtube%.com') and 'Video on YouTube' or src:match('vimeo%.com') and 'Video on Vimeo' or 'Video')
      end
      if div.classes:includes('twin-embed') then return embed(div, 'embed', 'Embedded content from ' .. host(div.attributes.src)) end
      if div.classes:includes('twin-audio') then
        return pandoc.Div({ pandoc.Para { pandoc.Link(lib.words(div.attributes.title), target(div.attributes)) } }, pandoc.Attr('', { 'audio' }))
      end
    end,
  }

  if lib.title_heading then
    local head = { pandoc.Header(1, lib.words(lib.title)) }
    if lib.subtitle ~= '' then head[2] = pandoc.Para { pandoc.Emph(lib.words(lib.subtitle)) } end
    blocks = pandoc.Blocks(head) .. blocks
  end
  doc.blocks = blocks
  local meta = { title = lib.title, lang = lib.lang }
  if lib.subtitle ~= '' then meta.subtitle = lib.subtitle end
  -- the version stamp (index.md only; publication.md has it once, in its own front matter)
  local function get(key) return doc.meta[key] and pandoc.utils.stringify(doc.meta[key]) or '' end
  if get('version-id') ~= '' then
    meta.version = { id = get('version-id'), label = get('version-label'), date = get('version-date'), status = get('version-status') }
    meta.kit = get('kit-version')
  end
  doc.meta = pandoc.Meta(meta)
  return doc
end
