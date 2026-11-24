'use client'

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

type MotionPermissionDeviceOrientation = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

let motionPermissionRequest: Promise<boolean> | null = null

function askForMotionPermission() {
  if (typeof DeviceOrientationEvent === 'undefined') return
  const OrientationEvent = DeviceOrientationEvent as MotionPermissionDeviceOrientation
  if (typeof OrientationEvent.requestPermission !== 'function') return

  motionPermissionRequest ??= OrientationEvent.requestPermission()
    .then(result => result === 'granted')
    .catch(() => false)
}

function clampUnit(value: number) {
  return Math.max(-1, Math.min(1, value))
}

export function LogoMotion({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let baselineBeta: number | null = null
    let baselineGamma: number | null = null

    function setTilt(x: number, y: number) {
      if (!node) return
      node.style.setProperty('--logo-tilt-x', `${(-y * 6).toFixed(2)}deg`)
      node.style.setProperty('--logo-tilt-y', `${(x * 8).toFixed(2)}deg`)
      node.style.setProperty('--logo-shift-x', `${(x * 3).toFixed(2)}px`)
      node.style.setProperty('--logo-shift-y', `${(y * 3).toFixed(2)}px`)
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || !window.innerWidth || !window.innerHeight) return
      const x = clampUnit((event.clientX / window.innerWidth - 0.5) * 2)
      const y = clampUnit((event.clientY / window.innerHeight - 0.5) * 2)
      setTilt(x, y)
    }

    function handleDeviceOrientation(event: DeviceOrientationEvent) {
      if (event.beta === null || event.gamma === null) return
      baselineBeta ??= event.beta
      baselineGamma ??= event.gamma
      const x = clampUnit((event.gamma - baselineGamma) / 22)
      const y = clampUnit((event.beta - baselineBeta) / 22)
      setTilt(x, y)
    }

    function resetTilt() {
      setTilt(0, 0)
    }

    function handlePointerExit(event: PointerEvent) {
      if (event.relatedTarget === null) resetTilt()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerout', handlePointerExit)
    window.addEventListener('blur', resetTilt)
    window.addEventListener('deviceorientation', handleDeviceOrientation)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerout', handlePointerExit)
      window.removeEventListener('blur', resetTilt)
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
    }
  }, [])

  function enablePhoneMotion(event: ReactPointerEvent<HTMLSpanElement>) {
    if (event.pointerType === 'touch') askForMotionPermission()
  }

  return (
    <span
      ref={ref}
      className={`logo-motion ${className}`.trim()}
      onPointerDown={enablePhoneMotion}
      title="Move your pointer or tilt your phone to shift the logo"
    >
      {children}
    </span>
  )
}
