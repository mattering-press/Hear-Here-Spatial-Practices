-- Margin notes (the rules are in CONTRACT.md, "Margin notes and their numbers"; the plan in DEVELOPMENT.md).
-- A note is written directly after the paragraph it belongs to:
--   ::: {.margin}
--   **Newspaper Stories**
--   …
--   :::
-- Text notes are numbered from 1 on each page, in order, as n1, n2 …, and become
--   <aside id="n1" class="margin" aria-label="Note 1"><a class="margin-number" href="#n1-mark">1</a>…</aside>
-- with a matching mark, <a class="margin-mark" id="n1-mark" href="#n1">1</a>, at the end of the paragraph before the note.
-- On wide screens the stylesheet sets the note in the right-hand margin, level with that paragraph; elsewhere
-- (phones, print) it stays in reading order after the paragraph.
-- Runs after paragraphs.lua, which does not number anything inside a note, so paragraph numbers ignore the margin.
local count = 0

local function last_para(block)
  if not block then return nil end
  if block.t == 'Para' or block.t == 'Plain' then return block end
  if block.t == 'Div' or block.t == 'BlockQuote' then return last_para(block.content[#block.content]) end
  return nil
end

local function note(div, before)
  count = count + 1
  local id, n = 'n' .. count, tostring(count)
  local para = last_para(before)
  if para then
    para.content:insert(pandoc.RawInline('html', string.format(
      '<a class="margin-mark" id="%s-mark" href="#%s" aria-label="Note %s">%s</a>', id, id, n, n)))
  end
  -- the note's number links back to its mark in the text
  local number = para and string.format('<a class="margin-number" href="#%s-mark" aria-label="Back to the text">%s</a>', id, n)
    or string.format('<span class="margin-number">%s</span>', n)
  local open = string.format('<aside id="%s" class="margin" aria-label="Note %s">%s', id, n, number)
  local out = pandoc.Blocks { pandoc.RawBlock('html', open) }
  out:extend(div.content)
  out:insert(pandoc.RawBlock('html', '</aside>'))
  return out
end

local function walk(blocks)
  local out = pandoc.Blocks {}
  for _, b in ipairs(blocks) do
    if b.t == 'Div' and b.classes:includes('margin') then
      out:extend(note(b, out[#out]))
    else
      if b.t == 'Div' or b.t == 'BlockQuote' then b.content = walk(b.content) end
      out:insert(b)
    end
  end
  return out
end

function Pandoc(doc)
  doc.blocks = walk(doc.blocks)
  return doc
end
