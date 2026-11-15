'use client'

/**
 * SNES CABINET — cabinet 02 of the Games room.
 *
 * Plays Super Nintendo games with the self-hosted EmulatorJS runtime
 * (public/emulatorjs/data/ — no CDN, archive law). It runs whatever the
 * VISITOR brings: a ROM file chosen from their own device is read through
 * an object URL in memory and handed to the emulator. It is never
 * uploaded anywhere — there is no upload code in this file, and the
 * Content-Security-Policy forbids it.
 *
 * Commercial ROMs are not hosted by the archive; this cabinet only runs
 * files the user already owns. Homebrew and freely-distributable ROMs are
 * always welcome.
 *
 * Lifecycle: each ROM selection mounts a fresh <div key=...> so
 * EmulatorJS boots clean; the previous object URL is revoked on change
 * and unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const RUNTIME = '/emulatorjs/data/loader.js'

type SnesRom = {
  name: string
  size: number
  url: string
}

/** extensions the snes9x core + compression loaders understand */
const ROM_EXT = /\.(smc|sfc|swc|fig|bin|zip|7z)$/i
const prettyBytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export function SnesCabinet() {
  const [rom, setRom] = useState<SnesRom | null>(null)
  const [booted, setBooted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const holderRef = useRef<HTMLDivElement>(null)
  const romRef = useRef<SnesRom | null>(null)

  const pick = useCallback((file: File | null) => {
    if (!file) return
    if (!ROM_EXT.test(file.name)) {
      setError(`"${file.name}" is not a SNES ROM. Expected .smc, .sfc, .fig, .bin, .zip or .7z`)
      return
    }
    setError(null)
    setBooted(false)
    const prev = romRef.current
    if (prev) URL.revokeObjectURL(prev.url)
    const next: SnesRom = { name: file.name, size: file.size, url: URL.createObjectURL(file) }
    romRef.current = next
    setRom(next)
  }, [])

  /* clean up the object URL when the cabinet unmounts */
  useEffect(() => {
    return () => {
      const r = romRef.current
      if (r) URL.revokeObjectURL(r.url)
    }
  }, [])

  /* boot the loader exactly once per mounted container */
  useEffect(() => {
    if (!rom) return
    const holder = holderRef.current
    if (!holder) return
    holder.innerHTML = ''
    const mount = document.createElement('div')
    mount.className = 'snes-mount'
    holder.appendChild(mount)

    const w = window as unknown as Record<string, unknown>
    w.EJS_player = '.snes-mount'
    w.EJS_core = 'snes'
    w.EJS_gameUrl = rom.url
    w.EJS_gameName = rom.name.replace(ROM_EXT, '').replace(/[_-]+/g, ' ').trim()
    w.EJS_pathtodata = '/emulatorjs/data/'
    w.EJS_startOnLoaded = false
    w.EJS_disableAutoLang = true // archive is English-only; avoids a 404 for locale JSONs
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
  }, [rom])

  return (
    <div className="snes-cab">
      <input
        ref={inputRef}
        type="file"
        accept=".smc,.sfc,.swc,.fig,.bin,.zip,.7z"
        className="snes-file-input"
        onChange={e => {
          pick(e.target.files?.[0] ?? null)
          e.currentTarget.value = '' // allow re-picking the same file
        }}
      />
      <div className="snes-drop"
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
        onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null) }}
      >
        {!rom && (
          <div className="snes-empty">
            <div className="snes-slot" aria-hidden="true">
              <span className="snes-slot-label">CARTRIDGE SLOT</span>
              <span className="snes-slot-mark" aria-hidden="true">▚▚▚</span>
            </div>
            <p className="snes-empty-title">Insert your cartridge</p>
            <p className="snes-empty-copy">
              Choose a SNES ROM file from this device — .smc · .sfc · .fig · .bin · .zip · .7z.
              The game runs entirely in your browser. It is never uploaded: this cabinet
              has no server to send it to.
            </p>
            <button
              type="button"
              className="game-btn snes-load-btn"
              onClick={() => inputRef.current?.click()}
            >
              ⇧ LOAD CARTRIDGE
            </button>
            <p className="snes-empty-note">
              Bring what you own. The archive hosts no commercial ROMs — homebrew
              and freely-distributable images play exactly the same way.
            </p>
          </div>
        )}

        {rom && (
          <div className="snes-live">
            <div className="snes-cart" aria-hidden="true">
              <span className="snes-cart-tab" />
              <span className="snes-cart-title">{rom.name.replace(ROM_EXT, '').replace(/[_-]+/g, ' ')}</span>
              <span className="snes-cart-meta">SUPER NES · {prettyBytes(rom.size)}</span>
            </div>
            <div className="snes-stage">
              <div ref={holderRef} className="snes-holder" />
              {!booted && <div className="snes-boot">POWERING ON…</div>}
            </div>
            <div className="snes-live-ui">
              <span className="snes-live-note">ROM stays on this device — nothing is uploaded.</span>
              <button
                type="button"
                className="game-btn"
                onClick={() => {
                  const prev = romRef.current
                  romRef.current = null
                  setRom(null)
                  setBooted(false)
                  setError(null)
                  if (prev) URL.revokeObjectURL(prev.url)
                }}
              >
                ⏏ EJECT
              </button>
            </div>
          </div>
        )}

        {error && <p className="snes-error" role="alert">✕ {error}</p>}
      </div>
    </div>
  )
}
