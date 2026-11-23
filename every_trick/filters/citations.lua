-- Stage 2, citations. During the parallel run the Markdown keeps its plain-text citations and typed reference lists
-- (Juncture would show Pandoc's [@key] as it is). This filter links them to the book's bibliography,
-- references/bibliography.json, which build.mjs hands over as -M citations=<index file> (see citations.mjs).
--
-- Citations it reads, in a bracket, several separated by ";":
--   (Hall, 2001)  (Becker 2007: 74)  (Puwar and Sharma, 2012)  (Stengers et al, 2014)  (Pratt 1991, 1992)
--   year only, the author being named in the same sentence: Fryer (1984), Haraway … 'Staying with the Trouble' (2016),
--   Pratt, (1991;1992), Frichot … (2017:147)
-- A citation is matched by the first author's surname and the year (with its letter, 2005a, if typed). A year-only
-- citation takes the nearest bibliography author with that year in the sentence, before the bracket first, then after
-- it; one with a page or other locator may also take one earlier in the paragraph. Two works with the same author
-- and year, typed without a letter, are told apart by a page number that falls in only one of their page ranges.
-- Nothing is guessed beyond that: anything else is reported as unmatched, and the text is never changed.
--
-- What it does to the page:
--   - the citation inside the brackets (Hall, 2001 / 1984 / 2017:147) becomes a link, class "citation", to the
--     work's entry in this page's typed reference list if the list has it, otherwise to its entry on the References
--     page of the same edition (references/#hall2001, which build.mjs writes from the whole bibliography);
--   - every paragraph of the page's "References" section that is a typed bibliography entry is wrapped in a div
--     with the id ref-<key> (and class typed-reference), the target of those links;
--   - every cited reference, formatted by citeproc in the house style, is added at the end as a popover that
--     assets/citations.js shows on hover, focus and tap. The link names it in aria-describedby.
-- page.json gets `references`; build.mjs gets `citations` and `typed` for its report and the References page.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'
os.setlocale('C', 'ctype')   -- %s and %a match ASCII only, never a byte inside a UTF-8 character

-- Accented letters and typographic quotes -> ASCII, so that "Verges" finds Vergès and sentences can be split.
local FOLD = {}
for ascii, chars in pairs {
  a = 'àáâãäåā', A = 'ÀÁÂÃÄÅĀ', c = 'çćč', C = 'ÇĆČ', e = 'èéêëēęě', E = 'ÈÉÊËĒĘĚ', i = 'ìíîïī', I = 'ÌÍÎÏĪ',
  n = 'ñń', N = 'ÑŃ', o = 'òóôõöøō', O = 'ÒÓÔÕÖØŌ', u = 'ùúûüū', U = 'ÙÚÛÜŪ', y = 'ýÿ', Y = 'Ý', s = 'śš', S = 'ŚŠ',
  z = 'źżž', Z = 'ŹŻŽ', l = 'ł', L = 'Ł', ["'"] = '‘’', ['"'] = '“”', ['-'] = '–—',
} do
  for _, code in utf8.codes(chars) do FOLD[utf8.char(code)] = ascii end
end
FOLD['ß'] = 'ss'
local function fold(s) return (s:gsub('[\xC2-\xF4][\x80-\xBF]*', FOLD)) end
local function trim(s) return (s:gsub('^%s+', ''):gsub('%s+$', '')) end
-- whitespace, including no-break and thin spaces, as one space (as \s+ in citations.mjs)
local function norm(s) return trim(s:gsub('\xC2\xA0', ' '):gsub('\xE2\x80[\x80-\x8A\xAF]', ' '):gsub('%s+', ' ')) end

local index, entries, by_name_year, by_year, surnames = nil, {}, {}, {}, {}
local function load_index(path)
  local f = assert(io.open(path, 'r'))
  index = pandoc.json.decode(f:read('a'), false)
  f:close()
  local keys = {}
  for key in pairs(index.entries) do keys[#keys + 1] = key end
  table.sort(keys)
  for _, key in ipairs(keys) do
    local e = index.entries[key]
    e.key = key
    entries[#entries + 1] = e
    if e.surname then
      local id = fold(e.surname):lower() .. '|' .. (e.year or '')
      by_name_year[id] = by_name_year[id] or {}
      table.insert(by_name_year[id], e)
      surnames[fold(e.surname)] = true
    end
    if e.year then
      by_year[e.year] = by_year[e.year] or {}
      table.insert(by_year[e.year], e)
    end
  end
end

-- Positions of `name` as a whole word in `text` (both folded).
local function find_name(text, name)
  local hits, from = {}, 1
  while true do
    local s, e = text:find(name, from, true)
    if not s then return hits end
    if not text:sub(s - 1, s - 1):match('%a') and not text:sub(e + 1, e + 1):match('%a') then hits[#hits + 1] = s end
    from = s + 1
  end
end

-- The sentence before position `upto` in text, and the one that continues after it (both folded).
local BOUNDARY = '[%.!?][\'"%)%]]*%s+()[%u\'"%(]'
local function sentence_before(text)
  local start = 1
  for pos in text:gmatch(BOUNDARY) do start = pos end
  return text:sub(start)
end
local function sentence_after(text)
  local pos = text:find(BOUNDARY)
  return pos and text:sub(1, pos) or text
end

-- Locators: 74, 413, 417-18, p. 74, pp.12-14, para. 12, sec. 24, vol. 2, ch. 3 (after a ":" or ",").
local LABELS = { [''] = true, p = true, pp = true, para = true, paras = true, sec = true, secs = true, ch = true, chap = true, vol = true, vols = true, fig = true, n = true, no = true, l = true, ll = true }
local function is_locator(s)
  local label, rest = fold(s):match('^(%a*)%.?%s*([%d][%d%s,%-]*)$')
  return label and LABELS[label:lower()] and rest ~= nil
end
local function first_number(s) return tonumber(fold(s):match('%d+')) end

-- Words that may come before the names in a bracket: (see Hall, 2001), (aka Stengers, 2017).
local PREFIX = { see = true, aka = true, cf = true, ['cf.'] = true, ['e.g.'] = true, ['e.g.,'] = true, also = true, ['i.e.'] = true }
local PARTICLE = { de = true, la = true, le = true, du = true, des = true, del = true, della = true, di = true, da = true, van = true, von = true, der = true, den = true, ten = true, ter = true, y = true, et = true, al = true, ['al.'] = true, ['and'] = true, ['&'] = true }

-- "Puwar and Sharma, 2012: 40" -> { names, first, prefix, years = { {year, suffix, s, e} }, locator, lstart }
-- with positions relative to `text`; nil if it is not a citation.
local function parse_part(text)
  local from, ys, ye, year, suffix = 1
  while true do
    ys, ye, year, suffix = text:find('(%d%d%d%d)([a-h]?)', from)
    if not ys then return nil end
    if not text:sub(ys - 1, ys - 1):match('%w') and not text:sub(ye + 1, ye + 1):match('%w') and tonumber(year) >= 1500 and tonumber(year) <= 2099 then break end
    from = ye + 1
  end
  local years = { { year = year, suffix = suffix, s = ys, e = ye } }
  local rest_at = ye + 1
  while true do   -- more years of the same author: (Pratt 1991, 1992)
    local a, b, y2, s2 = text:find('^%s*,%s*(%d%d%d%d)([a-h]?)', rest_at)
    if not a or text:sub(b + 1, b + 1):match('%w') then break end
    years[#years + 1] = { year = y2, suffix = s2, s = b - #y2 - #s2 + 1, e = b }
    rest_at = b + 1
  end
  local rest = text:sub(rest_at)
  local sep, locator = rest:match('^%s*([:,]?)%s*(.-)%s*$')
  if locator ~= '' and not (sep ~= '' and is_locator(locator)) then return nil end
  local names = trim(text:sub(1, ys - 1):gsub('[%s,]+$', ''))
  local words, prefix = {}, nil
  for w in names:gmatch('%S+') do words[#words + 1] = w end
  while words[1] and PREFIX[words[1]:lower()] and words[1]:match('^%l') do prefix = (prefix and prefix .. ' ' or '') .. table.remove(words, 1) end
  for _, w in ipairs(words) do
    local bare = w:gsub(',$', '')
    if bare:match('[%d<>/:]') or not (PARTICLE[bare] or bare:match('^[%u\xC2-\xF4]')) then return nil end
  end
  names = table.concat(words, ' ')
  local first = names:gsub(',.*$', ''):gsub('%s+and%s.*$', ''):gsub('%s*&.*$', ''):gsub('%s+et%s+al%.?.*$', '')
  return { names = names, first = trim(first), prefix = prefix, years = years, locator = locator,
           lstart = locator ~= '' and (#text - #rest + rest:find(locator, 1, true)) or nil }
end

local function candidates(list, suffix)
  local out = {}
  for _, e in ipairs(list or {}) do
    if suffix == '' or e.suffix == suffix then out[#out + 1] = e end
  end
  return out
end

-- Two works by the same author in the same year, typed without a letter: take the one whose pages hold the locator.
local function by_page(cands, locator)
  local n = locator and first_number(locator)
  if not n then return nil end
  local hit
  for _, e in ipairs(cands) do
    if e.pages and n >= e.pages[1] and n <= e.pages[2] then
      if hit then return nil end
      hit = e
    end
  end
  return hit
end

-- Nearest author with that year: last before, else first after (both folded texts).
local function nearest(cands, before, after)
  local best, best_pos
  for _, e in ipairs(cands) do
    local hits = find_name(before, fold(e.surname))
    if #hits > 0 and (not best_pos or hits[#hits] > best_pos) then best, best_pos = e, hits[#hits] end
  end
  if best then return best end
  for _, e in ipairs(cands) do
    local hits = find_name(after, fold(e.surname))
    if #hits > 0 and (not best_pos or hits[1] < best_pos) then best, best_pos = e, hits[1] end
  end
  return best
end

local function mentions_author(text)
  for name in pairs(surnames) do
    if #find_name(text, name) > 0 then return true end
  end
  return false
end

-- The page's state
local listed = {}         -- key -> true: entries of this page's typed list
local cited = {}          -- key -> { anchors }
local cited_order = {}
local records = {}        -- every citation found, for build.mjs
local counter = {}

-- Where a citation of e leads: the work in this page's typed list, or else on the References page, which lists every
-- work of the bibliography (relative to the edition's root, for page.json, when `from_root` is set).
local function target(e, from_root)
  if listed[e.key] then return from_root and (lib.page_url(lib.page) .. '#ref-' .. e.key) or ('#ref-' .. e.key) end
  return (from_root and '' or lib.root) .. 'references/#' .. e.key
end

local function link_maker(e, text)
  return function(content)
    counter[e.key] = (counter[e.key] or 0) + 1
    local anchor = 'cite-' .. e.key .. '-' .. counter[e.key]
    if not cited[e.key] then cited[e.key] = {}; cited_order[#cited_order + 1] = e.key end
    table.insert(cited[e.key], anchor)
    return pandoc.Link(content, target(e), '', pandoc.Attr(anchor, { 'citation' }, {
      { 'data-popover', 'ref-popover-' .. e.key }, { 'aria-describedby', 'ref-text-' .. e.key } }))
  end
end

-- An inline list as text, with the span of each element; Str and Space can be split, other elements cannot.
local OPAQUE_EMPTY = { Note = true, Image = true }
local function flatten(inlines)
  local parts, buf, pos = {}, {}, 0
  for i, el in ipairs(inlines) do
    local kind, t = 'other', ''
    if el.t == 'Str' then kind, t = 'str', el.text
    elseif el.t == 'Space' or el.t == 'SoftBreak' or el.t == 'LineBreak' then kind, t = 'space', ' '
    elseif not OPAQUE_EMPTY[el.t] then t = pandoc.utils.stringify(el) end
    parts[i] = { s = pos + 1, e = pos + #t, kind = kind }
    buf[#buf + 1] = t
    pos = pos + #t
  end
  return table.concat(buf), parts
end

-- Rebuild the inline list with the segments { s, e, make } turned into links.
local function rebuild(inlines, parts, segs)
  local out, cur, cur_seg, si = pandoc.Inlines {}, nil, nil, 1
  local function flush()
    if cur then out:insert(cur_seg.make(cur)) end
    cur, cur_seg = nil, nil
  end
  local function emit(el, s, e)
    while segs[si] and segs[si].e < s do si = si + 1 end
    local seg = segs[si]
    if seg and s >= seg.s and e <= seg.e then
      if cur_seg ~= seg then flush(); cur, cur_seg = pandoc.Inlines {}, seg end
      cur:insert(el)
    else
      flush()
      out:insert(el)
    end
  end
  for i, el in ipairs(inlines) do
    local p = parts[i]
    if p.kind == 'str' then
      local cuts = {}
      for _, g in ipairs(segs) do
        if g.s > p.s and g.s <= p.e then cuts[#cuts + 1] = g.s end
        if g.e >= p.s and g.e < p.e then cuts[#cuts + 1] = g.e + 1 end
      end
      table.sort(cuts)
      local start = p.s
      for _, c in ipairs(cuts) do
        if c > start then emit(pandoc.Str(el.text:sub(start - p.s + 1, c - p.s)), start, c - 1); start = c end
      end
      emit(pandoc.Str(el.text:sub(start - p.s + 1)), start, p.e)
    else
      emit(el, p.s, p.e)
    end
  end
  flush()
  return out
end

local CONTAINERS = { Emph = true, Strong = true, Underline = true, Strikeout = true, SmallCaps = true, Span = true, Quoted = true, Superscript = true, Subscript = true }

-- Brackets without a bracket inside: "(Pratt, (1991;1992)" gives "(1991;1992)".
local function brackets(S)
  local found, i = {}, 1
  while true do
    local o = S:find('(', i, true)
    if not o then return found end
    local c = S:find(')', o + 1, true)
    if not c then return found end
    local inner = S:find('(', o + 1, true)
    if inner and inner < c then i = inner else found[#found + 1] = { o = o, c = c }; i = c + 1 end
  end
end

local function process(inlines, prefix)
  local S, parts = flatten(inlines)
  for i, el in ipairs(inlines) do
    if CONTAINERS[el.t] then
      el.content = process(el.content, prefix .. S:sub(1, parts[i].s - 1))
      inlines[i] = el
    end
  end
  local segs = {}
  for _, b in ipairs(brackets(S)) do
    local splittable = true
    for _, p in ipairs(parts) do
      if p.kind == 'other' and p.e >= b.o and p.s <= b.c and p.e >= p.s then splittable = false end
    end
    -- split the bracket at ";" and parse every part; all of them must be citations
    local pieces, ok, pos = {}, splittable, b.o + 1
    while ok do
      local semi = S:find(';', pos, true)
      local stop = (semi and semi < b.c) and semi - 1 or b.c - 1
      local raw = S:sub(pos, stop)
      local lead = #raw:match('^%s*')
      local text = trim(raw)
      local parsed = text ~= '' and parse_part(text)
      if not parsed then ok = false break end
      parsed.base = pos + lead - 1   -- S position = base + position in text
      parsed.text = text
      pieces[#pieces + 1] = parsed
      if stop == b.c - 1 then break end
      pos = stop + 2
    end
    if ok and #pieces > 0 then
      local bracket = S:sub(b.o, b.c)
      local before = fold(prefix .. S:sub(1, b.o - 1))
      local after = fold(S:sub(b.c + 1))
      local sentence = trim(sentence_before(before) .. bracket .. sentence_after(after))
      for _, part in ipairs(pieces) do
        for yi, y in ipairs(part.years) do
          local e, status, how = nil, nil, nil
          local cands
          if part.first ~= '' then
            cands = candidates(by_name_year[fold(part.first):lower() .. '|' .. y.year], y.suffix)
            if #cands == 1 then e = cands[1]
            elseif #cands > 1 then e = by_page(cands, yi == #part.years and part.locator or nil); how = e and 'page range' end
          else
            cands = candidates(by_year[y.year], y.suffix)
            e = nearest(cands, sentence_before(before), sentence_after(after))
            if not e and part.locator ~= '' then e = nearest(cands, before, ''); how = e and 'earlier in the paragraph' end
          end
          if e then status = 'matched'
          elseif #cands > 1 and part.first ~= '' then status = 'ambiguous'
          elseif part.first ~= '' or part.locator ~= '' or mentions_author(sentence) then status = 'unmatched'
          else status = 'date' end
          -- the linked text: names and first year (and the locator after the last year)
          local s = (yi == 1) and 1 or y.s
          local en = (yi == #part.years and part.lstart) and #part.text or y.e
          local text = part.text:sub(s, en)
          local rec = { status = status, text = text, bracket = bracket, names = part.names, year = y.year, suffix = y.suffix,
                        locator = yi == #part.years and part.locator or '', form = part.first ~= '' and 'parenthetical' or 'year',
                        key = e and e.key or nil, how = how, sentence = sentence }
          if status == 'ambiguous' then
            rec.candidates = {}
            for _, c in ipairs(cands) do rec.candidates[#rec.candidates + 1] = c.key end
          end
          records[#records + 1] = rec
          if e then
            local seg = { s = part.base + s, e = part.base + en }
            local make = link_maker(e, text)
            seg.make = function(content)
              local link = make(content)
              rec.id = link.identifier
              return link
            end
            segs[#segs + 1] = seg
          end
        end
      end
    end
  end
  if #segs == 0 then return inlines end
  table.sort(segs, function(a, c) return a.s < c.s end)
  return rebuild(inlines, parts, segs)
end

local MEDIA = { video = true, embed = true, audio = true, gallery = true, cards = true }
local function walk_block(b)
  if b.t == 'Para' or b.t == 'Plain' then b.content = process(b.content, '')
  elseif b.t == 'BlockQuote' then b.content = b.content:map(walk_block)
  elseif b.t == 'Div' then
    -- not inside media: captions of videos, embeds and galleries are not read for citations
    for _, c in ipairs(b.classes) do if MEDIA[c] or c:match('^twin%-') then return b end end
    b.content = b.content:map(walk_block)
  elseif b.t == 'BulletList' or b.t == 'OrderedList' then
    local items = {}
    for j, item in ipairs(b.content) do items[j] = pandoc.Blocks(item):map(walk_block) end
    b.content = items
  end
  return b
end

-- The typed reference list: the blocks after a "References" heading, up to the next heading of its level or higher.
local function references_section(blocks)
  for i, b in ipairs(blocks) do
    if b.t == 'Header' and norm(pandoc.utils.stringify(b)):lower() == 'references' then
      local last = #blocks
      for j = i + 1, #blocks do
        if blocks[j].t == 'Header' and blocks[j].level <= b.level then last = j - 1 break end
      end
      return i + 1, last
    end
  end
end

-- Keys whose typed text on this page is this paragraph (exactly, or failing that, by its first 40 characters).
local function typed_keys(text)
  local exact, prefix = {}, {}
  for _, e in ipairs(entries) do
    local t = e.typed and e.typed[lib.page]
    if t then
      if t == text then exact[#exact + 1] = e.key
      elseif #t >= 40 and #text >= 40 and t:sub(1, 40) == text:sub(1, 40) then prefix[#prefix + 1] = e.key end
    end
  end
  return #exact > 0 and exact or prefix
end

function Pandoc(doc)
  lib.init(doc.meta)
  local path = doc.meta.citations and pandoc.utils.stringify(doc.meta.citations)
  if not path or path == '' then return nil end
  load_index(path)
  doc.meta.citations = nil
  local blocks = doc.blocks
  local first, last = references_section(blocks)
  local typed = { listed = {}, unmatched = {} }
  if first then
    for i = first, last do
      local b = blocks[i]
      if b.t == 'Para' or b.t == 'Plain' then
        local text = norm(pandoc.utils.stringify(b))
        local keys = typed_keys(text)
        if #keys > 0 then
          for k = #keys, 2, -1 do b.content:insert(1, pandoc.Span({}, pandoc.Attr('ref-' .. keys[k]))) end
          blocks[i] = pandoc.Div({ b }, pandoc.Attr('ref-' .. keys[1], { 'typed-reference' }))
          for _, k in ipairs(keys) do listed[k] = true; typed.listed[#typed.listed + 1] = k end
        elseif text ~= '' then
          typed.unmatched[#typed.unmatched + 1] = text
        end
      end
    end
  end
  for i, b in ipairs(blocks) do
    if not first or i < first - 1 or i > last then blocks[i] = walk_block(b) end
  end

  -- popovers and page data: cited references first, in order of first citation, then the rest of the typed list
  local refs, html = {}, {}
  local order = {}
  for _, k in ipairs(cited_order) do order[#order + 1] = k end
  for _, k in ipairs(typed.listed) do if not cited[k] then order[#order + 1] = k end end
  for _, key in ipairs(order) do
    local e = index.entries[key]
    refs[#refs + 1] = { key = key, html = e.html, url = target(e, true), citations = cited[key] or {} }
    if cited[key] then
      html[#html + 1] = string.format(
        '<div id="ref-popover-%s" class="citation-popover" popover="manual"><p id="ref-text-%s" class="citation-popover__text">%s</p>'
        .. '<p class="citation-popover__more"><a href="%s">Go to the reference list</a></p></div>',
        key, key, e.html, lib.esc(target(e)))
    end
  end
  if #html > 0 then
    blocks:insert(pandoc.RawBlock('html', '<div class="citation-popovers">\n' .. table.concat(html, '\n') .. '\n</div>'))
    doc.meta['has-citations'] = true
  end
  doc.blocks = blocks
  lib.add(doc, 'references', refs)
  lib.add(doc, 'citations', records)
  lib.add(doc, 'typed', { typed })
  return doc
end
