import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { PlayerProvider } from './contexts/PlayerContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PlayerProvider>
        <App />
      </PlayerProvider>
    </AuthProvider>
    <Toaster 
      position="top-right"
      toastOptions={{
        style: {
          background: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          color: '#f1f5f9',
        },
      }}
    />
  </StrictMode>,
)
