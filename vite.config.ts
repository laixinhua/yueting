import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const ebnrTarget = 'https://ebnr.xiyang6666.top'

/** Android WebView 加载本地 CSS 时，crossorigin 会导致样式表失败 */
function capacitorHtmlCompat(): Plugin {
  return {
    name: 'capacitor-html-compat',
    apply: 'build',
    transformIndexHtml(html) {
      return html
        .replace(/\s+crossorigin(?=\s+(?:src|href)="\.?\/assets\/)/g, '')
        .replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"[^>]*>\s*/g, '')
        .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>\s*/g, '')
        .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '')
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: mode === 'capacitor' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'capacitor' ? [capacitorHtmlCompat()] : []),
  ],
  build: {
    modulePreload: mode === 'capacitor' ? false : undefined,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    open: false,
    proxy: {
      '/api/ebnr': {
        target: ebnrTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ebnr/, ''),
      },
      '/api/netease-lyric': {
        target: 'https://apis.netstart.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/netease-lyric/, '/music'),
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/api/ebnr': {
        target: ebnrTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ebnr/, ''),
      },
      '/api/netease-lyric': {
        target: 'https://apis.netstart.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/netease-lyric/, '/music'),
      },
    },
  },
}))
