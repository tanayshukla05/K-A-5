/**
 * Shared types for the archive — no runtime code, no imports.
 * Safe to import from both server-only and client components.
 */

export type ArchiveEntry = {
  slug: string
  stage: string
  stageNumber: number
  title: string
  subtitle: string
  moduleName: string
  level: string
  estimatedTime: string
  category: string
  platform: string
  binary: string
  prerequisites: string | null
  mitre: string | null
  vtScore: string
  vtScoreClean: boolean
  tags: string[]
  categories: string[]
  dateLabel: string
  rawMarkdown: string
  rawHtml: string
  excerpt: string
  sections: Array<{ heading: string; level: number }>
}

export type TagCount = { tag: string; count: number }
export type CategoryCount = { category: string; count: number }

/* ============================================================
   RESEARCH NOTES — long-form notes grouped into sub-menus
   (Exploit-Dev, Mal-Dev). Rendered through the same hardened
   markdown pipeline as the learning paths.
   ============================================================ */
export type ResearchSeries = 'exploit-dev' | 'mal-dev'

export type ResearchEntry = {
  slug: string
  series: ResearchSeries
  title: string
  sourceLabel: string
  sourceUrl: string
  dateLabel: string
  rawHtml: string
  excerpt: string
  sections: Array<{ heading: string; level: number }>
}
