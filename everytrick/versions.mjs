// The book's frozen versions: the registry (versions.json at the repository root), their content from Git tags,
// and the matching of paragraphs between two versions. Used by build.mjs; see "Freezing a version for review or
// release" in DEVELOPMENT.md.
//
//   readRegistry()                 the registry's versions, checked, oldest first
//   checkout(version, dir)         the version's README.md, essays/ and references/ from its tag, in dir; files the
//                                  build needs besides (media no longer in the working tree) are taken on request
//   matchParagraphs(older, newer)  for each paragraph of a page in an older version, the same passage in a newer one
//   longDate('2026-11-20')         '20 November 2026'
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './convert.mjs';

export const REGISTRY = join(REPO_ROOT, 'versions.json');
const STATUS = ['review', 'release'], ANNOTATIONS = ['none', 'hypothesis'];
// Contracts whose paragraph rule the build knows (CONTRACT.md, "Paragraph numbers"): a frozen version is numbered by its own.
// Contract 0.5 changed the page data only; its paragraph rule is 0.4's. Contract 0.6's adds long descriptions to the
// blocks that are not numbered. Contract 0.7 changed the page data only; its paragraph rule is 0.6's.
const RULES = ['0.3', '0.4', '0.5', '0.6', '0.7'];

function git(args, { binary = false, input } = {}) {
  const result = spawnSync('git', ['-C', REPO_ROOT, ...args], { encoding: binary ? 'buffer' : 'utf8', maxBuffer: 1 << 30, input });
  return { ok: result.status === 0, out: result.stdout, err: String(result.stderr || '') };
}

export function readRegistry() {
  if (!existsSync(REGISTRY)) return [];
  let data;
  try { data = JSON.parse(readFileSync(REGISTRY, 'utf8')); } catch (e) { throw new Error(`versions.json is not valid JSON: ${e.message}`); }
  const list = data.versions ?? [];
  if (!Array.isArray(list)) throw new Error('versions.json: "versions" must be a list');
  const problems = [], seen = new Set();
  list.forEach((v, i) => {
    const where = `versions.json, version ${i + 1}${v?.id ? ` (${v.id})` : ''}`;
    if (!v || typeof v !== 'object') return problems.push(`${where}: not an object`);
    if (typeof v.id !== 'string' || !/^[0-9][0-9A-Za-z._-]*$/.test(v.id)) problems.push(`${where}: "id" must start with a digit and hold only letters, digits, dots and hyphens, such as 0.9-review2`);
    else if (seen.has(v.id)) problems.push(`${where}: the id is used twice`);
    seen.add(v.id);
    if (typeof v.tag !== 'string' || !v.tag) problems.push(`${where}: "tag" is missing`);
    else if (!git(['rev-parse', '--verify', '--quiet', `refs/tags/${v.tag}^{commit}`]).ok) {
      problems.push(`${where}: there is no Git tag ${v.tag} in this clone. Create it (git tag ${v.tag} <commit>) or fetch the tags (git fetch --tags)`);
    }
    if (typeof v.label !== 'string' || !v.label.trim()) problems.push(`${where}: "label" is missing`);
    if (typeof v.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || Number.isNaN(Date.parse(v.date))) problems.push(`${where}: "date" must be a date such as 2026-11-20`);
    if (!STATUS.includes(v.status)) problems.push(`${where}: "status" must be ${STATUS.join(' or ')}`);
    if (!ANNOTATIONS.includes(v.annotations ?? 'none')) problems.push(`${where}: "annotations" must be ${ANNOTATIONS.join(' or ')}`);
    if (v.hypothesisGroup !== undefined && typeof v.hypothesisGroup !== 'string') problems.push(`${where}: "hypothesisGroup" must be text`);
    if (!RULES.includes(v.contract)) problems.push(`${where}: "contract" must be the contract it was frozen under, whose paragraph rule numbers it: ${RULES.join(' or ')}`);
  });
  if (problems.length) throw new Error(problems.join('\n'));
  return list.map((v, i) => ({ annotations: 'none', hypothesisGroup: '', ...v, position: i }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position)
    .map(({ position, ...v }) => v);
}

// The version's text from its tag. The toolkit is never taken from the tag: every version is built with the current one.
// -> { root, commit, has(path), take(path) }: take copies a file of the tag (a media file) into root.
export function checkout(version, dir) {
  const tag = `refs/tags/${version.tag}`;
  const commit = git(['rev-parse', `${tag}^{commit}`]).out.trim();
  const listing = git(['ls-tree', '-r', '-z', '--name-only', commit]);
  if (!listing.ok) throw new Error(`cannot list the files of ${version.tag}: ${listing.err}`);
  const files = new Set(listing.out.split('\0').filter(Boolean));
  const wanted = ['README.md', 'essays', 'references'].filter((p) => files.has(p) || [...files].some((f) => f.startsWith(`${p}/`)));
  if (!files.has('README.md') || !wanted.includes('essays')) throw new Error(`${version.tag} has no README.md or essays/: is it a tag of this book?`);
  mkdirSync(dir, { recursive: true });
  const archive = git(['archive', '--format=tar', commit, '--', ...wanted], { binary: true });
  if (!archive.ok) throw new Error(`git archive failed on ${version.tag}: ${archive.err}`);
  const tar = spawnSync('tar', ['-x', '-f', '-', '-C', dir], { input: archive.out });
  if (tar.status !== 0) throw new Error(`could not unpack ${version.tag}: ${tar.stderr}`);
  const take = (path) => {
    const out = join(dir, path);
    if (!existsSync(out)) {
      const blob = git(['show', `${commit}:${path}`], { binary: true });
      if (!blob.ok) throw new Error(`${version.tag} has no ${path}`);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, blob.out);
    }
    return dir;
  };
  return { root: dir, commit, has: (path) => files.has(path), take };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

// Similarity of two normalised texts: the Dice coefficient of their word pairs (single words for very short texts).
function grams(text) {
  const words = text.split(' ').filter(Boolean);
  const list = words.length < 3 ? words : words.slice(1).map((w, i) => `${words[i]} ${w}`);
  const counts = new Map();
  for (const g of list) counts.set(g, (counts.get(g) || 0) + 1);
  return { counts, size: list.length };
}
function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const [g, n] of a.counts) shared += Math.min(n, b.counts.get(g) || 0);
  return (2 * shared) / (a.size + b.size);
}
export const SIMILAR_NEARBY = 0.5, SIMILAR_ANYWHERE = 0.75;

// older, newer: the paragraphs of one page in two versions, [{ id, text_hash, text }] in page order.
// -> { map: { p12: 'p14', … }, counts: { same, similar, nearby } }
//   same     the same normalised text, in the same order (the longest common sequence of text hashes, so that a
//            paragraph that occurs twice, such as "Yes.", goes to the right one);
//   similar  edited: at least half its word pairs shared with a paragraph between the neighbouring matches, or
//            three quarters with one anywhere on the page (a paragraph that moved);
//   nearby   deleted or rewritten: the match of the nearest paragraph before it (or after it, at the start).
export function matchParagraphs(older, newer) {
  const n = older.length, m = newer.length;
  const match = new Array(n).fill(null), how = new Array(n).fill(null), used = new Set();
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    lcs[i][j] = older[i].text_hash === newer[j].text_hash ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  for (let i = 0, j = 0; i < n && j < m;) {
    if (older[i].text_hash === newer[j].text_hash) { match[i] = j; how[i] = 'same'; used.add(j); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  const newGrams = newer.map((p) => grams(p.text));
  const best = (g, from, to, threshold) => {
    let pick = null, score = threshold;
    for (let j = from; j <= to; j++) {
      if (used.has(j)) continue;
      const s = similarity(g, newGrams[j]);
      if (s >= score) { pick = j; score = s; }
    }
    return pick;
  };
  for (let i = 0; i < n; i++) {
    if (match[i] !== null) continue;
    let from = 0, to = m - 1;
    for (let k = i - 1; k >= 0; k--) if (match[k] !== null) { from = match[k] + 1; break; }
    for (let k = i + 1; k < n; k++) if (match[k] !== null && how[k] === 'same') { to = match[k] - 1; break; }
    const g = grams(older[i].text);
    const j = best(g, from, to, SIMILAR_NEARBY) ?? best(g, 0, m - 1, SIMILAR_ANYWHERE);
    if (j !== null) { match[i] = j; how[i] = 'similar'; used.add(j); }
  }
  for (let i = 0; i < n; i++) {
    if (match[i] !== null || !m) continue;
    let k = i - 1;
    while (k >= 0 && (match[k] === null || how[k] === 'nearby')) k--;
    if (k < 0) { k = i + 1; while (k < n && (match[k] === null || how[k] === 'nearby')) k++; }
    match[i] = k >= 0 && k < n ? match[k] : 0;
    how[i] = 'nearby';
  }
  const map = {}, counts = { same: 0, similar: 0, nearby: 0 };
  older.forEach((p, i) => { if (match[i] !== null) { map[p.id] = newer[match[i]].id; counts[how[i]]++; } });
  return { map, counts };
}
