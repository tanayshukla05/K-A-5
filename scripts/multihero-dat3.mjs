// Full dword dumps of the smallest maps + full dump of amap0 to a file.
import { readFileSync, writeFileSync } from "node:fs";

const dir = "MultiHero094/Maps";
function dump(f) {
  const b = readFileSync(`${dir}/${f}`);
  const n = Math.floor(b.length / 4);
  console.log(`\n===== ${f} (${b.length} bytes = ${n} dwords) =====`);
  for (let i = 0; i < n; i += 8) {
    const line = [];
    for (let k = 0; k < 8; k++) {
      const j = (i + k) * 4;
      if (j + 4 <= b.length) {
        const v = b.readInt32LE(j);
        const f32 = b.readFloatLE(j);
        let s = String(v);
        // annotate plausible floats
        if ((v >>> 0) >= 0x3f000000 && (v >>> 0) <= 0x47000000 && Math.abs(f32) > 0.01 && Math.abs(f32) < 5000) s += `(~${f32.toFixed(1)})`;
        if (v === -500) s = "-500*";
        line.push(s);
      } else line.push("_");
    }
    console.log(String(i).padStart(5) + ": " + line.join("  "));
  }
  // leftover bytes
  const rem = b.length % 4;
  if (rem) console.log("leftover bytes:", b.subarray(n * 4).toString("hex"));
}
dump("map0.dat");
dump("map19.dat");
dump("map44.dat");
dump("map46.dat");

// full amap0 dword dump to file for analysis
const b = readFileSync(`${dir}/amap0.dat`);
const n = Math.floor(b.length / 4);
let out = "";
for (let i = 0; i < n; i += 8) {
  const line = [];
  for (let k = 0; k < 8; k++) {
    const j = (i + k) * 4;
    if (j + 4 <= b.length) {
      const v = b.readInt32LE(j);
      const f32 = b.readFloatLE(j);
      let s = String(v);
      if ((v >>> 0) >= 0x3f000000 && (v >>> 0) <= 0x47000000 && Math.abs(f32) > 0.01 && Math.abs(f32) < 5000) s += `(~${f32.toFixed(1)})`;
      if (v === -500) s = "-500*";
      line.push(s);
    } else line.push("_");
  }
  out += String(i).padStart(5) + ": " + line.join("  ") + "\n";
}
writeFileSync("scripts/amap0-dwords.txt", out);
console.log("\nwrote scripts/amap0-dwords.txt,", n, "dwords");
