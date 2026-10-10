import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installPersistenceBridge } from './state/persistenceBridge'
import { registerServiceWorker } from './ui/registerServiceWorker'

installPersistenceBridge()
registerServiceWorker()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root is missing from index.html')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
