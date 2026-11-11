import { getAllEntries } from '@/lib/content'

export const dynamic = 'force-static'

/** Same canonical origin as sitemap.ts — see the note there. */
const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://archive.shukla.example'
).replace(/\/+$/, '')

export async function GET() {
  const entries = getAllEntries()
  const items = entries.map(e => `    <item>
      <title>${escapeXml(e.title)} — ${escapeXml(e.subtitle)}</title>
      <link>${BASE}/#/stage/${encodeURIComponent(e.slug)}</link>
      <guid>${BASE}/#/stage/${encodeURIComponent(e.slug)}</guid>
      <description>${escapeXml(e.excerpt)}</description>
      <category>${escapeXml(e.category)}</category>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>`).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Pandit Tanay Shukla Ji Maharaj — Knowledge Archive</title>
    <link>${BASE}</link>
    <description>A personal knowledge archive publishing blogs, CTF walkthroughs, research notes, cheat sheets, and downloadable files.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
