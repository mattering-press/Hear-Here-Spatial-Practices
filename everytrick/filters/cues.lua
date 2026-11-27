-- SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
-- Stage 2, paragraph cues: when each transcript paragraph is heard in its recording. A recording may have a cue file
-- beside it, media/audio/<recording>.paragraphs.vtt (made by scripts/align.mjs, corrected by hand), whose cues build.mjs
-- hands over in its manifest. Each cue holds the words of its paragraph, not its number, because numbers change from
-- release to release while media files are shared by every version; this filter finds each cue's paragraph by its
-- words and marks it:
--   <div id="p17" class="para" data-cue-for="audio-1" data-cue-start="334.36" data-cue-end="361.52">
-- assets/player.js reads these: a ▸ on the paragraph plays from its start, and the paragraph being heard is marked.
-- Runs after paragraphs.lua (which makes the div.para) and embeds.lua (which names the players audio-1, audio-2 …).
-- A cue that matches no paragraph is reported, and its paragraph left untimed: the text has changed since it was timed.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

-- word pairs of a normalised text, for matching a paragraph whose text has changed a little since it was timed
local function pairs_of(text)
  local words, set, n = {}, {}, 0
  for w in text:gmatch('%S+') do words[#words + 1] = w end
  for i = 1, #words - 1 do
    local key = words[i] .. ' ' .. words[i + 1]
    if not set[key] then set[key] = true; n = n + 1 end
  end
  return set, n
end
local function similarity(a, b)   -- the share of word pairs the two texts have in common, of the larger set
  local sa, na = pairs_of(a)
  local sb, nb = pairs_of(b)
  if na == 0 or nb == 0 then return a == b and 1 or 0 end
  local common = 0
  for key in pairs(sa) do if sb[key] then common = common + 1 end end
  return common / math.max(na, nb)
end

function Pandoc(doc)
  lib.init(doc.meta)
  local players = lib.get(doc, 'audio')
  local timed = {}
  for _, player in ipairs(players) do
    local info = lib.audio(player.url)
    if info and info.cues then timed[#timed + 1] = { element = player.element, cues = info.cues, file = info.cueFile } end
  end
  if #timed == 0 then return nil end

  -- the page's paragraphs, in order, with their normalised text
  local paras = {}
  doc.blocks:walk { Div = function(div)
    if div.classes:includes('para') then paras[#paras + 1] = { id = div.identifier, text = lib.normalise(pandoc.utils.stringify(div)) } end
  end }

  -- Each recording's cues, in order, against the paragraphs from where its previous cue matched: the same text, or else
  -- the most similar of the next few paragraphs if it shares most of its word pairs.
  local marks = {}
  for _, rec in ipairs(timed) do
    local from = 1
    for _, cue in ipairs(rec.cues) do
      local text = lib.normalise(cue.text)
      local found
      for i = from, #paras do
        if paras[i].text == text then found = i; break end
      end
      if not found then
        local best, score = nil, 0.6
        for i = from, math.min(#paras, from + 12) do
          local s = similarity(paras[i].text, text)
          if s > score and not marks[paras[i].id] then best, score = i, s end
        end
        found = best
      end
      if found and not marks[paras[found].id] then
        marks[paras[found].id] = { rec.element, cue.start, cue['end'] }
        from = found + 1
      else
        local h, m, s = math.floor(cue.start / 3600), math.floor(cue.start % 3600 / 60), math.floor(cue.start % 60)
        io.stderr:write(string.format('%s: the cue at %02d:%02d:%02d in %s matches no paragraph: its text has changed since it was timed. Re-time it, or delete the cue (“%s”)\n',
          lib.page, h, m, s, rec.file, cue.text:sub(1, 60)))
      end
    end
  end

  return doc:walk { Div = function(div)
    local mark = div.classes:includes('para') and marks[div.identifier]
    if not mark then return nil end
    div.attributes['data-cue-for'] = mark[1]
    div.attributes['data-cue-start'] = string.format('%.2f', mark[2])
    div.attributes['data-cue-end'] = string.format('%.2f', mark[3])
    return div
  end }
end
