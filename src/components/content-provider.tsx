'use client'

/**
 * ContentProvider — bridges server-loaded archive data into the client tree
 * via React Context.
 *
 * Why: content.ts uses `node:fs` to read Markdown files at build/request
 * time, which is server-only. The entire app shell, however, is client-side
 * (hash router, search panel, page transitions). This provider accepts the
 * pre-loaded data as props from the server `page.tsx` and exposes it via
 * Context to every page component without prop-drilling.
 */

import { createContext, useContext, useMemo } from 'react'
import type { ArchiveEntry, TagCount, CategoryCount, ResearchEntry } from '@/lib/types'

type ContentData = {
  entries: ArchiveEntry[]
  tags: TagCount[]
  categories: CategoryCount[]
  research: ResearchEntry[]
}

const ContentContext = createContext<ContentData | null>(null)

export function ContentProvider({
  entries,
  tags,
  categories,
  research,
  children,
}: ContentData & { children: React.ReactNode }) {
  const value = useMemo(() => ({ entries, tags, categories, research }), [entries, tags, categories, research])
  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  )
}

export function useContent(): ContentData {
  const ctx = useContext(ContentContext)
  if (!ctx) {
    throw new Error('useContent must be used within a ContentProvider')
  }
  return ctx
}

/* Convenience helpers that operate on the in-memory data — these replace
   the server-side functions from content.ts for use inside client
   components. */

export function useAllEntries(): ArchiveEntry[] {
  return useContent().entries
}

export function useEntryBySlug(slug: string): ArchiveEntry | null {
  const { entries } = useContent()
  return useMemo(() => entries.find(e => e.slug === slug) ?? null, [entries, slug])
}

export function useAllTags(): TagCount[] {
  return useContent().tags
}

export function useAllCategories(): CategoryCount[] {
  return useContent().categories
}

export function useAllResearch(): ResearchEntry[] {
  return useContent().research
}

export function useResearchBySlug(slug: string): ResearchEntry | null {
  const { research } = useContent()
  return useMemo(() => research.find(e => e.slug === slug) ?? null, [research, slug])
}

export function useSearchEntries(query: string): ArchiveEntry[] {
  const { entries } = useContent()
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const results: Array<{ entry: ArchiveEntry; score: number }> = []
    for (const e of entries) {
      let score = 0
      const haystack = [
        e.title, e.subtitle, e.moduleName, e.category, e.level, e.binary,
        e.mitre ?? '', e.vtScore, e.tags.join(' '), e.categories.join(' '),
        e.sections.map(s => s.heading).join(' '),
        e.rawMarkdown.replace(/```[\s\S]*?```/g, ''),
      ].join('\n').toLowerCase()
      if (e.title.toLowerCase().includes(q)) score += 50
      if (e.moduleName.toLowerCase().includes(q)) score += 25
      if (e.binary.toLowerCase().includes(q)) score += 20
      if (e.tags.some(t => t.toLowerCase().includes(q))) score += 15
      if (haystack.includes(q)) score += 5
      if (score > 0) results.push({ entry: e, score })
    }
    return results.sort((a, b) => b.score - a.score).map(r => r.entry)
  }, [entries, query])
}
