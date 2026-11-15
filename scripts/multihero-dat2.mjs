// Deep empirical analysis of map .dat files.
import { readFileSync, readdirSync } from "node:fs";

const dir = "MultiHero094/Maps";
const files = readdirSync(dir).filter((f) => f.endsWith(".dat")).sort();

// 1) magic scan
console.log("=== magic scan ===");
for (const f of files) {
  const b = readFileSync(`${dir}/${f}`);
  const m = b.subarray(0, 8).toString("hex");
  let magic = "binary";
  if (m.startsWith("89504e47")) magic = "PNG";
  else if (m.startsWith("424d")) magic = "BMP";
  else if (m.startsWith("52696666")) magic = "RIFF";
  console.log(`${f.padEnd(14)} size=${String(b.length).padStart(6)}  ${magic}`);
}

// 2) full dword dump of map1.dat (small vs-map)
function dumpDwords(f, maxDwords = 100000) {
  const b = readFileSync(`${dir}/${f}`);
  const n = Math.min(maxDwords, Math.floor(b.length / 4));
  console.log(`\n=== ${f} (${b.length} bytes, ${Math.floor(b.length / 4)} dwords) — first ${Math.min(n, 200)} ===`);
  const rows = Math.min(n, 200);
  for (let r = 0; r < rows; r += 1) {
    const i = r * 4;
    const v = b.readInt32LE(i);
    const line = [];
    for (let k = 0; k < 8 && r * 8 + k < n; k++) {
      const j = (r * 8 + k) * 4;
      if (j + 4 <= b.length) line.push(b.readInt32LE(j));
    }
    // print 8 per row
    console.log(String(r * 8).padStart(5) + ": " + line.join(", "));
    r_done: break;
  }
}
// simpler: print 8 dwords per line
function dump8(f, start = 0, count = 200) {
  const b = readFileSync(`${dir}/${f}`);
  console.log(`\n=== ${f} dwords ${start}..${Math.min(count, Math.floor(b.length / 4))} of ${Math.floor(b.length / 4)} ===`);
  for (let i = start; i < Math.min(count, Math.floor(b.length / 4)); i += 8) {
    const line = [];
    for (let k = 0; k < 8; k++) {
      const j = (i + k) * 4;
      line.push(j + 4 <= b.length ? b.readInt32LE(j) : "_");
    }
    console.log(String(i).padStart(5) + ": " + line.join(", "));
  }
}
dump8("map1.dat", 0, 176); // 2732B -> 683 dwords, print first 176 then tail
const b1 = readFileSync(`${dir}/map1.dat`);
console.log(`--- map1.dat tail (last 40 dwords) ---`);
for (let i = Math.floor(b1.length / 4) - 40; i < Math.floor(b1.length / 4); i += 8) {
  const line = [];
  for (let k = 0; k < 8; k++) { const j = (i + k) * 4; line.push(j + 4 <= b1.length ? b1.readInt32LE(j) : "_"); }
  console.log(String(i).padStart(5) + ": " + line.join(", "));
}

// 3) float-start detection + -500 segments for amap0
function analyze(f) {
  const b = readFileSync(`${dir}/${f}`);
  const n = Math.floor(b.length / 4);
  let firstFloat = -1;
  for (let i = 0; i < n; i++) {
    const v = b.readUInt32LE(i * 4);
    const f32 = b.readFloatLE(i * 4);
    if (Number.isFinite(f32) && Math.abs(f32) >= 0.001 && Math.abs(f32) < 5000 && (v & 0x7fffffff) >= 0x3f000000 && (v & 0x7fffffff) <= 0x47000000) {
      // plausible float
      if (firstFloat < 0 && i > 0) firstFloat = i;
    }
  }
  // -500 positions
  const neg500 = [];
  for (let i = 0; i < n; i++) if (b.readInt32LE(i * 4) === -500) neg500.push(i);
  const gaps = neg500.slice(1).map((v, k) => v - neg500[k]);
  console.log(`\n=== ${f}: n=${n} firstFloatIdx=${firstFloat} neg500count=${neg500.length} firstNeg500s=${neg500.slice(0, 20).join(",")} gapsFirst20=${gaps.slice(0, 20).join(",")}`);
}
analyze("amap0.dat");
analyze("amap1.dat");
analyze("CTFmap1.dat");
