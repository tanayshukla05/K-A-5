'use client'

/**
 * SNES CABINET — cabinet 02 of the Games room.
 *
 * A shelf of pre-installed cartridges. Every game here is homebrew released
 * free by its own author (per-game attribution: public/roms/CREDITS.md), so
 * the cabinet ships complete — visitors tap a title and it plays. No file
 * picker, no downloads, nothing to bring.
 *
 * The archive never hosts commercial ROMs; this shelf only carries
 * author-released homebrew. Games run on the self-hosted EmulatorJS runtime
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
  author: string
  year: string
  genre: string
  players: string
  blurb: string
}

/** author-released homebrew — verified sources in public/roms/CREDITS.md */
const SHELF: ShelfGame[] = [
  {
    id: 'super-boss-gaiden',
    title: 'Super Boss Gaiden',
    file: '/roms/super-boss-gaiden.sfc',
    size: '0.5 MB',
    author: 'ChronoMoogle & D4S',
    year: '2016',
    genre: 'action platformer',
    players: '1 player',
    blurb:
      'A CEO rampages through Sony HQ after the SNES-CD prototype leaks. Tight, hard, funny — three secret characters hidden inside.',
  },
  {
    id: 'uwol-quest-for-money',
    title: 'UWOL: Quest for Money',
    file: '/roms/uwol-quest-for-money.sfc',
    size: '0.25 MB',
    author: 'Mojon Twins · port: Alekmaul',
    year: '2015',
    genre: 'puzzle platformer',
    players: '1 player',
    blurb:
      'Steal 255 gold coins out of the Storm Palace maze — every floor needs all its coins before the arrow lets you descend.',
  },
  {
    id: 'jet-pilot-rising',
    title: 'Jet Pilot Rising',
    file: '/roms/jet-pilot-rising.sfc',
    size: '0.5 MB',
    author: 'd4s · music: stargazer',
    year: '2013',
    genre: 'one-button flyer',
    players: '1 player',
    blurb:
      'A cat riding a rocket, coded in 24 hours for the SNES\u2019s 23rd birthday. Thrust is the only button — the sky does the rest.',
  },
  {
    id: 'n-warp-daisakusen',
    title: 'N-Warp Daisakusen',
    file: '/roms/n-warp-daisakusen.sfc',
    size: '2 MB',
    author: 'd4s · music: maf',
    year: '2008',
    genre: 'arena brawler',
    players: '2–8 players (one keyboard)',
    blurb:
      'Eight fighters, one arena, zero mercy. Player 1 vs player 2 on the same keyboard — remap controls in the emulator menu.',
  },
]

export function SnesCabinet() {
  const [game, setGame] = useState<ShelfGame | null>(null)
  const [booted, setBooted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const holderRef = useRef<HTMLDivElement>(null)

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
    w.EJS_startOnLoaded = false
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
          <p className="snes-shelf-head">GAMES SHIPPED WITH THIS CABINET — TAP ONE, IT PLAYS</p>
          <ul className="snes-shelf-list">
            {SHELF.map((g, i) => (
              <li key={g.id}>
                <button
                  type="button"
                  className="snes-shelf-item"
                  onClick={() => { setError(null); setBooted(false); setGame(g) }}
                >
                  <span className="snes-shelf-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="snes-shelf-body">
                    <span className="snes-shelf-title">{g.title}</span>
                    <span className="snes-shelf-meta">
                      {g.author} · {g.year} · {g.genre} · {g.players} · {g.size}
                    </span>
                    <span className="snes-shelf-blurb">{g.blurb}</span>
                  </span>
                  <span className="snes-shelf-play" aria-hidden="true">PLAY ▸</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="snes-shelf-note">
            Every cartridge here is homebrew — released free by its own author.
            Full credits: /roms/CREDITS.md
          </p>
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
            <span className="snes-live-note">{game.author} · {game.year} · {game.players}</span>
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
