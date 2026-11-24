'use client'

/**
 * SNES CABINET — cabinet 03 of the Games room.
 *
 * A shelf of pre-installed cartridges: author-released homebrew plus the
 * owner's own cartridges (per-game attribution: public/roms/CREDITS.md).
 * The cabinet ships complete — visitors tap a title and it plays. No file
 * picker, no downloads, nothing to bring.
 *
 * The homebrew shelf carts are author-released freeware; PowerFest 94,
 * Yoshi's Island and Aladdin are the owner's own cartridges, added by the
 * site owner. Games run on the self-hosted EmulatorJS runtime
 * (public/emulatorjs/data/ — no CDN, archive law) and are fetched from
 * same-origin paths (/roms/…), so the Content-Security-Policy stays narrow.
 *
 * Lifecycle: each selection mounts a fresh .snes-mount so EmulatorJS boots
 * clean; the loader script is removed on eject and unmount.
 */

import { useEffect, useRef, useState } from 'react'

const RUNTIME = '/emulatorjs/data/loader.js'

type ShelfGame = {
  id: string
  title: string
  /** same-origin path; EmulatorJS fetches this itself */
  file: string
  size: string
}

export function SnesCabinet() {
  const [shelf, setShelf] = useState<ShelfGame[]>([])
  const [query, setQuery] = useState('')
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [game, setGame] = useState<ShelfGame | null>(null)
  const [booted, setBooted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const holderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    fetch('/api/games')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the game catalog.')
        return response.json() as Promise<ShelfGame[]>
      })
      .then((games) => { if (active) setShelf(games) })
      .catch(() => { if (active) setCatalogError('Game catalog failed to load.') })
    return () => { active = false }
  }, [])

  /* boot the loader exactly once per mounted container */
  useEffect(() => {
    if (!game) return
    const holder = holderRef.current
    if (!holder) return
    holder.innerHTML = ''
    const mount = document.createElement('div')
    mount.className = 'snes-mount'
    holder.appendChild(mount)

    const w = window as unknown as Record<string, unknown>
    w.EJS_player = '.snes-mount'
    w.EJS_core = 'snes'
    w.EJS_gameUrl = game.file
    w.EJS_gameName = game.title
    w.EJS_pathtodata = '/emulatorjs/data/'
    w.EJS_startOnLoaded = true // one click: the shelf tap itself starts the game
    // NOTE: upstream reads this as `disableAutoLang !== false` (inverted), so
    // `false` is what actually skips the system-locale JSON fetch (and its 404).
    w.EJS_disableAutoLang = false
    w.EJS_Buttons = { netplay: false } // no third-party netplay server
    w.EJS_ready = () => setBooted(true)

    const s = document.createElement('script')
    s.src = RUNTIME
    s.async = true
    s.onerror = () => setError('Emulator runtime failed to load from /emulatorjs/data/')
    document.body.appendChild(s)
    return () => {
      s.remove()
      const ew = window as unknown as Record<string, unknown>
      try { (ew.EJS_emulator as { callEvent?: (n: string) => void } | undefined)?.callEvent?.('exit') } catch { /* ignore */ }
      try { delete ew.EJS_emulator } catch { ew.EJS_emulator = undefined }
      holder.innerHTML = ''
      setBooted(false)
    }
  }, [game])

  return (
    <div className="snes-cab">
      {!game && (
        <div className="snes-shelf">
          <p className="snes-shelf-head">SNES GAME LIBRARY — {shelf.length} CARTRIDGES</p>
          <label className="snes-search-label">
            <span className="sr-only">Search games</span>
            <input
              className="snes-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the game library…"
            />
          </label>
          {catalogError && <p className="snes-error" role="alert">✕ {catalogError}</p>}
          {!shelf.length && !catalogError && <p className="snes-shelf-note">Loading game library…</p>}
          <ul className="snes-shelf-list">
            {shelf.filter((g) => g.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map((g, i) => (
              <li key={g.id}>
                <button
                  type="button"
                  className="snes-shelf-item"
                  onClick={() => { setError(null); setBooted(false); setGame(g) }}
                >
                  <span className="snes-shelf-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="snes-shelf-body">
                    <span className="snes-shelf-title">{g.title}</span>
                    <span className="snes-shelf-meta">SUPER NINTENDO · {g.size}</span>
                  </span>
                  <span className="snes-shelf-play" aria-hidden="true">PLAY ▸</span>
                </button>
              </li>
            ))}
          </ul>
          {shelf.length > 0 && shelf.filter((g) => g.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).length === 0 &&
            <p className="snes-shelf-note">No games match “{query}”.</p>}
          <p className="snes-shelf-note">Select a cartridge to play. ROM files are served from this site&apos;s local library.</p>
        </div>
      )}

      {game && (
        <div className="snes-live">
          <div className="snes-cart" aria-hidden="true">
            <span className="snes-cart-tab" />
            <span className="snes-cart-title">{game.title}</span>
            <span className="snes-cart-meta">SUPER NES · {game.size}</span>
          </div>
          <div className="snes-stage">
            <div ref={holderRef} className="snes-holder" />
            {!booted && <div className="snes-boot">POWERING ON…</div>}
          </div>
          <div className="snes-live-ui">
            <span className="snes-live-note">SUPER NINTENDO · {game.size}</span>
            <button
              type="button"
              className="game-btn"
              onClick={() => { setGame(null); setBooted(false); setError(null) }}
            >
              ⏏ EJECT
            </button>
          </div>
        </div>
      )}

      {error && <p className="snes-error" role="alert">✕ {error}</p>}
    </div>
  )
}
