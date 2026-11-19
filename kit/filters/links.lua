-- Stage 2, the menu and footer, which build.mjs passes as metadata. Links between pages become relative links
-- in the site's URL scheme, so the site works at the root of a domain and under a sub-path alike:
--   ./acorn.md or /essays/acorn.md  ->  ../acorn/        /  or /README.md  ->  ../../  (from essays/walk.md)
-- In the menu, the link to the current page gets aria-current="page". (Links in the text were rewritten in
-- stage 1, by to-markdown.lua.)
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

function Pandoc(doc)
  lib.init(doc.meta)
  for _, key in ipairs { 'menu', 'footer' } do
    if doc.meta[key] then
      local items = {}
      for _, item in ipairs(doc.meta[key]) do
        items[#items + 1] = pandoc.Inlines(item):walk {
          Link = function(link)
            local url, page = lib.fix_link(link.target)
            if not url then return nil end
            link.target = url
            if key == 'menu' and page == lib.page then link.attributes['aria-current'] = 'page' end
            return link
          end,
        }
      end
      doc.meta[key] = items
    end
  end
  return doc
end
