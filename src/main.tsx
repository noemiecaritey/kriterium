import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash">
        <h1>kriterium</h1>
        <p>Oups, quelque chose s'est mal passé. Tes données sont gardées sur cet appareil.</p>
        <pre>{this.state.error.message}</pre>
        <button className="btn" onClick={() => location.reload()}>
          Recharger
        </button>
      </div>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
)

// Application installable + utilisable hors ligne
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* pas bloquant */
    })
  })
}
