import { useState } from 'react'
import { remove, update, useItem } from '../data/store'
import type { Project, Rec, Task } from '../data/types'
import { toggleTask } from '../lib/actions'
import { relativeLabel, today } from '../lib/dates'
import { nav } from '../lib/router'
import { Check } from '../ui/ui'

/** Petit libellé du projet auquel appartient une tâche (rien si la tâche n'a pas de projet). */
export function ProjectTag({ id }: { id?: string }) {
  const p = useItem<Project>(id)
  if (!id || !p) return null
  return (
    <button
      type="button"
      className="proj-tag link"
      onClick={(e) => {
        e.stopPropagation()
        nav(`/projets/${id}`)
      }}
    >
      {p.name}
    </button>
  )
}

/** Une tâche : case, titre modifiable au toucher, échéance (sélecteur de date natif), suppression. */
export function TaskRow({ t, showDue = true, showProject = true }: { t: Rec<Task>; showDue?: boolean; showProject?: boolean }) {
  const [editing, setEditing] = useState(false)
  const overdue = !t.done && !!t.due && t.due < today()
  return (
    <li className={'task' + (t.done ? ' done' : '')}>
      <Check on={t.done} onClick={() => toggleTask(t)} label={t.done ? 'Rouvrir la tâche' : 'Terminer la tâche'} />
      <div className="task-main">
      {showProject && <ProjectTag id={t.projectId} />}
      {editing ? (
        <input
          className="task-edit"
          autoFocus
          defaultValue={t.title}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== t.title) update<Task>(t.id, { title: v })
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <button className="task-title" onClick={() => setEditing(true)}>
          {t.title}
        </button>
      )}
      </div>
      {showDue && (
        <label className={'due' + (overdue ? ' late' : '') + (t.due ? '' : ' none')}>
          <span>{t.due ? relativeLabel(t.due) : 'date'}</span>
          <input
            type="date"
            value={t.due ?? ''}
            onChange={(e) => update<Task>(t.id, { due: e.target.value || undefined })}
            aria-label="Échéance"
          />
        </label>
      )}
      <button className="x" onClick={() => remove(t.id)} aria-label="Supprimer la tâche">
        ×
      </button>
    </li>
  )
}

export function TaskList({ tasks, showDue, showProject }: { tasks: Rec<Task>[]; showDue?: boolean; showProject?: boolean }) {
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.order - b.order)
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  const [showDone, setShowDone] = useState(false)
  return (
    <>
      <ul className="tasks">
        {open.map((t) => (
          <TaskRow key={t.id} t={t} showDue={showDue} showProject={showProject} />
        ))}
      </ul>
      {done.length > 0 && (
        <>
          <button className="linkish" onClick={() => setShowDone((s) => !s)}>
            {showDone ? 'Masquer' : 'Voir'} les terminées ({done.length})
          </button>
          {showDone && (
            <ul className="tasks">
              {done.map((t) => (
                <TaskRow key={t.id} t={t} showDue={showDue} showProject={showProject} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
