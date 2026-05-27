import { useDeviceContext } from '../context/DeviceContext'

/** 手机模式：浮层限制在 max-w-md 栏内；平板/电视：全屏 */
export function useShellOverlayClass(layer: 'base' | 'above' = 'base') {
  const { device } = useDeviceContext()
  const z = layer === 'above' ? 'z-[65]' : 'z-50'
  if (device === 'phone') {
    return `fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md ${z}`
  }
  return `fixed inset-0 ${z}`
}

export function usePlayerShellClass() {
  const { device } = useDeviceContext()
  if (device === 'phone') {
    return 'absolute inset-0 z-50'
  }
  return 'fixed inset-0 z-50'
}
