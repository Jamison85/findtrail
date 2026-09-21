import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './ErrorBoundary'
import './styles.css'
import './home-trail-polish.css'
import './calm-reset-polish.css'
import './trail-view-polish.css'
import './still-missing-polish.css'
import './found-view-polish.css'
import './history-settings-polish.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let refreshing = false
    let hasController = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hasController) {
        hasController = true
        return
      }
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
      const announce = (worker: ServiceWorker | null) => {
        if (!worker || !navigator.serviceWorker.controller) return
        window.dispatchEvent(new CustomEvent('findtrail:update-ready', { detail: { worker } }))
      }
      announce(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') announce(registration.waiting ?? worker)
        })
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    }).catch((error) => {
      console.warn('FindTrail offline support could not start.', error)
    })
  })
}
