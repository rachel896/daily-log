import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline shell. Registered after load so it never competes with first paint,
// and skipped on the dev server so it cannot serve stale files while building.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Document-relative, so the scope is the deployed folder (/daily-log/).
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
