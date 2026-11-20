-- The page's data for page.json (see CONTRACT.md): its headings and links, plus the figures, audio, video,
-- references and paragraphs that the other filters recorded (and the citations and typed references for the build's
-- report).
-- Written as JSON to the file given with -M contract-out; build.mjs adds the fields it knows itself and writes
-- page.json. Runs last, so headings have their ids.
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
  local f = assert(io.open(lib.contract_path, 'w'))
  f:write(pandoc.json.encode(data))
  f:close()
  return doc
end
