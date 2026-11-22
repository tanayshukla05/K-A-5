'use client'

/**
 * Search command panel — Ctrl+K / Cmd+K.
 * Instant search across stages, headings.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ArchiveEntry } from '@/lib/types'
import { useAllEntries, useSearchEntries } from '@/components/content-provider'
import type { Route } from '@/lib/router'

type SearchHit = { kind: 'entry'; entry: ArchiveEntry }

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
    const entryHits: SearchHit[] = []
    if (!q) {
      for (const e of allEntries.slice(0, 5)) entryHits.push({ kind: 'entry', entry: e })
    } else {
      for (const e of searchResults.slice(0, 12)) entryHits.push({ kind: 'entry', entry: e })
    }
    return entryHits
  }, [query, allEntries, searchResults])

  // When the query changes, the hit list shrinks; clamp the active index
  // during render so we never point past the end of the list. Derived
  // state — no setState-in-effect needed.
  const safeActiveIdx = hits.length === 0 ? 0 : Math.min(activeIdx, hits.length - 1)

  function activate(hit: SearchHit) {
    if (hit.kind === 'entry') onNavigate({ name: 'stage', slug: hit.entry.slug })
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
          placeholder="Search archive — stages, headings…"
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
          })}
        </div>
      </div>
    </div>
  )
}
