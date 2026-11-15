// Empirical analysis of MultiHero map .dat files.
import { readFileSync, readdirSync } from "node:fs";

const dir = "MultiHero094/Maps";
const files = readdirSync(dir).filter((f) => f.endsWith(".dat"));
console.log("map files:", files.length);

function bytes(f, n, off = 0) {
  const b = readFileSync(`${dir}/${f}`);
  const end = Math.min(off + n, b.length);
  return { b, slice: b.subarray(off, end) };
}
function hexdump(f, off = 0, n = 128) {
  const { b, slice } = bytes(f, n, off);
  console.log(`\n=== ${f} (size=${b.length}) @off=0x${off.toString(16)} ===`);
  for (let i = 0; i < slice.length; i += 16) {
    const line = slice.subarray(i, i + 16);
    const hx = [...line].map((x) => x.toString(16).padStart(2, "0")).join(" ");
    const asci = [...line].map((x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : ".")).join("");
    const rel = off + i;
    const i16 = [];
    for (let j = 0; j + 2 <= line.length; j += 2) i16.push(line.readInt16LE(j));
    const i32 = [];
    for (let j = 0; j + 4 <= line.length; j += 4) i32.push(line.readInt32LE(j));
    console.log(`  ${rel.toString().padStart(6)}  ${hx}  |${asci}|  i16[${i16.slice(0, 8).join(",")}] i32[${i32.slice(0, 4).join(",")}]`);
  }
}

// maps.dat fully, save.dat fully
hexdump("../maps.dat", 0, 48);
try { hexdump("../save.dat", 0, 32); } catch {}

// first 192 bytes of several maps
for (const f of ["amap0.dat", "amap1.dat", "amap2.dat", "map1.dat", "CTFmap1.dat", "amap51.dat"]) {
  try { hexdump(f, 0, 160); } catch (e) { console.log(f, "ERR", String(e)); }
}

// value histogram of amap0.dat as int32 and int16 streams
function hist(f) {
  const b = readFileSync(`${dir}/${f}`);
  const h32 = new Map(), h16 = new Map();
  for (let i = 0; i + 4 <= b.length; i += 4) { const v = b.readInt32LE(i); h32.set(v, (h32.get(v) || 0) + 1); }
  for (let i = 0; i + 2 <= b.length; i += 2) { const v = b.readInt16LE(i); h16.set(v, (h16.get(v) || 0) + 1); }
  const top = (m, k = 24) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k)
    .map(([v, c]) => `${v}x${c}`).join("  ");
  console.log(`\n${f}: top int32: ${top(h32)}`);
  console.log(`${f}: top int16: ${top(h16)}`);
  // file size modulo checks
  console.log(`${f}: size=${b.length}  %4=${b.length % 4}  %2=${b.length % 2}`);
}
for (const f of ["amap0.dat", "amap1.dat", "map1.dat", "CTFmap1.dat"]) hist(f);
