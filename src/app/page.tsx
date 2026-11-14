import { LoadingScreen } from '@/components/loader'
import { ArchiveShell } from '@/components/archive-shell'
import { ContentProvider } from '@/components/content-provider'
import { getAllEntries, getAllTags, getAllCategories, getAllResearchEntries } from '@/lib/content'

/**
 * The single user-visible route. This is a SERVER component — it reads
 * Markdown from disk via content.ts (which uses `node:fs` and is marked
 * `'server-only'`), then passes the data down to the client-side
 * ContentProvider → LoadingScreen + ArchiveShell tree.
 *
 * The LoadingScreen is `position: fixed; z-index: 100` so it overlays the
 * ArchiveShell while visible. The ArchiveShell renders underneath during
 * the 5-second sequence — this pre-warms the homepage so it is instantly
 * ready when the loader fades.
 *
 * "Every reload" guarantee:
 *   The LoadingScreen mounts fresh on every full browser reload because
 *   React state is per-mount. Its initial `visible` state is `true`
 *   unconditionally — no read from any storage. Internal hash navigation
 *   does NOT remount it, so client-side nav skips the loader correctly.
 */

export default function Home() {
  const entries = getAllEntries()
  const tags = getAllTags()
  const categories = getAllCategories()
  const research = getAllResearchEntries()

  return (
    <ContentProvider entries={entries} tags={tags} categories={categories} research={research}>
      <LoadingScreen />
      <ArchiveShell />
    </ContentProvider>
  )
}
