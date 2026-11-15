// Scan .text for direct E8/E9 call/jmp sites to target addresses.
import { readFileSync } from "node:fs";

const buf = readFileSync("MultiHero094/MultiHero.exe");
const imageBase = 0x10000000;
const TEXT_RAW = 0x1000, TEXT_SIZE = 0x8a000;

const targets = {
  "0x1000e9c2": "OpenFile(name,mode)->obj",
  "0x1000cdc6": "openfile-low(name,mode)",
  "0x1000c2e3": "OpenFileAlt",
  "0x1000eb50": "wrap-open-0x12",
  "0x1000eb63": "wrap-open-3",
  "0x1000eb73": "wrap-read?",
};

const sites = [];
for (let i = 0; i < TEXT_SIZE; i++) {
  const off = TEXT_RAW + i;
  const op = buf[off];
  if (op !== 0xe8 && op !== 0xe9) continue;
  const rel = buf.readInt32LE(off + 1);
  const va = imageBase + off;
  const target = va + 5 + rel;
  const key = "0x" + target.toString(16);
  if (targets[key]) {
    const pre = buf.toString("hex", off - 6, off);
    sites.push({ va: "0x" + va.toString(16), op: op === 0xe8 ? "call" : "jmp", target: key, name: targets[key], pre });
  }
}
for (const s of sites) console.log(`${s.op} @${s.va} -> ${s.target} (${s.name})   pre:${s.pre}`);
console.log("total", sites.length);
