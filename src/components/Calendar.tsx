import { useMemo, useState } from 'react'
import { useItems } from '../data/store'
import type { EventT, Mood, Task } from '../data/types'
import { MONTHS, WEEKDAYS_SHORT, monthMatrix, today } from '../lib/dates'
import { useHolidays } from '../lib/holidays'
import { eventColorCss, moodColor } from '../lib/palette'

/**
 * Le calendrier de la maquette : un panneau sombre, un mois après l'autre.
 * Pastilles pleines = évènements (couleur choisie), pastilles creuses = tâches à faire ce jour-là.
 */
export function Calendar(props: {
  selected: string | null
  onSelect: (day: string) => void
  /** limite l'affichage aux évènements/tâches d'un projet (page projet) */
  projectId?: string
}) {
  const { selected, onSelect, projectId } = props
  const events = useItems<EventT>('event')
  const tasks = useItems<Task>('task')
  const moods = useItems<Mood>('mood')

  const [before, setBefore] = useState(0)
  const [after, setAfter] = useState(11)

  const now = new Date()
  const months = useMemo(() => {
    const out: { y: number; m: number }[] = []
    for (let i = -before; i <= after; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      out.push({ y: d.getFullYear(), m: d.getMonth() })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [before, after, now.getMonth(), now.getFullYear()])

  const holiday = useHolidays([...new Set(months.map((m) => m.y))])

  const byDay = useMemo(() => {
    const ev = new Map<string, EventT[]>()
    for (const e of events) {
      if (projectId && e.projectId !== projectId) continue
      const a = ev.get(e.date) ?? []
      a.push(e)
      ev.set(e.date, a)
    }
    const tk = new Map<string, number>()
    for (const t of tasks) {
      if (t.done || !t.due) continue
      if (projectId && t.projectId !== projectId) continue
      tk.set(t.due, (tk.get(t.due) ?? 0) + 1)
    }
    const md = new Map<string, number>()
    for (const m of moods) md.set(m.date, m.value)
    return { ev, tk, md }
  }, [events, tasks, moods, projectId])

  const t0 = today()

  return (
    <section className="cal" aria-label="Calendrier">
      {before < 24 && (
        <button className="cal-more" onClick={() => setBefore((b) => b + 3)}>
          ‹ mois précédents
        </button>
      )}
      {months.map(({ y, m }) => {
        const isCurrent = y === now.getFullYear() && m === now.getMonth()
        const weeks = monthMatrix(y, m)
        return (
          <div className="month" key={`${y}-${m}`}>
            <h3 className={'month-title' + (isCurrent ? '' : ' alt')}>
              {MONTHS[m]}
              {y !== now.getFullYear() && <small> {y}</small>}
            </h3>
            <div className="wd">
              {WEEKDAYS_SHORT.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid">
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  if (!day) return <div key={`${wi}-${di}`} className="cell blank" />
                  const evs = byDay.ev.get(day) ?? []
                  const nTasks = byDay.tk.get(day) ?? 0
                  const mood = byDay.md.get(day)
                  const hol = holiday(day)
                  const dots = [
                    ...evs.map((e) => ({ css: eventColorCss(e.color), task: false })),
                    ...Array.from({ length: nTasks }, () => ({ css: '', task: true })),
                  ]
                  const cls = [
                    'cell',
                    di >= 5 ? 'we' : '',
                    day === selected ? 'sel' : '',
                    day === t0 ? 'today' : '',
                    hol ? 'hol' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <button
                      key={day}
                      className={cls}
                      onClick={() => onSelect(day)}
                      aria-label={`${Number(day.slice(8))} ${MONTHS[m]}${hol ? ', ' + hol : ''}${evs.length ? `, ${evs.length} évènement(s)` : ''}`}
                      title={hol}
                    >
                      <span className="dots">
                        {dots.slice(0, 6).map((d, i) => (
                          <i key={i} className={'dot' + (d.task ? ' todo' : '')} style={d.task ? undefined : { background: d.css }} />
                        ))}
                      </span>
                      <span className="num">{Number(day.slice(8))}</span>
                      {mood && <span className="mood-bar" style={{ background: moodColor(mood) }} />}
                    </button>
                  )
                }),
              )}
            </div>
          </div>
        )
      })}
      <button className="cal-more" onClick={() => setAfter((a) => a + 6)}>
        mois suivants ›
      </button>
    </section>
  )
}
