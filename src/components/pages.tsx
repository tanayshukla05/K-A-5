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
  useAllEntries, useEntryBySlug, useAllResearch, useResearchBySlug,
} from '@/components/content-provider'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ArchiveEntry, ResearchSeries } from '@/lib/types'
import type { Route } from '@/lib/router'
import { isCtfEntry, ctfSourceOf, ctfTopicOf, type CtfSource, type CtfTopic } from '@/lib/entry-group'
import { LINKS, type ArchiveLink } from '@/lib/links'
import { MarioGame } from '@/components/mario-game'
import { SnesCabinet } from '@/components/snes-cabinet'
import { LogoMotion } from '@/components/logo-motion'
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
  const allEntries = useAllEntries()
  const entries = useMemo(() => allEntries.filter(e => !isCtfEntry(e)), [allEntries])
  const [query, setQuery] = useState('')
  const [activeLevel, setActiveLevel] = useState('all')
  const [activeStage, setActiveStage] = useState<number | null>(null)
  const [sortOrder, setSortOrder] = useState<'path' | 'title'>('path')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isEditing = target instanceof HTMLElement
        && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const stageNumbers = useMemo(
    () => Array.from(new Set(entries.map(entry => entry.stageNumber))).sort((a, b) => a - b),
    [entries],
  )
  const levels = useMemo(
    () => Array.from(new Set(entries.map(entry => entry.level).filter(Boolean))).sort(),
    [entries],
  )
  const platformCount = useMemo(
    () => new Set(entries.map(entry => entry.platform).filter(Boolean)).size,
    [entries],
  )
  const visibleEntries = useMemo(() => {
    const term = query.trim().toLowerCase()
    return entries
      .filter(entry => activeLevel === 'all' || entry.level === activeLevel)
      .filter(entry => activeStage === null || entry.stageNumber === activeStage)
      .filter(entry => !term || [
        entry.title, entry.subtitle, entry.moduleName, entry.level, entry.category,
        entry.platform, entry.binary, entry.tags.join(' '), entry.categories.join(' '),
      ].join(' ').toLowerCase().includes(term))
      .sort((a, b) => sortOrder === 'path'
        ? a.stageNumber - b.stageNumber || a.title.localeCompare(b.title)
        : a.title.localeCompare(b.title))
  }, [entries, query, activeLevel, activeStage, sortOrder])

  function resetFilters() {
    setQuery('')
    setActiveLevel('all')
    setActiveStage(null)
    setSortOrder('path')
  }

  return (
    <div className="archive-explorer">
      <section className="archive-explorer-hero" aria-labelledby="archive-explorer-title">
        <div className="archive-explorer-hero-copy">
          <button type="button" className="archive-explorer-back" onClick={() => navigate({ name: 'home' })}>
            <span aria-hidden="true">←</span> HOME
          </button>
          <div className="archive-explorer-kicker"><i /> LEARNING PATH <span>/</span> STAGE DIRECTORY</div>
          <h1 id="archive-explorer-title">FUD Loader<br /><em>dev</em></h1>
          <p>{stageNumbers.length} stages of loader engineering, injection research and defensive evasion. Follow the path or search the field notes.</p>
          <div className="archive-explorer-stats" aria-label="Archive overview">
            <div><strong>{String(stageNumbers.length).padStart(2, '0')}</strong><span>STAGES</span></div>
            <div><strong>{String(entries.length).padStart(2, '0')}</strong><span>FIELD NOTES</span></div>
            <div><strong>{String(platformCount).padStart(2, '0')}</strong><span>PLATFORMS</span></div>
          </div>
        </div>
        <div className="archive-explorer-emblem" aria-hidden="true">
          <div className="archive-explorer-emblem-ring archive-explorer-emblem-ring--outer" />
          <div className="archive-explorer-emblem-ring archive-explorer-emblem-ring--inner" />
          <span className="archive-explorer-emblem-cross archive-explorer-emblem-cross--horizontal" />
          <span className="archive-explorer-emblem-cross archive-explorer-emblem-cross--diagonal" />
          <LogoMotion className="archive-explorer-emblem-mark">
            <img src="/logo.png" alt="" />
          </LogoMotion>
          <span className="archive-explorer-emblem-caption">01 / {String(stageNumbers.length).padStart(2, '0')} <i /> FIELD ARCHIVE</span>
        </div>
        <div className="archive-explorer-hero-index"><span>TS</span><i /> PERSONAL KNOWLEDGE ARCHIVE</div>
      </section>

      <section className="archive-explorer-path" aria-label="Filter by stage">
        <div className="archive-explorer-section-label"><span>01</span> PATH INDEX</div>
        <div className="archive-explorer-path-track">
          <button type="button" className={activeStage === null ? 'is-active' : ''} aria-pressed={activeStage === null} onClick={() => setActiveStage(null)}>
            <span className="archive-explorer-path-dot archive-explorer-path-dot--all">ALL</span>
            <span>All stages</span>
          </button>
          {stageNumbers.map(number => (
            <button key={number} type="button" className={activeStage === number ? 'is-active' : ''} aria-pressed={activeStage === number} onClick={() => setActiveStage(activeStage === number ? null : number)}>
              <span className="archive-explorer-path-dot">{String(number).padStart(2, '0')}</span>
              <span>Stage {String(number).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="archive-explorer-browser" aria-label="Browse archive entries">
        <div className="archive-explorer-browser-head">
          <div>
            <div className="archive-explorer-section-label"><span>02</span> FIELD NOTES</div>
            <p><strong>{String(visibleEntries.length).padStart(2, '0')}</strong> records in view</p>
          </div>
          <label className="archive-explorer-search">
            <span className="archive-explorer-search-icon" aria-hidden="true">⌕</span>
            <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search techniques, modules, tags…" aria-label="Search archive entries" />
            <kbd>/</kbd>
          </label>
        </div>

        <div className="archive-explorer-toolbar">
          <div className="archive-explorer-level-filters" aria-label="Filter by level">
            <button type="button" className={activeLevel === 'all' ? 'is-active' : ''} aria-pressed={activeLevel === 'all'} onClick={() => setActiveLevel('all')}>ALL LEVELS</button>
            {levels.map(level => (
              <button key={level} type="button" className={activeLevel === level ? 'is-active' : ''} aria-pressed={activeLevel === level} onClick={() => setActiveLevel(activeLevel === level ? 'all' : level)}>{level}</button>
            ))}
          </div>
          <label className="archive-explorer-sort">SORT
            <select value={sortOrder} onChange={event => setSortOrder(event.target.value as 'path' | 'title')} aria-label="Sort archive entries">
              <option value="path">PATH ORDER</option>
              <option value="title">TITLE A—Z</option>
            </select>
          </label>
        </div>

        {visibleEntries.length > 0 ? (
          <div className="archive-explorer-grid">
            {visibleEntries.map(entry => (
              <StageExplorerCard key={entry.slug} entry={entry} onClick={() => navigate({ name: 'stage', slug: entry.slug })} />
            ))}
          </div>
        ) : (
          <div className="archive-explorer-empty">
            <span>NO MATCHES</span>
            <p>Nothing in the archive matches those filters.</p>
            <button type="button" onClick={resetFilters}>Reset archive view <b>↗</b></button>
          </div>
        )}
      </section>
    </div>
  )
}

function StageExplorerCard({ entry, onClick }: { entry: ArchiveEntry; onClick: () => void }) {
  const code = String(entry.stageNumber).padStart(2, '0')
  const score = entry.vtScore.match(/^\s*\d+\s*\/\s*\d+(?:\s*(?:→|->)\s*\d+\s*\/\s*\d+)*/)?.[0]

  return (
    <button type="button" className="archive-record" data-index={code} onClick={onClick} aria-label={`${entry.stage}: ${entry.title}. Open the write-up.`}>
      <span className="archive-record-topline">
        <span><i /> FIELD NOTE <b>/{code}</b></span>
        <span className="archive-record-open" aria-hidden="true">↗</span>
      </span>
      <span className="archive-record-title">{entry.title}</span>
      <span className="archive-record-summary">{entry.subtitle}</span>
      <span className="archive-record-tags">
        <span className="archive-record-level">{entry.level || 'FIELD NOTE'}</span>
        {entry.tags.slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}
      </span>
      <span className="archive-record-divider" />
      <span className="archive-record-bottomline">
        <span className="archive-record-module"><b>{entry.moduleName}</b><i>{entry.category} · {entry.platform}</i></span>
        <span className="archive-record-data">
          {score && <span title={entry.vtScore}>VT <b>{score.replace(/\s*->\s*/g, ' → ')}</b></span>}
          {entry.estimatedTime && entry.estimatedTime !== '—' && <span>{entry.estimatedTime}</span>}
        </span>
      </span>
    </button>
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
            {entry.mitre && <MetaCell label="MITRE ATT&ACK" value={entry.mitre} />}
          </div>
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
                {next.stage}: {next.title}
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
          {entry.moduleName} — {entry.level} — {entry.estimatedTime}
        </div>
      </div>
      <div className={`entry-row-vt ${entry.vtScoreClean ? 'entry-row-vt-clean' : ''}`}>
        {entry.vtScore || '-'}
      </div>
    </button>
  )
}

/* ============================================================
   CTF CARD - the Links rule applied to walkthroughs: no two
   stages share a surface, a silhouette or a behaviour. Every
   card is a different physical artifact - a vessel, a tape, a
   fader, a trap, a shell, a flag, a lock - and carries its own
   art markup. The stage number picks the object; add a new
   walkthrough and it needs a matching CtfArt case and CSS block.
   ============================================================ */
function CtfArt({ code }: { code: string }) {
  switch (code) {
    case '01':
      return (
        <span className="ctf-art ctf-art--overflow" aria-hidden="true">
          <i className="ov-vessel" />
          <i className="ov-liquid" />
          <i className="ov-drop" />
        </span>
      )
    case '02':
      return (
        <span className="ctf-art ctf-art--pipe" aria-hidden="true">
          <i className="pp-pipe" />
          <i className="pp-gauge" />
        </span>
      )
    case '03':
      return (
        <span className="ctf-art ctf-art--reticle" aria-hidden="true">
          <i className="rt-ring" />
          <i className="rt-cross" />
          <i className="rt-dot" />
        </span>
      )
    case '04':
      return (
        <span className="ctf-art ctf-art--tape" aria-hidden="true">
          <i className="tp-reader" />
        </span>
      )
    case '05':
      return (
        <span className="ctf-art ctf-art--fader" aria-hidden="true">
          <i className="fd-track" />
          <i className="fd-knob" />
          <i className="fd-led" />
        </span>
      )
    case '06':
      return (
        <span className="ctf-art ctf-art--dial" aria-hidden="true">
          <i className="dl-face" />
          <i className="dl-needle" />
        </span>
      )
    case '07':
      return (
        <span className="ctf-art ctf-art--ruler" aria-hidden="true">
          <i className="ru-cursor" />
        </span>
      )
    case '08':
      return (
        <span className="ctf-art ctf-art--spool" aria-hidden="true">
          <i className="sp-flange" />
          <i className="sp-thread" />
        </span>
      )
    case '09':
      return (
        <span className="ctf-art ctf-art--lever" aria-hidden="true">
          <i className="lv-plate" />
          <i className="lv-arm" />
        </span>
      )
    case '10':
      return (
        <span className="ctf-art ctf-art--stick" aria-hidden="true">
          <i className="st-base" />
          <i className="st-stick"><b className="st-ball" /></i>
        </span>
      )
    case '11':
      return (
        <span className="ctf-art ctf-art--trap" aria-hidden="true">
          <i className="tr-board" />
          <i className="tr-spring" />
          <i className="tr-arm" />
          <i className="tr-cheese" />
        </span>
      )
    case '12':
      return (
        <span className="ctf-art ctf-art--splice" aria-hidden="true">
          <i className="sl-left" />
          <i className="sl-right" />
          <i className="sl-arc" />
        </span>
      )
    case '13':
      return (
        <span className="ctf-art ctf-art--crate" aria-hidden="true">
          <i className="cr-label cr-label--a" />
          <i className="cr-label cr-label--b" />
        </span>
      )
    case '14':
      return (
        <span className="ctf-art ctf-art--mailbox" aria-hidden="true">
          <i className="mb-box" />
          <i className="mb-post" />
          <i className="mb-flag" />
        </span>
      )
    case '15':
      return (
        <span className="ctf-art ctf-art--shell" aria-hidden="true">
          <i className="sh-hull" />
          <i className="sh-brass" />
        </span>
      )
    case '16':
      return (
        <span className="ctf-art ctf-art--sled" aria-hidden="true">
          <i className="sd-trail" />
          <i className="sd-runner" />
          <i className="sd-deck" />
        </span>
      )
    case '17':
      return (
        <span className="ctf-art ctf-art--map" aria-hidden="true">
          <i className="mp-sheet" />
          <i className="mp-route" />
          <i className="mp-pin" />
        </span>
      )
    case '18':
      return (
        <span className="ctf-art ctf-art--watch" aria-hidden="true">
          <i className="wt-crown" />
          <i className="wt-face" />
          <i className="wt-hand" />
          <i className="wt-tag" />
        </span>
      )
    case '19':
      return (
        <span className="ctf-art ctf-art--block" aria-hidden="true">
          <i className="bk-pedal" />
          <i className="bk-rail" />
        </span>
      )
    case '20':
      return (
        <span className="ctf-art ctf-art--relay" aria-hidden="true">
          <i className="ry-lane ry-lane--a" />
          <i className="ry-lane ry-lane--b" />
          <i className="ry-baton" />
        </span>
      )
    case '21':
      return (
        <span className="ctf-art ctf-art--pendulum" aria-hidden="true">
          <i className="pd-rod" />
          <i className="pd-bob" />
        </span>
      )
    case '22':
      return (
        <span className="ctf-art ctf-art--film" aria-hidden="true">
          <i className="fm-strip" />
        </span>
      )
    case '23':
      return (
        <span className="ctf-art ctf-art--flag" aria-hidden="true">
          <i className="fg-pole" />
          <i className="fg-cloth" />
        </span>
      )
    case '24':
      return (
        <span className="ctf-art ctf-art--lock" aria-hidden="true">
          <i className="lk-shackle" />
          <i className="lk-body" />
          <i className="lk-keyhole" />
        </span>
      )
    default:
      return null
  }
}

function CtfCard({ entry, onClick }: { entry: ArchiveEntry; onClick: () => void }) {
  const code = String(entry.stageNumber).padStart(2, '0')
  return (
    <button
      type="button"
      className={`ctf-card ctf-card--v${code}`}
      data-code={code}
      onClick={onClick}
    >
      <span className="ctf-card-stage">{entry.stage}</span>
      <span className="ctf-card-main">
        <span className="ctf-card-title">{entry.title}</span>
        <span className="ctf-card-meta">{entry.moduleName} — {entry.level}</span>
      </span>
      <span className={`ctf-card-vt${entry.vtScoreClean ? ' ctf-card-vt--clean' : ''}`}>
        {entry.vtScore || '-'}
      </span>
      <CtfArt code={code} />
    </button>
  )
}

/* ============================================================
   CTF WALKTHROUGHS
   ============================================================ */
// The two walkthrough origins, in menu order. An entry lands on a tab
// through its Module Name metadata row - see ctfSourceOf in
// entry-group.ts ("Pwn.College - ." vs "HackTheBox - .").
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
        analysis exercises. Each entry documents the full chain - from initial
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
          {entries.map(e => source === 'pwn-college' ? (
            <CtfCard key={e.slug} entry={e} onClick={() => navigate({ name: 'stage', slug: e.slug })} />
          ) : (
            <EntryRow key={e.slug} entry={e} onClick={() => navigate({ name: 'stage', slug: e.slug })} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   RESEARCH NOTES - sub-menus per series, mirroring the CTF tab
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
        Long-form working notes and curated free courses - exploit
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
                  {e.sourceUrl ? ` — ${e.sourceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : ''}
                </div>
              </div>
              <div className="entry-row-vt">?</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   RESEARCH NOTE DETAIL - rendered through the same hardened
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
            {entry.series === 'mal-dev' ? 'MAL-DEV' : 'EXPLOIT-DEV'} — {entry.dateLabel}
          </div>
          <h1 className="article-title research-title">{entry.title}</h1>
          {entry.sourceLabel && (
            <div className="research-meta">Free course - {entry.sourceLabel}</div>
          )}
          {entry.sourceUrl && (
            <a
              className="research-source-chip"
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              SOURCE <span aria-hidden="true">?</span>
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
   CHEAT SHEETS - intentionally empty section
   ============================================================ */
/* ============================================================
   CHEAT SHEETS - reference material. First sheet: Windows shell
   secrets. The Run dialog (Win+R) is the fastest terminal on any
   PC; these one-click-copy commands teach visitors to drive it.
   ============================================================ */

const SHELL_SECRETS: Array<{ cmd: string; desc: string }> = [
  { cmd: 'shell:MyComputerFolder', desc: 'This PC - every drive and device in one window' },
  { cmd: 'shell:RecycleBinFolder', desc: 'The Recycle Bin' },
  { cmd: 'shell:AppsFolder', desc: 'Every installed app - launch any of them by name' },
  { cmd: 'shell:Startup', desc: 'Programs that run the moment you log in' },
  { cmd: 'shell:Recent', desc: 'Everything you opened lately' },
  { cmd: 'shell:Downloads', desc: 'Your Downloads folder' },
  { cmd: 'shell:Temp', desc: 'Temp junk - safe to clear out' },
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
        Reference material - quick-lookup tables for analysis workflows.
        First sheet: the Windows Run dialog, the fastest terminal on any
        PC. No install, no admin rights, pure muscle memory.
      </p>

      <div className="archive-eyebrow">SHEET 01 - WINDOWS SHELL SECRETS</div>
      <div className="shell-secrets">
        <div className="shell-secret-steps">
          <div className="shell-step"><span className="shell-step-key">01</span><span>PRESS <b>Win + R</b> - the Run dialog opens</span></div>
          <div className="shell-step"><span className="shell-step-key">02</span><span>PASTE a command - one click on <b>COPY</b> puts it on your clipboard</span></div>
          <div className="shell-step"><span className="shell-step-key">03</span><span>HIT <b>Enter</b> - the folder opens. No menus, no hunting.</span></div>
        </div>
        <div className="shell-secret-hero">
          <div className="shell-secret-cmd">explorer shell:MyComputerFolder</div>
          <div className="shell-secret-desc">
            The gateway command: opens This PC - every drive, every device,
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
        <div className="shell-secret-foot">WINDOWS ONLY - RUN NEEDS A KEYBOARD. ON A PHONE, THE LESSON IS STILL FREE.</div>
      </div>
    </div>
  )
}

/* ============================================================
   FILE ARCHIVE - intentionally empty section
   ============================================================ */
export function FilesPage({ navigate }: { navigate: NavFn }) {
  // No downloadable files have been published yet - empty state until
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
   GAMES - playable things built for and hosted by the archive.
   Cabinet 01: MultiHero - the freeware fan game's official
   WASM build, self-hosted and embedded same-origin.
   Cabinet 02: a complete side-scrolling platformer written
   from scratch (original engine, sprites, and sound - no ROMs).
   Cabinet 03: a self-hosted Super Nintendo whose shelf of
   cartridges runs in the browser on the self-hosted
   EmulatorJS runtime.
   ============================================================ */
export function GamesPage({ navigate }: { navigate: NavFn }) {
  /* cabinet 01 (MultiHero) stays powered off until the visitor clicks -
     the WASM build only downloads on click (~13 MB) */
  const [heroOn, setHeroOn] = useState(false)
  /* cabinet 02 stays powered off until the visitor clicks - no auto-start */
  const [marioOn, setMarioOn] = useState(false)
  return (
    <div className="archive-container games-room">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">GAMES</div>
      <h1 className="archive-title">Games</h1>
      <p className="archive-subtitle">
        Playable things from the archive. Cabinet 01: MultiHero - a
        freeware browser beat-'em-up, solo or with up to four players
        online. Cabinet 02: SUPER ARCHIVE BROS. - a complete
        side-scrolling platformer built from scratch for this site.
        Cabinet 03: a Super Nintendo with its games pre-installed - tap a
        title on the shelf and it runs right here in the browser.
      </p>

      {/* ============================================================
          CABINET 01 - MultiHero, Web Edition. The port author ships a
          complete self-hostable WASM build (public/multihero/multihero-web,
          MIT; original freeware game by mhman - see NOTICE.md). The
          loader fetches its ~13 MB data package the moment it runs, so
          the iframe only mounts on click - nothing downloads before it.
          ============================================================ */}
      <div className="game-cabinet game-cabinet--hero">
        <div className="game-cab-head">
          <span className="game-num">01</span>
          <span className="game-cab-label">MultiHero - Web Edition</span>
          <span className="game-cab-note">browser beat-'em-up · touch + gamepad · up to 4 players online</span>
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
                  EJECT
                </button>
              </div>
            </>
          ) : (
            <div className="game-launch game-launch--poster">
              <button
                type="button"
                className="game-launch-poster"
                onClick={() => setHeroOn(true)}
                aria-label="Power on MultiHero - Web Edition"
              >
                <img
                  src="/posters/multihero-web-edition.png"
                  alt="Cabinet 01 poster: MultiHero - Web Edition. Mario vs Bowser under the cabinet marquee, with the cast of all 27 fighters drawn from the game's own gfx."
                  width={1200}
                  height={1800}
                  loading="lazy"
                  decoding="async"
                />
              </button>
              <div className="game-launch-side">
                <p className="game-launch-head">GAME INSTALLED - TAP TO POWER ON</p>
                <button type="button" className="game-launch-btn" onClick={() => setHeroOn(true)}>
                  INSERT COIN · PLAY
                </button>
                <p className="game-launch-blurb">
                  27 fighters on one cartridge - Ryu, Spider-Man, Bowser, Venom and
                  the rest, drawn from the game's own gfx. The WASM build
                  (~13 MB) downloads only after you press start.
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
          CABINET 02 - Super Archive Bros., written from scratch for the
          archive (original engine, sprites, sound - no ROMs). The INSERT
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
                  EJECT
                </button>
              </div>
            </>
          ) : (
            <div className="game-launch">
              <p className="game-launch-head">CARTRIDGE INSTALLED - TAP TO POWER ON</p>
              <button type="button" className="game-launch-btn" onClick={() => setMarioOn(true)}>
                INSERT COIN · ONE CLICK PLAY
              </button>
            </div>
          )}
        </div>
        <div className="game-cab-foot">
          <span className="game-keys">MOVE · Z JUMP (HOLD = HIGHER) · X RUN · ENTER PAUSE · M SOUND</span>
        </div>
      </div>

      {/* ============================================================
          CABINET 03 - Super Nintendo. Pre-installed cartridges running on
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
   CLIPPED - gameplay videos from the archive. Where the
   gameplay footage lives: the playable cabinets up top and the
   walkthroughs below, with the actual clips posted here as they
   happen. Each clip is its own card: the pasted footage plays,
   the source note keeps the catalog honest.
   ============================================================ */
const CLIPS: Array<{ src: string; label: string; note: string }> = [
  {
    src: '/clip1_0001.mp4',
    label: 'Clip 0001',
    note: 'Raw gameplay footage — the first clip pasted into the archive root.',
  },
  {
    src: '/clip_0002.mp4',
    label: 'Clip 0002',
    note: 'Raw gameplay footage — the second clip pasted into the archive root.',
  },
  {
    src: '/clip_0003.mp4.mp4',
    label: 'Clip 0003',
    note: 'Raw gameplay footage — the third clip pasted into the archive root.',
  },
]

const ANHILATION_CLIPS: Array<{ src: string; label: string; note: string }> = [
  {
    src: '/CA_clip_0001.mp4.mp4',
    label: 'CA Clip 0001',
    note: 'Raw gameplay footage — the ANHILATION clip pasted into the archive root.',
  },
]

export function ClippedPage({ navigate }: { navigate: NavFn }) {
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'games' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">CLIPS</div>
      <h1 className="archive-title">Clipped</h1>
      <p className="archive-subtitle">
        Gameplay videos from the archive - where I will post my gameplay
        videos. Recorded runs, boss fights, speedruns and cabinet captures
        as they happen.
      </p>
      <div className="clip-list">
        {CLIPS.map((clip) => (
          <article key={clip.src} className="clip-card">
            <video
              className="clip-video"
              src={clip.src}
              controls
              playsInline
              muted
              loop
              autoPlay
              preload="metadata"
              aria-label={clip.label}
            />
            <div className="clip-body">
              <span className="clip-label">{clip.label}</span>
              <span className="clip-note">{clip.note}</span>
            </div>
          </article>
        ))}
      </div>

      {/* ============================================================
         ANHILATION — the second menu under CLIPS. Carries its own
         clip, kept as its own menu rather than merged into the
         gameplay list.
         ============================================================ */}
      <div className="clip-menu">
        <span className="clip-menu-name">ANHILATION</span>
        <div className="clip-list">
          {ANHILATION_CLIPS.map((clip) => (
            <article key={clip.src} className="clip-card">
              <video
                className="clip-video"
                src={clip.src}
                controls
                playsInline
                muted
                loop
                autoPlay
                preload="metadata"
                aria-label={clip.label}
              />
              <div className="clip-body">
                <span className="clip-label">{clip.label}</span>
                <span className="clip-note">{clip.note}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   LINKS - the directory as a collection of artifacts. Every row
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
      {link.variant === 'av' && (
        <span className="artifact-art artifact-art--av" aria-hidden="true">
          <i className="av-glass" />
          <i className="av-fill" />
          <i className="av-cap" />
        </span>
      )}
      {link.variant === 'aes' && (
        <span className="artifact-art artifact-art--aes" aria-hidden="true">
          <i className="aes-chip" />
        </span>
      )}
      {link.variant === 'sc' && (
        <span className="artifact-art artifact-art--sc" aria-hidden="true">
          <i className="sc-plug" />
          <i className="sc-body" />
          <i className="sc-led" />
        </span>
      )}
      {link.variant === 'bolus' && (
        <span className="artifact-art artifact-art--bolus" aria-hidden="true">
          <i /><i /><i />
        </span>
      )}
      {link.variant === 'nim' && (
        <span className="artifact-art artifact-art--nim" aria-hidden="true">
          <i className="nim-crown" />
        </span>
      )}
      {link.variant === 'rustic' && (
        <span className="artifact-art artifact-art--rustic" aria-hidden="true">
          <span className="rustic-regs">
            {['RAX', 'RBX', 'RCX', 'RDX', 'RSI', 'RDI', 'RBP', 'RSP'].map(reg => (
              <i key={reg}>{reg}</i>
            ))}
          </span>
        </span>
      )}
      {link.variant === 'defcon' && (
        <span className="artifact-art artifact-art--defcon" aria-hidden="true">
          <b>27</b>
          <i className="defcon-barcode" />
        </span>
      )}
      {link.variant === 'net' && (
        <span className="artifact-art artifact-art--net" aria-hidden="true">
          <i className="net-proc">HOST</i>
          <i className="net-arrow" />
          <i className="net-proc net-proc--b">TARGET</i>
        </span>
      )}
      {link.variant === 'dotnet' && (
        <span className="artifact-art artifact-art--dotnet" aria-hidden="true">
          <i>00000000  4D 5A 90 00 03 00 00 00</i>
          <i>00000008  04 00 00 00 FF FF 00 00</i>
          <i>00000010  B8 2A 00 00 00 C3 90 90</i>
        </span>
      )}
      {link.variant === 'pic' && (
        <span className="artifact-art artifact-art--pic" aria-hidden="true">
          <i className="pic-jaw" />
          <i className="pic-screw" />
        </span>
      )}
      {link.variant === 'clickonce' && (
        <span className="artifact-art artifact-art--clickonce" aria-hidden="true">
          <i className="clickonce-button" />
          <i className="clickonce-led" />
        </span>
      )}
      {link.variant === 'ascii' && (
        <span className="artifact-art artifact-art--ascii" aria-hidden="true">
          <span className="ascii-magic-panel">
            <span className="ascii-magic-meta">BITMAP <i /> GLYPH</span>
            <pre className="ascii-magic-glyph">{`         .::::.
      .::+####+::.
   .::+#%%@@%%#+::.
 .::+#%%@@##@@%%#+::.
   .::+#%%@@%%#+::.
      '::+####+::'
         '----'`}</pre>
            <span className="ascii-magic-footer"><i /> RENDER / 80 COL</span>
            <i className="ascii-magic-scan" />
          </span>
        </span>
      )}
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
      <span className="artifact-go" aria-hidden="true">{link.variant === 'ascii' ? '↗' : '?'}</span>
    </a>
  )
}

export function LinksPage({ navigate }: { navigate: NavFn }) {
  const links = LINKS
  // Two drawers under this menu: .com (the clearnet side) and .onion (Tor
  // hidden services). Classification is automatic - any row whose host ends
  // in .onion renders in the .onion drawer, so adding a hidden service to
  // LINKS needs no extra flag. Rows keep whichever unique material they
  // declare - every link is its own artifact, in both drawers.
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
        Every external link in one directory, split into two drawers - the
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
      <div className="empty-state-mark">- -</div>
      <div className="empty-state-text">{message}</div>
    </div>
  )
}
