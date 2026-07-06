import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.yueting.music',
  appName: '悦听',
  webDir: 'dist',
  backgroundColor: '#121212',
  android: {
    allowMixedContent: true,
    backgroundColor: '#121212',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      // 不劫持 WebView fetch，EBNR 在 ebnr.ts 中显式调用 CapacitorHttp 作为备用
      enabled: false,
    },
  },
}

export default config
