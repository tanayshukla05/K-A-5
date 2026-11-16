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
    | 'neural' | 'grimoire' | 'bbs' | 'detonate' | 'apex' | 'modules'
    | 'signal' | 'specimen' | 'blueprint' | 'onion'
    | 'drive' | 'beacon'
    | 'subvault' | 'crate' | 'void' | 'darkroom' | 'catalog'
    | 'cipher' | 'relay' | 'shelf' | 'portal'
}

export const LINKS: ArchiveLink[] = [
  {
    label: 'Onion Mirror',
    url: 'https://digdig2nugjpszzmqe5ep2bk7lqfpdlyrkojsx2j6kzalnrqtwedr3id.onion/',
    note: 'This archive as a Tor hidden service — open via Tor Browser',
    variant: 'onion',
  },
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
  {
    label: 'Z.AI',
    url: 'https://z.ai/',
    note: 'AI chat and model platform',
    variant: 'neural',
  },
  {
    label: 'HackTricks',
    url: 'https://hacktricks.wiki',
    note: 'The pentesting methods bible',
    variant: 'grimoire',
  },
  {
    label: 'PHRACK',
    url: 'https://phrack.org/',
    note: 'Legendary hacker e-zine — exploit craft since 1985',
    variant: 'bbs',
  },
  {
    label: 'Windows RCE',
    url: 'https://github.com/smgorelik/Windows-RCE-exploits/tree/master/Web/Javascript',
    note: 'Archive of Windows RCE exploits — web/JavaScript section',
    variant: 'detonate',
  },
  {
    label: 'Brute Ratel',
    url: 'https://bruteratel.com/',
    note: 'Commercial red-team C2 — the badger',
    variant: 'apex',
  },
  {
    label: 'C4 KIT',
    url: 'https://github.com/paranoidninja/Brute-Ratel-C4-Community-Kit',
    note: 'Community extensions for Brute Ratel C4',
    variant: 'modules',
  },
  {
    label: 'Shannon AI',
    url: 'https://shannon-ai.com',
    note: 'Frontier red-team lab for LLM safety',
    variant: 'signal',
  },
  {
    label: 'VX-Underground',
    url: 'https://vx-underground.org/',
    note: 'The largest public collection of malware source code and samples',
    variant: 'specimen',
  },
  {
    label: 'cocomelonc',
    url: 'https://cocomelonc.github.io/',
    note: 'Malware dev research blog — injection, evasion, crypto, Linux hacking',
    variant: 'blueprint',
  },
  {
    label: 'Google Drive',
    url: 'https://drive.google.com/drive/folders/12Mvq6kE2HJDwN2CZhEGWizyWt87YunkU',
    note: 'Shared Drive folder — files & resources',
    variant: 'drive',
  },
  {
    label: 'xbz0n.sh',
    url: 'https://xbz0n.sh/blog/mythic-c2-early-bird-defender-evasion',
    note: 'Mythic C2 + EarlyBird APC injection — full Defender evasion walkthrough',
    variant: 'beacon',
  },
  {
    label: 'MEGA Subvault',
    url: 'https://mega.nz/folder/HldHkSJD#jYRQtC67Ibsg36J4yOdwVA/folder/C4VwQTob',
    note: 'MEGA folder — nested subfolder inside',
    variant: 'subvault',
  },
  {
    label: 'MEGA Crate',
    url: 'https://mega.nz/folder/BX5SBKrY#Qw4AcfRRYMwheNDdrRlkkw',
    note: 'MEGA folder — shared files',
    variant: 'crate',
  },
  {
    label: 'Damaga',
    url: 'http://damaga377vyvydeqeuigxvl6g5sbmipoxb5nne6gpj3sisbnslbhvrqd.onion',
    note: 'Hidden service — open via Tor Browser',
    variant: 'void',
  },
  {
    label: 'Darko',
    url: 'http://darkoxfbjibhbb65wtvdnjygyi46a4xrjcakqkrzuw7ch6o7xgxhxmid.onion/',
    note: 'Hidden service — open via Tor Browser',
    variant: 'darkroom',
  },
  {
    label: 'Deep Index',
    url: 'http://q3o3hdjbf6vwxdnpskyhxw7w7rnmnfhz2szbuala4q24x6csbp7adiad.onion/links',
    note: 'Hidden links directory — open via Tor Browser',
    variant: 'catalog',
  },
  {
    label: 'MEGA Drop',
    url: 'https://mega.nz/file/4z9nCIYL#LNH3WaJa36tkMcL6D6tPLt5EZ_WvNNpz8X3dEU9hQCk',
    note: 'MEGA single file — direct download',
    variant: 'cipher',
  },
  {
    label: 'Drive Locker',
    url: 'https://drive.google.com/drive/folders/1pt305LLTt83xbyyEFlZkLsSaxsSOlfBY',
    note: 'Google Drive folder — shared files',
    variant: 'relay',
  },
  {
    label: 'Drive Shelf',
    url: 'https://drive.google.com/drive/folders/1CgN7DE3pNRNh_4BA_zrrMLqWz6KquwuD',
    note: 'Google Drive folder — shared files',
    variant: 'shelf',
  },
  {
    label: 'elhacker.info',
    url: 'https://elhacker.info/',
    note: 'Classic Spanish hacker portal — tools, docs & community',
    variant: 'portal',
  },
]
