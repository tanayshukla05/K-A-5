/**
 * RECON 02 — Blitz-string mining in MultiHero.exe + statistical look at the
 * .dat map files. Blitz Basic stores string literals as
 * <u32 length><bytes>[null?], so plain null-terminated searches miss them.
 */
import { readFileSync } from 'node:fs'

const exe = readFileSync('MultiHero094/MultiHero.exe')
const ascii = Buffer.from(exe)

function findAll(needle, limit = 40) {
  const hits = []
  const n = Buffer.from(needle, 'latin1')
  let i = 0
  while ((i = ascii.indexOf(n, i)) !== -1 && hits.length < limit) {
    // print surrounding bytes decoded as latin1, stripping non-printables
    const start = Math.max(0, i - 12)
    const end = Math.min(ascii.length, i + needle.length + 48)
    let ctx = ''
    for (let k = start; k < end; k++) {
      const c = ascii[k]
      ctx += (c >= 32 && c < 127) ? String.fromCharCode(c) : (c === 13 ? '' : '.')
    }
    hits.push({ off: i, ctx })
    i += needle.length
  }
  return hits
}

for (const needle of [
  'amap', 'CTFmap', 'gfx\\', 'gfx/', 'Maps\\', '.dat', '.bmp', '.wav',
  'zblow', 'zwalk', 'zspecial', 'tiles\\', 'stuff\\', 'fonts\\',
  'Mario', 'Goku', 'Ryu', 'Mike', 'Richter', 'Predator', 'Shredder', 'Spider', 'Joker', 'Batman', 'Michel',
]) {
  const hits = findAll(needle)
  if (hits.length) {
    console.log(`\n### "${needle}" ×${hits.length}`)
    for (const h of hits.slice(0, 8)) console.log(`  @${h.off.toString(16)}  |${h.ctx}|`)
  } else {
    console.log(`\n### "${needle}" — none`)
  }
}

/* ---------- map .dat statistics ---------- */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
const mapDir = 'MultiHero094/Maps'
const names = readdirSync(mapDir).filter(n => n.endsWith('.dat')).sort((a, b) => {
  const na = a.match(/(\d+)/)?.[1] ?? '9999'
  const nb = b.match(/(\d+)/)?.[1] ?? '9999'
  return a[0].localeCompare(b[0]) || +na - +nb
})
console.log('\n===== MAP FILES =====')
for (const n of names) {
  const b = readFileSync(join(mapDir, n))
  const i32 = (o) => b.readInt32LE(o)
  const u32 = (o) => b.readUInt32LE(o)
  const i16 = (o) => b.readInt16LE(o)
  console.log(`\n${n} (${b.length}B)`)
  console.log(`  u32[0..7]: ${[0, 4, 8, 12, 16, 20, 24, 28].map(o => u32(o)).join(', ')}`)
  // try (size-H)/2 == w*h with h=50?
  for (const H of [0, 4, 8, 12, 16, 20, 24, 40, 100, 104, 108]) {
    const rest = b.length - H
    if (rest > 0 && rest % 2 === 0) {
      const cells = rest / 2
      // find factor pairs
      const pairs = []
      for (let w = 1; w <= Math.sqrt(cells); w++) if (cells % w === 0) pairs.push(`${w}x${cells / w}`)
      if (pairs.length <= 6) console.log(`  H=${H}: cells=${cells} (${pairs.join(' ')})`)
    }
  }
}
