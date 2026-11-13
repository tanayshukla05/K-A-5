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
 *
 * MOTION GUARANTEE: Android Data Saver / battery saver (and iOS Low Power
 * Mode) refuse to autoplay AND refuse to preload a 7.9 MB video on mobile
 * data — every play() retry fails and the poster would sit still. So an
 * animated GIF loop (.bg-video-fallback, ~2.6 s cut from the same scene)
 * always renders UNDER the video: GIFs animate as plain images on EVERY
 * browser ever shipped — no autoplay policy, codec gap, or webview quirk
 * can stop one. The real video stacks on top the moment playback
 * actually starts ('playing' event) and the fallback steps aside; if the
 * phone never allows playback, the ghost still moves.
 */

import { useEffect, useRef, useState } from 'react'

export function BackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null)
  const fallbackRef = useRef<HTMLImageElement>(null)
  const [videoLive, setVideoLive] = useState(false)

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
        // Blocked (data saver, low-power mode) — the animated fallback
        // keeps the frame moving; a later retry or the user's next tap
        // recovers.
      })
    }
    tryPlay()
    v.addEventListener('loadeddata', tryPlay, { once: true })
    // One late retry for phones that blocked the first attempt.
    const retry = window.setTimeout(tryPlay, 1500)

    // The moment real frames are actually drawing, retire the fallback.
    const onPlaying = () => setVideoLive(true)
    v.addEventListener('playing', onPlaying)

    return () => {
      window.clearTimeout(retry)
      v.removeEventListener('loadeddata', tryPlay)
      v.removeEventListener('playing', onPlaying)
    }
  }, [])

  return (
    <>
      {/*
        MOTION GUARANTEE — animated GIF cut from the same scene. Plays as
        a plain <img> on every browser ever made (no autoplay policy
        applies); renders below the video (both z-index -1; DOM order
        stacks video on top) and steps aside once the real video plays.
      */}
      <img
        ref={fallbackRef}
        src="/bg-poster.gif"
        alt=""
        aria-hidden="true"
        tabIndex={-1}
        className={`bg-video-fallback${videoLive ? ' bg-video-fallback--retired' : ''}`}
      />
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
    </>
  )
}
