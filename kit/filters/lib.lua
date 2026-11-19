-- Helpers shared by the filters. Each filter loads this file with
--   package.path = pandoc.path.directory(PANDOC_SCRIPT_FILE) .. '/?.lua;' .. package.path
--   local lib = require 'lib'
-- and calls lib.init(doc.meta) first, which reads the values build.mjs passes to every page with -M.
local M = {}

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

-- URL for a repository file that is not an image: the copy in the site if the build copied it,
-- otherwise the file on GitHub, as Juncture does. (convert.mjs warns about links to missing files.)
function M.file_url(path)
  if load_manifest().files[path] then return M.root .. M.pct(path) end
  return 'https://raw.githubusercontent.com/' .. M.repo .. '/main/' .. M.pct(path)
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

return M
