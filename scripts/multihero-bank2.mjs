// Parse the string bank and search all sections for pointers into it.
import { readFileSync } from "node:fs";

const buf = readFileSync("MultiHero094/MultiHero.exe");
const imageBase = 0x10000000;
const SECS = [
  { name: ".text", rva: 0x1000, raw: 0x1000, size: 0x8a000 },
  { name: ".rdata", rva: 0x8b000, raw: 0x8b000, size: 0xa000 },
  { name: ".data", rva: 0x95000, raw: 0x95000, size: 0x19000 },
  { name: ".rsrc", rva: 0xe1000, raw: 0xae000, size: 0x170000 },
];
function offToVA(f) {
  for (const s of SECS) if (f >= s.raw && f < s.raw + s.size) return imageBase + s.rva + (f - s.raw);
  return null;
}
function vaToOff(va) {
  const rva = va - imageBase;
  for (const s of SECS) if (rva >= s.rva && rva < s.rva + s.size) return s.raw + (rva - s.rva);
  return null;
}
const vaHex = (v) => (v == null ? "?" : "0x" + v.toString(16));

// --- 1) Dump null-separated strings in the bank around the two template regions ---
function dumpStrings(from, to, label) {
  console.log(`--- strings ${label} (0x${from.toString(16)}..0x${to.toString(16)}) ---`);
  let start = from;
  for (let i = from; i < to; i++) {
    if (buf[i] === 0) {
      if (i > start) {
        const s = buf.toString("latin1", start, i);
        const printable = /^[\x20-\x7e]+$/.test(s);
        console.log(`  va=${vaHex(offToVA(start))} off=0x${start.toString(16)}  ${printable ? '"' + s + '"' : "(bin " + s.replace(/[^\x20-\x7e]/g, "?") + ")"}`);
      }
      start = i + 1;
    }
  }
  console.log("");
}
dumpStrings(0x172980, 0x172a80, "regionA-templates");
dumpStrings(0x174300, 0x174420, "regionB-templates");

// --- 2) Search all sections for pointers into the bank range ---
const LO = 0x101a4000, HI = 0x101f0000;
console.log(`--- pointers into bank [0x${LO.toString(16)},0x${HI.toString(16)}) ---`);
for (const s of SECS) {
  if (s.name === ".reloc") continue;
  const start = s.raw, end = s.raw + s.size;
  for (let i = start; i + 4 <= end; i++) {
    const v = buf.readUInt32LE(i);
    if (v >= LO && v < HI) {
      const refVA = offToVA(i);
      console.log(`  ${s.name} @va=${vaHex(refVA)} -> ${vaHex(v)} (bytes: ${buf.toString("hex", i - 4, i + 8)})`);
      i += 3;
    }
  }
}
