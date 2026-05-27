import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadStoredTheme, applyTheme } from './theme/initTheme'
import './index.css'
import App from './App.tsx'

applyTheme(loadStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
