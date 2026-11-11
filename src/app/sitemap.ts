import type { MetadataRoute } from 'next'
import { getAllEntries } from '@/lib/content'

export const dynamic = 'force-static'

/**
 * Canonical site origin. Set NEXT_PUBLIC_SITE_URL in your hosting
 * environment (e.g. https://knowledge-archive.vercel.app or a custom
 * domain) once deployed; the placeholder below is only a local fallback
 * so the build never fails.
 */
const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://archive.shukla.example'
).replace(/\/+$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const entries = getAllEntries()
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/#/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/#/archive`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/#/ctf`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/#/links`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/#/tags`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/#/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]
  const entryUrls: MetadataRoute.Sitemap = entries.map(e => ({
    url: `${BASE}/#/stage/${encodeURIComponent(e.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))
  return [...staticUrls, ...entryUrls]
}
