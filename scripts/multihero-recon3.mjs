/**
 * RECON 03 — dump every printable run in the exe's string-bank region so the
 * game's full name table (file templates, frame lists, Blitz globals,
 * function names) is readable in one place.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const exe = readFileSync('MultiHero094/MultiHero.exe')

// Blitz string banks cluster in the .data section; scan generously.
const START = 0x170000
const END = 0x1a0000

let out = []
let run = []
let runStart = START
for (let i = START; i < END; i++) {
  const c = exe[i]
  if (c >= 32 && c < 127) {
    if (run.length === 0) runStart = i
    run.push(c)
  } else {
    if (run.length >= 3) {
      out.push(`${runStart.toString(16).padStart(6, '0')} ${run.length.toString().padStart(4, ' ')} |${Buffer.from(run).toString('latin1')}|`)
    }
    run = []
  }
}

const text = out.join('\n')
writeFileSync('scripts/multihero-strings.txt', text)
console.log(`runs: ${out.length} · written scripts/multihero-strings.txt (${(text.length / 1024).toFixed(0)} KB)`)
