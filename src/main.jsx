import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { KitchenProvider } from './context/KitchenContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KitchenProvider>
        <App />
    </KitchenProvider>
  </StrictMode>,
)
