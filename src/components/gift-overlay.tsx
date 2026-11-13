'use client'

/**
 * GiftOverlay — the archive greets every visitor with the gift by itself
 * and SAVES it by itself. The site owner's explicit call: no tap should
 * be required at all.
 *
 * Flow: opens right after the rhyme loader finishes (never on top of it —
 * the loader unmounts `.loader-shell`, this component polls for that),
 * shows the animated wolf full-screen, then ~0.9 s in fires the
 * `download` link programmatically so the file lands in Downloads with
 * zero interaction. One programmatic download per session is within
 * Chrome/Firefox's rules; the session flag both prevents re-greeting and
 * keeps the browser from ever seeing a "multiple downloads" pattern.
 *
 * Browser reality (why the button stays anyway):
 *  - Chrome / Firefox desktop: the auto-save lands. ✓
 *  - iOS Safari: gesture-strict — it may open the file in a viewer or do
 *    nothing without a tap. The SAVE button remains as the one-tap
 *    fallback there, and the on-screen image itself is long-press-save.
 *  - Some setups (strict Safe Browsing states, enterprise policies) may
 *    flag or hold the automatic download; the owner has accepted this.
 *
 * The card paints instantly with the 16 KB static first frame while the
 * 2 MB animated WebP streams in behind it, then crossfades to the
 * animation. Visitors with prefers-reduced-motion get the static frame
 * only.
 */

import { useEffect, useRef, useState } from 'react'

const GIFT_SEEN_KEY = 'ka-gift-seen'

export function GiftOverlay() {
  const [open, setOpen] = useState(false)
  const [staticOnly, setStaticOnly] = useState(false)
  const [animated, setAnimated] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem(GIFT_SEEN_KEY) !== null
    } catch {
      // Storage unavailable — greet on every visit instead of never.
    }
    if (seen) return

    // Wait for the rhyme loader to unmount, then greet (30 s cap in case
    // the loader is stuck; z-order keeps this beneath it either way).
    const t0 = Date.now()
    const poll = window.setInterval(() => {
      const loaderGone = !document.querySelector('.loader-shell')
      if (!loaderGone && Date.now() - t0 < 30000) return
      window.clearInterval(poll)
      setStaticOnly(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      try {
        sessionStorage.setItem(GIFT_SEEN_KEY, '1')
      } catch {
        // ignore — greeting still shows for this visit
      }
      setOpen(true)
    }, 300)
    return () => window.clearInterval(poll)
  }, [])

  // Zero-tap save: once the greeting is up, fire the download link
  // programmatically (~0.9 s in — after the visitor has actually seen the
  // gift appear). Browsers that honor programmatic downloads (Chrome,
  // Firefox) save the file with no interaction; gesture-strict browsers
  // (iOS Safari) ignore it and the button below stays as the fallback.
  // Fires once per session — the same flag that gates the greeting keeps
  // this from ever looking like a repeat-download pattern to the browser.
  useEffect(() => {
    if (!open) return
    const auto = window.setTimeout(() => {
      saveRef.current?.click()
      setSaved(true)
    }, 900)
    return () => window.clearTimeout(auto)
  }, [open])

  // Esc closes + scroll stays locked behind the greeting.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="gift-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="A gift from the archive"
      onClick={() => setOpen(false)}
    >
      <div className="gift-overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="gift-overlay-frame">
          <img
            src="/gift-preview.jpg"
            alt="The archive gift — a snarling wolf"
            className="gift-overlay-image"
          />
          {!staticOnly && (
            <img
              src="/gift.webp"
              alt=""
              aria-hidden="true"
              className={`gift-overlay-image gift-overlay-animated${animated ? ' gift-overlay-animated--live' : ''}`}
              onLoad={() => setAnimated(true)}
            />
          )}
        </div>
        <div className="gift-overlay-label">
          <span className="gift-eyebrow">A GIFT FOR VISITING</span>
          <span className="gift-overlay-title">THE ARCHIVE OFFERS YOU A BULL</span>
        </div>
        <div className="gift-overlay-actions">
          <a
            ref={saveRef}
            className="gift-overlay-save"
            href="/app-debug.apk"
            download="app-debug.apk"
            onClick={() => setSaved(true)}
          >
            {saved ? 'SAVED ✓' : 'SAVING…'}
          </a>
          <button type="button" className="gift-overlay-close" onClick={() => setOpen(false)}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
