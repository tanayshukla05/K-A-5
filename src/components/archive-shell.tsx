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
import { InstallAppButton } from '@/components/pwa'
import { LogoMotion } from '@/components/logo-motion'
import {
  HomePage, AboutPage, ArchivePage, StagePage, CtfPage,
  ResearchPage, ResearchEntryPage, CheatsheetsPage, FilesPage,
  GamesPage, ClippedPage, LinksPage, NotFoundPage,
} from '@/components/pages'
import { useAllEntries, useAllResearch } from '@/components/content-provider'
import { isCtfEntry } from '@/lib/entry-group'

type NavItem = {
  label: string
  route: Route
  count?: number
  gold?: boolean
  arcade?: boolean
}

// --- MENU CLICK SOUNDS -----------------------------------------------------
const HOME_SOUND = '/home-click.mp3'
const ABOUT_SOUND = '/sounds/about-click.mp3'
// ABOUT — SAD BONES "GRAVITY" (type beat, 160k). The track opens on a quiet
// melody intro; the first bass hit lands at ~0:16.3 (found by low-frequency
// energy analysis of the waveform), so playback starts there instead of the
// file head. If the track is ever replaced, re-measure or set this back to 0.
const ABOUT_SOUND_START = 16.2
// Which menu owns which sound — navigation uses this to stop a sound the
// moment its menu is no longer on this list. The About beat is allowed to
// keep playing on Home; it only stops when the visitor enters any other
// section.
const SOUND_ROUTE: Record<string, string[]> = {
  [ABOUT_SOUND]: ['about', 'home'],
  [HOME_SOUND]: ['home'],
}

// Warm the sounds as the app starts so the first menu click does not pay the
// network or seek cost. Playback still happens synchronously in the click
// handler so mobile browsers keep the user-activation chain intact.
const menuSounds = new Map<string, HTMLAudioElement>()

function getMenuSound(src: string, start = 0): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  let sound = menuSounds.get(src)
  if (!sound) {
    sound = new Audio(src)
    sound.preload = 'auto'
    if (start > 0) {
      sound.addEventListener('loadedmetadata', () => {
        if (Math.abs(sound!.currentTime - start) > 0.05) sound!.currentTime = start
      }, { once: true })
    }
    menuSounds.set(src, sound)
    sound.load()
  }
  return sound
}

function playMenuSound(src: string, start = 0) {
  const sound = getMenuSound(src, start)
  if (!sound) return
  if (Math.abs(sound.currentTime - start) > 0.05) sound.currentTime = start
  void sound.play().catch(() => {})
}

export function ArchiveShell() {
  const { route, navigate } = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchKey, setSearchKey] = useState(0)

  useEffect(() => {
    getMenuSound(HOME_SOUND)
    getMenuSound(ABOUT_SOUND, ABOUT_SOUND_START)
  }, [])

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

  // SHARP MODE FOR ABOUT — the About menu wants the background crisp.
  // The shell mirrors the active route name onto <body data-route>, and
  // globals.css keys on that to lift the blur only for "about" (both the
  // video and its GIF fallback). Every other page keeps the soft texture.
  // MENU SOUND CUTOFF — a menu sound stops as soon as the active route is
  // no longer one of its allowed routes; without this the About beat would
  // keep playing for another two minutes while the visitor reads other
  // pages. (Home keeps the beat playing — see SOUND_ROUTE.)
  useEffect(() => {
    document.body.dataset.route = route.name
    menuSounds.forEach((sound, src) => {
      const owner = SOUND_ROUTE[src]
      if (owner && !owner.includes(route.name)) sound.pause()
    })
  }, [route.name])

  const entries = useAllEntries()
  const researchCount = useAllResearch().length

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
    { label: 'Research Notes', route: { name: 'research' }, count: researchCount },
    { label: 'Cheat Sheets', route: { name: 'cheatsheets' } },
    { label: 'File Archive', route: { name: 'files' } },
    { label: 'Games', route: { name: 'games' }, arcade: true },
    { label: 'Clipped', route: { name: 'clipped' } },
    { label: 'Links', route: { name: 'links' }, gold: true },
  ]

  function isActive(item: Route): boolean {
    if (item.name !== route.name) return false
    // For stage, also compare the param.
    if (item.name === 'stage' && route.name === 'stage') {
      return item.slug === route.slug
    }
    return true
  }

  function renderPage() {
    switch (route.name) {
      case 'home': return <HomePage />
      case 'about': return <AboutPage navigate={navigate} />
      case 'archive': return <ArchivePage navigate={navigate} />
      case 'stage': return <StagePage slug={route.slug} navigate={navigate} />
      case 'ctf': return <CtfPage navigate={navigate} topic={route.topic} />
      case 'research': return <ResearchPage navigate={navigate} />
      case 'research-entry': return <ResearchEntryPage slug={route.slug} navigate={navigate} />
      case 'cheatsheets': return <CheatsheetsPage navigate={navigate} />
      case 'files': return <FilesPage navigate={navigate} />
      case 'games': return <GamesPage navigate={navigate} />
      case 'clipped': return <ClippedPage navigate={navigate} />
      case 'links': return <LinksPage navigate={navigate} />
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
            <LogoMotion className="archive-brand-mark-motion">
              <img src="/logo.png" alt="" className="archive-brand-mark" />
            </LogoMotion>
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
                  if (item.route.name === 'home') playMenuSound(HOME_SOUND)
                  if (item.route.name === 'about') playMenuSound(ABOUT_SOUND, ABOUT_SOUND_START)
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

          <InstallAppButton />
        </aside>

        <main className="archive-main">
          {renderPage()}
        </main>
      </div>

      <footer className="archive-footer">
        <div>$ 2003 $ · Pandit Tanay Shukla Ji Maharaj</div>
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
      className={`archive-sidebar-link ${active ? 'archive-sidebar-link--active' : ''} ${item.gold ? 'archive-sidebar-link--gold' : ''} ${item.arcade ? 'archive-sidebar-link--arcade' : ''}`}
      onClick={onClick}
    >
      <span>
        {item.label}
        {item.gold && (
          <span className="nav-sparkles" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
        )}
        {item.arcade && (
          <span className="nav-pixels" aria-hidden="true">
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
