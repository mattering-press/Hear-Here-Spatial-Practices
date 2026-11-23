// Times the paragraphs of a podcast transcript against its recordings, once, on your own computer. Not part of the build.
//
//   cd everytrick && npm run build
//   node scripts/align.mjs essays/aya_nassar.md [--report report.md]
//
// For each recording that the page plays, whisper.cpp transcribes the audio with a time for every word (offline: the
// audio never leaves the computer), and the words it heard are matched against the edited transcript. The result:
//   - a paragraph cue file beside each recording, media/audio/<recording>.paragraphs.vtt, with one cue per paragraph.
//     A file that is already there is the editor's and is never overwritten; the new one then goes to the work folder.
//   - a report (Markdown) for the editor: when each paragraph starts, the written timecodes checked against those times,
//     and every passage where the edited text and the recording part company, to check by ear.
// The cues hold the paragraphs' words, not their numbers, because numbers change from release to release; the build
// finds each cue's paragraph by its words.
//
// What is not spoken is not matched: speaker labels (AYA NASSAR:), bracketed directions ([organ playing]), timecodes,
// and lines that the paragraph rule leaves unnumbered (Addendum). The recordings are matched in the order the page
// plays them, and the transcript is read in the same order, so each paragraph falls to the recording it was heard in.
//
// Needs ffmpeg and whisper.cpp (brew install ffmpeg whisper-cpp) and a whisper model, by default
// ~/.cache/whisper.cpp/ggml-large-v3-turbo.bin (set WHISPER_MODEL to use another).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = 'mattering-press/Hear-Here-Spatial-Practices';
const MODEL = process.env.WHISPER_MODEL || join(homedir(), '.cache', 'whisper.cpp', 'ggml-large-v3-turbo.bin');
const WORK = join(tmpdir(), 'everytrick-align');
const FILLERS = new Set(['um', 'uh', 'er', 'erm', 'ah', 'eh', 'mm', 'hmm', 'mhm', 'uhm', 'oh']);

const args = process.argv.slice(2);
const page = args.find((a) => !a.startsWith('--'));
const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : null;
const jsonPath = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;   // the same findings, for scripts
if (!page) { console.error('usage: node scripts/align.mjs essays/<page>.md [--report <file>]'); process.exit(1); }
const html = join(REPO_ROOT, '_site', page.replace(/\.md$/, ''), 'index.html');
if (!existsSync(html)) { console.error(`${html} is missing: run npm run build first`); process.exit(1); }
if (!existsSync(MODEL)) { console.error(`no whisper model at ${MODEL} (set WHISPER_MODEL)`); process.exit(1); }
mkdirSync(WORK, { recursive: true });

// ---- text ------------------------------------------------------------------------------------------------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(1).replace(/^x/i, ''), /^#x/i.test(e) ? 16 : 10)) : ENTITIES[e] ?? m));
const plain = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
// one word for matching: lower case, no accents, letters and digits only ("Cathedral’s" -> "cathedrals")
const norm = (w) => w.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '');
const splitWords = (text) => text.split(/[\s—–-]+/).map((w) => ({ word: w, key: norm(w) })).filter((w) => w.key);
const SPEAKER = /^\s*([A-Z][A-Z .’'-]+):\s*/;
const clock = (s, ms = true) => {
  const t = Math.max(0, s), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${ms ? x.toFixed(3).padStart(6, '0') : String(Math.floor(x)).padStart(2, '0')}`;
};

// ---- the page: its players and its transcript --------------------------------------------------------------
const source = readFileSync(html, 'utf8');
const players = [...source.matchAll(/<div class="player" data-for="(audio-\d+)"[^>]*>\s*<audio[^>]*aria-label="([^"]*)"[^>]*>\s*<source src="([^"]+)"/g)].map(([, id, title, src]) => {
  const path = decodeURIComponent(new RegExp(`^https://raw\\.githubusercontent\\.com/${REPO}/main/(.+)$`).exec(decode(src))?.[1] ?? '');
  return { id, title: decode(title), path };
});
if (!players.length) { console.error(`${page} has no podcast player`); process.exit(1); }
for (const p of players) if (!p.path || !existsSync(join(REPO_ROOT, p.path))) { console.error(`${p.title}: its audio is not a file in this repository (${p.path || 'elsewhere'})`); process.exit(1); }

const start = source.indexOf('<div class="transcript">');
if (start < 0) { console.error(`${page} has no transcript (a section under a "Transcript" heading)`); process.exit(1); }
const end = source.indexOf('<h2', start);
const section = source.slice(start, end < 0 ? undefined : end);
const blocks = [];   // { kind: 'para' | 'timecode' | 'other', n, text, speaker, words: [...] }
let speaker = '';
for (const m of section.matchAll(/<div id="p(\d+)" class="para[^"]*"[^>]*>([\s\S]*?)<\/div>|<p>([\s\S]*?)<\/p>|<figure[\s\S]*?<\/figure>|<aside[\s\S]*?<\/aside>/g)) {
  if (m[1]) {
    const text = plain(m[2]);
    const label = SPEAKER.exec(text);
    if (label) speaker = label[1];
    const spoken = text.replace(SPEAKER, '').replace(/\[[^\]]*\]/g, ' ');
    blocks.push({ kind: 'para', n: Number(m[1]), text, speaker, words: splitWords(spoken) });
  } else if (m[3] !== undefined) {
    const text = plain(m[3]);
    const tc = /data-seconds="(\d+)"/.exec(m[3]);
    blocks.push(tc ? { kind: 'timecode', seconds: Number(tc[1]), text } : { kind: 'other', text });
  }
}
const paras = blocks.filter((b) => b.kind === 'para');
const T = [];   // the transcript's words, in order: { key, word, para }
paras.forEach((p, i) => p.words.forEach((w) => T.push({ ...w, para: i })));

// ---- the recordings: whisper.cpp, cached by file -----------------------------------------------------------
function transcribe(path) {
  const file = join(REPO_ROOT, path), st = statSync(file);
  const key = createHash('sha1').update(`${path}|${st.size}|${st.mtimeMs}|${basename(MODEL)}`).digest('hex').slice(0, 12);
  const json = join(WORK, `${key}.json`);
  if (!existsSync(json)) {
    const wav = join(WORK, `${key}.wav`);
    console.log(`transcribing ${path} (a few minutes)…`);
    let r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-ar', '16000', '-ac', '1', wav], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg failed (brew install ffmpeg)');
    r = spawnSync('whisper-cli', ['-m', MODEL, '-l', 'en', '-ojf', '-of', join(WORK, key), '-f', wav], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`whisper-cli failed (brew install whisper-cpp):\n${r.stderr.slice(-2000)}`);
  }
  // words from tokens: a token that starts with a space starts a word. Its time is whisper.cpp's token time, which on
  // Aya Nassar's recording fell within a tenth of a second of where speech resumes after a pause (its DTW times, from
  // --dtw, came about a second late).
  const words = [];
  for (const segment of JSON.parse(readFileSync(json, 'utf8')).transcription) {
    for (const t of segment.tokens) {
      if (t.text.startsWith('[_')) continue;
      const at = t.offsets.from / 1000;
      if (/^\s/.test(t.text) || !words.length) words.push({ word: t.text.trim(), start: at, end: t.offsets.to / 1000 });
      else { words.at(-1).word += t.text; words.at(-1).end = t.offsets.to / 1000; }
    }
  }
  return words.flatMap((w) => w.word.split(/[—–-]+/).filter(Boolean).map((part) => ({ ...w, word: part, key: norm(part) }))).filter((w) => w.key);
}
const A = [];   // the recordings' words, one recording after another: { key, word, start, end, rec }
players.forEach((p, rec) => transcribe(p.path).forEach((w) => A.push({ ...w, rec })));

// ---- matching ---------------------------------------------------------------------------------------------
// Anchors: runs of four words that occur once in the transcript and once in the recordings, kept in order (the
// longest increasing sequence); between anchors, a word-by-word alignment (edit distance).
const gram = (arr, i) => arr.slice(i, i + 4).map((w) => w.key).join(' ');
const counts = (arr) => { const m = new Map(); for (let i = 0; i + 4 <= arr.length; i++) { const g = gram(arr, i); m.set(g, m.has(g) ? -1 : i); } return m; };
const tg = counts(T), ag = counts(A);
const pairs = [];
for (const [g, ti] of tg) if (ti >= 0 && ag.get(g) >= 0) pairs.push([ti, ag.get(g)]);
pairs.sort((a, b) => a[0] - b[0]);
// longest increasing subsequence of the recording positions
const tails = [], prev = new Array(pairs.length);
for (let i = 0; i < pairs.length; i++) {
  let lo = 0, hi = tails.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (pairs[tails[mid]][1] < pairs[i][1]) lo = mid + 1; else hi = mid; }
  prev[i] = lo ? tails[lo - 1] : -1;
  tails[lo] = i;
}
const chain = [];
for (let i = tails.length ? tails.at(-1) : -1; i >= 0; i = prev[i]) chain.unshift(pairs[i]);
const anchors = [];   // matched word positions, non-overlapping
for (const [ti, ai] of chain) {
  const last = anchors.at(-1);
  for (let k = 0; k < 4; k++) if (!last || (ti + k > last[0] && ai + k > last[1])) anchors.push([ti + k, ai + k]);
}

const ops = [];   // in order: { t, a, op: 'same' | 'changed' | 'unheard' (in the text only) | 'unwritten' (heard only) }
function alignGap(t0, t1, a0, a1) {
  const n = t1 - t0, m = a1 - a0, W = m + 1;
  if (!n && !m) return;
  if (n * m > 5e7) throw new Error(`a stretch of ${n} written and ${m} heard words has nothing in common to anchor it; is this the right recording?`);
  const D = new Uint32Array((n + 1) * W);
  for (let i = 0; i <= n; i++) D[i * W] = i;
  for (let j = 0; j <= m; j++) D[j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const diag = D[(i - 1) * W + j - 1] + (T[t0 + i - 1].key === A[a0 + j - 1].key ? 0 : 1);
    D[i * W + j] = Math.min(diag, D[(i - 1) * W + j] + 1, D[i * W + j - 1] + 1);
  }
  const out = [];
  for (let i = n, j = m; i > 0 || j > 0;) {
    const same = i > 0 && j > 0 && T[t0 + i - 1].key === A[a0 + j - 1].key;
    if (i > 0 && j > 0 && D[i * W + j] === D[(i - 1) * W + j - 1] + (same ? 0 : 1)) { out.push({ t: t0 + i - 1, a: a0 + j - 1, op: same ? 'same' : 'changed' }); i--; j--; }
    else if (i > 0 && D[i * W + j] === D[(i - 1) * W + j] + 1) { out.push({ t: t0 + i - 1, a: null, op: 'unheard' }); i--; }
    else { out.push({ t: null, a: a0 + j - 1, op: 'unwritten' }); j--; }
  }
  ops.push(...out.reverse());
}
let ti = 0, ai = 0;
for (const [t, a] of anchors) { alignGap(ti, t, ai, a); ops.push({ t, a, op: 'same' }); ti = t + 1; ai = a + 1; }
alignGap(ti, T.length, ai, A.length);

// ---- paragraph times --------------------------------------------------------------------------------------
const heardAs = new Array(T.length).fill(null);
for (const o of ops) if (o.t !== null && o.a !== null) heardAs[o.t] = o;
paras.forEach((p, i) => {
  const idx = T.map((w, k) => (w.para === i ? k : -1)).filter((k) => k >= 0);
  const same = idx.filter((k) => heardAs[k]?.op === 'same');
  p.match = idx.length ? same.length / idx.length : 0;
  // the start: the first of its first eight words that was heard, or else its first word heard the same
  const first = idx.slice(0, 8).find((k) => heardAs[k]) ?? same[0];
  const last = [...idx].reverse().find((k) => heardAs[k]);
  if (first === undefined || p.match < 0.3) { p.untimed = true; return; }
  p.rec = A[heardAs[first].a].rec;
  p.startA = heardAs[first].a;
  const firstSame = idx.slice(0, 8).find((k) => heardAs[k]?.op === 'same');
  p.firstSameA = firstSame === undefined ? p.startA : heardAs[firstSame].a;
  p.start = A[p.startA].start;
  const lastSame = same.at(-1) ?? last;   // the boundary with the next paragraph: its last word heard as written
  p.lastA = heardAs[lastSame].a;
  p.lastWord = A[p.lastA].end;
});
players.forEach((pl, rec) => {
  const timed = paras.filter((p) => !p.untimed && p.rec === rec);
  // Between the last word of one paragraph heard as written and the first of the next lie words the text has
  // changed or does not have: the end of one speaker's sentence, edited, or the next one's lead-in, edited out. The
  // paragraph starts after the longest pause among them (a later pause wins unless an earlier one is clearly longer).
  // On Aya Nassar's para. 16 that is "So, Aya, having read your work…", which the text moves further in; on her
  // para. 68 it is "There's nothing here", after the edited end of para. 67.
  timed.forEach((p, i) => {
    const before = timed[i - 1];
    const lo = before ? before.lastA + 1 : p.startA, hi = Math.max(p.firstSameA, p.startA);
    if (!before || hi <= lo || A[hi].rec !== rec || A[hi].start - A[lo].start > 30) return;
    let best = hi, bestGap = A[hi].start - A[hi - 1].end;
    for (let k = hi - 1; k >= lo; k--) {
      const gap = A[k].start - A[k - 1].end;
      if (gap > bestGap + 0.15) { best = k; bestGap = gap; }
    }
    const firstWritten = A[p.startA].start;
    // talk between the two paragraphs that the text changed or left out, kept with the paragraph before: it may be
    // this paragraph's opening, condensed
    if (best > lo && A[best].start - A[lo].start > 5.5) p.late = { seconds: A[best].start - A[lo].start, words: A.slice(lo, best).map((w) => w.word) };
    p.startA = best;
    p.start = A[best].start;
    if (firstWritten - p.start > 0.5) p.lead = { seconds: firstWritten - p.start, words: A.slice(best, hi).map((w) => w.word) };
  });
  timed.forEach((p, i) => { p.end = i + 1 < timed.length ? timed[i + 1].start : p.lastWord; });
  pl.paras = timed;
});

// ---- what needs a person's attention ------------------------------------------------------------------------
// Signs that a cue may be wrong, or that a stretch of the recording is not in the text, to check by ear first.
const short = (s, n = 9) => { const w = s.split(' '); return w.slice(0, n).join(' ') + (w.length > n ? ' …' : ''); };
const quote = (words, n = 12) => `“${short(words.join(' '), n)}”`;
const opOfA = new Array(A.length).fill(null);
for (const o of ops) if (o.a !== null) opOfA[o.a] = o.op;
const attention = [];
const flag = (p, why, at) => attention.push({ n: p ? p.n : null, rec: p && !p.untimed ? p.rec : at?.rec ?? null, at: at ? at.start : p && !p.untimed ? p.start : null,
  first: p ? short(p.text.replace(SPEAKER, ''), 8) : '', why });
for (const p of paras) {
  if (p.untimed) { flag(p, 'untimed: too few of its words were heard. Time it by hand, or leave it untimed.'); continue; }
  if (p.lead && p.lead.seconds > 5) flag(p, `starts ${p.lead.seconds.toFixed(0)} s before its first written words, with words the text does not have there (${quote(p.lead.words)}): check the start.`);
  if (p.late) flag(p, `the ${p.late.seconds.toFixed(0)} s of talk before this cue (${quote(p.late.words)}) are not in the text as heard; they are counted as the end of the paragraph before, but may be this one's opening, condensed: check the start.`);
  if (p.match < 0.6) flag(p, `only ${Math.round(p.match * 100)}% of its words were heard as written: the start may be off.`);
  const words = p.words.length, seconds = p.end - p.start;
  if (words >= 12 && words / seconds > 4.5) flag(p, `${words} words in ${seconds.toFixed(0)} s, too fast for speech: the cue is probably too short.`);
  if (seconds > 20 && words / seconds < 1) flag(p, `${words} words in ${seconds.toFixed(0)} s, too slow for speech: the cue probably runs on over something else.`);
}
players.forEach((pl, rec) => {
  pl.paras.forEach((p, i) => {
    // heard words inside the cue that the text does not have: the paragraph stays marked while they play
    const to = i + 1 < pl.paras.length ? pl.paras[i + 1].startA : A.findLastIndex((w) => w.rec === rec) + 1;
    // the longest unbroken stretch of words heard here that the text does not have (filler words do not break it)
    let run = [], longest = [];
    for (let k = p.startA; k < to; k++) {
      if (opOfA[k] === 'unwritten') { if (!FILLERS.has(A[k].key)) run.push(A[k]); }
      else run = [];
      if (run.length > longest.length) longest = run.slice();
    }
    const runSeconds = longest.length ? longest.at(-1).end - longest[0].start : 0;
    if (longest.length >= 20 || runSeconds >= 10) {
      flag(p, `${runSeconds.toFixed(0)} s of talk in this cue that the text leaves out (${quote(longest.map((w) => w.word))}): the paragraph stays marked while it plays. Fine if it was cut on purpose.`, longest[0]);
    }
    if (i && p.start <= pl.paras[i - 1].start) flag(p, 'starts before the paragraph above it: the cues are out of order.');
  });
  const mine = A.filter((w) => w.rec === rec);
  const first = pl.paras[0], last = pl.paras.at(-1);
  if (first && first.start > 15) flag(null, `the recording plays ${first.start.toFixed(0)} s before its first timed paragraph (para. ${first.n}).`, { start: 0, rec });
  const tail = last ? mine.filter((w) => w.start > last.lastWord && !FILLERS.has(w.key)) : [];
  if (tail.length >= 15) flag(null, `the recording goes on for ${(mine.at(-1).end - last.lastWord).toFixed(0)} s after its last timed paragraph (para. ${last.n}), with words not in the text (${quote(tail.map((w) => w.word))}).`, { start: last.lastWord, rec });
});
blocks.forEach((b, i) => {
  if (b.kind !== 'timecode') return;
  const next = blocks.slice(i + 1).find((x) => x.kind === 'para');
  if (next && !next.untimed && Math.abs(next.start - b.seconds) > 3) flag(next, `the written timecode ${b.text} is ${(next.start - b.seconds).toFixed(0)} s from this paragraph's start: one of them is off.`);
});
attention.sort((a, b) => (a.rec ?? 0) - (b.rec ?? 0) || (a.at ?? 0) - (b.at ?? 0));

// ---- the cue files ----------------------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const written = [];
for (const pl of players) {
  const cues = pl.paras.map((p) => `${clock(p.start)} --> ${clock(Math.max(p.end, p.start + 1))}\n${p.text.replace(/-->/g, '->')}`);
  const vtt = ['WEBVTT', '',
    'NOTE',
    `Paragraph cues for “${pl.title}” (${page}), one cue per paragraph of the transcript,`,
    `made by everytrick/scripts/align.mjs on ${today} and then checked by ear. The build finds each cue's paragraph by its`,
    'words. To correct a cue, change its start time. To leave a paragraph untimed, delete its cue and write a line',
    '"NOTE untimed: <its first words>" in its place.', '', ...cues.flatMap((c) => [c, ''])].join('\n');
  const target = join(REPO_ROOT, pl.path.replace(/\.mp3$/i, '.paragraphs.vtt'));
  const out = existsSync(target) ? join(WORK, basename(target)) : target;
  writeFileSync(out, vtt);
  written.push({ pl, out, kept: out !== target ? target : null });
}

// ---- the report -------------------------------------------------------------------------------------------
const lines = [];
lines.push(`# Timing report: ${page}`, '', `Made by everytrick/scripts/align.mjs on ${today}, with whisper.cpp (${basename(MODEL)}).`, '');
lines.push('## Recordings', '');
for (const { pl, out, kept } of written) {
  lines.push(`- ${pl.title} (${pl.path}): paragraphs ${pl.paras.length ? `${pl.paras[0].n}–${pl.paras.at(-1).n}` : 'none'}, ${pl.paras.length} cues. ` +
    (kept ? `${kept} already exists and was left alone; the new cues are in ${out}.` : `Cues written to ${out.replace(REPO_ROOT + '/', '')}.`));
}
const untimed = paras.filter((p) => p.untimed);
lines.push('', `Paragraphs left untimed (too few of their words were heard): ${untimed.length ? untimed.map((p) => `para. ${p.n} (“${short(p.text, 6)}”)`).join(', ') : 'none'}.`);
lines.push('', '## Needs attention', '', 'Cues that may be wrong, and stretches of the recording that are not in the text. Listen at the time given.', '',
  ...(attention.length ? attention.map((f) => `- ${f.at !== null ? `${players[f.rec].id} ${clock(f.at, false)}` : 'untimed'}${f.n ? `, para. ${f.n} (“${f.first}”)` : ''}: ${f.why}`) : ['Nothing.']));

lines.push('', '## The written timecodes, checked', '', 'A timecode is taken to mark the paragraph after it.', '', '| timecode | paragraph after it | that paragraph starts at | difference |', '|---|---|---|---|');
blocks.forEach((b, i) => {
  if (b.kind !== 'timecode') return;
  const next = blocks.slice(i + 1).find((x) => x.kind === 'para');
  const before = [...blocks.slice(0, i)].reverse().find((x) => x.kind === 'para');
  const diff = next && !next.untimed ? next.start - b.seconds : null;
  const note = before && !before.untimed && Math.abs(before.start - b.seconds) < Math.abs(diff ?? Infinity) ? ` (para. ${before.n}, before it, starts at ${clock(before.start, false)})` : '';
  lines.push(`| ${b.text} | ${next ? `para. ${next.n}` : '–'} | ${next && !next.untimed ? clock(next.start, false) : 'untimed'} | ${diff === null ? '–' : `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} s`}${note} |`);
});

lines.push('', '## When each paragraph starts', '', 'Match: the share of the paragraph’s words that were heard as written. A low match means edited, reordered or misheard text.', '',
  '| para. | recording | starts | speaker | first words | match |', '|---|---|---|---|---|---|');
for (const p of paras) {
  lines.push(`| ${p.n} | ${p.untimed ? '–' : players[p.rec].id} | ${p.untimed ? 'untimed' : clock(p.start, false)} | ${p.speaker ? p.speaker.replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()) : ''} | ${short(p.text.replace(SPEAKER, '').replace(/\|/g, '\\|'))} | ${Math.round(p.match * 100)}% |`);
}

// passages where text and recording differ: runs of operations that are not 'same', leaving out filler words and
// repetitions that were not written ("the the")
// Passages where text and recording differ: runs of operations that are not 'same'. An edited transcript leaves out
// filler and false starts and tidies small words, so those are not listed; what is listed falls in three groups.
const SMALL = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'so', 'yeah', 'yes', 'well', 'now', 'just', 'like', 'really', 'actually',
  'i', 'you', 'we', 'it', 'its', 'is', 'was', 'are', 'were', 'be', 'that', 'this', 'there', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'as', 'know', 'mean', 'sort', 'kind', 'okay', 'ok', 'right', 'also', 'very', 'quite', 'then', 'thats', 'theres', 'im',
  'youre', 'were', 'weve', 'ive', 'do', 'did', 'have', 'has', 'had', 'not', 'think', 'say', 'said', 'all', 'some', 'what', 'which']);
const content = (words) => words.map(norm).filter((k) => k && !SMALL.has(k) && !FILLERS.has(k));
const runs = [];
let run = null;
const flush = () => { if (run) runs.push(run); run = null; };
for (const o of ops) {
  if (o.op === 'same') { flush(); continue; }
  if (o.op === 'unwritten') {
    const w = A[o.a], before = A[o.a - 1];
    if (FILLERS.has(w.key) || (before && before.key === w.key)) continue;
  }
  run = run || { written: [], heard: [], at: null, para: null };
  if (o.t !== null) { run.written.push(T[o.t].word); run.para ??= paras[T[o.t].para]; }
  if (o.a !== null) { run.heard.push(A[o.a].word); run.at ??= A[o.a]; }
}
flush();
// two words or names that look or sound alike ("plants", "plans"), leaving out British and American spellings,
// singular and plural, and numbers written two ways ("1950s", "50s")
const spelling = (k) => k.replace(/isation/g, 'ization').replace(/ise(d|s)?$/, 'ize$1').replace(/our/g, 'or').replace(/ll(ed|ing)$/, 'l$1')
  .replace(/tre$/, 'ter').replace(/s$/, '');
function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) { const tmp = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; }
  }
  return d[b.length];
}
const alike = (cw, ch) => {
  if (cw.length > 3 || ch.length > 3) return false;
  const a = cw.map(spelling).join(' '), b = ch.map(spelling).join(' ');
  if (a === b || (/\d/.test(a) && /\d/.test(b))) return false;
  return 1 - lev(a, b) / Math.max(a.length, b.length) >= 0.5;
};
const groups = { alike: [], words: [], unwritten: [], unheard: [] };
for (const r of runs) {
  const para = r.para ?? null;
  const at = r.at ?? (para && !para.untimed ? { start: para.start, rec: para.rec } : null);
  const w = r.written.join(' '), h = r.heard.join(' ');
  const cw = content(r.written), ch = content(r.heard);
  const line = `- ${at ? `${players[at.rec].id} ${clock(at.start, false)}` : ''}${para ? `, para. ${para.n}` : ''}: `;
  if (r.written.length && r.heard.length) {
    if (!cw.length || !ch.length || cw.join(' ') === ch.join(' ')) continue;   // only small words differ, or spelling
    (alike(cw, ch) ? groups.alike : groups.words).push(line + `written “${w}”, heard “${h}”`);
  } else if (r.heard.length) {
    if (ch.length >= 3) groups.unwritten.push(line + `“${h}”`);
  } else if (cw.length >= 2) {
    groups.unheard.push(line + `“${w}”`);
  }
}
lines.push('', '## Where the text and the recording differ', '',
  'Places to check by ear, with the time to listen at. An edited transcript leaves out filler, false starts and small words, ' +
  'so those are not listed. whisper.cpp also mishears, names especially, so many of these are its mistakes, not the text’s.', '');
lines.push('### Words that look or sound alike', '', 'The text has one word or name, the recording seems to have one that looks or sounds like it: a slip ' +
  'in the transcript, or whisper.cpp mishearing. Check these first.', '', ...(groups.alike.length ? groups.alike : ['None.']), '');
lines.push('### Heard but not in the text', '', 'Three or more words of substance that the transcript leaves out: usually edited out on purpose.', '',
  ...(groups.unwritten.length ? groups.unwritten : ['None.']), '');
lines.push('### In the text but not heard', '', 'Words the transcript has that the recording does not seem to: added in editing.', '',
  ...(groups.unheard.length ? groups.unheard : ['None.']), '');
lines.push('### Rephrased', '', 'Other places where the words differ: mostly the editing of spoken into written English.', '',
  ...(groups.words.length ? groups.words : ['None.']), '');
const listed = groups.alike.length + groups.words.length + groups.unwritten.length + groups.unheard.length;
const report = lines.join('\n');
if (reportPath) writeFileSync(reportPath, report);
if (jsonPath) {
  writeFileSync(jsonPath, JSON.stringify({
    page, recordings: players.map((pl) => ({ id: pl.id, title: pl.title, path: pl.path, cues: pl.paras.length })),
    paragraphs: paras.length, untimed: untimed.map((p) => p.n), attention,
    timecodes: blocks.flatMap((b, i) => {
      if (b.kind !== 'timecode') return [];
      const next = blocks.slice(i + 1).find((x) => x.kind === 'para');
      return [{ timecode: b.text, seconds: b.seconds, para: next?.n ?? null, start: next && !next.untimed ? next.start : null }];
    }),
    differ: { alike: groups.alike.length, unwritten: groups.unwritten.length, unheard: groups.unheard.length, rephrased: groups.words.length, alikeLines: groups.alike },
  }, null, 2));
}
else console.log(report);
console.log(`\n${paras.length} paragraphs, ${paras.length - untimed.length} timed; ${attention.length} things need attention; ${listed} passages where text and recording differ.` + (reportPath ? ` Report: ${reportPath}` : ''));
for (const { out } of written) console.log(`cues: ${out}`);
