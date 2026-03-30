import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import './index.css'
import App from './App.tsx'

const routerBaseName = (import.meta.env.VITE_APP_BASE_PATH || '/').replace(/\/$/, '') || '/'
const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`
const serviceWorkerEnabled = import.meta.env.VITE_ENABLE_SERVICE_WORKER === 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBaseName}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (serviceWorkerEnabled) {
      navigator.serviceWorker.register(serviceWorkerUrl, {
        scope: import.meta.env.BASE_URL,
      }).catch(() => {
        // Best effort registration for installability and offline shell caching.
      })
      return
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().catch(() => {
          // Ignore cleanup failures so the app can still boot.
        })
      })
    })
  })
}
