import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
