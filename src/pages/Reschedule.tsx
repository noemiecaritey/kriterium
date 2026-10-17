import { removeMany, remove, update, useItems } from '../data/store'
import type { Task } from '../data/types'
import { addDays, fmtShort, nextMonday, today } from '../lib/dates'
import { Empty, Header } from '../ui/ui'

/** Tâches en retard : on les reporte en un geste, ou on les abandonne. */
export function Reschedule() {
  const tasks = useItems<Task>('task')
  const t0 = today()
  const late = tasks.filter((t) => !t.done && t.due && t.due < t0).sort((a, b) => a.due!.localeCompare(b.due!))
  const move = (id: string, due: string) => update<Task>(id, { due })
  return (
    <>
      <Header title="À reprogrammer" showBack />
      <main className="page">
        {late.length === 0 ? (
          <Empty>Rien en retard. Bravo !</Empty>
        ) : (
          <>
            <button className="btn" onClick={() => late.forEach((t) => move(t.id, t0))}>
              Tout reporter à aujourd'hui ({late.length})
            </button>
            <ul className="resched">
              {late.map((t) => (
                <li key={t.id}>
                  <div>
                    <strong>{t.title}</strong>
                    <small>prévue le {fmtShort(t.due!)}</small>
                  </div>
                  <div className="chips">
                    <button className="chip" onClick={() => move(t.id, t0)}>Aujourd'hui</button>
                    <button className="chip" onClick={() => move(t.id, addDays(t0, 1))}>Demain</button>
                    <button className="chip" onClick={() => move(t.id, nextMonday(t0))}>Lundi</button>
                    <label className="chip">
                      Choisir…
                      <input type="date" className="ghost-date" onChange={(e) => e.target.value && move(t.id, e.target.value)} aria-label="Choisir une date" />
                    </label>
                    <button className="chip danger" onClick={() => remove(t.id)}>Abandonner</button>
                  </div>
                </li>
              ))}
            </ul>
            <button className="linkish" onClick={() => removeMany(late.map((t) => t.id))}>Abandonner toutes ces tâches</button>
          </>
        )}
      </main>
    </>
  )
}
