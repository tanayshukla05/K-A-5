'use client'

/**
 * GiftOverlay — the archive greets every visitor with the gift by itself.
 *
 * Opens right after the rhyme loader finishes (never on top of it — the
 * loader unmounts `.loader-shell`, this component polls for that), shows
 * the animated wolf full-screen, no click needed to SEE it. The one tap
 * browsers still require is the actual file save: downloads fired without
 * a user gesture are blocked by every browser and get sites flagged by
 * Safe Browsing, so SAVE stays a deliberate tap.
 *
 * Once per browsing session (sessionStorage) — navigating Home again in
 * the same session does not re-greet; a fresh session does. Storage
 * blocked (private-mode edge cases) → it simply greets every time.
 *
 * The card paints instantly with the 16 KB static first frame while the
 * 2 MB animated WebP streams in behind it, then crossfades to the
 * animation. Visitors with prefers-reduced-motion get the static frame
 * only. iOS <13 ignores the download attribute and opens the file
 * instead — the full-size image on screen is itself the fallback there
 * (long-press → save).
 */

import { useEffect, useState } from 'react'

const GIFT_SEEN_KEY = 'ka-gift-seen'

export function GiftOverlay() {
  const [open, setOpen] = useState(false)
  const [staticOnly, setStaticOnly] = useState(false)
  const [animated, setAnimated] = useState(false)
  const [saved, setSaved] = useState(false)

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
          <span className="gift-overlay-title">THE ARCHIVE OFFERS YOU A WOLF</span>
        </div>
        <div className="gift-overlay-actions">
          <a
            className="gift-overlay-save"
            href="/gift.webp"
            download="gift.webp"
            onClick={() => setSaved(true)}
          >
            {saved ? 'SAVED ✓' : 'SAVE THE GIFT'}
          </a>
          <button type="button" className="gift-overlay-close" onClick={() => setOpen(false)}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
