import { createContext, useContext, type ReactNode } from 'react'
import { useDevice } from '../hooks/useDevice'
import type { DeviceOverride, DeviceType } from '../types/device'

interface DeviceContextValue {
  device: DeviceType
  detected: DeviceType
  override: DeviceOverride
  setOverride: (value: DeviceOverride) => void
}

const DeviceContext = createContext<DeviceContextValue | null>(null)

export function DeviceProvider({ children }: { children: ReactNode }) {
  const value = useDevice()
  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}

export function useDeviceContext() {
  const ctx = useContext(DeviceContext)
  if (!ctx) throw new Error('useDeviceContext must be used within DeviceProvider')
  return ctx
}
