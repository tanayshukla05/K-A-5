// MultiHero asset extractor: BMP -> PNG (with transparency keying), WAV copy, manifest.
// No external deps: minimal PNG encoder using node zlib.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const ROOT = "MultiHero094";
const OUT = "public/multihero";

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  // rgba: Buffer w*h*4
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- BMP decoder -> {w,h,rgba} ----------
function decodeBMP(buf) {
  if (buf.length < 54 || buf.toString("latin1", 0, 2) !== "BM") return null;
  const offBits = buf.readUInt32LE(10);
  const dibSize = buf.readUInt32LE(14);
  let w = buf.readInt32LE(18);
  let hRaw = buf.readInt32LE(22);
  const bpp = buf.readUInt16LE(28);
  const comp = buf.readUInt32LE(30);
  if (comp !== 0) return null; // BI_RGB only
  const topDown = hRaw < 0;
  const h = Math.abs(hRaw);
  if (w <= 0 || h <= 0 || w > 4096 || h > 4096) return null;
  // palette
  let palette = null;
  if (bpp <= 8) {
    let palOff = 14 + dibSize;
    // some DIBs have palette size field (biClrUsed) at 14+46? handle standard: colors used at 14+32
    const clrUsed = dibSize >= 40 ? buf.readUInt32LE(14 + 32) : 0;
    const n = clrUsed || (1 << bpp);
    palette = [];
    for (let i = 0; i < n; i++) {
      const o = palOff + i * 4;
      if (o + 4 > buf.length) break;
      palette.push([buf[o + 2], buf[o + 1], buf[o]]); // BGRX -> RGB
    }
  }
  const rowSize = Math.floor((bpp * w + 31) / 32) * 4;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcY = topDown ? y : h - 1 - y;
    const rowStart = offBits + srcY * rowSize;
    if (rowStart + rowSize > buf.length) return null;
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      if (bpp === 24 || bpp === 32) {
        const o = rowStart + x * (bpp / 8);
        b = buf[o]; g = buf[o + 1]; r = buf[o + 2];
        if (bpp === 32) { /* ignore alpha */ }
      } else if (bpp === 16) {
        const v = buf.readUInt16LE(rowStart + x * 2);
        r = ((v >> 10) & 31) * 8; g = ((v >> 5) & 31) * 8; b = (v & 31) * 8;
      } else if (bpp === 8) {
        const p = palette[buf[rowStart + x]] || [0, 0, 0];
        r = p[0]; g = p[1]; b = p[2];
      } else if (bpp === 4) {
        const byte = buf[rowStart + (x >> 1)];
        const idx = (x & 1) ? (byte & 15) : (byte >> 4);
        const p = palette[idx] || [0, 0, 0];
        r = p[0]; g = p[1]; b = p[2];
      } else if (bpp === 1) {
        const byte = buf[rowStart + (x >> 3)];
        const bit = (byte >> (7 - (x & 7))) & 1;
        const p = palette[bit] || [0, 0, 0];
        r = p[0]; g = p[1]; b = p[2];
      } else return null;
      const o = (y * w + x) * 4;
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = 255;
    }
  }
  return { w, h, rgba };
}

// ---------- transparency keying ----------
function applyKey(img) {
  const { w, h, rgba } = img;
  const get = (x, y) => {
    const o = (y * w + x) * 4;
    return (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
  };
  // border ring coverage
  const counts = new Map();
  const bump = (c) => counts.set(c, (counts.get(c) || 0) + 1);
  for (let x = 0; x < w; x++) { bump(get(x, 0)); bump(get(x, h - 1)); }
  for (let y = 0; y < h; y++) { bump(get(0, y)); bump(get(w - 1, y)); }
  const borderTotal = 2 * w + 2 * h;
  let best = 0, bestC = -1;
  for (const [c, n] of counts) if (n > best) { best = n; bestC = c; }
  const cover = best / borderTotal;
  let key = null;
  const MAGENTA = 0xff00ff;
  if (bestC === MAGENTA) key = MAGENTA;
  else if (cover >= 0.25) key = bestC;
  else if (cover >= 0.08) key = bestC; // permissive for small sprites
  if (key == null) return img;
  const kr = (key >> 16) & 255, kg = (key >> 8) & 255, kb = key & 255;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i] === kr && rgba[i + 1] === kg && rgba[i + 2] === kb) rgba[i + 3] = 0;
  }
  return img;
}

// ---------- main ----------
mkdirSync(OUT, { recursive: true });
for (const d of ["chars", "tiles", "stuff", "fonts", "sfx", "music"]) mkdirSync(join(OUT, d), { recursive: true });

const manifest = { characters: {}, tiles: {}, stuff: {}, fonts: {}, sounds: [] };
let converted = 0, failed = 0;
const failures = [];

function convFile(srcAbs, relDir, outName, bucket, bucketKey) {
  let img;
  try { img = decodeBMP(readFileSync(srcAbs)); } catch { img = null; }
  if (!img) { failed++; failures.push(srcAbs); return null; }
  img = applyKey(img);
  const png = encodePNG(img.w, img.h, img.rgba);
  const outPath = join(OUT, relDir, outName.replace(/\.bmp$/i, ".png"));
  writeFileSync(outPath, png);
  converted++;
  if (bucket) {
    bucket[bucketKey] = bucket[bucketKey] || {};
    bucket[bucketKey][outName.replace(/\.bmp$/i, ".png")] = { w: img.w, h: img.h };
  }
  return img;
}

// characters 1..10
for (let c = 1; c <= 10; c++) {
  const dir = join(ROOT, "gfx", String(c));
  mkdirSync(join(OUT, "chars", String(c)), { recursive: true });
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".bmp"));
  const frames = {};
  for (const f of files) {
    const outName = f.toLowerCase();
    const img = convFile(join(dir, f), join("chars", String(c)), outName, null, null);
    if (img) frames[outName.replace(/\.bmp$/i, ".png")] = { w: img.w, h: img.h };
  }
  manifest.characters[String(c)] = { frames };
}

// tiles
{
  const dir = join(ROOT, "gfx", "tiles");
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".bmp"));
  const tiles = {};
  for (const f of files) {
    const img = convFile(join(dir, f), "tiles", f.toLowerCase(), null, null);
    if (img) tiles[f.toLowerCase().replace(/\.bmp$/, "")] = { w: img.w, h: img.h };
  }
  manifest.tiles = tiles;
}

// stuff
{
  const dir = join(ROOT, "gfx", "stuff");
  const files = readdirSync(dir);
  const stuff = {};
  for (const f of files) {
    const lower = f.toLowerCase();
    if (lower.endsWith(".bmp")) {
      const img = convFile(join(dir, f), "stuff", lower, null, null);
      if (img) stuff[lower.replace(/\.bmp$/, "")] = { w: img.w, h: img.h };
    } else if (lower.endsWith(".png")) {
      copyFileSync(join(dir, f), join(OUT, "stuff", lower));
      stuff[lower.replace(/\.png$/, "")] = { png: true };
    }
  }
  manifest.stuff = stuff;
}

// fonts
{
  const dir = join(ROOT, "gfx", "fonts");
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".bmp"));
  const fonts = {};
  for (const f of files) {
    const img = convFile(join(dir, f), "fonts", f.toLowerCase(), null, null);
    if (img) fonts[f.toLowerCase().replace(/\.bmp$/, "")] = { w: img.w, h: img.h };
  }
  manifest.fonts = fonts;
}

// sounds
{
  const dir = join(ROOT, "sounds");
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".wav"));
  for (const f of files) {
    const lower = f.toLowerCase();
    if (/^music/.test(lower)) copyFileSync(join(dir, f), join(OUT, "music", lower));
    else copyFileSync(join(dir, f), join(OUT, "sfx", lower));
    manifest.sounds.push(lower);
  }
}

// level 51 secret background (PNG already)
try { copyFileSync(join(ROOT, "Maps", "amap51.dat"), join(OUT, "stuff", "level51bg.png")); } catch {}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest));
console.log(`converted=${converted} failed=${failed}`);
if (failures.length) console.log("failures (first 10):", failures.slice(0, 10));
