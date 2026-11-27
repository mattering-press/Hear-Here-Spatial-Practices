-- SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
-- Stage 2, cards. In the page's Markdown a card list is a div holding a list of links, each with a picture
-- and a title. The title is wrapped so that the stylesheet can set it apart:
--   <div class="cards" data-pagefind-ignore="all"><ul><li><a href="…"><img …><span class="card-title">Introduction</span></a></li>…</ul></div>
-- Search leaves cards out (data-pagefind-ignore), so that words in a card are found on the page it leads to.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

function Pandoc(doc)
  lib.init(doc.meta)
  doc.blocks = doc.blocks:walk {
    Div = function(div)
      if not div.classes:includes('cards') then return nil end
      div.attributes['data-pagefind-ignore'] = 'all'
      return div:walk {
        Link = function(link)
          local image, title = pandoc.Inlines {}, pandoc.Inlines {}
          for _, el in ipairs(link.content) do
            -- figures.lua, which runs first, writes an image without alt text as raw HTML
            local picture = el.t == 'Image' or (el.t == 'RawInline' and el.format == 'html' and el.text:match('^<img%s'))
            if picture then image:insert(el) elseif not (#title == 0 and el.t == 'Space') then title:insert(el) end
          end
          link.content = image .. pandoc.Inlines { pandoc.Span(title, pandoc.Attr('', { 'card-title' })) }
          return link
        end,
      }
    end,
  }
  return doc
end
