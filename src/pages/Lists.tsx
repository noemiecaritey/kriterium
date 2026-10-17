import { useState } from 'react'
import { TaskList } from '../components/Tasks'
import { create, remove, removeMany, update, useItem, useItems } from '../data/store'
import type { ListT, Task } from '../data/types'
import { gradientCss } from '../lib/palette'
import { nav } from '../lib/router'
import { AddRow, Empty, GradientPicker, Header, Sheet } from '../ui/ui'

export function Lists() {
  const lists = useItems<ListT>('list').sort((a, b) => a.order - b.order)
  const tasks = useItems<Task>('task')
  const [creating, setCreating] = useState(false)
  return (
    <>
      <Header title="Listes" onAdd={() => setCreating(true)} addLabel="Nouvelle liste" />
      <main className="page">
        {lists.length === 0 && <Empty>Aucune liste pour l'instant. Touche + pour en créer une.</Empty>}
        <div className="cards">
          {lists.map((l) => {
            const mine = tasks.filter((t) => t.listId === l.id)
            const done = mine.filter((t) => t.done).length
            return (
              <button key={l.id} className="card" style={{ background: gradientCss(l.gradient) }} onClick={() => nav(`/listes/${l.id}`)}>
                <strong>{l.name}</strong>
                <span>{l.desc || 'Liste'}</span>
                {mine.length > 0 && (
                  <em>
                    {done}/{mine.length}
                  </em>
                )}
              </button>
            )
          })}
        </div>
      </main>
      <ListForm open={creating} onClose={() => setCreating(false)} count={lists.length} onSaved={(id) => nav(`/listes/${id}`)} />
    </>
  )
}

/** Création / édition d'une liste. */
export function ListForm(props: { open: boolean; onClose: () => void; id?: string; count?: number; onSaved?: (id: string) => void }) {
  const cur = useItem<ListT>(props.id)
  const [name, setName] = useState<string | null>(null)
  const [desc, setDesc] = useState<string | null>(null)
  const [gradient, setGradient] = useState<string | null>(null)
  const tasks = useItems<Task>('task')
  if (!props.open) return null
  const n = name ?? cur?.name ?? ''
  const d = desc ?? cur?.desc ?? ''
  const g = gradient ?? cur?.gradient ?? 'periwinkle'
  const close = () => {
    setName(null)
    setDesc(null)
    setGradient(null)
    props.onClose()
  }
  const save = () => {
    if (!n.trim()) return
    if (cur) update<ListT>(cur.id, { name: n.trim(), desc: d, gradient: g })
    else props.onSaved?.(create<ListT>('list', { name: n.trim(), desc: d, gradient: g, order: props.count ?? 0 }))
    close()
  }
  return (
    <Sheet open onClose={close} title={cur ? 'Modifier la liste' : 'Nouvelle liste'}>
      <input className="field dark" autoFocus value={n} onChange={(e) => setName(e.target.value)} placeholder="Nom" />
      <input className="field dark" value={d} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
      <label className="lbl">Fond</label>
      <GradientPicker value={g} onChange={setGradient} />
      <div className="row-actions">
        {cur && (
          <button
            className="btn ghost"
            onClick={() => {
              removeMany(tasks.filter((t) => t.listId === cur.id).map((t) => t.id))
              remove(cur.id)
              close()
              nav('/listes')
            }}
          >
            Supprimer
          </button>
        )}
        <button className="btn" onClick={save} disabled={!n.trim()}>
          Enregistrer
        </button>
      </div>
    </Sheet>
  )
}

export function ListDetail({ id }: { id: string }) {
  const list = useItem<ListT>(id)
  const tasks = useItems<Task>('task').filter((t) => t.listId === id)
  const [editing, setEditing] = useState(false)
  if (!list) {
    return (
      <>
        <Header title="Liste" showBack />
        <main className="page">
          <Empty>Cette liste n'existe plus.</Empty>
        </main>
      </>
    )
  }
  return (
    <>
      <Header
        title={list.name}
        showBack
        extra={
          <button className="txt-btn" onClick={() => setEditing(true)}>
            modifier
          </button>
        }
      />
      <main className="page">
        {list.desc && <p className="muted">{list.desc}</p>}
        <AddRow dark placeholder="Nouvelle tâche" onAdd={(title) => create<Task>('task', { title, done: false, listId: id, order: Date.now() })} />
        {tasks.length === 0 ? <Empty>Ajoute ta première tâche : en la terminant, tu gagneras une œuvre.</Empty> : <TaskList tasks={tasks} />}
      </main>
      <ListForm open={editing} onClose={() => setEditing(false)} id={id} />
    </>
  )
}
