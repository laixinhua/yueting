import { useEffect } from 'react'
import { useDeviceContext } from '../context/DeviceContext'
import { PhoneLayout } from '../layouts/PhoneLayout'
import { TabletLayout } from '../layouts/TabletLayout'
import { TvLayout } from '../layouts/TvLayout'

export function AppShell() {
  const { device } = useDeviceContext()

  useEffect(() => {
    document.documentElement.setAttribute('data-device', device)
  }, [device])

  if (device === 'tv') return <TvLayout />
  if (device === 'tablet') return <TabletLayout />
  return <PhoneLayout />
}
