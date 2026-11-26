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
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { ArchiveEntry, ResearchSeries } from '@/lib/types'
import type { Route } from '@/lib/router'
import { isCtfEntry, ctfSourceOf, ctfTopicOf, type CtfSource, type CtfTopic } from '@/lib/entry-group'
import { LINKS, type ArchiveLink } from '@/lib/links'
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
   CTF DIRECTORY ROW
   A shared, compact row keeps entries easy to scan across sources.
   ============================================================ */
function CtfCard({ entry, onClick }: { entry: ArchiveEntry; onClick: () => void }) {
  return (
    <button
      type="button"
      className="ctf-card"
      onClick={onClick}
    >
      <span className="ctf-card-stage">{entry.stage}</span>
      <span className="ctf-card-main">
        <span className="ctf-card-title">{entry.title}</span>
        <span className="ctf-card-meta">{entry.moduleName} — {entry.level}</span>
      </span>
      <span className={`ctf-card-vt${entry.vtScoreClean ? ' ctf-card-vt--clean' : ''}`}>
        <span className="ctf-card-vt-label">VT</span>
        <span>{entry.vtScore || '—'}</span>
      </span>
      <span className="ctf-card-arrow" aria-hidden="true">↗</span>
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
    <div className="archive-container ctf-page">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <header className="ctf-hero">
        <div className="ctf-hero-copy">
          <div className="archive-eyebrow"><span className="ctf-kicker-mark" /> OFFENSIVE SECURITY / FIELD NOTES</div>
          <h1 className="archive-title">CTF Walkthroughs</h1>
          <p className="archive-subtitle">
            Challenge breakdowns, exploit notes, and lab research. Choose a collection to browse the writeups.
          </p>
        </div>
        <div className="ctf-hero-stat" aria-label={`${counts[source]} walkthroughs in selected source`}>
          <span>INDEXED</span>
          <strong>{String(counts[source]).padStart(2, '0')}</strong>
          <span>WRITEUPS</span>
        </div>
      </header>
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
      <section className="ctf-directory" aria-label={`${emptyLabel} walkthroughs`}>
        <div className="ctf-directory-head">
          <h2>{emptyLabel}</h2>
          <span>{String(entries.length).padStart(2, '0')} RECORDS</span>
        </div>
        {entries.length === 0 ? (
          <EmptyState message={`No ${emptyLabel} walkthroughs published yet`} />
        ) : (
          <>
            <div className="ctf-column-head" aria-hidden="true">
              <span>STAGE</span><span>CHALLENGE</span><span>VIRUSTOTAL</span><span />
            </div>
            <div className="ctf-entry-list">
              {entries.map(e => (
                <CtfCard key={e.slug} entry={e} onClick={() => navigate({ name: 'stage', slug: e.slug })} />
              ))}
            </div>
          </>
        )}
      </section>
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

function CopyCommandButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const input = document.createElement('textarea')
      input.value = text
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button type="button" className={`copy-chip${copied ? ' copy-chip--done' : ''}`} onClick={copyCommand}>
      {copied ? 'COPIED' : 'COPY'}
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
      <div className="shell-secret-hero">
        <pre className="shell-secrets"><code>{'explorer.exe "$(wslpath -w ~/extracted)"'}</code></pre>
        <CopyCommandButton text={'explorer.exe "$(wslpath -w ~/extracted)"'} />
      </div>
    </div>
  )
}

const MALWARE_TECHNIQUE_GROUPS = [
  {
    tactic: 'Reconnaissance', id: 'TA0043',
    goal: 'Information gathered before an operation begins.',
    techniques: ['Victim organization research', 'Public information collection', 'Technical footprint mapping'],
    watch: 'Unexpected scanning, lookalike domains, and unusual collection of public-facing details.',
  },
  {
    tactic: 'Resource Development', id: 'TA0042',
    goal: 'Resources prepared to support a later operation.',
    techniques: ['Infrastructure acquisition', 'Staging malware or tools', 'Account and domain preparation'],
    watch: 'Newly registered domains, suspicious certificates, and infrastructure with short lifetimes.',
  },
  {
    tactic: 'Initial Access', id: 'TA0001',
    goal: 'A foothold established on a target system or network.',
    techniques: ['Phishing delivery', 'Trojanized software', 'Drive-by compromise', 'Removable media'],
    watch: 'Attachment and download provenance, application reputation, and endpoint process ancestry.',
  },
  {
    tactic: 'Execution', id: 'TA0002',
    goal: 'Malicious instructions run in a target environment.',
    techniques: ['Command and scripting interpreters', 'Native API execution', 'User execution', 'Shared modules and loaders'],
    watch: 'Unexpected parent-child processes, rare interpreter use, and unsigned code loaded by trusted apps.',
  },
  {
    tactic: 'Persistence', id: 'TA0003',
    goal: 'Access maintained across logins, reboots, or interruptions.',
    techniques: ['Autostart extensibility points', 'Scheduled tasks or jobs', 'System services', 'Event-triggered execution'],
    watch: 'New autoruns, services, scheduled jobs, and changes to startup configuration.',
  },
  {
    tactic: 'Privilege Escalation', id: 'TA0004',
    goal: 'Higher permissions obtained to expand access.',
    techniques: ['Abuse of access tokens', 'Permission or configuration abuse', 'Exploitation for privilege escalation'],
    watch: 'Unexpected elevation, token changes, vulnerable driver loads, and privileged process creation.',
  },
  {
    tactic: 'Stealth', id: 'TA0005',
    goal: 'Activity made harder to distinguish from normal system behavior.',
    techniques: ['Obfuscation or packing', 'Masquerading', 'Process injection', 'Signed binary proxy execution'],
    watch: 'Unsigned or anomalous modules, mismatched file metadata, and memory execution without normal image loads.',
  },
  {
    tactic: 'Defense Impairment', id: 'TA0112',
    goal: 'Security controls, logging, or recovery capabilities disrupted.',
    techniques: ['Impair defenses', 'Clear or alter logs', 'Disable or modify tools', 'Delete or inhibit recovery data'],
    watch: 'Gaps in telemetry, service tampering, policy changes, and backup deletion events.',
  },
  {
    tactic: 'Credential Access', id: 'TA0006',
    goal: 'Authentication material sought or captured.',
    techniques: ['Credential dumping', 'Input capture', 'Password guessing', 'Authentication material in files or stores'],
    watch: 'Credential-store access by unusual processes, repeated failures, and anomalous authentication patterns.',
  },
  {
    tactic: 'Discovery', id: 'TA0007',
    goal: 'The environment mapped after access is gained.',
    techniques: ['System and user discovery', 'Network and service discovery', 'Account and permission discovery', 'Security software discovery'],
    watch: 'Bursts of inventory commands, directory queries, and host or service enumeration.',
  },
  {
    tactic: 'Lateral Movement', id: 'TA0008',
    goal: 'Access extended from one system to another.',
    techniques: ['Remote services', 'Remote execution', 'Internal spearphishing', 'Use of valid accounts'],
    watch: 'New remote logons, unusual administrative shares, and one host initiating access to many peers.',
  },
  {
    tactic: 'Collection', id: 'TA0009',
    goal: 'Information gathered and staged for an objective.',
    techniques: ['Local data collection', 'Screen or audio capture', 'Clipboard data', 'Archive collected data'],
    watch: 'Unusual access to sensitive files, bulk reads, and new archive creation in temporary locations.',
  },
  {
    tactic: 'Command and Control', id: 'TA0011',
    goal: 'A compromised system communicates with an operator or controller.',
    techniques: ['Application-layer protocols', 'Encrypted channels', 'Proxy or relay use', 'Dead drop resolution'],
    watch: 'Periodic outbound connections, rare destinations, and network flows that do not match the host role.',
  },
  {
    tactic: 'Exfiltration', id: 'TA0010',
    goal: 'Collected information moved outside the environment.',
    techniques: ['Transfer over command and control', 'Transfer to cloud storage', 'Transfer over alternate protocols'],
    watch: 'Unusual outbound volume, off-hours transfers, and sensitive data sent to new destinations.',
  },
  {
    tactic: 'Impact', id: 'TA0040',
    goal: 'Systems or data disrupted, altered, or destroyed.',
    techniques: ['Data encryption for impact', 'Data destruction', 'Service interruption', 'Resource hijacking'],
    watch: 'Rapid file changes, unexpected service stops, recovery failures, and sudden resource spikes.',
  },
] as const

/* ============================================================
   APPS / MALWARE BEHAVIOR ATLAS
   ============================================================ */
export function FilesPage({ navigate }: { navigate: NavFn }) {
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">RED TEAM / BLUE TEAM FIELD GUIDE</div>
      <h1 className="archive-title">Malware Technique Atlas</h1>
      <p className="archive-subtitle">
        A behavior-first map for authorized exercises, threat analysis, and detection engineering.
        Each entry pairs a high-level technique family with signals defenders can investigate.
      </p>
      <div className="malware-atlas-meta">
        <span>ENTERPRISE BEHAVIOR MAP</span>
        <span>{String(MALWARE_TECHNIQUE_GROUPS.length).padStart(2, '0')} TACTIC AREAS</span>
        <a href="https://attack.mitre.org/matrices/enterprise/" target="_blank" rel="noreferrer">MITRE ATT&amp;CK ↗</a>
      </div>
      <div className="malware-atlas">
        {MALWARE_TECHNIQUE_GROUPS.map((group, index) => (
          <article className="malware-card" key={group.id}>
            <div className="malware-card-top">
              <span className="malware-card-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="malware-card-id">{group.id}</span>
            </div>
            <h2>{group.tactic}</h2>
            <p className="malware-card-goal">{group.goal}</p>
            <ul className="malware-techniques">
              {group.techniques.map((technique) => <li key={technique}>{technique}</li>)}
            </ul>
            <div className="malware-watch"><span>DEFENDER LENS</span><p>{group.watch}</p></div>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   GAMES - playable things built for and hosted by the archive.
   Cabinet 01: MultiHero - the freeware fan game's official
   WASM build, self-hosted and embedded same-origin.
   Cabinet 02: a self-hosted Super Nintendo whose shelf of
   cartridges runs in the browser on the self-hosted
   EmulatorJS runtime.
   ============================================================ */
export function GamesPage({ navigate, initialGame }: { navigate: NavFn; initialGame?: string }) {
  /* cabinet 01 (MultiHero) stays powered off until the visitor clicks -
     the WASM build only downloads on click (~13 MB) */
  const [heroOn, setHeroOn] = useState(false)
  const snesCabinetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!initialGame) return
    const frame = requestAnimationFrame(() => {
      snesCabinetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [initialGame])

  return (
    <div className="archive-container games-room">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">GAMES</div>
      <h1 className="archive-title">Games</h1>
      <p className="archive-subtitle">
        Two cabinets, ready to play. Step into MultiHero or browse the
        Super Nintendo library.
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
              </div>
            </div>
          )}
        </div>
        <div className="game-cab-foot">
          <span className="game-keys">WASD MOVE · N ATTACK · M JUMP · H SPECIAL · SPACE BLOCK · J THROW · ONLINE PLAY IN MENU · TOUCH PADS ON MOBILE · CREDITS AT /MULTIHERO</span>
        </div>
      </div>

      {/* ============================================================
          CABINET 02 - Super Nintendo. Pre-installed cartridges running on
          the self-hosted EmulatorJS runtime; per-game attribution at
          public/roms/CREDITS.md.
          ============================================================ */}
      <div ref={snesCabinetRef} className="game-cabinet game-cabinet--snes">
        <div className="game-cab-head">
          <span className="game-num">02</span>
          <span className="game-cab-label">Super Nintendo</span>
          <span className="game-cab-note">games pre-installed · tap and play · nothing to bring</span>
        </div>
        <div className="game-screen">
          <SnesCabinet key={initialGame ?? 'all-games'} initialQuery={initialGame} />
        </div>
        <div className="game-cab-foot">
          <span className="game-keys">SNES LIBRARY · SEARCH ALL INSTALLED CARTRIDGES · SAVE STATES + TOUCH CONTROLS · CREDITS AT /ROMS</span>
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
const CLIPS: Array<{ src: string; label: string }> = [
  {
    src: '/clip1_0001.mp4',
    label: 'Clip 0001',
  },
  {
    src: '/clip_0002.mp4',
    label: 'Clip 0002',
  },
  {
    src: '/clip_0003.mp4.mp4',
    label: 'Clip 0003',
  },
  {
    src: '/clip_0004.mp4',
    label: 'Clip 0004',
  },
]

const ANHILATION_CLIPS: Array<{ src: string }> = [
  {
    src: '/CA_clip_0001.mp4.mp4',
  },
  {
    src: '/CA_clip_0002.mp4',
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
          </article>
        ))}
      </div>

      {/* ANHILATION is a separate collection inside the clip archive. */}
      <div className="clip-menu">
        <details className="clip-submenu" open>
          <summary className="clip-menu-name">
            <span className="clip-menu-index" aria-hidden="true">
              <small>CA</small>
              <b>02</b>
            </span>
            <span className="clip-menu-title">
              <span>CONTROLED</span>
              <em>ANHILATION</em>
            </span>
            <span className="clip-menu-total" aria-hidden="true">
              <b>02</b>
              <small>REELS</small>
            </span>
          </summary>
          <div className="clip-list clip-list--annihilation">
            {ANHILATION_CLIPS.map((clip, index) => (
              <article key={clip.src} className="clip-card clip-card--annihilation">
                <span className="clip-reel-index" aria-hidden="true">
                  CA–{String(index + 1).padStart(2, '0')}
                </span>
                <video
                  className="clip-video"
                  src={clip.src}
                  controls
                  playsInline
                  muted
                  loop
                  autoPlay
                  preload="metadata"
                  aria-label={`CONTROLED ANHILATION video ${index + 1}`}
                />
              </article>
            ))}
          </div>
        </details>
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
  const siteHost = new URL(link.url).hostname.toLowerCase()
  const isOnion = siteHost.endsWith('.onion')
  const hasOwnLogo = variant === 'wetw0rk'
  const githubOwner = siteHost === 'github.com'
    ? new URL(link.url).pathname.split('/').filter(Boolean)[0]
    : undefined
  const siteLogoPath = githubOwner
    ? `/link-art/github-owners/${githubOwner}.webp`
    : `/link-art/logos-finished/${siteHost}.png`
  const [logoFailed, setLogoFailed] = useState(false)
  const logoWords = link.label.match(/[a-z0-9]+/gi) ?? [link.label]
  const logoMonogram = (logoWords.length > 1
    ? `${logoWords[0][0]}${logoWords[1][0]}`
    : logoWords[0].slice(0, 2)).toUpperCase()
  const has3dArt = ['a13xp0p0v', 'maxwell-dulin', 'capt-meelo', 'doar-e', 'hex-rays', 'secret-club', 'zerozero-sec'].includes(variant)
  const tiltArtwork = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    event.currentTarget.style.setProperty('--link-tilt-x', `${-y * 11}deg`)
    event.currentTarget.style.setProperty('--link-tilt-y', `${x * 14}deg`)
  }
  const resetArtwork = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.setProperty('--link-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--link-tilt-y', '0deg')
  }
  return (
    <a
      className={`artifact artifact--${variant}`}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onPointerMove={has3dArt ? tiltArtwork : undefined}
      onPointerLeave={has3dArt ? resetArtwork : undefined}
    >
      <span className="artifact-num" aria-hidden="true">{num}</span>
      <span className="artifact-body">
        <span className="artifact-heading">
          {!hasOwnLogo && (
            <span className={`artifact-site-logo${isOnion || logoFailed ? ' artifact-site-logo--monogram' : ''}${githubOwner ? ' artifact-site-logo--owner' : ''}`} aria-hidden="true">
              {isOnion || logoFailed
                ? <span>{logoMonogram}</span>
                : <img src={siteLogoPath} alt="" loading="lazy" decoding="async" onError={() => setLogoFailed(true)} />}
            </span>
          )}
          <span className="artifact-label">{link.label}</span>
        </span>
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
      {link.variant === 'corelan' && (
        <span className="artifact-art artifact-art--corelan" aria-hidden="true">
          <span className="corelan-console">
            <span className="corelan-console-head"><i /> DEBUG SESSION <b>CORE / 01</b></span>
            <span className="corelan-memory">
              <span><i>STACK</i><b /><b /><b /></span>
              <span><i>HEAP</i><b /><b /><b /></span>
              <span><i>IMAGE</i><b /><b /><b /></span>
            </span>
            <span className="corelan-console-foot">MEMORY / CONTROL / RESEARCH</span>
            <i className="corelan-scan" />
          </span>
        </span>
      )}
      {link.variant === 'wetw0rk' && (
        <span className="artifact-art artifact-art--wetw0rk" aria-hidden="true">
          <span className="wetw0rk-art-index">FIELD RECORD / 062</span>
          <span className="wetw0rk-emblem">
            <i className="wetw0rk-frame-mark wetw0rk-frame-mark--a" />
            <i className="wetw0rk-frame-mark wetw0rk-frame-mark--b" />
            <img src="/link-art/wetw0rk-avatar.webp" alt="" />
            <i className="wetw0rk-scanline" />
          </span>
          <span className="wetw0rk-stamp">
            <b>M. VALENCIA</b>
            <i>WINDOWS / X64</i>
            <i>REPOSITORY INDEX</i>
          </span>
        </span>
      )}
      {link.variant === 'a13xp0p0v' && (
        <span className="artifact-art artifact-art--research a13-art" aria-hidden="true">
          <span className="research-scene a13-scene">
            <i className="a13-orbit a13-orbit--one" /><i className="a13-orbit a13-orbit--two" />
            <span className="a13-core"><img src="/link-art/a13xp0p0v.png" alt="" /></span>
            <span className="a13-caption">KERNEL / 01</span>
          </span>
        </span>
      )}
      {link.variant === 'maxwell-dulin' && (
        <span className="artifact-art artifact-art--research maxwell-art" aria-hidden="true">
          <span className="research-scene maxwell-scene">
            <span className="maxwell-cube maxwell-cube--one"><i /><i /><i /></span>
            <span className="maxwell-cube maxwell-cube--two"><i /><i /><i /></span>
            <span className="maxwell-cube maxwell-cube--three"><i /><i /><i /></span>
            <img src="/link-art/maxwell-dulin.ico" alt="" />
            <span className="maxwell-caption">HEAP / 02</span>
          </span>
        </span>
      )}
      {link.variant === 'capt-meelo' && (
        <span className="artifact-art artifact-art--research meelo-art" aria-hidden="true">
          <span className="research-scene meelo-scene">
            <i className="meelo-ring meelo-ring--outer" /><i className="meelo-ring meelo-ring--inner" />
            <span className="meelo-sphere"><img src="/link-art/capt-meelo.ico" alt="" /></span>
            <span className="meelo-crosshair meelo-crosshair--x" /><span className="meelo-crosshair meelo-crosshair--y" />
            <span className="meelo-caption">PWN / LAB</span>
          </span>
        </span>
      )}
      {link.variant === 'doar-e' && (
        <span className="artifact-art artifact-art--research doare-art" aria-hidden="true">
          <span className="research-scene doare-scene">
            <span className="doare-book"><i /><i /><i /><b>RE</b></span>
            <span className="doare-loupe"><i /></span>
            <span className="doare-caption">TRACE / DECODE</span>
          </span>
        </span>
      )}
      {link.variant === 'hex-rays' && (
        <span className="artifact-art artifact-art--research hexrays-art" aria-hidden="true">
          <span className="research-scene hexrays-scene">
            <span className="hexrays-prism"><i /><i /><i /><img src="/link-art/hex-rays.png" alt="" /></span>
            <span className="hexrays-base">IDA / ANALYSIS</span>
          </span>
        </span>
      )}
      {link.variant === 'secret-club' && (
        <span className="artifact-art artifact-art--research secretclub-art" aria-hidden="true">
          <span className="research-scene secretclub-scene">
            <i className="secretclub-ring secretclub-ring--x" /><i className="secretclub-ring secretclub-ring--y" />
            <span className="secretclub-core"><img src="/link-art/secret-club.ico" alt="" /></span>
            <span className="secretclub-caption">RING 0 / FIELD NOTES</span>
          </span>
        </span>
      )}
      {link.variant === 'zerozero-sec' && (
        <span className="artifact-art artifact-art--research zerozero-art" aria-hidden="true">
          <span className="research-scene zerozero-scene">
            <i className="zerozero-orbit zerozero-orbit--one" /><i className="zerozero-orbit zerozero-orbit--two" />
            <span className="zerozero-core"><img src="/link-art/0x00sec.png" alt="" /></span>
            <span className="zerozero-nodes"><i /><i /><i /><i /><i /></span>
            <span className="zerozero-caption">LOW LEVEL / NETWORK</span>
          </span>
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
      <span className="artifact-go" aria-hidden="true">{link.variant === 'ascii' || link.variant === 'wetw0rk' ? '↗' : '?'}</span>
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
  const directoryLinks = comLinks
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">DIRECTORY / LINKS</div>
      <h1 className="archive-title">Links</h1>

      <div className="links-drawer">
        <div className="links-drawer-head">
          <span className="links-drawer-tld">.com</span>
          <span className="links-drawer-note">the clearnet directory · 01–{String(directoryLinks.length).padStart(2, '0')} LINKS</span>
        </div>
        {directoryLinks.length === 0 ? (
          <EmptyState message="No clearnet links yet" />
        ) : (
          directoryLinks.map((l, i) => (
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
