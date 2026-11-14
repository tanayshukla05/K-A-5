/**
 * Links directory for the LINKS page.
 *
 * To add a link, append one entry to the array below — the page, its
 * numbering, and the count update automatically:
 *
 *   { label: 'My Website', url: 'https://example.com', note: 'optional note' }
 *
 * `note` is optional. Rows are numbered in array order (LINK 01, 02, …).
 * Every row opens in a new tab.
 */

export type ArchiveLink = {
  label: string
  url: string
  note?: string
  /** Which artifact material this row is rendered as — see .artifact--* in globals.css. */
  variant?: 'seal' | 'stencil' | 'terminal' | 'tactical'
    | 'gothic' | 'goodboy' | 'acid' | 'typewriter' | 'holo' | 'arcade'
    | 'wreck' | 'glitch' | 'friendly' | 'prism'
}

export const LINKS: ArchiveLink[] = [
  {
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/tanay-shukla-23198a334/',
    note: 'Pandit Tanay Shukla Ji Maharaj',
    variant: 'seal',
  },
  {
    label: 'Play IGI',
    url: 'https://playigi.com/',
    note: 'Project I.G.I. in the browser',
    variant: 'stencil',
  },
  {
    label: 'GitHub',
    url: 'https://github.com/tanayshukla05',
    note: 'tanayshukla05',
    variant: 'terminal',
  },
  {
    label: 'RCWS v5',
    url: 'https://github.com/wildcard1719/RCWS_v5',
    note: '3D-printed remote weapon system — STEP files + design handbook',
    variant: 'tactical',
  },
  {
    label: 'MaleficentVM',
    url: 'https://github.com/winsecurity/MaleficentVM',
    note: 'Practice VM for malware development',
    variant: 'gothic',
  },
  {
    label: 'GOODBOY',
    url: 'https://github.com/F2u0a0d3/goodboy-framework',
    note: '15-stage Rust malware course — red builds, blue detects, 0/76 VT',
    variant: 'goodboy',
  },
  {
    label: 'RABIDS',
    url: 'https://github.com/atiilla/RABIDS',
    note: 'Modular malware framework for adversary simulation',
    variant: 'acid',
  },
  {
    label: 'Malware Lab',
    url: 'https://maldev.nl/posts/malware-lab/',
    note: 'maldev.nl — building a malware analysis lab',
    variant: 'typewriter',
  },
  {
    label: 'ZYGRAX',
    url: 'https://github.com/Ar1sto/zygrax',
    note: 'Malware-dev templates — C2, droppers, loaders, stage-0',
    variant: 'holo',
  },
  {
    label: 'PWNEXE',
    url: 'https://github.com/napstar/PWNEXE',
    note: 'napstar — modular Windows malware framework',
    variant: 'arcade',
  },
  {
    label: 'PWNEXE',
    url: 'https://github.com/vsa77/PWNEXE',
    note: 'vsa77 — modular Windows malware framework',
    variant: 'wreck',
  },
  {
    label: 'pupy',
    url: 'https://github.com/n1nj4sec/pupy',
    note: 'Cross-platform C2 and post-exploitation framework',
    variant: 'glitch',
  },
  {
    label: 'Boot.dev',
    url: 'https://www.boot.dev/',
    note: 'Backend and CS courses — learn to code the hard way',
    variant: 'friendly',
  },
  {
    label: 'TNKR.AI',
    url: 'https://tnkr.ai/explore',
    note: 'AI experiment explorer',
    variant: 'prism',
  },
]
