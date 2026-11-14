/**
 * Content loader for the archive.
 *
 * Per the Ultimate Portfolio Prompt:
 *   - Populate the website ONLY with the files, Markdown documents, images,
 *     and assets that I provide.
 *   - Do NOT generate placeholder content, lorem ipsum, dummy text, fake
 *     blog posts, fake walkthroughs, fake projects, fake files, fake
 *     statistics, fake comments, fake dates, fake download counts, or
 *     sample data.
 *   - Every tag, category, archive page, search result, RSS entry, sitemap
 *     entry, and navigation link must be generated only from real content.
 *   - If no content exists for a page, display a clean "No content available
 *     yet" state rather than creating placeholder entries.
 *
 * This module reads the real markdown files in /content/learning-paths/ at
 * build time — the 8-stage shellcode-loader learning path (Stage 01–08) and
 * the 17 pwn.college CTF walkthroughs (Stage 01–17) — and exposes them as
 * structured records. Adding a new .md file automatically extends the
 * archive — no manual edits required.
 */

import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import { isCtfEntry } from '@/lib/entry-group'

// Re-export the shared types so legacy imports (`import { ArchiveEntry } from
// '@/lib/content'`) keep working, while ensuring this module's *runtime*
// code (the fs reads) only ever runs on the server.
export type { ArchiveEntry, TagCount, CategoryCount } from '@/lib/types'
import type { ArchiveEntry } from '@/lib/types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'learning-paths')

// Lightweight GFM -> HTML renderer. We intentionally avoid pulling in a
// heavy dependency for the build-time parse. This covers the constructs
// used in the LEARNING_PATH files: headings, paragraphs, lists, tables,
// fenced code blocks, blockquotes, horizontal rules, inline code, bold,
// italic, links.
function renderMarkdown(md: string): { html: string; sections: Array<{ heading: string; level: number }>; excerpt: string } {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  const sections: Array<{ heading: string; level: number }> = []
  let excerpt = ''
  let i = 0
  let inCode = false
  let codeLang = ''
  let codeBuf: string[] = []

  // Escapes everything that could break out of an HTML text node or an
  // attribute value: & < > " '. Quotes matter because this renderer
  // emits double-quoted attributes (href, data-lang) — an unescaped "
  // in markdown would let a payload inject attributes (see the
  // security-review PoC: onmouseover executed from a link URL).
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const inline = (s: string) => {
    let t = esc(s)
    // inline code first
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
    // bold
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // italic
    t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    t = t.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>')
    // links — scheme allowlist. Only http(s), mailto and same-site
    // relative targets may become <a href>; anything else (javascript:,
    // data:, vbscript:, …) stays plain text and can never execute.
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) => {
      const u = url.trim()
      if (/^(https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i.test(u)) {
        return `<a href="${u}" rel="noopener noreferrer">${text}</a>`
      }
      return `${text} (${u})`
    })
    return t
  }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true
        codeLang = line.slice(3).trim()
        codeBuf = []
      } else {
        inCode = false
        const code = esc(codeBuf.join('\n'))
        out.push(`<pre data-lang="${esc(codeLang)}"><code data-lang="${esc(codeLang)}">${code}</code></pre>`)
      }
      i++
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      i++
      continue
    }

    // ATX headings
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (hMatch) {
      const level = hMatch[1].length
      const text = hMatch[2].trim()
      sections.push({ heading: text, level })
      out.push(`<h${level}>${inline(text)}</h${level}>`)
      i++
      continue
    }

    // Horizontal rule
    if (/^(\-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr />')
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`)
      continue
    }

    // Table — header row followed by separator
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s\-:|]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const header = line.split('|').map(s => s.trim()).filter(Boolean)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        const cells = lines[i].split('|').map(s => s.trim()).filter((_, idx, arr) => {
          // keep empty cells in the middle, drop leading/trailing empties from split
          if (idx === 0 || idx === arr.length - 1) return false
          return true
        })
        rows.push(cells)
        i++
      }
      const thead = '<thead><tr>' + header.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead>'
      const tbody = '<tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>'
      out.push(`<table>${thead}${tbody}</table>`)
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      out.push('<ul>' + items.map(it => `<li>${inline(it)}</li>`).join('') + '</ul>')
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      out.push('<ol>' + items.map(it => `<li>${inline(it)}</li>`).join('') + '</ol>')
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph (collect consecutive non-blank, non-special lines)
    const buf: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('>') &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !(/^(\-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]))
    ) {
      buf.push(lines[i])
      i++
    }
    const para = inline(buf.join(' '))
    out.push(`<p>${para}</p>`)
    if (!excerpt && para.length > 40 && !para.startsWith('Field') && !para.startsWith('Module Name')) {
      excerpt = para
        .replace(/<[^>]+>/g, '')
        // para is HTML-escaped; excerpts are plain text (search, RSS), so
        // decode the entities back to characters.
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    }
  }

  return { html: out.join('\n'), sections, excerpt: excerpt.slice(0, 240) }
}

// Parse the metadata table at the top of each file.
function parseMetadata(md: string) {
  const get = (key: string): string | null => {
    const re = new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.*?)\\s*\\|`, 'i')
    const m = md.match(re)
    return m ? m[1].trim() : null
  }

  const moduleName = get('Module Name') ?? ''
  const level = get('Level') ?? ''
  const estimatedTime = get('Estimated Time') ?? ''
  const category = (get('Category') ?? '').split('/').map(s => s.trim()).filter(Boolean).join(' / ')
  const platform = get('Platform') ?? ''
  const binary = (get('Binary') ?? '').replace(/`/g, '')
  const prerequisites = get('Prerequisites') ?? get('Prerequisite') ?? null
  const mitre = get('MITRE ATT&CK') ?? null
  const vtScore = (get('VT Score') ?? '').replace(/\*\*/g, '')

  // Derive a "dateLabel" from any date-looking string in the first 60 lines
  // (VT journey tables always carry the month/year the binary was achieved).
  const head = md.split('\n').slice(0, 60).join('\n')
  const dateMatch = head.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+202\d/i)
  const dateLabel = dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : '2026'

  // Tags: split category plus level plus a "stage" tag.
  const tags = new Set<string>()
  ;(get('Category') ?? '').split('/').map(s => s.trim()).filter(Boolean).forEach(t => tags.add(t))
  if (level) tags.add(level.split('→')[0].trim())
  if (mitre) mitre.split(',').map(s => s.trim()).forEach(t => tags.add(t))
  if (platform) tags.add(platform)

  // Categories: top-level "kind" — all of these are "Learning Paths" but
  // we also expose the first segment of the Category field as a sub-category.
  const categories: string[] = ['Learning Path']
  const firstCat = (get('Category') ?? '').split('/')[0].trim()
  if (firstCat) categories.push(firstCat)

  return {
    moduleName, level, estimatedTime, category, platform, binary,
    prerequisites, mitre, vtScore, dateLabel,
    tags: Array.from(tags), categories,
    vtScoreClean: /0\/76/.test(vtScore),
  }
}

let _cache: ArchiveEntry[] | null = null

export function getAllEntries(): ArchiveEntry[] {
  if (_cache) return _cache
  if (!fs.existsSync(CONTENT_DIR)) {
    _cache = []
    return _cache
  }

  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()

  const entries: ArchiveEntry[] = files.map(file => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8')
    const slug = file.replace(/\.md$/, '')
    const meta = parseMetadata(raw)

    // Title — first H1 line
    const h1 = raw.match(/^#\s+(.+)$/m)
    const fullTitle = h1 ? h1[1].trim() : slug
    // Split into "Stage NN: Title — Subtitle" pieces.
    const stageMatch = fullTitle.match(/^(Stage\s+(\d+)):\s*(.+?)(?:\s+—\s+(.+))?$/i)
    let stage = 'STAGE'
    let stageNumber = 0
    let title = fullTitle
    let subtitle = ''
    if (stageMatch) {
      stage = `STAGE ${stageMatch[2].padStart(2, '0')}`
      stageNumber = parseInt(stageMatch[2], 10)
      title = stageMatch[3].trim()
      subtitle = stageMatch[4] ? stageMatch[4].trim() : 'Learning Path'
    }

    const { html, sections, excerpt } = renderMarkdown(raw)

    return {
      slug,
      stage,
      stageNumber,
      title,
      subtitle,
      moduleName: meta.moduleName,
      level: meta.level,
      estimatedTime: meta.estimatedTime,
      category: meta.category,
      platform: meta.platform,
      binary: meta.binary,
      prerequisites: meta.prerequisites,
      mitre: meta.mitre,
      vtScore: meta.vtScore,
      vtScoreClean: meta.vtScoreClean,
      tags: meta.tags,
      categories: meta.categories,
      dateLabel: meta.dateLabel,
      rawMarkdown: raw,
      rawHtml: html,
      excerpt,
      sections,
    }
  })

  // Order: learning-path stages first (Stage 01–08), then the CTF
  // walkthroughs (Stage 01–17). Both series number independently, so sort
  // by group before stage number to keep each series ascending internally.
  _cache = entries.sort((a, b) =>
    (isCtfEntry(a) ? 1 : 0) - (isCtfEntry(b) ? 1 : 0) ||
    a.stageNumber - b.stageNumber
  )
  return _cache
}

export function getEntryBySlug(slug: string): ArchiveEntry | null {
  return getAllEntries().find(e => e.slug === slug) ?? null
}

export function getAllTags(): Array<{ tag: string; count: number }> {
  const map = new Map<string, number>()
  for (const e of getAllEntries()) {
    for (const t of e.tags) {
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function getAllCategories(): Array<{ category: string; count: number }> {
  const map = new Map<string, number>()
  for (const e of getAllEntries()) {
    for (const c of e.categories) {
      map.set(c, (map.get(c) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
}

export function searchEntries(query: string): ArchiveEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: Array<{ entry: ArchiveEntry; score: number }> = []
  for (const e of getAllEntries()) {
    let score = 0
    const haystack = [
      e.title, e.subtitle, e.moduleName, e.category, e.level, e.binary,
      e.mitre ?? '', e.vtScore, e.tags.join(' '), e.categories.join(' '),
      e.sections.map(s => s.heading).join(' '),
      // Strip code blocks before scanning the body to avoid noise.
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
}

/* ============================================================
   RESEARCH NOTES — a second content directory with the same
   markdown pipeline. Files carry a small metadata table:

     | **Series** | Exploit-Dev |
     | **Source** | The Perkins Cybersecurity Educational Fund |
     | **Source URL** | https://… |
     | **Date** | 2026 |

   The Series row selects the sub-menu on the Research Notes page
   ('Exploit-Dev' | 'Mal-Dev'). Adding a new .md file extends the
   menu automatically — no manual edits required.
   ============================================================ */
const RESEARCH_DIR = path.join(process.cwd(), 'content', 'research-notes')

export type { ResearchEntry, ResearchSeries } from '@/lib/types'
import type { ResearchEntry, ResearchSeries } from '@/lib/types'

function normalizeSeries(raw: string): ResearchSeries {
  return /mal.?dev/i.test(raw) ? 'mal-dev' : 'exploit-dev'
}

function parseResearchMetadata(md: string) {
  const get = (key: string): string => {
    const re = new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.*?)\\s*\\|`, 'i')
    const m = md.match(re)
    return m ? m[1].trim() : ''
  }
  return {
    series: normalizeSeries(get('Series')),
    sourceLabel: get('Source'),
    sourceUrl: get('Source URL'),
    dateLabel: get('Date') || '2026',
  }
}

let _researchCache: ResearchEntry[] | null = null

export function getAllResearchEntries(): ResearchEntry[] {
  if (_researchCache) return _researchCache
  if (!fs.existsSync(RESEARCH_DIR)) {
    _researchCache = []
    return _researchCache
  }

  const files = fs.readdirSync(RESEARCH_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()

  _researchCache = files.map(file => {
    const raw = fs.readFileSync(path.join(RESEARCH_DIR, file), 'utf8')
    const slug = file.replace(/\.md$/, '')
    const meta = parseResearchMetadata(raw)
    const h1 = raw.match(/^#\s+(.+)$/m)
    const title = h1 ? h1[1].trim() : slug
    // Render from the line after the H1 — the title lives in the custom
    // header plate, and the key/value metadata table is parsed, not shown.
    const lines = raw.split('\n')
    const h1Line = lines.findIndex(l => /^#\s+/.test(l))
    const body = h1Line >= 0 ? lines.slice(h1Line + 1).join('\n') : raw
    const { html, sections, excerpt } = renderMarkdown(body)
    return {
      slug,
      series: meta.series,
      title,
      sourceLabel: meta.sourceLabel,
      sourceUrl: meta.sourceUrl,
      dateLabel: meta.dateLabel,
      rawHtml: html,
      excerpt,
      sections,
    }
  })
  return _researchCache
}
