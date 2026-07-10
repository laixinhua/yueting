import { useEffect, useState } from 'react'
import type { DeviceOverride, DeviceType } from '../types/device'
import { loadJSON, saveJSON } from '../utils/storage'

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

export async function getDeviceOverride(): Promise<DeviceOverride> {
  const v = await loadJSON<DeviceOverride | null>(OVERRIDE_KEY, null)
  if (v === 'phone' || v === 'tablet' || v === 'tv' || v === 'auto') return v
  return 'auto'
}

export async function setDeviceOverride(value: DeviceOverride): Promise<void> {
  await saveJSON(OVERRIDE_KEY, value)
}

export function useDevice() {
  const [override, setOverrideState] = useState<DeviceOverride>('auto')
  const [detected, setDetected] = useState<DeviceType>(() =>
    typeof window !== 'undefined' ? detectFromWidth(window.innerWidth) : 'phone',
  )

  useEffect(() => {
    let cancelled = false
    void getDeviceOverride().then((v) => {
      if (!cancelled) setOverrideState(v)
    })
    return () => { cancelled = true }
  }, [])

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
    void setDeviceOverride(value)
    setOverrideState(value)
  }

  return { device, detected, override, setOverride }
}
