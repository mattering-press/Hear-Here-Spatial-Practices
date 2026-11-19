-- Stage 2, paragraph numbers (the rule is in CONTRACT.md, "Paragraph numbers"). The reading paragraphs of a page
-- are numbered from 1 in page order. Each becomes
--   <div id="p12" class="para"><p><a class="para-link" href="#p12" data-n="12" aria-label="Paragraph 12"></a>…</p></div>
-- The link has no text of its own: the stylesheet shows the number (data-n) in the margin and a ¶ on hover and
-- focus, so copying text and text-fragment links (#p12:~:text=…) see only the paragraph's words. Without JavaScript
-- the link goes to #p12; assets/paragraphs.js copies the paragraph's address instead.
--
-- The rule depends only on the content of the page's Markdown view, never on the template: it runs after the media
-- filters, and reads their output as what it was in the Markdown (a figure, a video, a card list). The paragraph
-- texts, normalised, and a short hash of each go to page.json (contract.lua), so that versions can be matched.
-- With -M paragraph-numbers=false (the versions page) nothing is numbered.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'
os.setlocale('C', 'ctype')   -- %p and %c match ASCII only, never a byte inside a UTF-8 character

-- Divs whose contents are never reading paragraphs: media, card lists, and what the citation filter added.
local SKIP = { video = true, embed = true, audio = true, gallery = true, cards = true, ['typed-reference'] = true, ['citation-popovers'] = true }

-- Punctuation that the normalised text leaves out, besides ASCII punctuation.
local PUNCT = { '‘', '’', '‚', '‛', '“', '”', '„', '‟', '–', '—', '―', '‐', '‑', '…', '•', '·', '«', '»', '‹', '›', '¶', '§', '′', '″', '\u{00A0}', '\u{2009}', '\u{202F}' }

-- The normalised text: lower case, punctuation and markup removed, words separated by single spaces.
-- "‘Dust’ – as Aya says…" -> "dust as aya says"
local function normalise(text)
  local s = pandoc.text.lower(text)
  for _, p in ipairs(PUNCT) do s = s:gsub(p, ' ') end
  s = s:gsub('[%c%p]', ' ')     -- ASCII control characters and punctuation (C locale, set above)
  return (s:gsub('%s+', ' '):gsub('^ ', ''):gsub(' $', ''))
end

local function is_timecode(el)
  local text = el.t == 'Str' and el.text or el.t == 'Link' and el.classes:includes('timecode') and pandoc.utils.stringify(el.content)
  return text and text:match('^%[%d%d:%d%d:%d%d%]$') ~= nil
end

-- A paragraph is numbered unless it holds no words: only images, only a transcript timecode, only raw HTML.
local function readable(block)
  local words = false
  for _, el in ipairs(block.content) do
    if el.t == 'Space' or el.t == 'SoftBreak' or el.t == 'LineBreak' or el.t == 'Image' or el.t == 'RawInline' then
      -- not words
    elseif is_timecode(el) and #block.content:filter(function(x) return x.t ~= 'Space' and x.t ~= 'SoftBreak' end) == 1 then
      return false
    else
      words = true
    end
  end
  return words and normalise(pandoc.utils.stringify(block)) ~= ''
end

function Pandoc(doc)
  lib.init(doc.meta)
  local setting = doc.meta['paragraph-numbers']   -- -M paragraph-numbers=false arrives as a boolean
  if setting == false or (setting and pandoc.utils.stringify(setting) == 'false') then return nil end
  local paragraphs = {}
  local references_level = nil   -- inside a "References" section: the level of its heading

  -- block: a Para or Plain; for a line block, text is a Para of its lines and the link goes into its first line
  local function number(block, text_block)
    local n = #paragraphs + 1
    local id = 'p' .. n
    local text = normalise(pandoc.utils.stringify(text_block or block))
    paragraphs[n] = { id = id, n = n, text_hash = pandoc.utils.sha1(text):sub(1, 12), text = text }
    local link = pandoc.RawInline('html', string.format('<a class="para-link" href="#%s" data-n="%d" aria-label="Paragraph %d"></a>', id, n, n))
    if block.t == 'LineBlock' then block.content[1]:insert(1, link) else block.content:insert(1, link) end
    return pandoc.Div({ block }, pandoc.Attr(id, { 'para' }))
  end

  local walk_blocks
  local function walk_block(b)
    if b.t == 'Header' then
      local text = pandoc.utils.stringify(b.content):lower():gsub('^%s+', ''):gsub('%s+$', '')
      if references_level and b.level <= references_level then references_level = nil end
      if text == 'references' and not references_level then references_level = b.level end
      return b
    end
    if references_level then return b end
    if b.t == 'Para' or b.t == 'Plain' then
      return readable(b) and number(b) or b
    elseif b.t == 'LineBlock' then
      -- verse, or an address: one paragraph, its lines kept
      local inlines = pandoc.Inlines {}
      for i, line in ipairs(b.content) do
        if i > 1 then inlines:insert(pandoc.LineBreak()) end
        inlines:extend(line)
      end
      local para = pandoc.Para(inlines)
      return readable(para) and number(b, para) or b
    elseif b.t == 'BlockQuote' then
      b.content = walk_blocks(b.content)
    elseif b.t == 'Div' then
      for _, c in ipairs(b.classes) do if SKIP[c] then return b end end
      b.content = walk_blocks(b.content)
    elseif b.t == 'BulletList' or b.t == 'OrderedList' then
      local items = {}
      for i, item in ipairs(b.content) do items[i] = walk_blocks(item) end
      b.content = items
    elseif b.t == 'DefinitionList' then
      local items = {}
      for i, item in ipairs(b.content) do
        local definitions = {}
        for j, def in ipairs(item[2]) do definitions[j] = walk_blocks(def) end
        items[i] = { item[1], definitions }
      end
      b.content = items
    end
    -- tables, code, rules and raw HTML (figures, players, embeds) are not numbered
    return b
  end
  walk_blocks = function(blocks)
    local out = pandoc.Blocks {}
    for _, b in ipairs(blocks) do out:insert(walk_block(b)) end
    return out
  end

  doc.blocks = walk_blocks(doc.blocks)
  lib.add(doc, 'paragraphs', paragraphs)
  return doc
end
