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
} from '@/components/content-provider'
import { useState } from 'react'
import type { ArchiveEntry } from '@/lib/types'
import type { Route } from '@/lib/router'
import { isCtfEntry, ctfSourceOf, type CtfSource } from '@/lib/entry-group'
import { LINKS } from '@/lib/links'
import { GiftOverlay } from '@/components/gift-overlay'

type NavFn = (route: Route) => void

/* ============================================================
   HOME — intentionally minimal: brand block + the quote. The
   stats / latest-entries / tag sections were removed on request.
   ============================================================ */
export function HomePage() {
  return (
    <div className="archive-container">
      {/*
        THE GREETING — opens by itself after the loader, once per
        session. The static card below stays as the permanent
        touchpoint for visitors who closed the greeting.
      */}
      <GiftOverlay />
      <div className="archive-eyebrow">7TH WARD</div>
      <h1 className="archive-title">
        Pandit Tanay Shukla<br />Ji Maharaj
      </h1>
      {/*
        THE GIFT — every visitor is offered a take-home file. The `download`
        attribute makes the browser save it directly on click (browsers block
        any download that fires without a user gesture, so this is the
        consent-respecting way). The small preview keeps the page light —
        the full 2 MB animation only transfers when someone actually claims
        the gift. On older iOS the visible <img> is the long-press-save
        fallback.
      */}
      <a className="gift-card" href="/app-debug.apk" download="app-debug.apk">
        <img src="/gift-preview.jpg" alt="The archive gift — a snarling wolf" className="gift-image" />
        <span className="gift-label">
          <span className="gift-eyebrow">A GIFT FOR VISITING</span>
          <span className="gift-cta">CLICK TO TAKE IT WITH YOU</span>
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
  // walkthroughs) so the two menus never cross-link into each other.
  const series = entries.filter(e => isCtfEntry(e) === isCtfEntry(entry))
  const idx = series.findIndex(e => e.slug === slug)
  const prev = idx > 0 ? series[idx - 1] : null
  const next = idx < series.length - 1 ? series[idx + 1] : null

  return (
    <div className="archive-container">
      <button
        type="button"
        className="back-link"
        onClick={() => navigate({ name: isCtfEntry(entry) ? 'ctf' : 'archive' })}
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

export function CtfPage({ navigate }: { navigate: NavFn }) {
  const all = useAllEntries().filter(e => isCtfEntry(e))
  const [source, setSource] = useState<CtfSource>('pwn-college')
  const entries = all.filter(e => ctfSourceOf(e) === source)
  const counts: Record<CtfSource, number> = { 'pwn-college': 0, hackthebox: 0 }
  for (const e of all) counts[ctfSourceOf(e)]++
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
      {entries.length === 0 ? (
        <EmptyState message={`No ${CTF_TABS.find(t => t.id === source)?.label} walkthroughs published yet`} />
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
   RESEARCH NOTES — intentionally empty section
   ============================================================ */
export function ResearchPage({ navigate }: { navigate: NavFn }) {
  // No research notes have been published yet. Per the archive philosophy
  // this page shows its empty state plainly until real content exists —
  // no placeholder entries.
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">RESEARCH NOTES</div>
      <h1 className="archive-title">Research Notes</h1>
      <p className="archive-subtitle">
        Long-form research notes — cryptanalysis, memory forensics, detection
        engineering, and Windows internals. These are working documents, not
        polished posts.
      </p>
      <EmptyState message="No research notes published yet" />
    </div>
  )
}

/* ============================================================
   CHEAT SHEETS — intentionally empty section
   ============================================================ */
export function CheatsheetsPage({ navigate }: { navigate: NavFn }) {
  // No cheat sheets have been published yet — empty state until real
  // reference material exists.
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">CHEAT SHEETS</div>
      <h1 className="archive-title">Cheat Sheets</h1>
      <p className="archive-subtitle">
        Reference material — YARA rule templates, syscall tables, byte
        signatures, and quick-lookup tables for analysis workflows.
      </p>
      <EmptyState message="No cheat sheets published yet" />
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
   LINKS — external links directory
   ============================================================ */
export function LinksPage({ navigate }: { navigate: NavFn }) {
  const links = LINKS
  return (
    <div className="archive-container">
      <button type="button" className="back-link" onClick={() => navigate({ name: 'home' })}>
        ← Back
      </button>
      <div className="archive-eyebrow">DIRECTORY / LINKS</div>
      <h1 className="archive-title">Links</h1>
      <p className="archive-subtitle">
        Every external link in one directory. Each row opens in a new tab.
      </p>
      {links.length === 0 ? (
        <EmptyState message="No links added yet" />
      ) : (
        <div>
          {links.map((l, i) => (
            <a
              key={l.url}
              className="entry-row"
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="entry-row-stage">LINK {String(i + 1).padStart(2, '0')}</div>
              <div>
                <div className="entry-row-title">{l.label}</div>
                <div className="entry-row-meta">
                  {l.note ? `${l.note} · ` : ''}{l.url}
                </div>
              </div>
              <div className="entry-row-vt">↗</div>
            </a>
          ))}
        </div>
      )}
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
