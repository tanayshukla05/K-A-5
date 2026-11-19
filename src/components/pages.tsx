'use client'

/**
 * All page components for the archive.
 * These are rendered client-side based on the hash router state.
 *
 * Data access is via the ContentProvider context — server-side fs reads
 * happen in page.tsx, the results are passed in as serializable props
 * through the provider, and these client components read from context.
 */

import {
  useAllEntries, useEntryBySlug, useAllTags, useAllCategories,
  useAllResearch, useResearchBySlug,
} from '@/components/content-provider'
import { useState } from 'react'
import type { ArchiveEntry, ResearchSeries } from '@/lib/types'
import type { Route } from '@/lib/router'
import { isCtfEntry, ctfSourceOf, ctfTopicOf, type CtfSource, type CtfTopic } from '@/lib/entry-group'
import { LINKS, type ArchiveLink } from '@/lib/links'
import { MarioGame } from '@/components/mario-game'
import { SnesCabinet } from '@/components/snes-cabinet'
type NavFn = (route: Route) => void

/* ============================================================
   HOME — intentionally minimal: the poster card is the page.
   ============================================================ */
export function HomePage() {
  return (
    <div className="archive-container">
      <div className="archive-eyebrow">7TH WARD</div>
      {/*
        THE POSTER — the whole archive in one image (every section,
        the LINKS drawer, the games cabinet) and the home page's
        one-click download: clicking it saves the signed
        knowledge-archive.apk. The `download` attribute keeps the
        save a user-gesture action; the light JPG preview keeps the
        page fast.
      */}
      <a className="apk-card" href="/knowledge-archive.apk" download="knowledge-archive.apk">
        <img src="/apk-poster-card.jpg" alt="The Knowledge Archive poster — every section in one image" className="apk-poster" width={1080} height={1920} decoding="async" />
        <span className="apk-label">
          <span className="apk-eyebrow">THE POSTER · ONE-CLICK DOWNLOAD</span>
          <span className="apk-cta">CLICK TO TAKE THE APK WITH YOU</span>
        </span>
      </a>
    </div>
  )
}

/* ============================================================
   ABOUT
   ============================================================ */
export function AboutPage({ navigate }: { navigate: NavFn }) {
  // Intentionally empty — no about prose published. The only content is
  // the LinkedIn profile link.
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">ABOUT</div>
      <h1 className="archive-title">About <span className="title-orange">SHUKLA</span> ?</h1>

      <div style={{ marginTop: '2rem' }}>
        <a
          className="back-link"
          href="https://www.linkedin.com/in/tanay-shukla-23198a334/"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn Profile →
        </a>
      </div>
    </div>
  )
}

/* ============================================================
   ARCHIVE INDEX
   ============================================================ */
export function ArchivePage({ navigate }: { navigate: NavFn }) {
  // The Archive index lists the learning-path stages only (Stage 01–08).
  // The CTF walkthrough series lives in its own section of the menu.
  const entries = useAllEntries().filter(e => !isCtfEntry(e))
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">ARCHIVE / LEARNING PATH</div>
      <h1 className="archive-title">Archive</h1>
      <p className="archive-subtitle">
        The shellcode-loader learning path — Stage 01 through 08 — in stage
        order. Click any row to read the full write-up.
      </p>
      <div className="archive-section-title">
        <span>{entries.length} Entries</span>
        <span />
      </div>
      <div>
        {entries.map(e => (
          <EntryRow key={e.slug} entry={e} onClick={() => navigate({ name: 'stage', slug: e.slug })} />
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   STAGE DETAIL
   ============================================================ */
export function StagePage({ slug, navigate }: { slug: string; navigate: NavFn }) {
  const entry = useEntryBySlug(slug)
  const entries = useAllEntries()

  if (!entry) {
    return (
      <div className="archive-container">
        <button type="button" className="back-link" onClick={() => navigate({ name: 'archive' })}>
          ← Back to Archive
        </button>
        <EmptyState message="No content available yet" />
      </div>
    )
  }

  // Prev/next stay inside the entry's own series (learning path vs CTF
  // walkthroughs) and, for pwn.college, inside the same sub-menu topic so a
  // race-condition writeup never links into the binary-exploitation chain.
  const series = entries.filter(e =>
    isCtfEntry(e) === isCtfEntry(entry) &&
    (!isCtfEntry(entry) || ctfTopicOf(e) === ctfTopicOf(entry))
  )
  const idx = series.findIndex(e => e.slug === slug)
  const prev = idx > 0 ? series[idx - 1] : null
  const next = idx < series.length - 1 ? series[idx + 1] : null

  return (
    <div className="archive-container">
      <button
        type="button"
        className="back-link"
        onClick={() => navigate(isCtfEntry(entry) ? { name: 'ctf', topic: ctfTopicOf(entry) } : { name: 'archive' })}
      >
        ← {isCtfEntry(entry) ? 'Back to CTF Walkthroughs' : 'Back to Archive'}
      </button>

      <article>
        <header className="article-head">
          <div className="article-stage">{entry.stage} · {entry.dateLabel}</div>
          <h1 className="article-title">{entry.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', letterSpacing: '0.04em' }}>
            {entry.subtitle} — {entry.moduleName}
          </div>

          <div className="article-meta-grid">
            <MetaCell label="Level" value={entry.level} />
            <MetaCell label="Estimated Time" value={entry.estimatedTime} />
            <MetaCell label="Category" value={entry.category} />
            <MetaCell label="Platform" value={entry.platform} />
            <MetaCell label="Binary" value={entry.binary} />
            <MetaCell label="VT Score" value={entry.vtScore} highlight={entry.vtScoreClean} />
            {entry.prerequisites && <MetaCell label="Prerequisites" value={entry.prerequisites} />}
            {entry.mitre && <MetaCell label="MITRE ATT&CK" value={entry.mitre} />}
          </div>

          {entry.tags.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {entry.tags.map(t => (
                <button
                  key={t}
                  type="button"
                  className="tag-pill"
                  style={{ padding: '0.3rem 0.55rem', fontSize: 10 }}
                  onClick={() => navigate({ name: 'tag', tag: t })}
                >
                  <span>{t}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        <div
          className="article-prose"
          dangerouslySetInnerHTML={{ __html: entry.rawHtml }}
        />

        <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            {prev && (
              <button
                type="button"
                className="back-link"
                style={{ margin: 0 }}
                onClick={() => navigate({ name: 'stage', slug: prev.slug })}
              >
                ← {prev.stage}: {prev.title}
              </button>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            {next && (
              <button
                type="button"
                className="back-link"
                style={{ margin: 0 }}
                onClick={() => navigate({ name: 'stage', slug: next.slug })}
              >
                {next.stage}: {next.title} →
              </button>
            )}
          </div>
        </footer>
      </article>
    </div>
  )
}

function MetaCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="article-meta-cell">
      <div className="article-meta-cell-label">{label}</div>
      <div
        className="article-meta-cell-value"
        style={highlight ? { color: 'oklch(0.92 0 0)', fontWeight: 600 } : undefined}
      >
        {value}
      </div>
    </div>
  )
}

/* ============================================================
   ENTRY ROW (shared)
   ============================================================ */
function EntryRow({ entry, onClick }: { entry: ArchiveEntry; onClick: () => void }) {
  return (
    <button type="button" className="entry-row" onClick={onClick}>
      <div className="entry-row-stage">{entry.stage}</div>
      <div>
        <div className="entry-row-title">{entry.title}</div>
        <div className="entry-row-meta">
          {entry.moduleName} · {entry.level} · {entry.estimatedTime}
        </div>
      </div>
      <div className={`entry-row-vt ${entry.vtScoreClean ? 'entry-row-vt-clean' : ''}`}>
        {entry.vtScore || '—'}
      </div>
    </button>
  )
}

/* ============================================================
   CTF WALKTHROUGHS
   ============================================================ */
// The two walkthrough origins, in menu order. An entry lands on a tab
// through its Module Name metadata row — see ctfSourceOf in
// entry-group.ts ("Pwn.College — …" vs "HackTheBox — …").
const CTF_TABS: Array<{ id: CtfSource; label: string }> = [
  { id: 'pwn-college', label: 'pwn.college' },
  { id: 'hackthebox', label: 'HackTheBox' },
]

// Nested sub-menus inside the pwn.college tab. Topic comes from the entry's
// Category row through ctfTopicOf; HackTheBox keeps a flat list because its
// writeups are organized per box, not per pwn.college module.
const CTF_TOPICS: Array<{ id: CtfTopic; label: string }> = [
  { id: 'binary-exploitation', label: 'Binary Exploitation' },
  { id: 'race-condition', label: 'Race Condition' },
  { id: 'kernel-exploitation', label: 'Kernel Exploitation' },
]

export function CtfPage({ navigate, topic = 'binary-exploitation' }: { navigate: NavFn; topic?: CtfTopic }) {
  const all = useAllEntries().filter(e => isCtfEntry(e))
  const [source, setSource] = useState<CtfSource>('pwn-college')
  const sourceEntries = all.filter(e => ctfSourceOf(e) === source)
  const entries = source === 'pwn-college'
    ? sourceEntries.filter(e => ctfTopicOf(e) === topic)
    : sourceEntries
  const counts: Record<CtfSource, number> = { 'pwn-college': 0, hackthebox: 0 }
  for (const e of all) counts[ctfSourceOf(e)]++
  const topicCounts: Record<CtfTopic, number> = { 'binary-exploitation': 0, 'race-condition': 0, 'kernel-exploitation': 0 }
  for (const e of all) {
    if (ctfSourceOf(e) === 'pwn-college') topicCounts[ctfTopicOf(e)]++
  }
  const emptyLabel = source === 'pwn-college'
    ? `pwn.college / ${CTF_TOPICS.find(t => t.id === topic)?.label}`
    : CTF_TABS.find(t => t.id === source)?.label
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">CTF WALKTHROUGHS</div>
      <h1 className="archive-title">CTF Walkthroughs</h1>
      <p className="archive-subtitle">
        Step-by-step walkthroughs of capture-the-flag challenges and binary
        analysis exercises. Each entry documents the full chain — from initial
        reconnaissance to final payload.
      </p>
      <div className="ctf-tabs" role="tablist" aria-label="Walkthrough source">
        {CTF_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={source === t.id}
            className={`ctf-tab${source === t.id ? ' ctf-tab--active' : ''}`}
            onClick={() => setSource(t.id)}
          >
            <span>{t.label}</span>
            <span className="ctf-tab-count">{String(counts[t.id]).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
      {source === 'pwn-college' && (
        <div className="ctf-tabs ctf-tabs--sub" role="tablist" aria-label="pwn.college challenge series">
          {CTF_TOPICS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={topic === t.id}
              className={`ctf-tab ctf-tab--sub${topic === t.id ? ' ctf-tab--active' : ''}`}
              onClick={() => navigate({ name: 'ctf', topic: t.id })}
            >
              <span>{t.label}</span>
              <span className="ctf-tab-count">{String(topicCounts[t.id]).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      )}
      {entries.length === 0 ? (
        <EmptyState message={`No ${emptyLabel} walkthroughs published yet`} />
      ) : (
        <div>
          {entries.map(e => (
            <EntryRow key={e.slug} entry={e} onClick={() => navigate({ name: 'stage', slug: e.slug })} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   RESEARCH NOTES — sub-menus per series, mirroring the CTF tab
   pattern. Series comes from each note's **Series** metadata row;
   adding a markdown file to content/research-notes/ extends the
   menus automatically.
   ============================================================ */
const RESEARCH_TABS: Array<{ id: ResearchSeries; label: string }> = [
  { id: 'exploit-dev', label: 'Exploit-Dev' },
  { id: 'mal-dev', label: 'Mal-Dev' },
]

export function ResearchPage({ navigate }: { navigate: NavFn }) {
  const all = useAllResearch()
  const [series, setSeries] = useState<ResearchSeries>('exploit-dev')
  const entries = all.filter(e => e.series === series)
  const counts: Record<ResearchSeries, number> = { 'exploit-dev': 0, 'mal-dev': 0 }
  for (const e of all) counts[e.series]++
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">RESEARCH NOTES</div>
      <h1 className="archive-title">Research Notes</h1>
      <p className="archive-subtitle">
        Long-form working notes and curated free courses — exploit
        development, malware development, and the internals they live in.
        Third-party material is archived with full attribution.
      </p>
      <div className="ctf-tabs" role="tablist" aria-label="Research series">
        {RESEARCH_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={series === t.id}
            className={`ctf-tab${series === t.id ? ' ctf-tab--active' : ''}`}
            onClick={() => setSeries(t.id)}
          >
            <span>{t.label}</span>
            <span className="ctf-tab-count">{String(counts[t.id]).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
      {entries.length === 0 ? (
        <EmptyState message={`No ${RESEARCH_TABS.find(t => t.id === series)?.label} notes published yet`} />
      ) : (
        <div>
          {entries.map(e => (
            <button
              key={e.slug}
              type="button"
              className="entry-row"
              onClick={() => navigate({ name: 'research-entry', slug: e.slug })}
            >
              <div className="entry-row-stage">NOTE</div>
              <div>
                <div className="entry-row-title">{e.title}</div>
                <div className="entry-row-meta">
                  {e.sourceLabel}
                  {e.sourceUrl ? ` · ${e.sourceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : ''}
                </div>
              </div>
              <div className="entry-row-vt">↗</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   RESEARCH NOTE DETAIL — rendered through the same hardened
   markdown pipeline as every other entry on the site.
   ============================================================ */
export function ResearchEntryPage({ slug, navigate }: { slug: string; navigate: NavFn }) {
  const entry = useResearchBySlug(slug)

  if (!entry) {
    return (
      <div className="archive-container">
        <button type="button" className="back-link" onClick={() => navigate({ name: 'research' })}>
          ← Back to Research Notes
        </button>
        <EmptyState message="No content available yet" />
      </div>
    )
  }

  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'research' })}>
        ← Back to Research Notes
      </button>

      <article className={`research-entry research-entry--${entry.series}`}>
        <header className="article-head research-head">
          <div className={`research-series-chip research-series-chip--${entry.series}`}>
            {entry.series === 'mal-dev' ? 'MAL-DEV' : 'EXPLOIT-DEV'} · {entry.dateLabel}
          </div>
          <h1 className="article-title research-title">{entry.title}</h1>
          {entry.sourceLabel && (
            <div className="research-meta">Free course — {entry.sourceLabel}</div>
          )}
          {entry.sourceUrl && (
            <a
              className="research-source-chip"
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              SOURCE <span aria-hidden="true">↗</span>
            </a>
          )}
        </header>

        <div
          className="article-prose research-prose"
          dangerouslySetInnerHTML={{ __html: entry.rawHtml }}
        />
      </article>
    </div>
  )
}

/* ============================================================
   CHEAT SHEETS — intentionally empty section
   ============================================================ */
/* ============================================================
   CHEAT SHEETS — reference material. First sheet: Windows shell
   secrets. The Run dialog (Win+R) is the fastest terminal on any
   PC; these one-click-copy commands teach visitors to drive it.
   ============================================================ */

const SHELL_SECRETS: Array<{ cmd: string; desc: string }> = [
  { cmd: 'shell:MyComputerFolder', desc: 'This PC — every drive and device in one window' },
  { cmd: 'shell:RecycleBinFolder', desc: 'The Recycle Bin' },
  { cmd: 'shell:AppsFolder', desc: 'Every installed app — launch any of them by name' },
  { cmd: 'shell:Startup', desc: 'Programs that run the moment you log in' },
  { cmd: 'shell:Recent', desc: 'Everything you opened lately' },
  { cmd: 'shell:Downloads', desc: 'Your Downloads folder' },
  { cmd: 'shell:Temp', desc: 'Temp junk — safe to clear out' },
  { cmd: 'shell:Fonts', desc: 'Every font installed on the machine' },
  { cmd: 'shell:ProgramFiles', desc: 'Program Files' },
  { cmd: 'shell:Windows', desc: 'The Windows directory itself' },
]

function CopyChip({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'done'>('idle')
  async function copy() {
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      // Fallback for browsers that refuse the async clipboard API
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        ok = true
      } catch {
        ok = false
      }
    }
    if (!ok) window.prompt('Copy this command:', text)
    setState('done')
    setTimeout(() => setState('idle'), 1600)
  }
  return (
    <button
      type="button"
      className={`copy-chip${state === 'done' ? ' copy-chip--done' : ''}`}
      onClick={copy}
    >
      {state === 'done' ? 'COPIED' : 'COPY'}
    </button>
  )
}

export function CheatsheetsPage({ navigate }: { navigate: NavFn }) {
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">CHEAT SHEETS</div>
      <h1 className="archive-title">Cheat Sheets</h1>
      <p className="archive-subtitle">
        Reference material — quick-lookup tables for analysis workflows.
        First sheet: the Windows Run dialog, the fastest terminal on any
        PC. No install, no admin rights, pure muscle memory.
      </p>

      <div className="archive-eyebrow">SHEET 01 — WINDOWS SHELL SECRETS</div>
      <div className="shell-secrets">
        <div className="shell-secret-steps">
          <div className="shell-step"><span className="shell-step-key">01</span><span>PRESS <b>Win + R</b> — the Run dialog opens</span></div>
          <div className="shell-step"><span className="shell-step-key">02</span><span>PASTE a command — one click on <b>COPY</b> puts it on your clipboard</span></div>
          <div className="shell-step"><span className="shell-step-key">03</span><span>HIT <b>Enter</b> — the folder opens. No menus, no hunting.</span></div>
        </div>
        <div className="shell-secret-hero">
          <div className="shell-secret-cmd">explorer shell:MyComputerFolder</div>
          <div className="shell-secret-desc">
            The gateway command: opens This PC — every drive, every device,
            one window. The archive starts where the file manager does.
          </div>
          <CopyChip text="explorer shell:MyComputerFolder" />
        </div>
        {SHELL_SECRETS.map(s => (
          <div key={s.cmd} className="shell-secret-row">
            <div>
              <div className="shell-secret-cmd shell-secret-cmd--small">{s.cmd}</div>
              <div className="shell-secret-desc">{s.desc}</div>
            </div>
            <CopyChip text={s.cmd} />
          </div>
        ))}
        <div className="shell-secret-foot">WINDOWS ONLY — RUN NEEDS A KEYBOARD. ON A PHONE, THE LESSON IS STILL FREE.</div>
      </div>
    </div>
  )
}

/* ============================================================
   FILE ARCHIVE — intentionally empty section
   ============================================================ */
export function FilesPage({ navigate }: { navigate: NavFn }) {
  // No downloadable files have been published yet — empty state until
  // real files exist.
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">FILE ARCHIVE</div>
      <h1 className="archive-title">File Archive</h1>
      <p className="archive-subtitle">
        Downloadable binaries referenced by the learning path entries. Each
        entry will document the binary associated with a stage; the write-up
        page contains hashes, sizes, and analysis context.
      </p>
      <EmptyState message="No files available yet" />
    </div>
  )
}

/* ============================================================
   GAMES — playable things built for and hosted by the archive.
   Cabinet 01: MultiHero — the freeware fan game's official
   WASM build, self-hosted and embedded same-origin.
   Cabinet 02: a complete side-scrolling platformer written
   from scratch (original engine, sprites, and sound — no ROMs).
   Cabinet 03: a self-hosted Super Nintendo whose shelf of
   cartridges runs in the browser on the self-hosted
   EmulatorJS runtime.
   ============================================================ */
export function GamesPage({ navigate }: { navigate: NavFn }) {
  /* cabinet 01 (MultiHero) stays powered off until the visitor clicks —
     the WASM build only downloads on click (~13 MB) */
  const [heroOn, setHeroOn] = useState(false)
  /* cabinet 02 stays powered off until the visitor clicks — no auto-start */
  const [marioOn, setMarioOn] = useState(false)
  return (
    <div className="archive-container games-room">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">GAMES</div>
      <h1 className="archive-title">Games</h1>
      <p className="archive-subtitle">
        Playable things from the archive. Cabinet 01: MultiHero — a
        freeware browser beat-&rsquo;em-up, solo or with up to four players
        online. Cabinet 02: SUPER ARCHIVE BROS. — a complete
        side-scrolling platformer built from scratch for this site.
        Cabinet 03: a Super Nintendo with its games pre-installed — tap a
        title on the shelf and it runs right here in the browser.
      </p>

      {/* ============================================================
          CABINET 01 — MultiHero, Web Edition. The port author ships a
          complete self-hostable WASM build (public/multihero/multihero-web,
          MIT; original freeware game by mhman — see NOTICE.md). The
          loader fetches its ~13 MB data package the moment it runs, so
          the iframe only mounts on click — nothing downloads before it.
          ============================================================ */}
      <div className="game-cabinet game-cabinet--hero">
        <div className="game-cab-head">
          <span className="game-num">01</span>
          <span className="game-cab-label">MultiHero — Web Edition</span>
          <span className="game-cab-note">browser beat-&rsquo;em-up · touch + gamepad · up to 4 players online</span>
        </div>
        <div className="game-screen">
          {heroOn ? (
            <>
              <iframe
                src="/multihero/multihero-web/index.html"
                title="Play MultiHero"
                className="game-hero-frame"
                allow="fullscreen; gamepad"
                allowFullScreen
              />
              <div className="game-ui">
                <button type="button" className="game-btn" onClick={() => setHeroOn(false)}>
                  ⏏ EJECT
                </button>
              </div>
            </>
          ) : (
            <div className="game-launch game-launch--poster">
              <button
                type="button"
                className="game-launch-poster"
                onClick={() => setHeroOn(true)}
                aria-label="Power on MultiHero — Web Edition"
              >
                <img
                  src="/posters/multihero-web-edition.png"
                  alt="Cabinet 01 poster: MultiHero — Web Edition. Mario vs Bowser under the cabinet marquee, with the cast of all 27 fighters drawn from the game's own gfx."
                  width={1200}
                  height={1800}
                  loading="lazy"
                  decoding="async"
                />
              </button>
              <div className="game-launch-side">
                <p className="game-launch-head">GAME INSTALLED — TAP TO POWER ON</p>
                <button type="button" className="game-launch-btn" onClick={() => setHeroOn(true)}>
                  ▶ INSERT COIN · PLAY
                </button>
                <p className="game-launch-blurb">
                  27 fighters on one cartridge — Ryu, Spider-Man, Bowser, Venom and
                  the rest, drawn from the game&rsquo;s own gfx. The WASM build
                  (~13&thinsp;MB) downloads only after you press start.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="game-cab-foot">
          <span className="game-keys">WASD MOVE · N ATTACK · M JUMP · H SPECIAL · SPACE BLOCK · J THROW · ONLINE PLAY IN MENU · TOUCH PADS ON MOBILE · CREDITS AT /MULTIHERO</span>
        </div>
      </div>

      {/* ============================================================
          CABINET 02 — Super Archive Bros., written from scratch for the
          archive (original engine, sprites, sound — no ROMs). The INSERT
          COIN tap boots the game via autoStart.
          ============================================================ */}
      <div className="game-cabinet">
        <div className="game-cab-head">
          <span className="game-num">02</span>
          <span className="game-cab-label">Super Archive Bros.</span>
          <span className="game-cab-note">side-scrolling platformer · 3 courses · one click to play</span>
        </div>
        <div className="game-screen">
          {marioOn ? (
            <>
              <MarioGame autoStart />
              <div className="game-ui">
                <button type="button" className="game-btn" onClick={() => setMarioOn(false)}>
                  ⏏ EJECT
                </button>
              </div>
            </>
          ) : (
            <div className="game-launch">
              <p className="game-launch-head">CARTRIDGE INSTALLED — TAP TO POWER ON</p>
              <button type="button" className="game-launch-btn" onClick={() => setMarioOn(true)}>
                ▶ INSERT COIN · ONE CLICK PLAY
              </button>
            </div>
          )}
        </div>
        <div className="game-cab-foot">
          <span className="game-keys">← → MOVE · Z JUMP (HOLD = HIGHER) · X RUN · ENTER PAUSE · M SOUND</span>
        </div>
      </div>

      {/* ============================================================
          CABINET 03 — Super Nintendo. Pre-installed cartridges running on
          the self-hosted EmulatorJS runtime; per-game attribution at
          public/roms/CREDITS.md.
          ============================================================ */}
      <div className="game-cabinet game-cabinet--snes">
        <div className="game-cab-head">
          <span className="game-num">03</span>
          <span className="game-cab-label">Super Nintendo</span>
          <span className="game-cab-note">games pre-installed · tap and play · nothing to bring</span>
        </div>
        <div className="game-screen">
          <SnesCabinet />
        </div>
        <div className="game-cab-foot">
          <span className="game-keys">7 GAMES INSTALLED · SAVE STATES + TOUCH CONTROLS BUILT IN · CREDITS AT /ROMS</span>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   LINKS — the directory as a collection of artifacts. Every row
   is a distinct material with its own typography, texture,
   sparkle and hover behaviour (see .artifact--* in globals.css).
   ============================================================ */
function ArtifactLink({ link, index }: { link: ArchiveLink; index: number }) {
  const num = String(index + 1).padStart(2, '0')
  const variant = link.variant ?? 'seal'
  return (
    <a
      className={`artifact artifact--${variant}`}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="artifact-num" aria-hidden="true">{num}</span>
      <span className="artifact-body">
        <span className="artifact-label">{link.label}</span>
        {link.note && <span className="artifact-note">{link.note}</span>}
        <span className="artifact-url">{link.url.replace(/^https?:\/\//, '')}</span>
        {link.variant === 'redacted' && (
          <span className="redact-line" aria-hidden="true">
            CVE-2024-31317 · ZYGOTE INJECTION · UID 1000
            <i className="redact redact--1" aria-hidden="true"></i>
            <i className="redact redact--2" aria-hidden="true"></i>
            <i className="redact redact--3" aria-hidden="true"></i>
          </span>
        )}
        {link.variant === 'spectrum' && (
          <span className="spec-strip" aria-hidden="true">
            <i className="spec-bar spec-bar--1"></i>
            <i className="spec-bar spec-bar--2"></i>
            <i className="spec-bar spec-bar--3"></i>
            <i className="spec-bar spec-bar--4"></i>
            <i className="spec-bar spec-bar--5"></i>
            <i className="spec-bar spec-bar--6"></i>
            <i className="spec-bar spec-bar--7"></i>
            <i className="spec-bar spec-bar--8"></i>
            <i className="spec-bar spec-bar--9"></i>
          </span>
        )}
        {link.variant === 'gdb' && (
          <span className="gdb-lane" aria-hidden="true">
            <i className="gdb-cell">mov rax,[rbx+8]</i>
            <i className="gdb-cell">test rax,rax</i>
            <i className="gdb-cell gdb-cell--fault">mov [rax],rcx</i>
            <i className="gdb-cell">ret</i>
            <i className="gdb-pc"></i>
          </span>
        )}
        {link.variant === 'cve' && (
          <span className="cve-tabs" aria-hidden="true">
            <b className="cve-tabs-head">CVE</b>
            <i className="cve-tab cve-tab--a">17</i>
            <i className="cve-tab cve-tab--b">19</i>
            <i className="cve-tab cve-tab--c">21</i>
            <i className="cve-tab cve-tab--d">24</i>
          </span>
        )}
      </span>
      {link.variant === 'pick' && (
        <span className="pick-lock" aria-hidden="true">
          <i className="pin pin--1"></i>
          <i className="pin pin--2"></i>
          <i className="pin pin--3"></i>
          <i className="pin pin--4"></i>
          <i className="pin pin--5"></i>
        </span>
      )}
      {link.variant === 'cred' && (
        <span className="cred-card" aria-hidden="true">
          <span className="cred-flip">
            <span className="cred-face cred-face--user">
              <b>CRED</b>
              <em>uid 1000</em>
              <em>gid 1000</em>
              <i>CAP_NONE</i>
            </span>
            <span className="cred-face cred-face--root">
              <b>ROOT</b>
              <em>uid 0</em>
              <em>gid 0</em>
              <i>CAP_ALL</i>
            </span>
          </span>
        </span>
      )}
      <span className="artifact-go" aria-hidden="true">↗</span>
    </a>
  )
}

export function LinksPage({ navigate }: { navigate: NavFn }) {
  const links = LINKS
  // Two drawers under this menu: .com (the clearnet side) and .onion (Tor
  // hidden services). Classification is automatic — any row whose host ends
  // in .onion renders in the .onion drawer, so adding a hidden service to
  // LINKS needs no extra flag. Rows keep whichever unique material they
  // declare — every link is its own artifact, in both drawers.
  const isOnion = (l: ArchiveLink) => (/\.onion(\/|$)/i).test(l.url)
  const comLinks = links.filter(l => !isOnion(l))
  const onionLinks = links.filter(isOnion)
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">DIRECTORY / LINKS</div>
      <h1 className="archive-title">Links</h1>
      <p className="archive-subtitle">
        Every external link in one directory, split into two drawers — the
        clearnet (.com) and the Tor hidden services (.onion). Each row is
        its own artifact: a different material, a different behaviour. All
        open in a new tab.
      </p>

      <div className="links-drawer">
        <div className="links-drawer-head">
          <span className="links-drawer-tld">.com</span>
          <span className="links-drawer-note">the clearnet side · {comLinks.length} LINKS</span>
        </div>
        {comLinks.length === 0 ? (
          <EmptyState message="No clearnet links yet" />
        ) : (
          comLinks.map((l, i) => (
            <ArtifactLink key={l.url} link={l} index={i} />
          ))
        )}
      </div>

      <div className="links-drawer links-drawer--onion">
        <div className="links-drawer-head">
          <span className="links-drawer-tld">.onion</span>
          <span className="links-drawer-note">tor hidden services · open via tor browser · {onionLinks.length} LINKS</span>
        </div>
        {onionLinks.length === 0 ? (
          <EmptyState message="No onion links yet" />
        ) : (
          onionLinks.map((l, i) => (
            <ArtifactLink key={l.url} link={l} index={i} />
          ))
        )}
      </div>
    </div>
  )
}

/* ============================================================
   TAGS / TAG DETAIL
   ============================================================ */
export function TagsPage({ navigate }: { navigate: NavFn }) {
  const tags = useAllTags()
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">INDEX / TAGS</div>
      <h1 className="archive-title">Tags</h1>
      <p className="archive-subtitle">
        Every tag in the archive, generated only from real content. Click a tag
        to see every entry that carries it.
      </p>
      {tags.length === 0 ? (
        <EmptyState message="No tags yet" />
      ) : (
        <div className="tag-grid">
          {tags.map(t => (
            <button
              key={t.tag}
              type="button"
              className="tag-pill"
              onClick={() => navigate({ name: 'tag', tag: t.tag })}
            >
              <span>{t.tag}</span>
              <span className="tag-pill-count">{String(t.count).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TagPage({ tag, navigate }: { tag: string; navigate: NavFn }) {
  const entries = useAllEntries().filter(e => e.tags.includes(tag))
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'tags' })}>
        ← All Tags
      </button>
      <div className="archive-eyebrow">TAG / {tag.toUpperCase()}</div>
      <h1 className="archive-title">#{tag}</h1>
      <p className="archive-subtitle">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} tagged
        with <strong>{tag}</strong>.
      </p>
      {entries.length === 0 ? (
        <EmptyState message="No entries with this tag" />
      ) : (
        <div>
          {entries.map(e => (
            <EntryRow key={e.slug} entry={e} onClick={() => navigate({ name: 'stage', slug: e.slug })} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   CATEGORIES / CATEGORY DETAIL
   ============================================================ */
export function CategoriesPage({ navigate }: { navigate: NavFn }) {
  const cats = useAllCategories()
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">INDEX / CATEGORIES</div>
      <h1 className="archive-title">Categories</h1>
      <p className="archive-subtitle">
        Top-level categories derived from real entries only.
      </p>
      {cats.length === 0 ? (
        <EmptyState message="No categories yet" />
      ) : (
        <div className="tag-grid">
          {cats.map(c => (
            <button
              key={c.category}
              type="button"
              className="tag-pill"
              onClick={() => navigate({ name: 'category', category: c.category })}
            >
              <span>{c.category}</span>
              <span className="tag-pill-count">{String(c.count).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryPage({ category, navigate }: { category: string; navigate: NavFn }) {
  const entries = useAllEntries().filter(e => e.categories.includes(category))
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'categories' })}>
        ← All Categories
      </button>
      <div className="archive-eyebrow">CATEGORY / {category.toUpperCase()}</div>
      <h1 className="archive-title">{category}</h1>
      <p className="archive-subtitle">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in the{' '}
        <strong>{category}</strong> category.
      </p>
      {entries.length === 0 ? (
        <EmptyState message="No entries in this category" />
      ) : (
        <div>
          {entries.map(e => (
            <EntryRow key={e.slug} entry={e} onClick={() => navigate({ name: 'stage', slug: e.slug })} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   404
   ============================================================ */
export function NotFoundPage({ navigate }: { navigate: NavFn }) {
  return (
    <div className="archive-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="archive-eyebrow">ERROR / 404</div>
      <h1 className="archive-title">Not Found</h1>
      <p className="archive-subtitle" style={{ margin: '0 auto 2rem' }}>
        The requested path does not exist in the archive.
      </p>
      <button
        type="button"
        className="back-link"
        style={{ margin: '0 auto' }}
        onClick={() => navigate({ name: 'home' })}
      >
        Return Home →
      </button>
    </div>
  )
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-mark">— —</div>
      <div className="empty-state-text">{message}</div>
    </div>
  )
}
