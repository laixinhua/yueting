import type { CSSProperties } from 'react'

/** Tailwind 渐变 class → 内联样式（Capacitor / 旧 WebView 回退） */
const GRADIENT_MAP: Record<string, string> = {
  'from-rose-500 to-orange-600': 'linear-gradient(to bottom right, #f43f5e, #ea580c)',
  'from-violet-600 to-fuchsia-600': 'linear-gradient(to bottom right, #7c3aed, #c026d3)',
  'from-cyan-500 to-blue-600': 'linear-gradient(to bottom right, #06b6d4, #2563eb)',
  'from-emerald-500 to-teal-600': 'linear-gradient(to bottom right, #10b981, #0d9488)',
  'from-purple-600 to-pink-600': 'linear-gradient(to bottom right, #9333ea, #db2777)',
  'from-blue-600 to-indigo-600': 'linear-gradient(to bottom right, #2563eb, #4f46e5)',
  'from-emerald-600 to-teal-500': 'linear-gradient(to bottom right, #059669, #14b8a6)',
  'from-rose-500 to-pink-600': 'linear-gradient(to bottom right, #f43f5e, #db2777)',
  'from-fuchsia-500 to-purple-700': 'linear-gradient(to bottom right, #d946ef, #7e22ce)',
  'from-amber-500 to-orange-600': 'linear-gradient(to bottom right, #f59e0b, #ea580c)',
  'from-violet-600 to-indigo-800': 'linear-gradient(to bottom right, #7c3aed, #3730a3)',
  'from-blue-600 to-cyan-500': 'linear-gradient(to bottom right, #2563eb, #06b6d4)',
  'from-orange-500 to-red-600': 'linear-gradient(to bottom right, #f97316, #dc2626)',
  'from-zinc-600 to-zinc-800': 'linear-gradient(to bottom right, #52525b, #27272a)',
  'from-zinc-700 to-zinc-800': 'linear-gradient(to bottom right, #3f3f46, #27272a)',
  'from-neutral-600 to-neutral-800': 'linear-gradient(to bottom right, #525252, #262626)',
  'from-stone-600 to-stone-800': 'linear-gradient(to bottom right, #57534e, #292524)',
  'from-slate-600 to-slate-800': 'linear-gradient(to bottom right, #475569, #1e293b)',
}

const FALLBACK = 'linear-gradient(to bottom right, #52525b, #27272a)'

export function gradientStyle(gradient: string): CSSProperties {
  return { background: GRADIENT_MAP[gradient] ?? FALLBACK }
}
