'use client'

/**
 * Search command panel — Ctrl+K / Cmd+K.
 * Instant search across stages, tags, categories, headings.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ArchiveEntry } from '@/lib/types'
import { useAllEntries, useSearchEntries } from '@/components/content-provider'
import type { Route } from '@/lib/router'

type SearchHit =
  | { kind: 'entry'; entry: ArchiveEntry }
  | { kind: 'tag'; tag: string }
  | { kind: 'category'; category: string }

export function SearchPanel({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate: (route: Route) => void
}) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Focus the input when the panel opens. We intentionally do not call
  // setState here (React 19 discourages setState-in-effect for cascading
  // renders). State reset is handled by the parent passing a fresh `key`
  // each time the panel opens, which remounts this component cleanly.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const allEntries = useAllEntries()
  const searchResults = useSearchEntries(query)

  const hits: SearchHit[] = useMemo(() => {
    const q = query.trim()
    if (!q) {
      const tagHits: SearchHit[] = []
      const tagSet = new Set<string>()
      for (const e of allEntries) {
        for (const t of e.tags) {
          if (!tagSet.has(t)) { tagSet.add(t); tagHits.push({ kind: 'tag', tag: t }) }
        }
      }
      const entryHits: SearchHit[] = allEntries.slice(0, 5).map(e => ({ kind: 'entry', entry: e }))
      return [...tagHits.slice(0, 6), ...entryHits]
    }
    const entries = searchResults.slice(0, 12)
    const entryHits: SearchHit[] = entries.map(e => ({ kind: 'entry', entry: e }))

    const tagHits: SearchHit[] = []
    const catHits: SearchHit[] = []
    const lower = q.toLowerCase()
    const tagSet = new Set<string>()
    const catSet = new Set<string>()
    for (const e of allEntries) {
      for (const t of e.tags) {
        if (t.toLowerCase().includes(lower) && !tagSet.has(t)) {
          tagSet.add(t)
          tagHits.push({ kind: 'tag', tag: t })
        }
      }
      for (const c of e.categories) {
        if (c.toLowerCase().includes(lower) && !catSet.has(c)) {
          catSet.add(c)
          catHits.push({ kind: 'category', category: c })
        }
      }
    }
    return [...entryHits, ...tagHits.slice(0, 4), ...catHits.slice(0, 3)]
  }, [query, allEntries, searchResults])

  // When the query changes, the hit list shrinks; clamp the active index
  // during render so we never point past the end of the list. Derived
  // state — no setState-in-effect needed.
  const safeActiveIdx = hits.length === 0 ? 0 : Math.min(activeIdx, hits.length - 1)

  function activate(hit: SearchHit) {
    if (hit.kind === 'entry') onNavigate({ name: 'stage', slug: hit.entry.slug })
    else if (hit.kind === 'tag') onNavigate({ name: 'tag', tag: hit.tag })
    else onNavigate({ name: 'category', category: hit.category })
    onClose()
  }

  // ESC closes; ArrowUp/Down navigate; Enter activates.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, hits.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const hit = hits[safeActiveIdx]
        if (hit) activate(hit)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, hits, safeActiveIdx, onClose])

  // Scroll active hit into view
  useEffect(() => {
    if (!resultsRef.current) return
    const el = resultsRef.current.querySelector(`[data-idx="${safeActiveIdx}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [safeActiveIdx])

  if (!open) return null

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={e => e.stopPropagation()} role="dialog" aria-label="Search">
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search archive — stages, tags, categories, headings…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="search-results" ref={resultsRef}>
          {hits.length === 0 && (
            <div className="search-empty">No matches</div>
          )}
          {hits.map((hit, idx) => {
            const isActive = idx === safeActiveIdx
            if (hit.kind === 'entry') {
              const e = hit.entry
              return (
                <button
                  key={`e-${e.slug}`}
                  type="button"
                  className={`search-result ${isActive ? 'search-result--active' : ''}`}
                  data-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => activate(hit)}
                >
                  <div className="search-result-stage">{e.stage} · {e.dateLabel}</div>
                  <div className="search-result-title">{e.title} — {e.subtitle}</div>
                  <div className="search-result-snippet">{e.moduleName}</div>
                </button>
              )
            }
            if (hit.kind === 'tag') {
              return (
                <button
                  key={`t-${hit.tag}`}
                  type="button"
                  className={`search-result ${isActive ? 'search-result--active' : ''}`}
                  data-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => activate(hit)}
                >
                  <div className="search-result-stage">TAG</div>
                  <div className="search-result-title">{hit.tag}</div>
                </button>
              )
            }
            return (
              <button
                key={`c-${hit.category}`}
                type="button"
                className={`search-result ${isActive ? 'search-result--active' : ''}`}
                data-idx={idx}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => activate(hit)}
              >
                <div className="search-result-stage">CATEGORY</div>
                <div className="search-result-title">{hit.category}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
