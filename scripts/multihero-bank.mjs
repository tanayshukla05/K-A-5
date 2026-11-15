// Dump context around string fragments in the MultiHero.exe string bank.
import { readFileSync } from "node:fs";

const buf = readFileSync("MultiHero094/MultiHero.exe");
const imageBase = 0x10000000;
function offToVA(f) {
  if (f >= 0xae000 && f < 0xae000 + 0x170000) return imageBase + 0xe1000 + (f - 0xae000);
  if (f >= 0x1000 && f < 0x8b000) return imageBase + f;
  if (f >= 0x8b000 && f < 0x95000) return imageBase + 0x8b000 + (f - 0x8b000);
  if (f >= 0x95000 && f < 0xae000) return imageBase + 0x95000 + (f - 0x95000);
  return null;
}
const vaHex = (f) => { const v = offToVA(f); return v ? "0x" + v.toString(16) : "?"; };

function find(str, limit = 40) {
  const pb = Buffer.from(str, "latin1");
  let idx = 0, n = 0;
  while (n < limit) {
    idx = buf.indexOf(pb, idx);
    if (idx < 0) break;
    n++;
    const lo = Math.max(0, idx - 48), hi = Math.min(buf.length, idx + pb.length + 48);
    const ctx = buf.toString("latin1", lo, hi).replace(/[\x00-\x1f\x7f-\xff]/g, (c) => "\\x" + c.charCodeAt(0).toString(16).padStart(2, "0"));
    console.log(`"${str}" @file=0x${idx.toString(16)} va=${vaHex(idx)}\n   ctx: ${ctx}`);
    idx += 1;
  }
  if (n === 0) console.log(`"${str}": none`);
  console.log("");
}

console.log("=== fragments ===");
find("amap", 20);
find("CTFmap", 20);
find("music%d", 10);
find("zIcon", 10);
find("%d_%d", 10);
find("l%d_%d", 10);
find("Maps\\", 20);
find("zwalk", 10);
