import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { ExitHintToast } from '../components/ExitHintToast'

const EXIT_CONFIRM_MS = 2000

type BackHandler = () => boolean

interface BackNavigationContextValue {
  /** 与系统返回键相同：先关闭顶层界面，根页面则二次确认退出 */
  performBack: () => void
  registerHandler: (handler: BackHandler) => () => void
}

const BackNavigationContext = createContext<BackNavigationContextValue | null>(null)

export function BackNavigationProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<BackHandler[]>([])
  const exitArmedRef = useRef(false)
  const exitTimerRef = useRef<number | null>(null)
  const [exitHintVisible, setExitHintVisible] = useState(false)

  const clearExitArm = useCallback(() => {
    exitArmedRef.current = false
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
    setExitHintVisible(false)
  }, [])

  const armExit = useCallback(() => {
    exitArmedRef.current = true
    setExitHintVisible(true)
    if (exitTimerRef.current != null) window.clearTimeout(exitTimerRef.current)
    exitTimerRef.current = window.setTimeout(() => {
      exitArmedRef.current = false
      exitTimerRef.current = null
      setExitHintVisible(false)
    }, EXIT_CONFIRM_MS)
  }, [])

  const registerHandler = useCallback((handler: BackHandler) => {
    handlersRef.current.push(handler)
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler)
    }
  }, [])

  const performBack = useCallback(() => {
    const handlers = handlersRef.current
    for (let i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i]!()) {
        clearExitArm()
        return
      }
    }

    if (exitArmedRef.current) {
      clearExitArm()
      if (Capacitor.isNativePlatform()) {
        void App.exitApp()
      }
      return
    }

    armExit()
  }, [armExit, clearExitArm])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let remove: (() => void) | undefined
    void App.addListener('backButton', () => {
      performBack()
    }).then((handle) => {
      remove = () => void handle.remove()
    })

    return () => {
      remove?.()
      clearExitArm()
    }
  }, [performBack, clearExitArm])

  const value = useMemo(
    () => ({ performBack, registerHandler }),
    [performBack, registerHandler],
  )

  return (
    <BackNavigationContext.Provider value={value}>
      {children}
      <ExitHintToast visible={exitHintVisible} />
    </BackNavigationContext.Provider>
  )
}

export function useBackNavigation() {
  const ctx = useContext(BackNavigationContext)
  if (!ctx) throw new Error('useBackNavigation must be used within BackNavigationProvider')
  return ctx
}

/** 注册返回处理；返回 true 表示已消费（不再退出应用） */
export function useBackHandler(active: boolean, handler: () => boolean) {
  const { registerHandler } = useBackNavigation()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!active) return
    return registerHandler(() => handlerRef.current())
  }, [active, registerHandler])
}
