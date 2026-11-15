/**
 * MULTIHERO ASSET SCAN — read-only inventory of the shipped game data.
 * Parses every BMP (headers + palette) and WAV (fmt chunk) under
 * MultiHero094/ and prints a compact manifest so the web-port pipeline
 * can be designed against real formats instead of guesses.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = 'MultiHero094'

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

const files = walk(ROOT)
const bmps = files.filter(f => f.toLowerCase().endsWith('.bmp'))
const wavs = files.filter(f => f.toLowerCase().endsWith('.wav'))

/* ---------- BMP ---------- */
function bmpInfo(path) {
  const b = readFileSync(path)
  if (b.length < 54) return null
  if (b[0] !== 0x42 || b[1] !== 0x4d) return null
  const off = b.readUInt32LE(10)
  const hdrSize = b.readUInt32LE(14)
  let w, h, bpp, comp, palColors
  if (hdrSize >= 40) {
    w = b.readInt32LE(18)
    h = b.readInt32LE(22)
    bpp = b.readUInt16LE(28)
    comp = b.readUInt32LE(30)
    palColors = b.readUInt32LE(46)
  } else {
    w = b.readUInt16LE(18); h = 0; bpp = b.readUInt16LE(24); comp = 0; palColors = 0
  }
  const paletteBytes = off - 14 - hdrSize
  const dataBytes = b.length - off
  const bytesPerRow = Math.floor((bpp * w + 31) / 32) * 4
  return { off, hdrSize, w, h, bpp, comp, palColors, paletteBytes, dataBytes, bytesPerRow, file: b.length }
}

const byDir = new Map()
for (const f of bmps) {
  const info = bmpInfo(f)
  if (!info) { console.log('NOT-BMP:', f); continue }
  const rel = relative(ROOT, f).replaceAll('\\', '/')
  const dir = rel.slice(0, rel.lastIndexOf('/'))
  if (!byDir.has(dir)) byDir.set(dir, [])
  byDir.get(dir).push({ rel: rel.slice(dir.length + 1), ...info })
}

for (const [dir, list] of byDir) {
  list.sort((a, b) => {
    const na = a.rel.match(/(\d+)/)?.[1], nb = b.rel.match(/(\d+)/)?.[1]
    return (na && nb ? +na - +nb : a.rel.localeCompare(b.rel)) || a.rel.localeCompare(b.rel)
  })
  console.log(`\n== ${dir} (${list.length} files) ==`)
  const bpps = new Set(list.map(x => x.bpp))
  console.log(`  bpp variants: ${[...bpps].join(', ')} · hdr ${list[0].hdrSize} · palette ${list[0].paletteBytes}B`)
  // group by identical (w,h)
  const dims = new Map()
  for (const x of list) {
    const k = `${x.w}x${x.h}`
    if (!dims.has(k)) dims.set(k, [])
    dims.get(k).push(x.rel)
  }
  for (const [k, v] of dims) console.log(`  ${k}  ×${v.length}  [${v.slice(0, 12).join(', ')}${v.length > 12 ? ', …' : ''}]`)
}

/* ---------- WAV ---------- */
function wavInfo(path) {
  const b = readFileSync(path)
  if (b.length < 44) return null
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return null
  let p = 12
  let fmt = null
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4)
    const size = b.readUInt32LE(p + 4)
    if (id === 'fmt ') {
      fmt = {
        tag: b.readUInt16LE(p + 8),
        channels: b.readUInt16LE(p + 10),
        rate: b.readUInt32LE(p + 12),
        bits: b.readUInt16LE(p + 22),
        blockAlign: b.readUInt16LE(p + 16),
      }
    }
    if (id === 'data') return { fmt, data: size, file: b.length }
    p += 8 + size + (size & 1)
  }
  return { fmt, data: b.length - p, file: b.length }
}

console.log(`\n== sounds (${wavs.length} files) ==`)
let totalWav = 0
for (const f of wavs) {
  const info = wavInfo(f)
  if (!info || !info.fmt) { console.log('  NOT-WAV:', f); continue }
  const dur = info.data / (info.fmt.rate * info.fmt.channels * (info.fmt.bits / 8))
  totalWav += info.file
  console.log(`  ${relative(ROOT, f).replaceAll('\\','/')}  ${info.fmt.rate}Hz ${info.fmt.bits}bit ch=${info.fmt.channels} tag=${info.fmt.tag} ${dur.toFixed(1)}s ${(info.file/1024).toFixed(0)}KB`)
}
console.log(`  TOTAL ${(totalWav/1024/1024).toFixed(2)} MB`)
