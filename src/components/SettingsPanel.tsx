import { APP_VERSION } from '../constants/appVersion'
import { useDeviceContext } from '../context/DeviceContext'
import { usePlayer } from '../context/PlayerContext'
import { useTheme } from '../context/ThemeContext'
import { SLEEP_TIMER_MINUTES } from '../utils/sleepTimer'
import { DeviceSelect, deviceLabels } from './DeviceSelect'
import { Overlay } from './Overlay'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const {
    autoPlayNext,
    setAutoPlayNext,
    sleepTimerKind,
    sleepTimerRemainingLabel,
    sleepTimerActive,
    startSleepTimerMinutes,
    startSleepTimerEndOfTrack,
    cancelSleepTimer,
    sleepTimerMinutesPlanned,
  } = usePlayer()
  const { device, detected, override, setOverride } = useDeviceContext()
  const { theme, setTheme } = useTheme()

  return (
    <Overlay title="设置" onClose={onClose}>
      <div className="px-4 py-4 space-y-6">
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">界面</h2>
          <div className="p-4 rounded-xl bg-surface-highlight/50 space-y-3">
            <p className="text-sm text-white/50">
              当前：<span className="text-white font-medium">{deviceLabels[override === 'auto' ? detected : override]}</span>
              {override === 'auto' ? `（自动识别为 ${deviceLabels[device]}）` : ''}
            </p>
            <DeviceSelect value={override} onChange={setOverride} />
            <p className="text-xs text-white/40">浏览器拉宽窗口可自动切换平板/电视布局；也可手动固定。</p>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">外观</h2>
          <div className="p-4 rounded-xl bg-surface-highlight/50 space-y-3">
            <p className="text-sm text-white/50">
              当前：
              <span className="text-white font-medium">{theme === 'light' ? '白天模式' : '夜间模式'}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  theme === 'dark'
                    ? 'bg-white/15 text-white border-white/30'
                    : 'bg-surface-highlight text-white/70 border-white/10'
                }`}
              >
                夜间模式
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  theme === 'light'
                    ? 'bg-white/15 text-white border-white/30'
                    : 'bg-surface-highlight text-white/70 border-white/10'
                }`}
              >
                白天模式
              </button>
            </div>
            <p className="text-xs text-white/40">
              {theme === 'light'
                ? '白天模式使用浅色背景，更适合明亮环境浏览。'
                : '夜间模式使用深色背景，更适合弱光环境浏览。'}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">播放</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-xl bg-surface-highlight/50 cursor-pointer">
              <div>
                <p className="text-white font-medium">自动播放下一首</p>
                <p className="text-xs text-white/50 mt-0.5">关闭后，歌曲结束将停止播放</p>
              </div>
              <input
                type="checkbox"
                checked={autoPlayNext}
                onChange={(e) => setAutoPlayNext(e.target.checked)}
                className="w-5 h-5 accent-white shrink-0"
              />
            </label>

            <div className="p-4 rounded-xl bg-surface-highlight/50 space-y-3">
              <div>
                <p className="text-white font-medium">定时播放</p>
                <p className="text-xs text-white/50 mt-0.5">到时自动停止播放，适合睡前听歌</p>
                {sleepTimerActive && sleepTimerRemainingLabel ? (
                  <p className="text-xs text-amber-300/90 mt-2">
                    进行中：
                    {sleepTimerKind === 'end-of-track'
                      ? '当前首结束后停止'
                      : `剩余 ${sleepTimerRemainingLabel}`}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {SLEEP_TIMER_MINUTES.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => startSleepTimerMinutes(min)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      sleepTimerKind === 'minutes' && sleepTimerMinutesPlanned === min
                        ? 'bg-white/15 text-white border-white/30'
                        : 'bg-surface-highlight text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {min} 分钟
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startSleepTimerEndOfTrack}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    sleepTimerKind === 'end-of-track'
                      ? 'bg-white/15 text-white border-white/30'
                      : 'bg-surface-highlight text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  播完当前首
                </button>
                <button
                  type="button"
                  onClick={cancelSleepTimer}
                  disabled={!sleepTimerActive}
                  className="py-2.5 rounded-lg text-sm font-medium border border-white/10 bg-surface-highlight text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  关闭定时
                </button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">关于</h2>
          <div className="p-4 rounded-xl bg-surface-highlight/50 space-y-2 text-sm">
            <p className="text-white">
              <span className="text-white/50">应用名称：</span>悦听
            </p>
            <p className="text-white">
              <span className="text-white/50">版本：</span>{APP_VERSION}
            </p>
          </div>
        </section>
      </div>
    </Overlay>
  )
}
