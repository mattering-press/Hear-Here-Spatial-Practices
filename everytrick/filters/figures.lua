-- SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
-- Stage 2, images. In the page's Markdown a zoomable image is
--   ![caption](images/x-1600.jpg){.zoom .right width="75%" alt="…"}
-- where the class says where it sits: .left or .right, half the text column (width= sets another share); none, the
-- text column; .wide, as wide as the page's opening and its footer; .full, the whole window. It becomes a plain image
-- in several widths, linked to its media item's page (what a reader without JavaScript gets when they click it; on the
-- item's own page, and for a picture that is not an item, the link goes to its largest image, data-largest):
--   <figure id="item-37" class="zoom right" style="--figure-width: 75%; --ratio: 1.3333" data-tiles="../../iiif/x/info.json">
--     <a class="figure-picture" href="../../see/boulder-font/" data-largest="../../images/x-w2400.jpg"><img src="../../images/x-1600.jpg"
--       srcset="../../images/x-w800.jpg 800w, …, ../../images/x-w2400.jpg 2400w" sizes="…" width="1600" height="1200"
--       alt="…" loading="lazy"></a>
--     <figcaption><a class="item-number" href="../../see/boulder-font/" aria-label="Item 37">37</a> …</figcaption>
--   </figure>
-- Every picture is a media item (register.mjs): the figure's id is its anchor (item-37, or item-<name> before it has a
-- number), and its caption line starts with its number pill and ends with its credit (lib.caption_line); a picture
-- without a caption gets a caption line for the pill.
-- --ratio, the picture's width divided by its height, lets the stylesheet keep a tall picture within about 80% of the
-- window's height, with its caption as wide as the picture, without JavaScript. sizes tells the browser how wide the
-- picture is shown, so that it takes the right width from srcset. assets/zoom.js puts a Zoom button at the end of the
-- caption line and opens the picture's tiles in its viewer.
-- A .gallery div holds such figures. It becomes justified rows, worked out here from the pictures' proportions:
--   <div class="gallery"><div class="gallery__row"><figure …>…</figure><figure …>…</figure></div>…</div>
-- In a row every picture keeps its shape: the stylesheet gives each a share of the row in proportion to its --ratio,
-- so the pictures of a row are equally tall and fill the text column. A picture too narrow for its caption and the Zoom
-- button side by side is marked .narrow (in a gallery, all its pictures are), and its button gets a line of its own.
-- An animated image, ![caption](images/x.webp){.animated alt="…"}, becomes a figure without zoom, whose picture shows
-- its first frame (images/x-still.jpg) to readers who ask their system for less motion; zoom.js adds a pause button.
-- A long description, a ::: {.description by="…"} block directly after a picture (after a gallery: its last picture),
-- is taken into the picture's figure ("Long descriptions" in CONTRACT.md). On a page it is a disclosure at the end of the
-- caption line, which the picture names with aria-details:
--   <img … aria-details="item-34-description">
--   <figcaption>… <details class="description" id="item-34-description"><summary>Description by Jane Doe</summary>
--     <div class="description__text"><p>…</p></div></details></figcaption>
-- On the item's own page it is shown in full below the picture, as <section class="item-description" id="…">. A
-- description that follows anything but a picture stops the build.
-- Other images of the site get their size and lazy loading.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

local figures, items = {}, {}
local descriptions = {}   -- the long descriptions taken into figures, in page order (attach)

-- The page's measures in rem, as assets/site.css sets them: the text column (--measure less the gutters), the wide
-- width (--wide less the gutters) and the gap between the pictures of a gallery (--gap). On phones (40rem and less)
-- every picture is as wide as the text column, about the window less its gutters.
local COLUMN, WIDE, GAP = 36, 62, 1
local PHONE = '(max-width: 40rem) calc(100vw - 2rem)'
local ROW = 12      -- the height a gallery's rows aim at, in rem
local NARROW = 14   -- a picture narrower than this (rem) has the line below it for its button (.narrow)
local PLACES = { 'left', 'right', 'wide', 'full' }

local function num(n)   -- 1.333333 -> "1.3333", 18.0 -> "18"
  return (string.format('%.4f', n):gsub('0+$', ''):gsub('%.$', ''))
end

local function place_of(img)
  for _, c in ipairs(PLACES) do if img.classes:includes(c) then return c end end
end

-- sizes: the width the picture is shown at, never more than the width at which it is 80% of the window's height (for
-- a browser that cannot read min() here, the entry after it says the same without the limit)
local function sizes(place, width, ratio)
  local cap = num(80 * ratio) .. 'vh'
  local function limited(w) return 'min(' .. w .. ', ' .. cap .. '), ' .. w end
  if place == 'full' then return PHONE .. ', ' .. limited('100vw') end
  if place == 'wide' then
    local narrow = '(max-width: ' .. num(WIDE + 2 * GAP) .. 'rem) '
    return PHONE .. ', ' .. narrow .. 'min(calc(100vw - 2rem), ' .. cap .. '), ' .. narrow .. 'calc(100vw - 2rem), ' .. limited(num(WIDE) .. 'rem')
  end
  return PHONE .. ', ' .. limited(width)
end

-- the width a figure in the text column is shown at: its share of the column (width="75%"), the length width= gives,
-- or half the column for .left and .right, the whole column otherwise. Also that width in rem, where it is known.
local function column_width(width, place)
  local percent = width and width:match('^%s*(%d+%.?%d*)%%%s*$')
  local length = width and width:match('^%s*(%d+%.?%d*[%a]+)%s*$')
  if length and not percent then return length, tonumber(length:match('^(%d+%.?%d*)rem$')) end
  local rem = COLUMN * (percent and tonumber(percent) / 100 or (place == 'left' or place == 'right') and 0.5 or 1)
  return num(rem) .. 'rem', rem
end

local function entry_of(img)
  local entry = lib.image_at(img.src)
  if not entry or not (entry.tiles or entry.animated) then error('no zoomable image at ' .. img.src .. ' (' .. lib.page .. ')') end
  return entry
end

-- One picture. shown: in a gallery, the width (rem) its row gives it, and narrow whether the gallery has a picture
-- too narrow for its caption and button side by side (then all its pictures are .narrow, so that they look alike);
-- nil elsewhere.
local function figure(img, shown, narrow)
  local entry = entry_of(img)
  local animated = entry.animated
  local alt = img.attributes.alt or ''
  local caption = pandoc.utils.stringify(img.caption)
  local description = descriptions[tonumber(img.attributes['twin-description'] or '')]
  figures[#figures + 1] = { image = entry.url, width = entry.width, height = entry.height, tiles = entry.tiles, alt = alt, caption = caption,
    description = description and description.text or '', description_by = description and description.by or '' }
  local item = lib.item(entry.src)
  local anchor = item and lib.anchor(item)
  local described = description and ((anchor or ('figure-' .. #figures)) .. '-description')
  if item then items[#items + 1] = { anchor = anchor, source = entry.src, label = item.label, kind = item.kind, name = item.name, url = item.url } end
  local place = not shown and place_of(img) or nil
  local ratio = entry.width / entry.height
  local width = not shown and place ~= 'wide' and place ~= 'full' and img.attributes.width or nil
  local style = { '--ratio: ' .. num(ratio) }
  if width then table.insert(style, 1, '--figure-width: ' .. width) end
  local size = ' width="' .. entry.width .. '" height="' .. entry.height .. '" alt="' .. lib.esc(alt) .. '"' ..
    (described and (' aria-details="' .. described .. '"') or '') .. ' loading="lazy"'
  local css, rem = column_width(width, place)
  if shown then css = num(shown) .. 'rem' end
  if not shown then narrow = place ~= 'wide' and place ~= 'full' and rem and rem < NARROW end
  local picture
  if animated then
    picture = '<picture class="figure-picture"><source srcset="' .. lib.esc(lib.join(lib.root, entry.still)) .. '" media="(prefers-reduced-motion: reduce)">' ..
      '<img src="' .. lib.esc(lib.join(lib.root, entry.url)) .. '"' .. size .. '></picture>'
  else
    local candidates = {}
    for _, c in ipairs(entry.srcset) do candidates[#candidates + 1] = lib.join(lib.root, c.url) .. ' ' .. math.floor(c.width) .. 'w' end
    local shown_at = shown and (PHONE .. ', ' .. css) or sizes(place, css, ratio)
    local largest = lib.esc(lib.join(lib.root, entry.largest))
    local target = (item and not lib.item_page) and lib.esc(lib.join(lib.root, item.url)) or largest
    picture = '<a class="figure-picture" href="' .. target .. '" data-largest="' .. largest .. '">' ..
      '<img src="' .. lib.esc(lib.join(lib.root, entry.url)) .. '" srcset="' .. lib.esc(table.concat(candidates, ', ')) .. '" sizes="' .. lib.esc(shown_at) .. '"' .. size .. '></a>'
  end
  local classes = (animated and 'animated' or 'zoom') .. (place and (' ' .. place) or '') .. (narrow and ' narrow' or '')
  local line = lib.caption_line(item, caption ~= '' and lib.esc(caption) or '')
  -- the long description: on a page, a disclosure after the caption line; on the item's page, in full below the picture
  local disclosure, below = '', ''
  if description then
    local credit = description.by ~= '' and (' by ' .. lib.esc(description.by)) or ''
    if lib.item_page then
      below = table.concat { '\n<section class="item-description" id="', described, '" aria-labelledby="', described, '-heading">\n',
        '<h2 id="', described, '-heading">Description</h2>\n', credit ~= '' and ('<p class="item-description__by">By ' .. lib.esc(description.by) .. '</p>\n') or '',
        description.html, '\n</section>' }
    else
      disclosure = table.concat { '<details class="description" id="', described, '"><summary>Description', credit, '</summary>',
        '<div class="description__text">', description.html, '</div></details>' }
    end
  end
  return pandoc.RawBlock('html', table.concat {
    '<figure', anchor and (' id="' .. anchor .. '"') or '', ' class="', classes, '" style="', lib.esc(table.concat(style, '; ')), '"',
    animated and '' or (' data-tiles="' .. lib.esc(lib.join(lib.root, entry.tiles)) .. '"'), '>\n',
    picture, '\n',
    (line ~= '' or disclosure ~= '') and ('<figcaption>' .. line .. disclosure .. '</figcaption>\n') or '',
    '</figure>', below })
end

local function only_image(block)
  if block.t ~= 'Para' and block.t ~= 'Plain' then return nil end
  return #block.content == 1 and block.content[1].t == 'Image' and block.content[1] or nil
end

local function is_picture(img) return img and (img.classes:includes('zoom') or img.classes:includes('animated')) end

-- A gallery's rows: the pictures in order, cut into rows so that each row, filling the text column, is as close to ROW
-- tall as it can be (a row's height is the column, less its gaps, divided by the sum of its pictures' ratios). A
-- gallery of one or two pictures is one row: two pictures side by side.
local function rows(ratios)
  local n = #ratios
  if n <= 2 then return { { 1, n } } end
  local best, cut = { [0] = 0 }, {}
  for i = 1, n do
    best[i] = math.huge
    local sum = 0
    for j = i, 1, -1 do
      sum = sum + ratios[j]
      local height = (COLUMN - GAP * (i - j)) / sum
      local cost = best[j - 1] + ((height - ROW) / ROW) ^ 2
      if cost < best[i] - 1e-9 then best[i], cut[i] = cost, j end
    end
  end
  local out, i = {}, n
  while i > 0 do
    table.insert(out, 1, { cut[i], i })
    i = cut[i] - 1
  end
  return out
end

local function gallery(div)
  local images, ratios = {}, {}
  for _, block in ipairs(div.content) do
    local img = only_image(block)
    if not is_picture(img) then return nil end   -- anything else in it: each picture on its own (the Para filter)
    local entry = entry_of(img)
    images[#images + 1], ratios[#ratios + 1] = img, entry.width / entry.height
  end
  if #images == 0 then return nil end
  -- the width (rem) each picture has in its row
  local shown, narrow, cut = {}, false, rows(ratios)
  for _, row in ipairs(cut) do
    local first, last, sum = row[1], row[2], 0
    for k = first, last do sum = sum + ratios[k] end
    for k = first, last do
      shown[k] = (COLUMN - GAP * (last - first)) * ratios[k] / sum
      narrow = narrow or shown[k] < NARROW
    end
  end
  local blocks = pandoc.Blocks {}
  for _, row in ipairs(cut) do
    blocks:insert(pandoc.RawBlock('html', '<div class="gallery__row">'))
    for k = row[1], row[2] do blocks:insert(figure(images[k], shown[k], narrow)) end
    blocks:insert(pandoc.RawBlock('html', '</div>'))
  end
  div.content = blocks
  return div
end

-- Long descriptions: each ::: {.description} block is taken into the picture directly before it (in a gallery's place,
-- the gallery's last picture), whose image is marked with its place in descriptions; the block itself goes.
local function attach(blocks)
  local out, changed = pandoc.Blocks {}, false
  for _, b in ipairs(blocks) do
    if b.t == 'Div' and b.classes:includes('description') then
      local before = out[#out]
      local img, k = before and only_image(before), nil
      if not is_picture(img) and before and before.t == 'Div' and before.classes:includes('gallery') then
        for j = #before.content, 1, -1 do
          img = only_image(before.content[j])
          if is_picture(img) then k = j break end
        end
      end
      if not is_picture(img) then
        error('a long description, ::: {.description}, must come directly after a picture (' .. lib.page .. '): ' .. pandoc.utils.stringify(b):sub(1, 60))
      end
      local texts = {}
      for _, block in ipairs(b.content) do texts[#texts + 1] = pandoc.utils.stringify(block) end
      descriptions[#descriptions + 1] = { by = b.attributes.by or '', text = table.concat(texts, '\n\n'),
        html = (pandoc.write(pandoc.Pandoc(b.content), 'html', { wrap_text = 'wrap-none' }):gsub('%s+$', '')) }
      img.attributes['twin-description'] = tostring(#descriptions)
      local para = pandoc.Para { img }
      if k then before.content[k] = para else before = para end
      out[#out] = before
      changed = true
    else
      out:insert(b)
    end
  end
  return changed and out or nil
end

function Pandoc(doc)
  lib.init(doc.meta)
  doc.blocks = doc.blocks:walk { Blocks = attach }
  -- figures first (in page order), then the other images
  doc.blocks = doc.blocks:walk {
    traverse = 'topdown',
    Div = function(div)
      if div.classes:includes('gallery') then
        local made = gallery(div)
        if made then return made, false end
      end
    end,
    Para = function(para)
      local img = only_image(para)
      if is_picture(img) then return figure(img), false end
    end,
  }
  doc.blocks = doc.blocks:walk {
    Image = function(img)
      local entry = lib.image_at(img.src)
      if not entry then return nil end
      img.attributes.width, img.attributes.height, img.attributes.loading = tostring(entry.width), tostring(entry.height), 'lazy'
      -- Pandoc leaves alt out when there is no text; an empty alt marks the image as decorative (convert.mjs warns)
      if #img.caption == 0 then return pandoc.RawInline('html', '<img src="' .. lib.esc(img.src) .. '" width="' .. entry.width .. '" height="' .. entry.height .. '" alt="" loading="lazy">') end
      return img
    end,
  }
  lib.add(doc, 'figures', figures)
  lib.add(doc, 'items', items)
  return doc
end
