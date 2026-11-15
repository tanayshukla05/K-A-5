// Locate format strings in MultiHero.exe and find code that references them.
import { readFileSync } from "node:fs";

const P = "MultiHero094/MultiHero.exe";
const buf = readFileSync(P);

// --- parse PE headers ---
const e_lfanew = buf.readUInt32LE(0x3c);
const machine = buf.readUInt16LE(e_lfanew + 4);
const nSections = buf.readUInt16LE(e_lfanew + 6);
const optSize = buf.readUInt16LE(e_lfanew + 20);
const optStart = e_lfanew + 24;
const imageBase = buf.readUInt32LE(optStart + 28);
const secStart = optStart + optSize;
const sections = [];
for (let i = 0; i < nSections; i++) {
  const s = secStart + i * 40;
  const name = buf.toString("ascii", s, s + 8).replace(/\0.*$/, "");
  const virtualSize = buf.readUInt32LE(s + 8);
  const virtualAddress = buf.readUInt32LE(s + 12);
  const sizeOfRawData = buf.readUInt32LE(s + 16);
  const pointerToRawData = buf.readUInt32LE(s + 20);
  sections.push({ name, virtualSize, virtualAddress, sizeOfRawData, pointerToRawData });
}
console.log("imageBase=0x" + imageBase.toString(16), "machine=0x" + machine.toString(16));
for (const s of sections) console.log("  sec", s.name, "rva=0x" + s.virtualAddress.toString(16), "raw=0x" + s.pointerToRawData.toString(16), "rawsize=0x" + s.sizeOfRawData.toString(16));

function offToVA(f) {
  for (const s of sections) {
    if (s.sizeOfRawData > 0 && f >= s.pointerToRawData && f < s.pointerToRawData + s.sizeOfRawData)
      return imageBase + s.virtualAddress + (f - s.pointerToRawData);
  }
  return null;
}

// --- find string occurrences ---
const patterns = [
  "Maps\\amap%d.dat",
  "map%d.dat",
  "CTFmap%d.dat",
  "music%d.wav",
  "gfx\\tiles\\%d_%d.bmp",
  "gfx\\%d\\zIcon.bmp",
  "gfx\\fonts\\l%d_%d.bmp",
  "save.dat",
  "maps.dat",
  "gfx\\stuff\\",
];
const found = [];
for (const p of patterns) {
  const pb = Buffer.from(p, "latin1");
  let idx = 0;
  while (true) {
    idx = buf.indexOf(pb, idx);
    if (idx < 0) break;
    const va = offToVA(idx);
    found.push({ str: p, off: idx, va });
    idx += 1;
  }
}
console.log("\n--- string occurrences ---");
for (const f of found) console.log(`"${f.str}"  file=0x${f.off.toString(16)}  va=${f.va ? "0x" + f.va.toString(16) : "?"}`);

// --- find code refs in .text ---
const text = sections.find((s) => s.name === ".text");
if (text) {
  const tStart = text.pointerToRawData;
  const tEnd = tStart + text.sizeOfRawData;
  console.log("\n--- .text references (push/mov imm32 of string VA) ---");
  for (const f of found) {
    if (!f.va) continue;
    const le = Buffer.alloc(4);
    le.writeUInt32LE(f.va, 0);
    let idx = tStart;
    const hits = [];
    while (true) {
      idx = buf.indexOf(le, idx);
      if (idx < 0 || idx >= tEnd) break;
      const va = offToVA(idx);
      hits.push(va);
      // print surrounding bytes for context
      const ctx = buf.toString("hex", idx - 6, idx + 4);
      console.log(`  ref to "${f.str}" va=0x${va.toString(16)}  bytes[-6..+4]=${ctx}`);
      idx += 1;
    }
    if (hits.length === 0) console.log(`  (no .text refs for "${f.str}")`);
  }
}
