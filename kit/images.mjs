// Resized copies of the book's photographs, and static IIIF tiles for the zoomable ones (uses sharp).
//   figure, inline  ->  images/<name>-1600.jpg, 1600 px on the long edge
//   figure          ->  also iiif/<name>/: info.json and 512 px tiles (IIIF Image API 2, level 0)
//   header          ->  images/<name>-2000.jpg, 2000 px wide
//   card, poster    ->  images/<name>-800.jpg, 800 px wide
// A photo's EXIF orientation is applied, as browsers do. Juncture's rotation=90 instead turns the stored
// pixels clockwise, as Juncture's image service does (that service ignores the EXIF orientation).
import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const SIZES = { figure: 1600, inline: 1600, header: 2000, card: 800, poster: 800 };
const LONG_EDGE = new Set(['figure', 'inline']);
const TILE = 512;
const JPEG = { quality: 80, progressive: true, mozjpeg: true };
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
  writeFileSync(join(dir, 'info.json'), JSON.stringify({
    '@context': 'http://iiif.io/api/image/2/context.json', '@id': '.', protocol: 'http://iiif.io/api/image',
    width: W, height: H, sizes: sizes.reverse(), tiles: [{ width: TILE, scaleFactors: factors }],
    profile: ['http://iiif.io/api/image/2/level0.json'],
  }));
  return count;
}

// All jobs for one source image and rotation. Returns manifest entries keyed "role|src|rotation".
async function makeGroup({ src, rotation, roles }, sourceRoot, site) {
  const file = join(sourceRoot, src), name = imageName(src, rotation);
  const entries = {}, done = {};
  const full = roles.has('figure') ? await open(file, rotation).raw().toBuffer({ resolveWithObject: true }) : null;
  let tiles = 0;
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
    tiles = await writeTiles(full, join(site, 'iiif', name));
    entries[`figure|${src}|${rotation}`].tiles = `iiif/${name}/info.json`;
  }
  return { entries, tiles };
}

// jobs: [{ src, role, rotation }] -> { images: { "role|src|rotation": { url, width, height, tiles? } }, tiles }
export async function makeImages(jobs, sourceRoot, site) {
  mkdirSync(join(site, 'images'), { recursive: true });
  const groups = new Map(), names = new Map();
  for (const { src, role, rotation } of jobs) {
    const key = `${src}|${rotation}`;
    if (!groups.has(key)) groups.set(key, { src, rotation, roles: new Set() });
    groups.get(key).roles.add(role);
    const name = imageName(src, rotation);
    if (names.has(name) && names.get(name) !== key) throw new Error(`two images would share the name ${name}: ${names.get(name)} and ${key}`);
    names.set(name, key);
  }
  const queue = [...groups.values()], images = {};
  let tiles = 0;
  const worker = async () => {
    for (let group; (group = queue.shift());) {
      const result = await makeGroup(group, sourceRoot, site);
      Object.assign(images, result.entries);
      tiles += result.tiles;
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, Math.max(1, availableParallelism() - 1)) }, worker));
  return { images, tiles, sources: groups.size };
}
