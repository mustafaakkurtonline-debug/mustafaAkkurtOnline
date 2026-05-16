import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element bulunamadı. index.html içinde <div id="root"> olduğunu kontrol edin.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
