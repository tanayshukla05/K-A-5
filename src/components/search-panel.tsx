'use client'

/** Global search across archive entries, research, games, links and pages. */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ArchiveEntry, ResearchEntry } from '@/lib/types'
import { useAllEntries, useAllResearch } from '@/components/content-provider'
import { LINKS, type ArchiveLink } from '@/lib/links'
import type { Route } from '@/lib/router'

type GameItem = { title: string; size: string }
type PageItem = { title: string; description: string; route: Route }
type SearchHit =
  | { kind: 'entry'; title: string; meta: string; snippet: string; entry: ArchiveEntry }
  | { kind: 'research'; title: string; meta: string; snippet: string; entry: ResearchEntry }
  | { kind: 'game'; title: string; meta: string; snippet: string; game: GameItem }
  | { kind: 'link'; title: string; meta: string; snippet: string; link: ArchiveLink }
  | { kind: 'page'; title: string; meta: string; snippet: string; route: Route }

const SITE_PAGES: PageItem[] = [
  { title: 'Home', description: 'Knowledge Archive home page and welcome', route: { name: 'home' } },
  { title: 'About', description: 'About the author, archive, and project', route: { name: 'about' } },
  { title: 'Learning Paths', description: 'Archive stages, walkthroughs, CTF, binary exploitation, malware analysis', route: { name: 'archive' } },
  { title: 'Research Notes', description: 'Long-form exploit development and malware development notes and courses', route: { name: 'research' } },
  { title: 'Cheat Sheets', description: 'Quick reference commands and technical notes explorer.exe wslpath extracted', route: { name: 'cheatsheets' } },
  { title: 'File Archive', description: 'Downloadable binaries, files, and artifacts', route: { name: 'files' } },
  { title: 'Games', description: 'MultiHero, Super Nintendo, SNES games and playable browser games', route: { name: 'games' } },
  { title: 'Clipped', description: 'Gameplay videos and clips clip1_0001.mp4 clip_0002.mp4 clip_0003.mp4 CA_clip_0001.mp4 CA_clip_0002.mp4', route: { name: 'clipped' } },
  { title: 'Links', description: 'Curated external websites, tools, and references', route: { name: 'links' } },
]

function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function rank(query: string, title: string, fields: string[]) {
  const q = query.trim().toLocaleLowerCase()
  const terms = q.split(/\s+/).filter(Boolean)
  if (!terms.length) return 0
  const searchable = `${title} ${fields.join(' ')}`.toLocaleLowerCase()
  if (!terms.every((term) => searchable.includes(term))) return 0
  return (title.toLocaleLowerCase().includes(q) ? 100 : 0)
    + terms.reduce((score, term) => score + (title.toLocaleLowerCase().includes(term) ? 12 : 0), 0)
}

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
  const [games, setGames] = useState<GameItem[]>([])
  const [gamesLoaded, setGamesLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const allEntries = useAllEntries()
  const allResearch = useAllResearch()

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => inputRef.current?.focus())
    let active = true
    fetch('/api/games')
      .then((response) => {
        if (!response.ok) throw new Error('Game index unavailable')
        return response.json() as Promise<GameItem[]>
      })
      .then((catalog) => { if (active) setGames(catalog) })
      .catch(() => { if (active) setGames([]) })
      .finally(() => { if (active) setGamesLoaded(true) })
    return () => { active = false }
  }, [open])

  const hits: SearchHit[] = useMemo(() => {
    const q = query.trim()
    if (!q) {
      return [
        ...allEntries.slice(0, 4).map((entry): SearchHit => ({
          kind: 'entry', title: entry.title, meta: `${entry.stage} · LEARNING PATH`,
          snippet: entry.subtitle, entry,
        })),
        ...allResearch.slice(0, 3).map((entry): SearchHit => ({
          kind: 'research', title: entry.title, meta: `${entry.series} · RESEARCH NOTE`,
          snippet: entry.excerpt, entry,
        })),
      ]
    }

    const ranked: Array<{ hit: SearchHit; score: number }> = []
    for (const entry of allEntries) {
      const score = rank(q, entry.title, [
        entry.subtitle, entry.moduleName, entry.category, entry.level, entry.binary,
        entry.mitre ?? '', entry.vtScore, entry.tags.join(' '), entry.categories.join(' '),
        entry.sections.map((section) => section.heading).join(' '),
        entry.rawMarkdown.replace(/```[\s\S]*?```/g, ''),
      ])
      if (score) ranked.push({
        score,
        hit: { kind: 'entry', title: entry.title, meta: `${entry.stage} · LEARNING PATH`, snippet: entry.subtitle, entry },
      })
    }
    for (const entry of allResearch) {
      const score = rank(q, entry.title, [
        entry.series, entry.sourceLabel, entry.sourceUrl, entry.dateLabel, entry.excerpt,
        entry.sections.map((section) => section.heading).join(' '), plainText(entry.rawHtml),
      ])
      if (score) ranked.push({
        score,
        hit: { kind: 'research', title: entry.title, meta: `${entry.series} · RESEARCH NOTE`, snippet: entry.excerpt, entry },
      })
    }
    for (const game of games) {
      const score = rank(q, game.title, [game.size, 'Super Nintendo SNES ROM game'])
      if (score) ranked.push({
        score,
        hit: { kind: 'game', title: game.title, meta: `SNES GAME · ${game.size}`, snippet: 'Jump to this cartridge in the SNES cabinet.', game },
      })
    }
    for (const link of LINKS) {
      const score = rank(q, link.label, [link.url, link.note ?? '', 'curated link external reference'])
      if (score) ranked.push({
        score,
        hit: { kind: 'link', title: link.label, meta: 'CURATED LINK', snippet: link.note ?? link.url, link },
      })
    }
    for (const page of SITE_PAGES) {
      const score = rank(q, page.title, [page.description])
      if (score) ranked.push({
        score,
        hit: { kind: 'page', title: page.title, meta: 'ARCHIVE SECTION', snippet: page.description, route: page.route },
      })
    }
    return ranked.sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title)).slice(0, 15).map(({ hit }) => hit)
  }, [query, allEntries, allResearch, games])

  const safeActiveIdx = hits.length === 0 ? 0 : Math.min(activeIdx, hits.length - 1)

  function activate(hit: SearchHit) {
    switch (hit.kind) {
      case 'entry': onNavigate({ name: 'stage', slug: hit.entry.slug }); break
      case 'research': onNavigate({ name: 'research-entry', slug: hit.entry.slug }); break
      case 'game': onNavigate({ name: 'games', game: hit.game.title }); break
      case 'link': window.open(hit.link.url, '_blank', 'noopener,noreferrer'); break
      case 'page': onNavigate(hit.route); break
    }
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIdx((index) => Math.min(index + 1, hits.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIdx((index) => Math.max(index - 1, 0))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const hit = hits[safeActiveIdx]
        if (hit) activate(hit)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, hits, safeActiveIdx, onClose])

  useEffect(() => {
    const element = resultsRef.current?.querySelector(`[data-idx="${safeActiveIdx}"]`)
    element?.scrollIntoView({ block: 'nearest' })
  }, [safeActiveIdx])

  if (!open) return null

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Search the whole website">
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search everything — articles, research, games, links…"
          aria-label="Search the whole website"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIdx(0) }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="search-results" ref={resultsRef}>
          {!hits.length && (
            <div className="search-empty">{open && !gamesLoaded && query.trim() ? 'Searching the SNES game library…' : 'No matches across the archive'}</div>
          )}
          {hits.map((hit, index) => (
            <button
              key={`${hit.kind}-${hit.title}-${index}`}
              type="button"
              className={`search-result ${index === safeActiveIdx ? 'search-result--active' : ''}`}
              data-idx={index}
              onMouseEnter={() => setActiveIdx(index)}
              onClick={() => activate(hit)}
            >
              <div className="search-result-stage">{hit.meta}</div>
              <div className="search-result-title">{hit.title}</div>
              <div className="search-result-snippet">{hit.snippet}</div>
            </button>
          ))}
        </div>
        <div className="search-hint">↑ ↓ SELECT · ENTER OPEN · ESC CLOSE</div>
      </div>
    </div>
  )
}
