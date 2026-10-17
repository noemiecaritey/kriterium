import { create, useItems } from '../data/store'
import type { EventT, Mood, Task } from '../data/types'
import { fmtLong } from '../lib/dates'
import { useHolidays } from '../lib/holidays'
import { eventColorCss, MOODS } from '../lib/palette'
import { nav } from '../lib/router'
import { AddRow, Empty, Sheet } from '../ui/ui'
import { ProjectTag, TaskList } from './Tasks'

/** Détail d'un jour : évènements, tâches à faire ce jour-là, humeur, jour férié. */
export function DaySheet({ day, onClose }: { day: string | null; onClose: () => void }) {
  const events = useItems<EventT>('event')
  const tasks = useItems<Task>('task')
  const moods = useItems<Mood>('mood')
  const holiday = useHolidays(day ? [Number(day.slice(0, 4))] : [])
  if (!day) return null

  const dayEvents = events.filter((e) => e.date === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  const dayTasks = tasks.filter((t) => t.due === day)
  const mood = moods.find((m) => m.date === day)
  const hol = holiday(day)

  return (
    <Sheet open onClose={onClose} title={fmtLong(day)} tall>
      {hol && <p className="holiday">Jour férié · {hol}</p>}
      {mood && (
        <p className="muted">
          Humeur : {MOODS.find((m) => m.value === mood.value)?.label}
          {mood.note ? ` — ${mood.note}` : ''}
        </p>
      )}

      <div className="sec-head">
        <h3>Évènements</h3>
        <button
          className="linkish"
          onClick={() => {
            onClose()
            nav(`/evenements/new?date=${day}`)
          }}
        >
          + évènement
        </button>
      </div>
      {dayEvents.length === 0 && <Empty>Rien de prévu.</Empty>}
      <ul className="ev-list">
        {dayEvents.map((e) => (
          <li key={e.id}>
            <button
              className="ev-item"
              onClick={() => {
                onClose()
                nav(`/evenements/${e.id}`)
              }}
            >
              <i className="dot" style={{ background: eventColorCss(e.color) }} />
              <span>{e.title}</span>
              {e.time && <small>{e.time}</small>}
            </button>
            <ProjectTag id={e.projectId} />
          </li>
        ))}
      </ul>

      <div className="sec-head">
        <h3>Tâches</h3>
      </div>
      <AddRow
        dark
        placeholder="Nouvelle tâche pour ce jour"
        onAdd={(title) => create<Task>('task', { title, done: false, due: day, order: Date.now() })}
      />
      {dayTasks.length === 0 ? <Empty>Aucune tâche ce jour-là.</Empty> : <TaskList tasks={dayTasks} showDue={false} />}
    </Sheet>
  )
}
