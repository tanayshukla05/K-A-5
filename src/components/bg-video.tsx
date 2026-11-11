'use client'

/**
 * BackgroundVideo — the fixed rain-boulder loop behind the whole app.
 *
 * Why this is a client component and not an inline <video> in the server
 * layout: React does not render the `muted` prop as an HTML attribute
 * (long-standing react-dom behavior — it only sets the DOM property after
 * hydration). iOS Safari decides about inline autoplay from the ATTRIBUTES
 * in the original server HTML, so on phones the video never autoplays and
 * — with a black page and no poster — the background looks like it is
 * simply missing. The effect below writes muted + playsinline as real
 * attributes before first paint, then nudges play() a few times as
 * belt-and-braces (data-saver / low-power phones can stall the first
 * attempt while the page is still loading).
 */

import { useEffect, useRef } from 'react'

export function BackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return

    // Real attributes — required by mobile browsers for inline autoplay.
    v.muted = true
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    v.setAttribute('autoplay', '')

    const tryPlay = () => {
      void v.play().catch(() => {
        // Blocked (data saver, low-power mode) — the poster keeps the
        // frame visible; a later retry or the user's next tap recovers.
      })
    }
    tryPlay()
    v.addEventListener('loadeddata', tryPlay, { once: true })
    // One late retry for phones that blocked the first attempt.
    const retry = window.setTimeout(tryPlay, 1500)

    return () => {
      window.clearTimeout(retry)
      v.removeEventListener('loadeddata', tryPlay)
    }
  }, [])

  return (
    <video
      ref={ref}
      className="bg-video"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/bg-poster.jpg"
      aria-hidden="true"
      tabIndex={-1}
      src="/bg-boulder.mp4"
    />
  )
}
