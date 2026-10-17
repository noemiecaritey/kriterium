import { useState } from 'react'
import { applyFigmaPreset } from './Home'
import { clearLocal, exportData, list, setPbUrl, signIn, signInWithGoogle, signOut, signUp, syncNow, useStore } from '../data/store'
import type { WidgetT } from '../data/types'
import { enableNotifications, notificationPermission } from '../lib/notify'
import { DEFAULT_URL } from '../data/pocketbase'
import { PaletteEditor } from '../components/PaletteEditor'
import { Header } from '../ui/ui'

const STATUS: Record<string, string> = {
  off: 'Non connecté : tes données restent sur cet appareil.',
  idle: 'Synchronisé.',
  syncing: 'Synchronisation…',
  offline: 'Hors ligne : la synchro reprendra toute seule.',
  error: 'Erreur de synchronisation.',
  auth: 'Session expirée.',
}

export function Settings() {
  const st = useStore()
  const [email, setEmail] = useState(st.session?.email ?? '')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState(st.pbUrl || DEFAULT_URL)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(() => {
    const m = sessionStorage.getItem('kriterium:authmsg') ?? ''
    sessionStorage.removeItem('kriterium:authmsg')
    return m
  })
  const [perm, setPerm] = useState(notificationPermission())

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
      setPassword('')
    } catch (e) {
      setMsg(e instanceof TypeError ? "Serveur injoignable. Vérifie l'adresse de PocketBase." : e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kriterium-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <Header title="Réglages" showBack />
      <main className="page settings">
        <section>
          <h3 className="sec">Compte et synchro</h3>
          {st.session ? (
            <>
              <p>
                Connecté : <strong>{st.session.email}</strong>
              </p>
              <p className={'muted' + (st.status === 'error' || st.status === 'auth' ? ' warn' : '')}>
                {STATUS[st.status]} {st.error}
                {st.lastSyncAt ? ` Dernière synchro : ${new Date(st.lastSyncAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.` : ''}
              </p>
              <div className="row-actions">
                <button className="btn ghost" onClick={signOut}>
                  Se déconnecter
                </button>
                <button className="btn" onClick={() => void syncNow()} disabled={st.status === 'syncing'}>
                  Synchroniser
                </button>
              </div>
              {st.status === 'auth' && <p className="muted">Reconnecte-toi ci-dessous.</p>}
            </>
          ) : (
            <p className="muted">{STATUS.off} Connecte-toi à ton PocketBase pour retrouver tes données sur tous tes appareils.</p>
          )}
          {(!st.session || st.status === 'auth') && (
            <>
              <input className="field dark" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="Adresse de PocketBase" aria-label="Adresse de PocketBase" />
              <button className="btn google" disabled={busy} onClick={() => run(() => signInWithGoogle(url))}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
                  <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
                  <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
                </svg>
                Continuer avec Google
              </button>
              <p className="muted center">ou avec un email</p>
            </>
          )}
          {(!st.session || st.status === 'auth') && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void run(async () => {
                  setPbUrl(url)
                  await signIn(url, email, password)
                })
              }}
            >
              <input className="field dark" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" />
              <input className="field dark" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (8 caractères min.)" aria-label="Mot de passe" />
              {msg && <p className="muted warn">{msg}</p>}
              <div className="row-actions">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy || !email || password.length < 8}
                  onClick={() => run(async () => { setPbUrl(url); await signUp(url, email, password) })}
                >
                  Créer le compte
                </button>
                <button type="submit" className="btn" disabled={busy || !email || !password}>
                  Se connecter
                </button>
              </div>
            </form>
          )}
        </section>

        <section>
          <h3 className="sec">Rappels</h3>
          {perm === 'unsupported' ? (
            <p className="muted">Les notifications ne sont pas disponibles sur ce navigateur.</p>
          ) : perm === 'granted' ? (
            <p className="muted">Notifications activées. Choisis un rappel dans chaque évènement. Elles partent quand l'app est ouverte ou en arrière-plan.</p>
          ) : perm === 'denied' ? (
            <p className="muted warn">Notifications bloquées : autorise-les dans les réglages du navigateur.</p>
          ) : (
            <button className="btn" onClick={async () => setPerm(await enableNotifications())}>
              Activer les notifications
            </button>
          )}
        </section>

        <section>
          <h3 className="sec">Couleurs</h3>
          <PaletteEditor />
        </section>

        <section>
          <h3 className="sec">Accueil</h3>
          <button className="btn ghost" onClick={() => applyFigmaPreset(list<WidgetT>('widget'))}>
            Remettre la disposition de la maquette
          </button>
        </section>

        <section>
          <h3 className="sec">Données</h3>
          <div className="row-actions">
            <button className="btn ghost" onClick={download}>
              Exporter (JSON)
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                if (confirm('Effacer toutes les données de cet appareil ? Si tu es connecté, elles se rechargeront depuis le serveur.')) clearLocal()
              }}
            >
              Effacer l'appareil
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
