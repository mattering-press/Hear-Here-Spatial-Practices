// Resized copies of the book's photographs, and static IIIF tiles for the zoomable ones (uses sharp).
//   figure, inline  ->  images/<name>-1600.jpg, 1600 px on the long edge
//   figure          ->  also the widths the page offers the browser through srcset: 800, 1200, 1600 and 2400 px
//                       ("Images online" in DEVELOPMENT.md), never wider than the original. A width that a file made
//                       for the picture already has (the 1600 px file: a landscape picture's 1600, a portrait's 1200;
//                       a card's 800) is that file; the others are images/<name>-w<width>.jpg
//   figure          ->  also iiif/<name>/: info.json and 512 px tiles (IIIF Image API 2, level 0)
//   header          ->  images/<name>-2000.jpg, 2000 px wide: the band behind a page's title
//   card, poster    ->  images/<name>-800.jpg, 800 px wide
// An animated GIF becomes images/<name>.webp, animated and about a sixth of the GIF's size, with its first frame as
// images/<name>-still.jpg for readers who ask for less motion; it gets no tiles, since a zoom viewer cannot animate.
// A photo's EXIF orientation is applied, as browsers do. Juncture's rotation=90 instead turns the stored
// pixels clockwise, as Juncture's image service does (that service ignores the EXIF orientation).
// The pages of a document (documents.mjs, makePages) each get tiles, iiif/<name>/, and two widths, images/<name>-w400.jpg
// (thumbnails, the row of pages on a phone) and images/<name>-w800.jpg (the row of pages, a document's cover in a page).
import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const SIZES = { figure: 1600, inline: 1600, header: 2000, card: 800, poster: 800 };
const LONG_EDGE = new Set(['figure', 'inline']);
const WIDTHS = [800, 1200, 1600, 2400];   // a zoomable picture's widths in the page (srcset)
const PAGE_WIDTHS = [400, 800];           // a document page's widths (srcset)
const TILE = 512;
const JPEG = { quality: 82, progressive: true, mozjpeg: true };
const TILE_JPEG = { quality: 80 };

// media/podcasts/POD08_IMG_4200.jpeg, rotated 90 -> podcasts-pod08-img-4200-r90
export function imageName(src, rotation = 0) {
  const base = src.replace(/^media\//, '').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return rotation ? `${base}-r${rotation}` : base;
}

// One source image, oriented: EXIF orientation, or an explicit rotation of the stored pixels.
const open = (file, rotation) => (rotation ? sharp(file).rotate(rotation) : sharp(file).autoOrient());

// Writes a static IIIF level-0 tile pyramid into dir. OpenSeadragon asks for <id>/<region>/<width>,/0/default.jpg;
// the region and size arithmetic below mirrors its IIIFTileSource.getTileUrl, so every request finds a file.
async function writeTiles(full, dir) {
  const W = full.info.width, H = full.info.height;
  const factors = [1];
  while (Math.max(W, H) / factors.at(-1) > TILE) factors.push(factors.at(-1) * 2);
  let level = full, count = 0;
  const sizes = [];
  for (const factor of factors) {
    const scale = 1 / factor;
    const lw = Math.ceil(W * scale), lh = Math.ceil(H * scale);
    if (factor > 1) level = await sharp(level.data, { raw: level.info }).resize(lw, lh, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    sizes.push({ width: lw, height: lh });
    const tiles = [];
    if (lw < TILE && lh < TILE) tiles.push([0, 0, lw, lh, 'full', lw === W ? 'full' : `${lw},`]);
    else {
      const step = Math.round(TILE / scale);
      for (let y = 0; y * TILE < lh; y++) for (let x = 0; x * TILE < lw; x++) {
        const rx = x * step, ry = y * step, rw = Math.min(step, W - rx), rh = Math.min(step, H - ry);
        const sw = Math.min(TILE, lw - x * TILE), sh = Math.min(TILE, lh - y * TILE);
        const region = x === 0 && y === 0 && rw === W && rh === H ? 'full' : [rx, ry, rw, rh].join(',');
        tiles.push([x * TILE, y * TILE, sw, sh, region, sw === W ? 'full' : `${sw},`]);
      }
    }
    await Promise.all(tiles.map(async ([left, top, width, height, region, size]) => {
      const out = join(dir, region, size, '0');
      mkdirSync(out, { recursive: true });
      await sharp(level.data, { raw: level.info }).extract({ left, top, width, height }).jpeg(TILE_JPEG).toFile(join(out, 'default.jpg'));
    }));
    count += tiles.length;
  }
  // "@id" cannot be known in advance (the site may live at any address); zoom.js sets it from the info.json URL.
  const info = {
    '@context': 'http://iiif.io/api/image/2/context.json', '@id': '.', protocol: 'http://iiif.io/api/image',
    width: W, height: H, sizes: sizes.reverse(), tiles: [{ width: TILE, scaleFactors: factors }],
    profile: ['http://iiif.io/api/image/2/level0.json'],
  };
  writeFileSync(join(dir, 'info.json'), JSON.stringify(info));
  return { count, info };
}

// root is the folder that holds the source image: sourceRoot, or the job's own (a file only in a frozen version's tag).
// All jobs for one source image and rotation. Returns manifest entries keyed "role|src|rotation".
async function makeGroup({ src, rotation, roles, root }, site) {
  const file = join(root, src), name = imageName(src, rotation);
  const entries = {}, done = {};
  if (/\.gif$/i.test(src) && ((await sharp(file).metadata()).pages || 1) > 1) {
    const still = `images/${name}-still.jpg`, url = `images/${name}.webp`;
    const info = await sharp(file, { page: 0 }).jpeg(JPEG).toFile(join(site, still));
    await sharp(file, { animated: true }).webp({ quality: 65 }).toFile(join(site, url));
    for (const role of roles) entries[`${role}|${src}|${rotation}`] = { url, still, width: info.width, height: info.height, animated: true };
    return { entries, tiles: 0, widths: { files: 0, bytes: 0 } };
  }
  const full = roles.has('figure') ? await open(file, rotation).raw().toBuffer({ resolveWithObject: true }) : null;
  let tiles = 0;
  const widths = { files: 0, bytes: 0 };
  for (const role of roles) {
    const size = SIZES[role];
    const url = `images/${name}-${size}.jpg`;
    if (!done[url]) {
      const image = full ? sharp(full.data, { raw: full.info }) : open(file, rotation);
      const resize = LONG_EDGE.has(role) ? { width: size, height: size, fit: 'inside' } : { width: size };
      const info = await image.resize({ ...resize, withoutEnlargement: true }).jpeg(JPEG).toFile(join(site, url));
      done[url] = { url, width: info.width, height: info.height };
    }
    entries[`${role}|${src}|${rotation}`] = { ...done[url] };
  }
  if (full) {
    const figure = entries[`figure|${src}|${rotation}`];
    // the picture's widths for srcset, smallest first; the largest is also where the picture links without JavaScript
    figure.srcset = [];
    for (const width of new Set(WIDTHS.map((w) => Math.min(w, full.info.width)))) {
      // a file of this width made above (the 1600 px file, a card's 800 px one) is the same picture: use it
      const same = Object.values(done).find((d) => d.width === width);
      if (same) { figure.srcset.push({ url: same.url, width }); continue; }
      const url = `images/${name}-w${width}.jpg`;
      const info = await sharp(full.data, { raw: full.info }).resize({ width }).jpeg(JPEG).toFile(join(site, url));
      figure.srcset.push({ url, width: info.width });
      widths.files++;
      widths.bytes += info.size;
    }
    figure.largest = figure.srcset.at(-1).url;
    tiles = (await writeTiles(full, join(site, 'iiif', name))).count;
    figure.tiles = `iiif/${name}/info.json`;
  }
  return { entries, tiles, widths };
}

// The pages of documents: pages [{ file, name }] -> [{ width, height, tiles, info, srcset: [{ url, width, height }] }] in
// the same order, and the number of tiles. info is the page's info.json, which the document's data repeats.
export async function makePages(pages, site) {
  mkdirSync(join(site, 'images'), { recursive: true });
  const out = new Array(pages.length), queue = pages.map((page, i) => ({ ...page, i }));
  let tiles = 0;
  const worker = async () => {
    for (let page; (page = queue.shift());) {
      const full = await sharp(page.file).flatten({ background: '#ffffff' }).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
      const srcset = [];
      for (const width of new Set(PAGE_WIDTHS.map((w) => Math.min(w, full.info.width)))) {
        const url = `images/${page.name}-w${width}.jpg`;
        const info = await sharp(full.data, { raw: full.info }).resize({ width }).jpeg(JPEG).toFile(join(site, url));
        srcset.push({ url, width: info.width, height: info.height });
      }
      const made = await writeTiles(full, join(site, 'iiif', page.name));
      tiles += made.count;
      out[page.i] = { width: full.info.width, height: full.info.height, tiles: `iiif/${page.name}/info.json`, info: made.info, srcset };
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, Math.max(1, availableParallelism() - 1)) }, worker));
  return { pages: out, tiles };
}

// jobs: [{ src, role, rotation, root? }] -> { images: { "role|src|rotation": { url, width, height, tiles?, srcset?, largest? } },
//   tiles, sources, widths: { files, bytes } } (widths: the files made only for srcset, so the build can say what they add)
export async function makeImages(jobs, sourceRoot, site) {
  mkdirSync(join(site, 'images'), { recursive: true });
  const groups = new Map(), names = new Map();
  for (const { src, role, rotation, root } of jobs) {
    const key = `${src}|${rotation}`;
    if (!groups.has(key)) groups.set(key, { src, rotation, roles: new Set(), root: root || sourceRoot });
    groups.get(key).roles.add(role);
    const name = imageName(src, rotation);
    if (names.has(name) && names.get(name) !== key) throw new Error(`two images would share the name ${name}: ${names.get(name)} and ${key}`);
    names.set(name, key);
  }
  const queue = [...groups.values()], images = {};
  let tiles = 0;
  const widths = { files: 0, bytes: 0 };
  const worker = async () => {
    for (let group; (group = queue.shift());) {
      const result = await makeGroup(group, site);
      Object.assign(images, result.entries);
      tiles += result.tiles;
      widths.files += result.widths.files;
      widths.bytes += result.widths.bytes;
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, Math.max(1, availableParallelism() - 1)) }, worker));
  return { images, tiles, sources: groups.size, widths };
}
