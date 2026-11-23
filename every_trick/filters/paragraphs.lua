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
--
-- -M paragraph-rule=<contract> numbers a frozen version by the rule of the contract it was frozen under, so that its
-- numbers never change (versions.json, "contract"). Rules: 0.3 numbers each item of a list; 0.4 numbers a whole list
-- as one paragraph, <div id="p12" class="para para-list"><a class="para-link" …></a><ul>…</ul></div>; 0.5 has the rule of
-- 0.4, unchanged; 0.6 (the current contract) adds long descriptions (::: {.description}) to the blocks that are never
-- numbered. figures.lua, which runs first, takes each description into its picture's figure, so none is left here; the
-- rule says so all the same, because it is a rule of the Markdown, not of the filters.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

-- Divs whose contents are never reading paragraphs: media, card lists, margin notes (paragraph numbers ignore the
-- margin) and what the citation filter added; from rule 0.6, long descriptions too.
local SKIP = { margin = true, video = true, embed = true, audio = true, gallery = true, cards = true, ['typed-reference'] = true, ['citation-popovers'] = true }

local normalise = lib.normalise

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

-- Short lines that work as labels or stage directions, not as reading paragraphs (CONTRACT.md):
--   "[music]", "[laughter]"            the whole text is one bracketed note
--   "Addendum:", "In the archive:"     at most 6 words, ending with a colon
--   "**Addendum**", "*Interlude*"      at most 6 words, all in bold or italics
local function words_of(text)
  local n = 0
  for _ in text:gmatch('%S+') do n = n + 1 end
  return n
end
local function is_label(block)
  local text = pandoc.utils.stringify(block):gsub('^%s+', ''):gsub('%s+$', '')
  if text:match('^%[[^%[%]]+%]$') then return true end
  if words_of(text) > 6 then return false end
  if text:match(':$') then return true end
  local styled, other = 0, 0
  for _, el in ipairs(block.content) do
    if el.t == 'Strong' or el.t == 'Emph' then styled = styled + 1
    elseif el.t ~= 'Space' and el.t ~= 'SoftBreak' and el.t ~= 'LineBreak' then other = other + 1 end
  end
  return styled > 0 and other == 0
end

-- A list before the page's first heading whose every item starts with a bold label ending in a colon is page
-- metadata ("**Recording date:** 5 April 2025"), not reading text.
local function is_metadata_list(list)
  if #list.content == 0 then return false end
  for _, item in ipairs(list.content) do
    local first = item[1]
    if #item ~= 1 or not first or (first.t ~= 'Plain' and first.t ~= 'Para') then return false end
    local lead = first.content[1]
    if not lead or lead.t ~= 'Strong' or not pandoc.utils.stringify(lead):match(':%s*$') then return false end
  end
  return true
end

function Pandoc(doc)
  lib.init(doc.meta)
  local setting = doc.meta['paragraph-numbers']   -- -M paragraph-numbers=false arrives as a boolean
  if setting == false or (setting and pandoc.utils.stringify(setting) == 'false') then return nil end
  local rule = doc.meta['paragraph-rule'] and pandoc.utils.stringify(doc.meta['paragraph-rule']) or '0.6'
  if rule ~= '0.3' and rule ~= '0.4' and rule ~= '0.5' and rule ~= '0.6' then error('paragraphs.lua: unknown paragraph rule ' .. rule .. ' (known: 0.3, 0.4, 0.5, 0.6)') end
  SKIP.description = rule == '0.6' or nil
  local whole_lists = rule ~= '0.3'
  local paragraphs = {}
  local references_level = nil   -- inside a "References" section: the level of its heading
  local seen_header = false      -- a metadata list only counts before the first heading

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

  -- A poem (::: {.poem} … :::) counts as one paragraph of the chapter, and its lines are numbered within the
  -- poem: every line of its line blocks (| …) and every line of its other paragraphs, in order, as
  -- <poem id>-l1, -l2 … The poem id is the div's own id, or poem1, poem2 … in page order. Stanza breaks and
  -- empty lines are not numbered. See CONTRACT.md, "Poems".
  local poems = 0
  local function number_poem(div)
    poems = poems + 1
    if div.identifier == '' then div.identifier = 'poem' .. poems end
    local pid, n, texts = div.identifier, 0, {}
    local function line_span(inlines)
      n = n + 1
      texts[#texts + 1] = pandoc.utils.stringify(inlines)
      return pandoc.Span(inlines, pandoc.Attr(pid .. '-l' .. n, { 'line' }, { { 'data-line', tostring(n) } }))
    end
    local function split(inlines)   -- a paragraph's lines, separated by line breaks
      local lines, cur = {}, pandoc.Inlines {}
      for _, el in ipairs(inlines) do
        if el.t == 'LineBreak' or el.t == 'SoftBreak' then lines[#lines + 1] = cur; cur = pandoc.Inlines {}
        else cur:insert(el) end
      end
      lines[#lines + 1] = cur
      return lines
    end
    local out = pandoc.Blocks {}
    for _, block in ipairs(div.content) do
      if block.t == 'LineBlock' then
        local lines = {}
        for i, line in ipairs(block.content) do
          lines[i] = (pandoc.utils.stringify(line):match('%S')) and pandoc.Inlines { line_span(line) } or line
        end
        block.content = lines
        out:insert(block)
      elseif block.t == 'Para' or block.t == 'Plain' then
        local inlines = pandoc.Inlines {}
        for i, line in ipairs(split(block.content)) do
          if i > 1 then inlines:insert(pandoc.LineBreak()) end
          if pandoc.utils.stringify(line):match('%S') then inlines:insert(line_span(line)) else inlines:extend(line) end
        end
        block.content = inlines
        out:insert(block)
      else
        out:insert(block)
      end
    end
    div.content = out
    div.attributes['data-lines'] = tostring(n)
    -- the whole poem is one paragraph of the chapter
    local num = #paragraphs + 1
    local id = 'p' .. num
    local text = normalise(table.concat(texts, ' '))
    paragraphs[num] = { id = id, n = num, text_hash = pandoc.utils.sha1(text):sub(1, 12), text = text, poem = pid, lines = n }
    local link = pandoc.Plain { pandoc.RawInline('html', string.format('<a class="para-link" href="#%s" data-n="%d" aria-label="Paragraph %d"></a>', id, num, num)) }
    div.content:insert(1, link)
    return pandoc.Div({ div }, pandoc.Attr(id, { 'para', 'para-poem' }))
  end

  -- Rule 0.4: a whole list (bulleted, numbered or a definition list, with any lists nested in it) is one paragraph.
  -- Its text is the text of its items, in order; the link goes before the list, as for a poem.
  local function number_list(list)
    local texts = {}
    local function collect(blocks)
      pandoc.Blocks(blocks):walk {
        Plain = function(el) texts[#texts + 1] = pandoc.utils.stringify(el) end,
        Para = function(el) texts[#texts + 1] = pandoc.utils.stringify(el) end,
        LineBlock = function(el) for _, line in ipairs(el.content) do texts[#texts + 1] = pandoc.utils.stringify(line) end end,
      }
    end
    if list.t == 'DefinitionList' then
      for _, item in ipairs(list.content) do
        texts[#texts + 1] = pandoc.utils.stringify(item[1])
        for _, def in ipairs(item[2]) do collect(def) end
      end
    else
      collect({ list })
    end
    local text = normalise(table.concat(texts, ' '))
    if text == '' then return list end
    local num = #paragraphs + 1
    local id = 'p' .. num
    paragraphs[num] = { id = id, n = num, text_hash = pandoc.utils.sha1(text):sub(1, 12), text = text }
    local link = pandoc.Plain { pandoc.RawInline('html', string.format('<a class="para-link" href="#%s" data-n="%d" aria-label="Paragraph %d"></a>', id, num, num)) }
    return pandoc.Div({ link, list }, pandoc.Attr(id, { 'para', 'para-list' }))
  end

  local walk_blocks
  local function walk_block(b)
    if b.t == 'Header' then
      seen_header = true
      local text = pandoc.utils.stringify(b.content):lower():gsub('^%s+', ''):gsub('%s+$', '')
      if references_level and b.level <= references_level then references_level = nil end
      if text == 'references' and not references_level then references_level = b.level end
      return b
    end
    if references_level then return b end
    if b.t == 'Para' or b.t == 'Plain' then
      return (readable(b) and not is_label(b)) and number(b) or b
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
    elseif b.t == 'Div' and b.classes:includes('poem') then
      return number_poem(b)
    elseif b.t == 'Div' then
      for _, c in ipairs(b.classes) do if SKIP[c] then return b end end
      b.content = walk_blocks(b.content)
    elseif b.t == 'BulletList' or b.t == 'OrderedList' then
      if not seen_header and is_metadata_list(b) then return b end
      if whole_lists then return number_list(b) end
      local items = {}
      for i, item in ipairs(b.content) do items[i] = walk_blocks(item) end
      b.content = items
    elseif b.t == 'DefinitionList' then
      if whole_lists then return number_list(b) end
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
