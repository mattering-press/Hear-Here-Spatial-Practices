// When each media item was first published and when its file last changed, from the repository's Git history, for the
// item pages and media.json ("Plan: media register, item pages and the Media Index" in DEVELOPMENT.md; CONTRACT.md,
// "media.json"). Two passes over the history, whatever the number of items:
//   first published  the day of the earliest commit whose change to a page (README.md, essays/*.md) adds a line that
//                    refers to the item: its file (its current or a former source), in any of the forms pages use
//                    (gh:…/media/x.jpg, /media/x.jpg, a raw GitHub address, data-repo-pdf="media/x.pdf"), or its address
//                    elsewhere, normalised as filters/lib.lua's media_source does (youtu.be and /embed/ addresses are
//                    the same YouTube video, archive.org's /embed/ and /details/ the same item)
//   last changed     the day of the latest commit that changed the item's file (current or former), or for a zine copied
//                    from archive.org the folder of its pages; none for an item served from elsewhere (YouTube, Vimeo,
//                    the BBC, archive.org), whose file is not ours
// Days are committer dates, YYYY-MM-DD. Without the whole history (a shallow clone, or no Git at all) there are no dates:
// the item pages leave the rows out, and the build says why in its warnings.
//
//   itemDates(items, { root }) -> { dates: Map(item -> { firstPublished, lastChanged }), warning }
//   items: [{ source, formerSources, copy }], copy: the folder of a zine's copied pages (documents.mjs), or null
import { spawnSync } from 'node:child_process';

const isAddress = (source) => /^[a-z][\w+.-]*:/i.test(source);

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 1 << 30 });
  return result.status === 0 ? result.stdout : null;
}

// An address as the register writes it (filters/lib.lua, media_source).
export function normaliseAddress(url) {
  let m;
  if ((m = /^https?:\/\/[\w.]*youtube\.com\/watch\?v=([\w-]+)/.exec(url) || /^https?:\/\/youtu\.be\/([\w-]+)/.exec(url) || /^https?:\/\/[\w.]*youtube[\w-]*\.com\/embed\/([\w-]+)/.exec(url))) {
    return `https://www.youtube.com/watch?v=${m[1]}`;
  }
  if ((m = /^https?:\/\/player\.vimeo\.com\/video\/(\d+)\?h=(\w+)/.exec(url) || /^https?:\/\/vimeo\.com\/(\d+)\/(\w+)/.exec(url))) return `https://vimeo.com/${m[1]}/${m[2]}`;
  if ((m = /^https?:\/\/vimeo\.com\/(\d+)/.exec(url) || /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/.exec(url))) return `https://vimeo.com/${m[1]}`;
  if ((m = /^https?:\/\/[\w.]*archive\.org\/[a-z]+\/([^/?#]+)/i.exec(url))) return `https://archive.org/details/${m[1]}`;
  return url;
}

// Pages write a path as it is or percent-encoded, in part or in full (POD%2305_Aya%20Nassar - Addendum_01.mp3): the
// added lines are decoded before paths are looked for in them.
const decoded = (text) => text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => { try { return decodeURIComponent(run); } catch { return run; } });
// path appears in text as a whole path: not inside a longer file name or folder name
function mentions(text, path) {
  for (let i = text.indexOf(path); i !== -1; i = text.indexOf(path, i + 1)) {
    const before = text[i - 1] ?? '', after = text[i + path.length] ?? '';
    if (!/[\w.-]/.test(before) && !/[\w./-]/.test(after)) return true;
  }
  return false;
}

export function itemDates(items, { root }) {
  const dates = new Map(items.map((it) => [it, { firstPublished: null, lastChanged: null }]));
  const shallow = git(root, ['rev-parse', '--is-shallow-repository']);
  if (shallow === null) return { dates, warning: 'there is no Git history here, so the item pages do not say when each item was first published and last changed' };
  if (shallow.trim() === 'true') {
    return { dates, warning: 'this clone has only part of its Git history (a shallow clone), so the item pages do not say when each item was first published and last changed. Fetch the whole history (git fetch --unshallow), as GitHub Actions does' };
  }
  const earlier = (a, b) => (!a || b < a ? b : a), later = (a, b) => (!a || b > a ? b : a);

  // 1. First published: the lines each commit added to the pages (merges show no change of their own).
  const log = git(root, ['log', '--format=%x00%cs', '-p', '--unified=0', '--no-renames', '--no-color', '--no-ext-diff', '--', 'README.md', 'essays/*.md']);
  if (log === null) return { dates, warning: 'git log failed, so the item pages do not say when each item was first published and last changed' };
  const wanted = items.map((it) => {
    const sources = [it.source, ...(it.formerSources || [])];
    return { it, paths: sources.filter((s) => !isAddress(s)), addresses: new Set(sources.filter(isAddress)) };
  });
  for (const chunk of log.split('\0').slice(1)) {
    const day = chunk.slice(0, 10);
    const added = chunk.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++')).join('\n');
    if (!added) continue;
    const text = decoded(added);
    const addresses = new Set([...added.matchAll(/https?:\/\/[^\s"'<>()[\]]+/g)].map((m) => normaliseAddress(m[0].replace(/[.,;:!?]+$/, ''))));
    for (const w of wanted) {
      if (w.paths.some((p) => mentions(text, p)) || [...w.addresses].some((a) => addresses.has(a))) {
        const d = dates.get(w.it);
        d.firstPublished = earlier(d.firstPublished, day);
      }
    }
  }

  // 2. Last changed: the commits that changed the items' files, in one pass over them all.
  const files = new Map();   // path in the repository (a file, or a zine's folder) -> its item
  for (const it of items) {
    if (it.copy) files.set(it.copy.replace(/\/?$/, '/'), it);
    else for (const s of [it.source, ...(it.formerSources || [])]) if (!isAddress(s)) files.set(s, it);
  }
  if (files.size) {
    const changed = git(root, ['log', '--format=%x00%cs', '--name-only', '--no-renames', '--', ...files.keys()]);
    if (changed === null) return { dates, warning: 'git log failed, so the item pages do not say when each item was last changed' };
    const folders = [...files.keys()].filter((f) => f.endsWith('/'));
    for (const chunk of changed.split('\0').slice(1)) {
      const day = chunk.slice(0, 10);
      for (const name of chunk.slice(10).split('\n').filter(Boolean)) {
        const it = files.get(name) ?? files.get(folders.find((f) => name.startsWith(f)));
        if (it) dates.get(it).lastChanged = later(dates.get(it).lastChanged, day);
      }
    }
  }
  return { dates, warning: '' };
}
