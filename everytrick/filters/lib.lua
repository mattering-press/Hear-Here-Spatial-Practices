-- SPDX-License-Identifier: AGPL-3.0-or-later. Part of everytrickinthebook, https://everytrick.org/. Copyright © 2026 Studio Julien McHardy (SJMcH) and the everytrickinthebook contributors. See NOTICE.md.
-- Helpers shared by the filters. Each filter loads this file with
--   package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
--   local lib = require 'lib'
-- and calls lib.init(doc.meta) first, which reads the values build.mjs passes to every page with -M.
local M = {}
os.setlocale('C', 'ctype')   -- %p and %c match ASCII only, never a byte inside a UTF-8 character

function M.init(meta)
  local function get(key) return meta[key] and pandoc.utils.stringify(meta[key]) or '' end
  M.page = get('page')                -- repository path of this page, e.g. essays/walk.md
  M.root = get('root')                -- relative URL of the site root from this page, e.g. ../../
  M.repo = get('repo')                -- owner/name of the GitHub repository
  M.title = get('title')
  M.subtitle = get('subtitle')
  M.lang = get('lang')
  M.title_heading = get('title-heading') ~= ''
  M.manifest_path = get('manifest')   -- JSON file written by build.mjs: resized images and copied files
  M.contract_path = get('contract-out')
  M.item_page = get('item-page') ~= ''   -- an item's own page (/see/<name>/): its number is not a link to itself
end

-- root .. url, for a url relative to the site root. In a frozen version (v<id>/) the media shared by all versions
-- are one level up, so their URLs in the build's manifest start with ../: against an absolute root (publication.md)
-- these steps are resolved, and "./../images/…" becomes "../images/…".
function M.join(root, url)
  if root:match('^[%a][%w+.-]*://') then
    while url:sub(1, 3) == '../' and root:match('^[%a][%w+.-]*://[^/]+/.+/$') do
      root, url = root:match('^(.*/)[^/]+/$'), url:sub(4)
    end
    return root .. url
  end
  if root == './' and url:sub(1, 3) == '../' then return url end
  return root .. url
end

-- Image URLs that the filters made from the manifest during this run, so that they are not resized twice.
M.generated = {}
function M.site_url(url)
  local out = M.join(M.root, url)
  M.generated[out] = true
  return out
end

-- Escape text for HTML element content and attribute values.
function M.esc(s)
  return (tostring(s):gsub('&', '&amp;'):gsub('<', '&lt;'):gsub('>', '&gt;'):gsub('"', '&quot;'))
end

function M.unpct(s) return (s:gsub('%%(%x%x)', function(h) return string.char(tonumber(h, 16)) end)) end
function M.pct(path) return (path:gsub('[^%w%-%._~/]', function(c) return string.format('%%%02X', c:byte()) end)) end

-- A relative or root-absolute URL in the Markdown -> repository path plus the rest (?query#fragment).
-- Returns nil for external URLs and fragment-only links.
function M.resolve(url)
  if url == '' or url:match('^[%a][%w+.-]*:') or url:sub(1, 2) == '//' or url:sub(1, 1) == '#' then return nil end
  local path, rest = url:match('^([^#?]*)(.*)$')
  path = M.unpct(path)
  local base = path:sub(1, 1) == '/' and '' or (M.page:match('^(.*)/[^/]*$') or '')
  local parts = {}
  for seg in (base .. '/' .. path):gmatch('[^/]+') do
    if seg == '..' then table.remove(parts) elseif seg ~= '.' then parts[#parts + 1] = seg end
  end
  return table.concat(parts, '/'), rest
end

-- Site URL of a page, relative to the site root: README.md -> "", essays/walk.md -> "essays/walk/".
function M.page_url(path)
  if path == '' or path == 'README.md' then return '' end
  return M.pct((path:gsub('%.md$', ''))) .. '/'
end

-- A URL of a file in this repository on GitHub (github.com/…/raw/… or raw.githubusercontent.com/…)
-- -> repository path, or nil for any other URL.
function M.github_path(url)
  local repo = M.repo:gsub('%p', '%%%0')
  for _, prefix in ipairs {
    '^https://github%.com/' .. repo .. '/raw/refs/heads/main/',
    '^https://github%.com/' .. repo .. '/raw/main/',
    '^https://raw%.githubusercontent%.com/' .. repo .. '/refs/heads/main/',
    '^https://raw%.githubusercontent%.com/' .. repo .. '/main/',
  } do
    local path = url:match(prefix .. '([^?#]+)')
    if path then return M.unpct(path) end
  end
end

local manifest
local function load_manifest()
  if not manifest then
    local f = assert(io.open(M.manifest_path, 'r'))
    manifest = pandoc.json.decode(f:read('a'), false)
    f:close()
  end
  return manifest
end

-- The resized copy of an image: { url, width, height, tiles } (URLs relative to the site root).
function M.image(role, src, rotation)
  local key = role .. '|' .. src .. '|' .. tostring(math.floor(tonumber(rotation) or 0))
  local entry = load_manifest().images[key]
  if not entry then error('build.mjs made no ' .. role .. ' image for ' .. src .. ' (' .. M.page .. ')') end
  entry.width, entry.height = math.floor(entry.width), math.floor(entry.height)  -- JSON numbers arrive as floats
  return entry
end

-- The resized copy that a site URL (relative to this page, or to the site root) points at, or nil.
function M.image_at(url)
  local path = url:sub(1, #M.root) == M.root and url:sub(#M.root + 1) or url
  local by_url = load_manifest().by_url
  local entry = by_url and by_url[M.unpct(path)]
  if entry then entry.width, entry.height = math.floor(entry.width), math.floor(entry.height) end
  return entry
end

-- What build.mjs found out about an audio file in this repository, by its URL on GitHub: { duration } in seconds,
-- or nil for audio from elsewhere.
function M.audio(url)
  local path = M.github_path(url)
  local entry = path and load_manifest().audio
  return entry and entry[path] or nil
end

-- URL for a repository file that is not an image: the copy in the site if the build copied it (shared by all
-- versions, so it may start with ../),
-- otherwise the file on GitHub, as Juncture does. (convert.mjs warns about links to missing files.)
function M.file_url(path)
  local copy = load_manifest().files[path]
  if copy then return M.join(M.root, M.pct(copy)) end
  return 'https://raw.githubusercontent.com/' .. M.repo .. '/main/' .. M.pct(path)
end

-- ---- Media items (the media register, media/register.csv; see register.mjs) -------------------------------------

-- What the register calls a media item: the repository path of a file of this repository, or a normalised address
-- for an item elsewhere, so that the same item has the same source on every page and in every form of its address:
--   https://www.youtube.com/watch?v=<id>       (also for youtu.be, /embed/ and youtube-nocookie.com addresses)
--   https://vimeo.com/<id>/<hash> or /<id>     (also for player.vimeo.com/video/<id>?h=<hash>)
--   https://archive.org/details/<identifier>   (for its /details/ and /embed/ addresses, any mode)
--   any other address as given
-- url is a link target as the Markdown has it. where = 'repo': relative to the page in the repository, or
-- root-absolute (the converted page, before stage 1); where = 'site': relative to the page in the site (stage 2), where
-- shared media of a frozen version start with ../ (see M.join).
function M.media_source(url, where)
  local path = M.github_path(url)
  if path then return path end
  local yt = url:match('^https?://[%w.]*youtube%.com/watch%?v=([%w_-]+)') or url:match('^https?://youtu%.be/([%w_-]+)')
    or url:match('^https?://[%w.]*youtube[%w-]*%.com/embed/([%w_-]+)')
  if yt then return 'https://www.youtube.com/watch?v=' .. yt end
  local vimeo, hash = url:match('^https?://player%.vimeo%.com/video/(%d+)%?h=(%w+)')
  if not vimeo then vimeo, hash = url:match('^https?://vimeo%.com/(%d+)/(%w+)') end
  vimeo = vimeo or url:match('^https?://vimeo%.com/(%d+)') or url:match('^https?://player%.vimeo%.com/video/(%d+)')
  if vimeo then return 'https://vimeo.com/' .. vimeo .. (hash and ('/' .. hash) or '') end
  local archive = url:match('^https?://[%w.]*archive%.org/%a+/([^/?#]+)')
  if archive then return 'https://archive.org/details/' .. archive end
  if url:match('^[%a][%w+.-]*:') or url:sub(1, 2) == '//' then return url end
  if where == 'site' then
    local path = url:match('^([^?#]*)')
    if M.root ~= './' and path:sub(1, #M.root) == M.root then path = path:sub(#M.root + 1) end
    if path:sub(1, 2) == './' then path = path:sub(3) end
    while path:sub(1, 3) == '../' do path = path:sub(4) end   -- media shared by all versions, seen from a frozen one
    return M.unpct(path)
  end
  return (M.resolve(url))
end

-- The register's item for a source, as build.mjs hands it over in the manifest:
--   { label = "37" (nil for an item not yet numbered), kind, name, url (its item page, from the edition's root),
--     credit, title }
function M.item(source)
  local items = source and load_manifest().items
  local item = items and items[source] or nil
  if item and type(item.label) ~= 'string' then item.label = nil end   -- JSON's null is not nil
  return item
end

-- A document whose pages the build shows (documents.mjs), by its item's name, as build.mjs hands it over:
--   { title, kind ("pdf" or "zine"), text (true when its pages have text), json (its document.json), page (its item
--     page), download = { url, label, size, external }, pages = { { width, height, srcset = { { url, width } } } } }
-- with URLs from the edition's root; nil for any other item.
function M.document(name)
  local docs = name and load_manifest().documents
  local doc = docs and docs[name] or nil
  if doc then
    for _, p in ipairs(doc.pages) do
      p.width, p.height = math.floor(p.width), math.floor(p.height)
      for _, c in ipairs(p.srcset) do c.width = math.floor(c.width) end
    end
  end
  return doc
end

-- Every item on a page gets a stable anchor: by its number (item-37), or by its name until it has one; the same item a
-- second time on the page gets item-37-2.
local anchors = {}
function M.anchor(item)
  local base = 'item-' .. (item.label or item.name)
  anchors[base] = (anchors[base] or 0) + 1
  return anchors[base] == 1 and base or (base .. '-' .. anchors[base])
end

-- The number pill that starts an item's caption line, a link to its item page:
--   <a class="item-number" href="../../see/boulder-font/" aria-label="Item 37">37</a>
-- (dashed, "new", for an item not yet numbered). On the item's own page it is not a link.
function M.pill(item)
  local new = not item.label
  local class = 'item-number' .. (new and ' is-new' or '')
  local text = new and 'new' or item.label
  local label = new and 'New item, not yet numbered' or ('Item ' .. item.label)
  if M.item_page then
    if new then return '<span class="' .. class .. '"><span aria-hidden="true">new</span><span class="visually-hidden">' .. label .. '</span></span>' end
    return '<span class="' .. class .. '"><span class="visually-hidden">Item </span>' .. text .. '</span>'
  end
  return '<a class="' .. class .. '" href="' .. M.esc(M.join(M.root, item.url)) .. '" aria-label="' .. label .. '">' .. text .. '</a>'
end

-- The inside of an item's caption line: its number pill, the caption (HTML) and the item's credit from the register,
-- exactly as stored ("Photo: …"), after a middle dot. Without an item, the caption alone.
function M.caption_line(item, caption)
  if not item then return caption end
  local credit = item.credit or ''
  if credit ~= '' then credit = '<span class="item-credit">' .. (caption ~= '' and ' · ' or '') .. M.esc(credit) .. '</span>' end
  return M.pill(item) .. (caption ~= '' and (' ' .. caption) or '') .. credit
end

-- Filters hand data for page.json to contract.lua through the document's metadata, as JSON text.
function M.get(doc, key)
  local value = doc.meta['twin-' .. key]
  return value and pandoc.json.decode(pandoc.utils.stringify(value), false) or {}
end

function M.add(doc, key, items)
  local list = M.get(doc, key)
  for _, item in ipairs(items) do list[#list + 1] = item end
  doc.meta['twin-' .. key] = pandoc.json.encode(list)
end


-- Where a link in the Markdown should point in the site: other pages by their site URL, repository files by their
-- copy in the site (or on GitHub), links to repository files on GitHub likewise. Returns the new target and the
-- page file it leads to (nil for other targets), or nothing if the link is left alone.
function M.fix_link(url)
  local path, rest = M.resolve(url)
  if not path then
    local file = M.github_path(url)
    if file then return M.file_url(file), nil end
    return nil
  end
  if path == '' or path:match('%.md$') then
    local page = path == '' and 'README.md' or path
    return M.root .. M.page_url(page) .. rest, page
  end
  -- a page the build makes, written as its address with a slash at the end (/about/bibliography-and-items/, or ./bibliography-and-items/ from
  -- about.md): kept as an address in the site
  if url:match('^[^#?]*/[#?]') or url:match('^[^#?]*/$') then return M.root .. M.pct(path) .. '/' .. rest, nil end
  return M.file_url(path) .. rest, nil
end

-- A plain-text string as Pandoc inlines (words and spaces), so that the writer escapes whatever needs it.
function M.words(s)
  local out = pandoc.Inlines {}
  for word in (s or ''):gmatch('%S+') do
    if #out > 0 then out:insert(pandoc.Space()) end
    out:insert(pandoc.Str(word))
  end
  return out
end

-- Punctuation that the normalised text leaves out, besides ASCII punctuation.
local PUNCT = { '‘', '’', '‚', '‛', '“', '”', '„', '‟', '–', '—', '―', '‐', '‑', '…', '•', '·', '«', '»', '‹', '›', '¶', '§', '′', '″', '\u{00A0}', '\u{2009}', '\u{202F}' }

-- The normalised text: lower case, punctuation and markup removed, words separated by single spaces.
-- "‘Dust’ – as Aya says…" -> "dust as aya says"
function M.normalise(text)
  local s = pandoc.text.lower(text)
  for _, p in ipairs(PUNCT) do s = s:gsub(p, ' ') end
  s = s:gsub('[%c%p]', ' ')     -- ASCII control characters and punctuation (C locale, set above)
  return (s:gsub('%s+', ' '):gsub('^ ', ''):gsub(' $', ''))
end

return M
