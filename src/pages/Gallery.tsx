import { useState } from 'react'
import { useItems } from '../data/store'
import type { CardT, Task } from '../data/types'
import { resolvePending, streaks } from '../lib/actions'
import { fmtLong, dayOf } from '../lib/dates'
import { nav } from '../lib/router'
import { Empty, Header, Sheet } from '../ui/ui'

export function Gallery() {
  const cards = useItems<CardT>('card').sort((a, b) => b.wonAt - a.wonAt)
  const tasks = useItems<Task>('task')
  const [openId, setOpenId] = useState<string | null>(null)
  const open = cards.find((c) => c.id === openId)
  const pending = cards.filter((c) => c.status === 'pending').length
  const s = streaks(tasks)
  return (
    <>
      <Header
        title="Galerie"
        showBack
        extra={
          <button className="txt-btn" onClick={() => nav('/stats')}>
            stats
          </button>
        }
      />
      <main className="page">
        <p className="muted">
          {cards.length} œuvre{cards.length > 1 ? 's' : ''} · série en cours : {s.current} jour{s.current > 1 ? 's' : ''}
        </p>
        {pending > 0 && (
          <p className="muted">
            {pending} carte{pending > 1 ? 's' : ''} en attente de connexion.{' '}
            <button className="linkish inline" onClick={resolvePending}>
              Réessayer
            </button>
          </p>
        )}
        {cards.length === 0 && <Empty>Termine une tâche pour gagner ta première œuvre d'art.</Empty>}
        <div className="gal">
          {cards.map((c) => (
            <button key={c.id} className="gal-card" onClick={() => setOpenId(c.id)} aria-label={c.title ?? 'Carte en attente'}>
              {c.image ? <img src={c.image} alt={c.title ?? ''} loading="lazy" /> : <div className="art-pending" />}
              <span>{c.title ?? 'En attente…'}</span>
            </button>
          ))}
        </div>
      </main>

      <Sheet open={!!open} onClose={() => setOpenId(null)} tall>
        {open && (
          <div className="card-detail">
            {open.imageLarge || open.image ? <img src={open.imageLarge || open.image} alt={open.title ?? ''} /> : <div className="art-pending big" />}
            <h2>{open.title ?? 'Œuvre en attente'}</h2>
            <p>
              {open.artist}
              {open.year ? ` · ${open.year}` : ''}
            </p>
            {open.medium && <p className="muted">{open.medium}</p>}
            {open.dept && <p className="muted">{open.dept}</p>}
            <p className="muted">
              Gagnée le {fmtLong(dayOf(open.wonAt))} en terminant « {open.taskTitle} ».
            </p>
            {open.url && (
              <a className="btn" href={open.url} target="_blank" rel="noreferrer">
                Voir au Met Museum
              </a>
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}

