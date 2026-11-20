-- Transcripts, as Juncture's custom.js does them in the browser:
--  * the section under a "Transcript" heading is wrapped in <div class="transcript">
--  * a paragraph that is only a timecode, such as [00:10:13], links to the page's first audio player:
--    <a class="timecode" href="#audio-1" data-seconds="613">[00:10:13]</a>
--    Without JavaScript the link goes to the player; assets/seek.js makes it play from that moment.
package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
local lib = require 'lib'

local player

local function timecode(para)
  local first = para.content[1]
  if not (player and first and first.t == 'Str') then return nil end
  local h, m, s = first.text:match('^%[(%d%d):(%d%d):(%d%d)%]$')
  if not h then return nil end
  local seconds = tostring(tonumber(h) * 3600 + tonumber(m) * 60 + tonumber(s))
  para.content[1] = pandoc.Link({ first }, '#' .. player, '', pandoc.Attr('', { 'timecode' }, { { 'data-seconds', seconds } }))
  return para
end

function Pandoc(doc)
  lib.init(doc.meta)
  local audio = lib.get(doc, 'audio')
  player = audio[1] and audio[1].element
  doc.blocks = doc.blocks:walk { Para = timecode }

  local out, blocks, i = {}, doc.blocks, 1
  while i <= #blocks do
    local b = blocks[i]
    out[#out + 1] = b
    i = i + 1
    if b.t == 'Header' and pandoc.utils.stringify(b.content) == 'Transcript' then
      local section = {}
      while i <= #blocks and not (blocks[i].t == 'Header' and blocks[i].level <= b.level) do
        section[#section + 1] = blocks[i]
        i = i + 1
      end
      out[#out + 1] = pandoc.Div(section, pandoc.Attr('', { 'transcript' }))
    end
  end
  doc.blocks = out
  return doc
end
