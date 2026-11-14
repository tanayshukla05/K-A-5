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
import { isCtfEntry, ctfSourceOf, type CtfSource } from '@/lib/entry-group'
import { LINKS, type ArchiveLink } from '@/lib/links'
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
      </span>
      <span className="artifact-go" aria-hidden="true">↗</span>
    </a>
  )
}

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
        Every external link in one directory — each row is its own artifact:
        a different material, a different behaviour. All open in a new tab.
      </p>
      {links.length === 0 ? (
        <EmptyState message="No links added yet" />
      ) : (
        <div>
          {links.map((l, i) => (
            <ArtifactLink key={l.url} link={l} index={i} />
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
