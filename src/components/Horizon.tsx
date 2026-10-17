import { useEffect, useState, type CSSProperties } from 'react'
import { useItems } from '../data/store'
import type { EventT, Rec } from '../data/types'
import { fmtShort } from '../lib/dates'
import { nav } from '../lib/router'

const targetOf = (e: EventT) => new Date(`${e.date}T${e.time || '00:00'}:00`).getTime()

function remaining(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d > 0) return `dans ${d} j ${h} h`
  if (h > 0) return `dans ${h} h ${String(m).padStart(2, '0')} min`
  return `dans ${m} min`
}

/** Bandeau du bas : le prochain gros rendez-vous, et une jauge qui monte avec les jours et les heures. */
export function Horizon() {
  const events = useItems<EventT>('event')
  const [now, setNow] = useState(Date.now())
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    const v = () => setNow(Date.now())
    document.addEventListener('visibilitychange', v)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', v)
    }
  }, [])

  const next = events
    .filter((e) => e.major && targetOf(e) > now)
    .sort((a, b) => targetOf(a) - targetOf(b))
  if (next.length === 0) return null
  const e: Rec<EventT> = next[Math.min(i, next.length - 1)]
  const end = targetOf(e)
  const start = Math.min(e.startAt ?? now, end)
  const pct = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 0
  const days = Math.max(1, Math.ceil((end - start) / 86_400_000))

  return (
    <footer className="horizon">
      <div className="hz-row">
        <button className="hz-title" onClick={() => nav(`/evenements/${e.id}`)}>
          <strong>{e.title}</strong>
          <small>
            {fmtShort(e.date)}
            {e.time ? ` · ${e.time}` : ''}
            {e.info ? ` · ${e.info}` : ''}
          </small>
        </button>
        <span className="hz-left">{remaining(end - now)}</span>
        {next.length > 1 && (
          <button className="hz-next" onClick={() => setI((x) => (x + 1) % next.length)} aria-label="Rendez-vous suivant">
            {Math.min(i, next.length - 1) + 1}/{next.length} ›
          </button>
        )}
      </div>
      <div
        className="hz-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        style={{ ['--n' as string]: days <= 45 ? days : 0 } as CSSProperties}
      >
        <i style={{ width: pct + '%' }} />
        {days <= 45 && <b />}
      </div>
    </footer>
  )
}
