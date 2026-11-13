'use client'

/**
 * ArchiveShell — the persistent app shell: header, sidebar nav, content
 * area, footer. Houses the Search panel and the hash router.
 *
 * The Shell is rendered INSIDE the Loader component, so when the loader is
 * visible the Shell is in the DOM but hidden (visibility:hidden). This
 * means:
 *  - The Shell mounts on every full browser reload (good — fires the loader).
 *  - The Shell does NOT remount on client-side hash navigation (good — the
 *    loader correctly skips internal navigation).
 */

import { useEffect, useState } from 'react'
import { useRouter, type Route } from '@/lib/router'
import { SearchPanel } from '@/components/search-panel'
import {
  HomePage, AboutPage, ArchivePage, StagePage, CtfPage,
  ResearchPage, CheatsheetsPage, FilesPage, LinksPage, TagsPage, TagPage,
  CategoriesPage, CategoryPage, NotFoundPage,
} from '@/components/pages'
import { useAllEntries, useAllTags, useAllCategories } from '@/components/content-provider'
import { isCtfEntry } from '@/lib/entry-group'

type NavItem = {
  label: string
  route: Route
  count?: number
  gold?: boolean
}

// --- HOME menu click sound -------------------------------------------------
// Lazy singleton: created on the first click (a real user gesture, so iOS
// Safari and Android Chrome both allow playback) and restarted from the top
// on every further click. Playback rejection (e.g. missing user activation)
// is swallowed — the click must never break navigation.
let homeSound: HTMLAudioElement | null = null

function playHomeSound() {
  if (typeof window === 'undefined') return
  if (!homeSound) {
    homeSound = new Audio('/home-click.mp3')
    homeSound.preload = 'auto'
  }
  homeSound.currentTime = 0
  void homeSound.play().catch(() => {})
}

export function ArchiveShell() {
  const { route, navigate } = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchKey, setSearchKey] = useState(0)

  function openSearch() {
    // Bump the key so the SearchPanel remounts with fresh state every
    // time it opens. This avoids setState-in-effect while still resetting
    // query/activeIdx on each open.
    setSearchKey(k => k + 1)
    setSearchOpen(true)
  }

  // Global Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(o => {
          if (!o) setSearchKey(k => k + 1)
          return !o
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const entries = useAllEntries()
  const tagCount = useAllTags().length
  const catCount = useAllCategories().length

  const navPrimary: NavItem[] = [
    { label: 'Home', route: { name: 'home' } },
    { label: 'About', route: { name: 'about' } },
  ]

  const navArchive: NavItem[] = [
    // Archive lists the learning-path stages only; the CTF walkthrough
    // series lives in its own section. Research Notes / Cheat Sheets /
    // File Archive are kept as menu sections but are intentionally empty
    // (no content published for them yet), so they carry no count badge.
    { label: 'Archive', route: { name: 'archive' }, count: entries.filter(e => !isCtfEntry(e)).length },
    { label: 'CTF Walkthroughs', route: { name: 'ctf' } },
    { label: 'Research Notes', route: { name: 'research' } },
    { label: 'Cheat Sheets', route: { name: 'cheatsheets' } },
    { label: 'File Archive', route: { name: 'files' } },
    { label: 'Links', route: { name: 'links' }, gold: true },
  ]

  const navIndex: NavItem[] = [
    { label: 'Tags', route: { name: 'tags' }, count: tagCount },
    { label: 'Categories', route: { name: 'categories' }, count: catCount },
  ]

  function isActive(item: Route): boolean {
    if (item.name !== route.name) return false
    // For stage/tag/category, also compare the param.
    if (item.name === 'stage' && route.name === 'stage') {
      return item.slug === route.slug
    }
    if (item.name === 'tag' && route.name === 'tag') {
      return item.tag === route.tag
    }
    if (item.name === 'category' && route.name === 'category') {
      return item.category === route.category
    }
    return true
  }

  function renderPage() {
    switch (route.name) {
      case 'home': return <HomePage />
      case 'about': return <AboutPage navigate={navigate} />
      case 'archive': return <ArchivePage navigate={navigate} />
      case 'stage': return <StagePage slug={route.slug} navigate={navigate} />
      case 'ctf': return <CtfPage navigate={navigate} />
      case 'research': return <ResearchPage navigate={navigate} />
      case 'cheatsheets': return <CheatsheetsPage navigate={navigate} />
      case 'files': return <FilesPage navigate={navigate} />
      case 'links': return <LinksPage navigate={navigate} />
      case 'tags': return <TagsPage navigate={navigate} />
      case 'tag': return <TagPage tag={route.tag} navigate={navigate} />
      case 'categories': return <CategoriesPage navigate={navigate} />
      case 'category': return <CategoryPage category={route.category} navigate={navigate} />
      case 'notfound': return <NotFoundPage navigate={navigate} />
      default: return <NotFoundPage navigate={navigate} />
    }
  }

  return (
    <div className="archive-shell">
      <header className="archive-header">
        <div className="archive-header-inner">
          <button
            type="button"
            className="archive-brand"
            onClick={() => navigate({ name: 'home' })}
            aria-label="Archive home"
          >
            <img src="/logo.png" alt="" className="archive-brand-mark" />
            <span className="archive-brand-text">
              Pandit Tanay Shukla Ji Maharaj
              <small>Knowledge Archive</small>
            </span>
          </button>

          <button
            type="button"
            className="search-trigger"
            onClick={openSearch}
            aria-label="Open search"
          >
            <span>Search</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>
      </header>

      <div className="archive-body">
        <aside className="archive-sidebar" aria-label="Primary navigation">
          <NavSection title="Primary">
            {navPrimary.map(item => (
              <NavLink
                key={item.label}
                item={item}
                active={isActive(item.route)}
                onClick={() => {
                  // Sound fires synchronously inside the click handler
                  // (before any navigation work) so mobile browsers keep
                  // the user-activation chain intact.
                  if (item.route.name === 'home') playHomeSound()
                  navigate(item.route)
                }}
              />
            ))}
          </NavSection>

          <NavSection title="Archive">
            {navArchive.map(item => (
              <NavLink
                key={item.label}
                item={item}
                active={isActive(item.route)}
                onClick={() => navigate(item.route)}
              />
            ))}
          </NavSection>

          <NavSection title="Index">
            {navIndex.map(item => (
              <NavLink
                key={item.label}
                item={item}
                active={isActive(item.route)}
                onClick={() => navigate(item.route)}
              />
            ))}
          </NavSection>
        </aside>

        <main className="archive-main">
          {renderPage()}
        </main>
      </div>

      <footer className="archive-footer">
        <div>© 2003 · Pandit Tanay Shukla Ji Maharaj</div>
        <div>Knowledge Archive</div>
      </footer>

      <SearchPanel
        key={searchKey}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigate}
      />
    </div>
  )
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="archive-sidebar-section">
      <div className="archive-sidebar-heading">{title}</div>
      {children}
    </div>
  )
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`archive-sidebar-link ${active ? 'archive-sidebar-link--active' : ''} ${item.gold ? 'archive-sidebar-link--gold' : ''}`}
      onClick={onClick}
    >
      <span>
        {item.label}
        {item.gold && (
          <span className="nav-sparkles" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
        )}
      </span>
      {typeof item.count === 'number' && (
        <span className="archive-sidebar-count">{String(item.count).padStart(2, '0')}</span>
      )}
    </button>
  )
}
