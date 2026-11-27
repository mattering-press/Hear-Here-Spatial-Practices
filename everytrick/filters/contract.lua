-- SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
-- The page's data for page.json (see CONTRACT.md): its headings and links, plus the figures, audio, video, media
-- items, references and paragraphs that the other filters recorded (and the citations and typed references for the
-- build's report and the References page: each citation with the numbered paragraph that holds it).
-- Written as JSON to the file given with -M contract-out; build.mjs adds the fields it knows itself and writes
-- page.json. Runs last, so headings have their ids and paragraphs their numbers.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

function Pandoc(doc)
  lib.init(doc.meta)
  local data = { headings = {}, links = {} }
  local seen = {}
  doc.blocks:walk {
    Header = function(h)
      data.headings[#data.headings + 1] = { level = h.level, text = pandoc.utils.stringify(h.content), id = h.identifier }
    end,
    -- links to other pages of the site: relative targets that end in a slash (stage 1 made them so); citation links
    -- to a reference list on another page are references, not links
    Link = function(link)
      if link.classes:includes('citation') then return end
      local url = link.target
      if url:match('^[%a][%w+.-]*:') or url:sub(1, 1) == '#' then return end
      local path = url:match('^([^#?]*)')
      if not (path:sub(-1) == '/' and path:sub(1, #lib.root) == lib.root) then return end
      local site_url = path:sub(#lib.root + 1)
      local id = site_url == '' and 'README.md' or (lib.unpct(site_url:sub(1, -2)) .. '.md')
      if not seen[id] then
        seen[id] = true
        data.links[#data.links + 1] = { id = id, url = site_url, text = pandoc.utils.stringify(link.content) }
      end
    end,
  }
  for _, key in ipairs { 'figures', 'audio', 'video', 'references', 'paragraphs', 'citations', 'typed' } do
    data[key] = lib.get(doc, key)
    doc.meta['twin-' .. key] = nil
  end
  -- The media items that figures.lua and embeds.lua recorded, in page order (the order of their anchors in the page),
  -- each with the numbered paragraph before it (after: "p76"), so that an item's page can say where it is.
  local recorded, by_anchor, done, last = lib.get(doc, 'items'), {}, {}, nil
  doc.meta['twin-items'] = nil
  for _, it in ipairs(recorded) do by_anchor[it.anchor] = it end
  data.items = {}
  doc.blocks:walk {
    traverse = 'topdown',
    Div = function(div) if div.classes:includes('para') then last = div.identifier end end,
    RawBlock = function(raw)
      if raw.format ~= 'html' then return end
      for anchor in raw.text:gmatch(' id="(item%-[^"]+)"') do
        local it = by_anchor[anchor]
        if it and not done[anchor] then
          done[anchor], it.after = true, last
          data.items[#data.items + 1] = it
        end
      end
    end,
  }
  for _, it in ipairs(recorded) do if not done[it.anchor] then data.items[#data.items + 1] = it end end
  -- Where each citation link is, for the References page ("Introduction, para. 12"): the numbered paragraph that holds
  -- it (para: "p12"); for one outside the numbered paragraphs, the margin note it is in (note: "n3"), if any, and the
  -- numbered paragraph before it (after: "p11"). Paragraphs never hold one another, so a paragraph's citations are
  -- all the citation links inside it.
  local where, note, before = {}, nil, nil
  doc.blocks:walk {
    traverse = 'topdown',
    Div = function(div)
      if not div.classes:includes('para') then return end
      before = div.identifier
      div:walk { Link = function(link) if link.classes:includes('citation') then where[link.identifier] = { para = div.identifier } end end }
    end,
    RawBlock = function(raw)
      if raw.format ~= 'html' then return end
      local id = raw.text:match('^<aside id="(n%d+)" class="margin"')
      if id then note = id elseif raw.text:match('^</aside>') then note = nil end
    end,
    Link = function(link)
      if link.classes:includes('citation') and not where[link.identifier] then where[link.identifier] = { note = note, after = before } end
    end,
  }
  for _, rec in ipairs(data.citations) do
    local w = rec.id and where[rec.id]
    if w then rec.para, rec.note, rec.after = w.para, w.note, w.after end
  end
  local f = assert(io.open(lib.contract_path, 'w'))
  f:write(pandoc.json.encode(data))
  f:close()
  return doc
end
