// Inspect name-table entries: name string + following dword; test if dword is a plausible VA.
import { readFileSync } from "node:fs";
const buf = readFileSync("MultiHero094/MultiHero.exe");
const imageBase = 0x10000000;

function inspect(off, len = 64) {
  // name starts at off-1? strings.txt offset points at name start; find preceding 0 and following dword
  let start = off;
  while (buf[start - 1] !== 0 && start > off - 64) start--;
  let end = off;
  while (buf[end] !== 0) end++;
  const name = buf.toString("latin1", start, end);
  const d = end + 1 <= buf.length - 4 ? buf.readInt32LE(end + 1) : 0;
  const ctx = buf.toString("hex", end + 1, end + 21);
  const plausVA = d > 0x10001000 && d < 0x10260000 ? " VA!" : d > 0x400000 && d < 0x600000 ? " base0x400000?" : "";
  console.log(`@0x${start.toString(16)} "${name}"  dword=0x${(d >>> 0).toString(16)} (${d})${plausVA}  next-bytes: ${ctx}`);
}

for (const o of [0x18726d, 0x1876bd, 0x1876cb, 0x1877c2, 0x1914bf, 0x1922aa, 0x192c88]) inspect(o);
