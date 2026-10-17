import { useItems } from '../data/store'
import type { CardT, Mood, Task } from '../data/types'
import { doneByDay, streaks } from '../lib/actions'
import { addDays, today, parseYmd } from '../lib/dates'
import { Header } from '../ui/ui'

const LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export function Stats() {
  const tasks = useItems<Task>('task')
  const cards = useItems<CardT>('card')
  const moods = useItems<Mood>('mood')
  const s = streaks(tasks)
  const byDay = doneByDay(tasks)
  const t0 = today()
  const week = Array.from({ length: 7 }, (_, i) => addDays(t0, i - 6))
  const max = Math.max(1, ...week.map((d) => byDay.get(d) ?? 0))
  const total = tasks.filter((t) => t.done).length
  const m14 = moods.filter((m) => m.date >= addDays(t0, -13))
  const avg = m14.length ? (m14.reduce((a, b) => a + b.value, 0) / m14.length).toFixed(1) : '—'
  return (
    <>
      <Header title="Statistiques" showBack />
      <main className="page">
        <div className="stat-grid">
          <div className="stat"><b>{s.current}</b><span>jours d'affilée</span></div>
          <div className="stat"><b>{s.best}</b><span>meilleure série</span></div>
          <div className="stat"><b>{total}</b><span>tâches terminées</span></div>
          <div className="stat"><b>{cards.length}</b><span>œuvres gagnées</span></div>
        </div>
        <h3 className="sec">Cette semaine</h3>
        <div className="bars" role="img" aria-label="Tâches terminées par jour">
          {week.map((d) => {
            const n = byDay.get(d) ?? 0
            return (
              <div key={d} className="bar-col">
                <span className="bar-n">{n || ''}</span>
                <div className="bar" style={{ height: `${(n / max) * 100}%` }} />
                <span className="bar-l">{LETTERS[parseYmd(d).getDay()]}</span>
              </div>
            )
          })}
        </div>
        <p className="muted">Humeur moyenne sur 14 jours : {avg}{avg !== '—' ? '/5' : ''}</p>
      </main>
    </>
  )
}
