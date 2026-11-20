// Turns one Juncture page (Markdown with .ve-* tags) into Pandoc Markdown, and lists what the page needs:
// images to resize, files to copy, warnings, and anything it could not handle. No dependencies.
//
//   convert(source, file, { exists }) -> { markdown, title, subtitle, header, menu, footer, cards, images, files,
//                              handled, warnings, unhandled, exceptions }
//   exists(path) says whether a repository file is there (default: in the working tree; for a frozen version, in its tag)
//   node convert.mjs essays/walk.md      prints the converted Markdown (paths are relative to the repository)
//
// The .ve-* lines, and the raw HTML that Juncture's custom.js completes in the browser, become fenced divs
// with their data as attributes. filters/to-markdown.lua turns these into the clean Markdown of the page's
// Markdown view, and the other filters turn that Markdown into HTML:
//   .ve-media gh:…/x.jpg right caption="…"   ->  ::: {.twin-figure src="media/x.jpg" side="right" caption="…"}
//   .ve-media grid + "- gh:… caption=…" list  ->  :::: {.twin-gallery} with one .twin-figure per item
//   .ve-media https://www.youtube.com/…       ->  ::: {.twin-video src="…"}
//   .ve-iframe https://…, raw <iframe>         ->  ::: {.twin-embed src="…"}
//   raw <audio>                                ->  ::: {.twin-audio src="…" title="…"}
//   raw <figure class="video-embed"> (Vimeo or a repository video) -> ::: {.twin-video …} with the caption inside
//   raw <figure data-repo-pdf>                 ->  ::: {.twin-embed …} with the caption inside
// .ve-header and .ve-footer become page data (title, menu, footer); .ve-style and .ve-script are dropped.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = 'mattering-press/Hear-Here-Spatial-Practices';   // on GitHub, where the audio files are served from
const GITHUB_FILE = new RegExp(`^https://(?:github\\.com/${REPO}/raw|raw\\.githubusercontent\\.com/${REPO})/(?:refs/heads/)?main/([^?#]+)`);

// Split a tag's arguments into bare words and key=value pairs, honouring quotes.
function tokenize(text) {
  const out = [];
  const re = /(?:([\w-]+)=)?(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  for (const m of text.matchAll(re)) {
    const quoted = m[2] ?? m[3];
    out.push({ key: m[1] || null, value: quoted ?? m[4], quoted: quoted !== undefined });
  }
  return out;
}

// gh:owner/repo/media/x.jpg -> media/x.jpg
const ghPath = (value) => /^gh:[^/]+\/[^/]+\/(.+)$/.exec(value)?.[1] ?? null;

// A link or image target in the Markdown -> repository path ("/media/x.jpg" or "../media/x.jpg" -> "media/x.jpg").
export function repoPath(target, page) {
  const path = decodeURI(target.replace(/[?#].*$/, ''));
  return posix.normalize(path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(page), path));
}

// Quote a value for a Pandoc attribute: key="value".
const attr = (key, value) => `${key}="${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const div = (cls, attrs, content = '') => `::: {.${cls} ${Object.entries(attrs).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => attr(k, v)).join(' ')}}\n${content ? `\n${content}\n\n` : ''}:::`;

// A fragment of raw HTML (a figcaption) -> Markdown: links, emphasis and entities; any other tag is dropped.
// data-repo-href links point into the repository from its root.
const htmlToMd = (html) => html.replace(/<a\s[^>]*?(?:data-repo-href|href)="([^"]*)"[^>]*>(.*?)<\/a>/gs, (m, href, text) => `[${text}](${m.includes('data-repo-href') ? '/' + href : href})`)
  .replace(/<(em|i)>(.*?)<\/\1>/gs, '*$2*').replace(/<(strong|b)>(.*?)<\/\1>/gs, '**$2**').replace(/<[^>]+>/g, '')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const htmlAttr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
const hasWord = (tag, name) => new RegExp(`\\s${name}(?=[\\s>=])`).test(tag);

const MEDIA_OPTIONS = ['caption', 'alt', 'width', 'rotation'];
const IMAGE_RE = /!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+"[^"]*")?\)/g;

const inWorkingTree = (path) => existsSync(join(REPO_ROOT, path));

export function convert(source, file, { exists = inWorkingTree } = {}) {
  const lines = source.split(/\r?\n/);
  const page = { title: null, subtitle: null, header: {}, menu: [], footer: [], cards: [], images: [], files: [] };
  const handled = [], warnings = [], unhandled = [];
  const out = [];
  let fence = false, cardLevel = 0;

  const warn = (line, text) => warnings.push({ file, line, text });
  const fail = (line, text, why) => unhandled.push({ file, line, text: text.trim(), why });
  const needFile = (line, path, what) => { if (!exists(path)) fail(line, path, `${what} not found in the repository`); };
  const addImage = (line, src, role, rotation = 0) => { needFile(line, src, 'image'); page.images.push({ src, role, rotation, file, line }); };

  // The indented "- item" lines that follow a tag line.
  const takeList = (i) => {
    const items = [];
    while (i + 1 < lines.length && /^\s+[-*]\s+/.test(lines[i + 1])) items.push({ text: lines[++i].replace(/^\s+[-*]\s+/, '').trim(), line: i + 1 });
    return { items, next: i };
  };

  // One image of a .ve-media tag or gallery item -> a .twin-figure div.
  const figure = (line, src, args, inGallery) => {
    const opts = Object.fromEntries(args.filter((a) => a.key).map((a) => [a.key, a.value]));
    const side = args.find((a) => !a.key && (a.value === 'left' || a.value === 'right'))?.value;
    for (const a of args) {
      if (a.key ? !MEDIA_OPTIONS.includes(a.key) : !(a.value === side || ghPath(a.value))) fail(line, lines[line - 1], `.ve-media option "${a.key ? a.key + '=' : a.value}" is not supported`);
    }
    const rotation = Number(opts.rotation || 0);
    if (![0, 90, 180, 270].includes(rotation)) fail(line, lines[line - 1], `rotation=${opts.rotation} must be 0, 90, 180 or 270`);
    if (opts.alt === undefined) warn(line, `image without alt text: ${src}`);
    addImage(line, src, 'figure', rotation);
    return div('twin-figure', { src, rotation: rotation || undefined, side: inGallery ? undefined : side, width: inGallery ? undefined : opts.width, caption: opts.caption, alt: opts.alt ?? '' });
  };

  // A raw <audio>, <figure> or <iframe> block -> a twin-* div (or '' if it is not one the twin knows).
  const rawBlock = (kind, block, n, before) => {
    const asUrl = (v) => (/^[a-z][\w+.-]*:/i.test(v) ? v : '/' + v);       // data-repo-* paths start at the repository root
    const useFile = (path) => { needFile(n, path, 'file'); if (!page.files.includes(path)) page.files.push(path); };
    if (kind === 'audio') {
      const src = htmlAttr(block.match(/<source\s[^>]*>/)?.[0] ?? '', 'src');
      if (!src) return '';
      const previous = [...before].reverse().find((l) => l.trim());           // a short label such as "Addendum:" before the player
      const label = /^(.{1,40}):$/.exec((previous || '').replace(/[*_]/g, '').trim())?.[1];
      return div('twin-audio', { src, title: page.title + (label ? ` – ${label}` : '') });
    }
    if (kind === 'iframe') {
      const m = /^\s*(?:<center>\s*)?<iframe\b([^>]*)>\s*<\/iframe>\s*(?:<\/center>)?\s*$/.exec(block);
      const tag = m ? `<iframe${m[1]}>` : '';
      const src = htmlAttr(tag, 'src');
      if (!src) return '';
      const side = /\bclass="[^"]*\b(left|right)\b/.exec(tag)?.[1];
      return div('twin-embed', { src, side, width: htmlAttr(tag, 'width'), height: htmlAttr(tag, 'height'), title: htmlAttr(tag, 'title') });
    }
    // <figure class="video-embed"> or <figure class="pdf-embed" data-repo-pdf="…">
    const figureTag = /^\s*<figure\b[^>]*>/.exec(block)?.[0] ?? '';
    const caption = htmlToMd(block.match(/<figcaption>(.*?)<\/figcaption>/s)?.[1] ?? '');
    const pdf = htmlAttr(figureTag, 'data-repo-pdf');
    if (pdf) {
      useFile(pdf);
      return div('twin-embed', { src: '/' + pdf, title: htmlAttr(figureTag, 'data-title') }, caption);
    }
    const iframe = block.match(/<iframe\s[^>]*>/)?.[0], video = block.match(/<video\s[^>]*>/)?.[0];
    const vimeo = iframe && /^https:\/\/player\.vimeo\.com\/video\/(\d+)\?h=(\w+)$/.exec(htmlAttr(iframe, 'src') ?? '');
    if (vimeo) return div('twin-video', { src: `https://vimeo.com/${vimeo[1]}/${vimeo[2]}`, title: htmlAttr(iframe, 'title') }, caption);
    if (video && htmlAttr(video, 'data-repo-src')) {
      const src = htmlAttr(video, 'data-repo-src'), poster = htmlAttr(video, 'data-repo-poster');
      useFile(src);
      if (poster) addImage(n, poster, 'poster');
      return div(`twin-video${/video-embed-portrait/.test(figureTag) ? ' .portrait' : ''}`, { src: '/' + src, poster, title: htmlAttr(video, 'title') }, caption);
    }
    return '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], n = i + 1;
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) { out.push(line); continue; }

    // Card sections: "# Contents {.cards}" followed by "## Title {href=…}" headings, each with one image.
    const heading = /^(#{1,6})\s.*?(\{[^}]*\})?\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (cardLevel && level <= cardLevel) cardLevel = 0;
      if (/\.cards\b/.test(heading[2] || '')) cardLevel = level;
      else if (cardLevel) {
        const href = /href=("([^"]*)"|\S+?)\s*\}/.exec(heading[2] || '');
        if (href) page.cards.push(repoPath(href[2] ?? href[1], file));
      }
    }

    // Markdown images ![alt](/media/…): card thumbnails or inline images.
    for (const m of line.matchAll(IMAGE_RE)) {
      if (/^[a-z][\w+.-]*:/i.test(m[2])) continue;               // remote image, e.g. footer logos
      if (!m[1].trim()) warn(n, `image without alt text: ${m[2]}`);
      addImage(n, repoPath(m[2], file), cardLevel ? 'card' : 'inline');
    }

    // Links to repository files, relative or on GitHub, should point at files that exist.
    for (const m of line.matchAll(/\s(?:href|src)="([^"]*)"|(?<!!)\[[^\]]*\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g)) {
      const url = m[1] ?? m[2];
      const path = GITHUB_FILE.exec(url)?.[1] ?? (/^([a-z][\w+.-]*:|#|\/$)|\.md(#.*)?$/i.test(url) ? null : url);
      const target = path && (path === url ? repoPath(url, file) : decodeURIComponent(path));
      if (target && !exists(target)) warn(n, `link to a file that is not in the repository: ${target}`);
    }

    // Raw HTML blocks that Juncture's custom.js completes in the browser (audio players, iframes, the figures
    // with data-repo-* attributes). They are consumed whole and become twin-* divs.
    const raw = /^\s*(?:<center>\s*)?<(audio|figure|iframe)[\s>]/.exec(line);
    if (raw) {
      let block = line, end = i;
      const closing = raw[1] === 'iframe' ? '</iframe>' : `</${raw[1]}>`;
      while (!block.includes(closing) && end + 1 < lines.length) block += '\n' + lines[++end];
      i = end;
      const made = rawBlock(raw[1], block, n, out);
      if (made) out.push('', made, ''); else { fail(n, line, `raw <${raw[1]}> that the twin cannot convert`); out.push(line); }
      continue;
    }
    if (/\bdata-repo-[\w-]+=/.test(line)) fail(n, line, 'data-repo-* attribute outside a block the twin knows');

    const tag = /^\.ve-([\w-]+)(?:\s+(.*))?$/.exec(line);
    if (!tag) { out.push(line); continue; }
    const [, name, rest = ''] = tag;
    const args = tokenize(rest);

    if (name === 'style' || name === 'script') { handled.push({ line: n, kind: `ve-${name} (dropped)` }); continue; }

    if (name === 'header') {
      const { items, next } = takeList(i); i = next;
      const bare = args.filter((a) => !a.key);
      page.title = bare.find((a) => a.quoted)?.value ?? null;
      page.subtitle = args.find((a) => a.key === 'subtitle')?.value ?? null;
      const bg = args.find((a) => a.key === 'background') || bare.find((a) => !a.quoted);
      if (bg && ghPath(bg.value)) { page.header.image = ghPath(bg.value); addImage(n, page.header.image, 'header'); }
      else if (bg) page.header.colour = bg.value;
      for (const a of args) if (a.key && !['subtitle', 'background'].includes(a.key)) fail(n, line, `.ve-header option ${a.key}= is not supported`);
      page.menu = items.map((item) => item.text);
      handled.push({ line: n, kind: 've-header' });
      continue;
    }

    if (name === 'footer') {
      const { items, next } = takeList(i); i = next;
      page.footer = items.map((item) => item.text);          // background= is left to the stylesheet
      handled.push({ line: n, kind: 've-footer' });
      continue;
    }

    if (name === 'media') {
      const target = args.find((a) => !a.key && /^(gh:|https?:)/.test(a.value));
      if (!target && args.some((a) => a.value === 'grid')) {
        const { items, next } = takeList(i); i = next;
        if (args.length > 1) fail(n, line, '.ve-media grid takes no other options');
        const figures = items.map((item) => {
          const itemArgs = tokenize(item.text.replace(/[“”]/g, '"'));
          const src = ghPath(itemArgs[0]?.value || '');
          if (!src) { fail(item.line, item.text, 'gallery item is not a gh: image'); return ''; }
          return figure(item.line, src, itemArgs, true);
        });
        out.push('', ':::: {.twin-gallery}', ...figures, '::::', '');
        handled.push({ line: n, kind: 've-media grid (gallery)' });
      } else if (target && ghPath(target.value)) {
        out.push('', figure(n, ghPath(target.value), args, false), '');
        handled.push({ line: n, kind: 've-media image' });
      } else if (target && /^https:\/\/(www\.youtube\.com\/watch\?v=[\w-]+|vimeo\.com\/\d+(\/\w+)?\/?$)/.test(target.value)) {
        const opts = Object.fromEntries(args.filter((a) => a.key).map((a) => [a.key, a.value]));
        const side = args.find((a) => a.value === 'left' || a.value === 'right')?.value;
        for (const a of args) if (a.key ? !['caption', 'width'].includes(a.key) : !(a === target || a.value === side)) fail(n, line, `.ve-media video option "${a.key || a.value}" is not supported`);
        out.push('', div('twin-video', { src: target.value, side, width: opts.width, title: opts.caption }), '');
        handled.push({ line: n, kind: 've-media video' });
      } else {
        fail(n, line, '.ve-media target is not a gh: image, a YouTube watch?v= URL, a public Vimeo URL or "grid"');
        out.push(line);
      }
      continue;
    }

    if (name === 'iframe') {
      const target = args.find((a) => !a.key && /^https?:/.test(a.value));
      const side = args.find((a) => a.value === 'left' || a.value === 'right')?.value;
      const height = args.find((a) => a.key === 'height')?.value;
      for (const a of args) if (a !== target && a.value !== side && a.key !== 'height') fail(n, line, `.ve-iframe option "${a.key || a.value}" is not supported`);
      if (!target) { fail(n, line, '.ve-iframe without a URL'); out.push(line); continue; }
      out.push('', div('twin-embed', { src: target.value, side, height }), '');
      handled.push({ line: n, kind: 've-iframe' });
      continue;
    }

    fail(n, line, `.ve-${name} is not supported`);
    out.push(line);
  }

  if (!page.title) fail(1, '', 'page has no .ve-header title');
  const markdown = out.join('\n');
  // What stays as raw HTML in the Markdown view: third-party script embeds that cannot be a link.
  const exceptions = [];
  lines.forEach((text, k) => { if (/<(script|smartframe-embed)/.test(text)) { exceptions.push({ file, line: k + 1, text: text.slice(0, 80) }); handled.push({ line: k + 1, kind: 'raw HTML kept (third-party embed)' }); } });
  return { ...page, markdown, handled, warnings, unhandled, exceptions };
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2]) {
  const file = process.argv[2];
  const result = convert(readFileSync(join(REPO_ROOT, file), 'utf8'), file);
  process.stdout.write(result.markdown + '\n');
  for (const w of result.warnings) console.error(`warning ${w.file}:${w.line}  ${w.text}`);
  for (const u of result.unhandled) console.error(`UNHANDLED ${u.file}:${u.line}  ${u.why}`);
}
