-- Stage 2, images. In the page's Markdown a zoomable image is
--   ![caption](images/x-1600.jpg){.zoom .right width="75%" alt="…"}
-- and becomes
--   <figure class="zoom right" style="--figure-width: 75%" data-tiles="../../iiif/x/info.json">
--     <img src="../../images/x-1600.jpg" width="1600" height="1200" alt="…" loading="lazy">
--     <figcaption>…</figcaption>
--   </figure>
-- assets/zoom.js adds a Zoom button that opens the tiles in a dialog. A .gallery div holds such figures.
-- An animated image, ![caption](images/x.webp){.animated alt="…"}, becomes a figure without zoom, whose picture shows
-- its first frame (images/x-still.jpg) to readers who ask their system for less motion.
-- Other images of the site get their size and lazy loading.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

local figures = {}

local function figure(img)
  local entry = lib.image_at(img.src)
  local animated = entry and entry.animated
  if not entry or not (entry.tiles or animated) then error('no zoomable image at ' .. img.src .. ' (' .. lib.page .. ')') end
  local alt = img.attributes.alt or ''
  local caption = pandoc.utils.stringify(img.caption)
  figures[#figures + 1] = { image = entry.url, width = entry.width, height = entry.height, tiles = entry.tiles, alt = alt, caption = caption }
  local side = img.classes:includes('left') and ' left' or img.classes:includes('right') and ' right' or ''
  local picture = '<img src="' .. lib.join(lib.root, entry.url) .. '" width="' .. entry.width .. '" height="' .. entry.height .. '" alt="' .. lib.esc(alt) .. '" loading="lazy">'
  if animated then
    picture = '<picture><source srcset="' .. lib.join(lib.root, entry.still) .. '" media="(prefers-reduced-motion: reduce)">' .. picture .. '</picture>'
  end
  return pandoc.RawBlock('html', table.concat {
    '<figure class="', animated and 'animated' or 'zoom', side, '"',
    img.attributes.width and (' style="--figure-width: ' .. lib.esc(img.attributes.width) .. '"') or '',
    animated and '' or (' data-tiles="' .. lib.join(lib.root, entry.tiles) .. '"'), '>\n',
    picture, '\n',
    caption ~= '' and ('<figcaption>' .. lib.esc(caption) .. '</figcaption>\n') or '',
    '</figure>' })
end

local function only_image(block)
  if block.t ~= 'Para' and block.t ~= 'Plain' then return nil end
  return #block.content == 1 and block.content[1].t == 'Image' and block.content[1] or nil
end

function Pandoc(doc)
  lib.init(doc.meta)
  -- figures first (in page order), then the other images
  doc.blocks = doc.blocks:walk {
    traverse = 'topdown',
    Para = function(para)
      local img = only_image(para)
      if img and (img.classes:includes('zoom') or img.classes:includes('animated')) then return figure(img), false end
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
  return doc
end
