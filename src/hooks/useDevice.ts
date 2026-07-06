import { useEffect, useState } from 'react'
import type { DeviceOverride, DeviceType } from '../types/device'

const OVERRIDE_KEY = 'yueting-device-override'

function detectTvUserAgent() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return /smart-tv|smarttv|googletv|appletv|bravia|hbbtv|netcast|webos|tizen|android tv|aftb|aftm/i.test(ua)
}

function detectFromWidth(width: number): DeviceType {
  if (width >= 1280) return 'tv'
  if (width >= 768) return 'tablet'
  return 'phone'
}

export function getDeviceOverride(): DeviceOverride {
  try {
    const v = localStorage.getItem(OVERRIDE_KEY) as DeviceOverride | null
    if (v === 'phone' || v === 'tablet' || v === 'tv' || v === 'auto') return v
  } catch {
    /* ignore */
  }
  return 'auto'
}

export function setDeviceOverride(value: DeviceOverride) {
  localStorage.setItem(OVERRIDE_KEY, value)
}

export function useDevice() {
  const [override, setOverrideState] = useState<DeviceOverride>(getDeviceOverride)
  const [detected, setDetected] = useState<DeviceType>(() =>
    typeof window !== 'undefined' ? detectFromWidth(window.innerWidth) : 'phone',
  )

  useEffect(() => {
    const update = () => {
      const byWidth = detectFromWidth(window.innerWidth)
      setDetected(detectTvUserAgent() ? 'tv' : byWidth)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const device: DeviceType = override === 'auto' ? detected : override

  const setOverride = (value: DeviceOverride) => {
    setDeviceOverride(value)
    setOverrideState(value)
  }

  return { device, detected, override, setOverride }
}
