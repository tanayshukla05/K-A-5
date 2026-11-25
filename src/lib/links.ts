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
    | 'trapdoor' | 'forum' | 'lantern' | 'zipper' | 'chronicle'
    | 'redacted'
    | 'spectrum'
    | 'pick'
    | 'cred'
    | 'gdb'
    | 'cve'
    | 'av'
    | 'rust'
    | 'aes'
    | 'sc'
    | 'bolus'
    | 'thm'
    | 'nim'
    | 'rustic'
    | 'defcon'
    | 'net'
    | 'dotnet'
    | 'pic'
    | 'clickonce'
    | 'corelan'
    | 'a13xp0p0v'
    | 'maxwell-dulin'
    | 'capt-meelo'
    | 'doar-e'
    | 'hex-rays'
    | 'secret-club'
    | 'zerozero-sec'
    | 'wetw0rk'
    | 'ascii'
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
    label: 'ASCII Magic',
    url: 'https://www.ascii-magic.com/',
    variant: 'ascii',
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
  {
    label: 'Klskg',
    url: 'http://klskg4ypyrdfgkquqpwx53xjk5upkto3elmcakcvdxggyzpb4lxwl2qd.onion/',
    note: 'Hidden service — open via Tor Browser',
    variant: 'trapdoor',
  },
  {
    label: 'Jaat Forum',
    url: 'http://jaat7efxnopgxe7ypxzqpb46qmbaca36r7shexsowofexbfqp6p7xaad.onion/viewforum.php?f=47',
    note: 'Tor forum — open via Tor Browser',
    variant: 'forum',
  },
  {
    label: 'Swamws',
    url: 'http://swamws6z5ftw6cyfhtqdv36zv6h52vttutls4exxj77ltvtlch2wdcid.onion/',
    note: 'Hidden service — open via Tor Browser',
    variant: 'lantern',
  },
  {
    label: 'Orealm',
    url: 'http://orealmvxooetglfeguv2vp65a3rig2baq2ljc7jxxs4hsqsrcemkxcad.onion',
    note: 'Hidden service — open via Tor Browser',
    variant: 'zipper',
  },
  {
    label: 'Sploitony',
    url: 'https://sploitony.com/blog.html',
    note: 'anthonytuff - cybersecurity articles, tutorials & research',
    variant: 'chronicle',
  },
  {
    label: 'FreeXR / exploits',
    url: 'https://github.com/FreeXR/exploits',
    note: 'known Android / Quest exploits — CVEs, PoCs & root chains',
    variant: 'redacted',
  },
  {
    label: 'Google Security Research',
    url: 'https://github.com/google/security-research',
    note: 'security advisories & PoCs — kernelCTF, v8CTF, 90-day disclosure',
    variant: 'spectrum',
  },
  {
    label: 'Floor 796',
    url: 'https://floor796.com/',
    note: 'endless pixel-art animation - one office floor, never stops',
    variant: 'arcade',
  },
  {
    label: 'zhuowei / GitHub',
    url: 'https://github.com/zhuowei?tab=repositories',
    note: 'iOS / Android exploit PoCs — 394 repos, a new project every Thursday',
    variant: 'pick',
  },
  {
    label: 'Linux Kernel Exploitation',
    url: 'https://github.com/xairy/linux-kernel-exploitation',
    note: 'xairy — curated kernel exploitation techniques, exploits & write-ups · 6.7k★',
    variant: 'cred',
  },
  {
    label: 'Allele Security',
    url: 'https://allelesecurity.com/intro-linux-kernel-exploitation-part-1/',
    note: 'intro to kernel exploitation, part 1 — net/sched NULL-deref, GDB + QEMU',
    variant: 'gdb',
  },
  {
    label: 'CVE Exploits Archive',
    url: 'https://git.churchofmalware.org/K3ysTr0K3R/CVE-Exploits-Archive',
    note: 'K3ysTr0K3R — a collection of CVE-indexed PoC exploits · Python',
    variant: 'cve',
  },
  {
    label: 'AV EVASION LOADER',
    url: 'https://github.com/Jieyab89/Loader-and-shell-code-AV-Evasion',
    note: 'Jieyab89 — loader + shellcode AV evasion',
    variant: 'av',
  },
  {
    label: 'OFFENSIVE RUST',
    url: 'https://github.com/trickster0/OffensiveRust/tree/master',
    note: 'trickster0 — offensive Rust implants & tooling',
    variant: 'rust',
  },
  {
    label: 'RUSTRED OPS',
    url: 'https://github.com/joaoviictorti/RustRedOps/blob/main/Encryption_Shellcode/src/aes.rs',
    note: 'joaoviictorti — RustRedOps AES-encrypted shellcode',
    variant: 'aes',
  },
  {
    label: 'RUST SC LOADER',
    url: 'https://github.com/brosck/RustSCLoader/blob/main/src/main.rs',
    note: 'brosck — RustSCLoader (Rust + shellcode loader)',
    variant: 'sc',
  },
  {
    label: 'BOLUS',
    url: 'https://docs.rs/bolus/0.3.0/bolus/',
    note: 'docs.rs — Bolus 0.3.0 Rust syscall library',
    variant: 'bolus',
  },
  {
    label: 'AV DEFENSE ROOM',
    url: 'https://tryhackme.com/r/room/avevasionshellcode',
    note: 'TryHackMe — AV evasion room',
    variant: 'thm',
  },
  {
    label: 'OFFENSIVE NIM',
    url: 'https://github.com/byt3bl33d3r/OffensiveNim/blob/master/src/shellcode_bin.nim',
    note: 'byt3bl33d3r — OffensiveNim shellcode bin',
    variant: 'nim',
  },
  {
    label: 'RUSTIC64',
    url: 'https://github.com/safedv/Rustic64',
    note: 'safedv — Rustic64 loader',
    variant: 'rustic',
  },
  {
    label: 'DEF CON C#',
    url: 'https://github.com/mvelazc0/defcon27_csharp_workshop/blob/master/Labs/lab3/1.cs',
    note: 'mvelazc0 — DEF CON27 C# workshop lab',
    variant: 'defcon',
  },
  {
    label: 'NET INJECTION',
    url: 'https://www.ired.team/offensive-security/code-injection-process-injection/injecting-and-executing-.net-assemblies-to-unmanaged-process',
    note: 'iRed Team — .NET → unmanaged process injection',
    variant: 'net',
  },
  {
    label: 'FGSEC NET',
    url: 'https://fgsec.net/posts/Injecting-dotNet-Assemblies-To-Unmanaged-Processes/',
    note: 'fgsec — .NET assembly injection into unmanaged processes',
    variant: 'dotnet',
  },
  {
    label: 'PIC SHELLCODE',
    url: 'https://ppn.snovvcrash.rocks/red-team/maldev/pic-shellcode',
    note: 'ppn — maldev PIC shellcode',
    variant: 'pic',
  },
  {
    label: 'CLICKONCE',
    url: 'https://www.adroxz.foo/ab-using-clickonce-for-initial-access-and-persistence',
    note: 'adroxz — abusing ClickOnce for initial access and persistence',
    variant: 'clickonce',
  },
  {
    label: 'Corelan Research',
    url: 'https://www.corelan.be/',
    note: 'Exploit development · vulnerability research · Windows internals',
    variant: 'corelan',
  },
  {
    label: 'a13xp0p0v',
    url: 'https://a13xp0p0v.github.io/',
    note: 'Linux kernel exploitation',
    variant: 'a13xp0p0v',
  },
  {
    label: 'Maxwell Dulin',
    url: 'https://maxwelldulin.com/',
    note: 'Heap exploitation',
    variant: 'maxwell-dulin',
  },
  {
    label: 'Capt. Meelo',
    url: 'https://captmeelo.com/',
    note: 'Binary exploitation',
    variant: 'capt-meelo',
  },
  {
    label: 'Diary of a reverse-engineer',
    url: 'https://doar-e.github.io/',
    note: 'Reverse engineering',
    variant: 'doar-e',
  },
  {
    label: 'Hex-Rays',
    url: 'https://hex-rays.com/blog/',
    note: 'IDA and binary analysis',
    variant: 'hex-rays',
  },
  {
    label: 'Secret Club',
    url: 'https://secret.club/',
    note: 'Low-level Windows research',
    variant: 'secret-club',
  },
  {
    label: '0x00sec',
    url: 'https://0x00sec.org/',
    note: 'Low-level security research and community',
    variant: 'zerozero-sec',
  },
  {
    label: 'wetw0rk',
    url: 'https://github.com/wetw0rk?tab=repositories',
    note: 'Milton Valencia · Windows exploitation research',
    variant: 'wetw0rk',
  },
]
