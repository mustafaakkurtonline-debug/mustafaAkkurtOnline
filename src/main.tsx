// İlk import olmalı: Supabase istemcisi oluşturulmadan önce depoları güvenceye alır
import './lib/storageGuard'
import { reactErrorHandler } from '@sentry/react'
import { initSentry } from './lib/sentry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

initSentry()

if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; window.location.reload() }
  })
}

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element bulunamadı. index.html içinde <div id="root"> olduğunu kontrol edin.')
}

// React'in yakalayamadığı bileşen hataları da Sentry'ye raporlanır
createRoot(rootElement, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
