import { create, remove, useItems } from '../data/store'
import type { Note } from '../data/types'
import { AddRow, Empty, Header } from '../ui/ui'

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

/** Extrait un lien d'un texte collé (https://… ou www.…). */
export function extractUrl(text: string): string | null {
  const m = text.trim().match(/^(https?:\/\/\S+|www\.\S+)$/i)
  if (!m) return null
  return /^https?:\/\//i.test(m[1]) ? m[1] : `https://${m[1]}`
}

export function Notes() {
  const notes = useItems<Note>('note').filter((n) => !n.projectId).sort((a, b) => b.createdAt - a.createdAt)
  return (
    <>
      <Header title="Liens et notes" />
      <main className="page">
        <AddRow
          placeholder="Une note, ou colle un lien"
          onAdd={(text) => {
            const url = extractUrl(text)
            create<Note>('note', url ? { text: '', url, createdAt: Date.now() } : { text, createdAt: Date.now() })
          }}
        />
        {notes.length === 0 && <Empty>Rien ici pour l'instant.</Empty>}
        <ul className="note-cards">
          {notes.map((n) => (
            <li key={n.id} className={n.url ? 'is-link' : ''}>
              {n.url ? (
                <a href={n.url} target="_blank" rel="noreferrer">
                  <strong>{n.text || hostOf(n.url)}</strong>
                  <small>{n.url}</small>
                </a>
              ) : (
                <p>{n.text}</p>
              )}
              <button className="x" onClick={() => remove(n.id)} aria-label="Supprimer">
                ×
              </button>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
