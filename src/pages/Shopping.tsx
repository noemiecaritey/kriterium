import { create, removeMany, update, remove, useItems } from '../data/store'
import type { Shop } from '../data/types'
import { AddRow, Check, Empty, Header } from '../ui/ui'

export function Shopping() {
  const items = useItems<Shop>('shop').sort((a, b) => a.order - b.order)
  const open = items.filter((i) => !i.done)
  const done = items.filter((i) => i.done)
  return (
    <>
      <Header title="Courses" />
      <main className="page">
        <AddRow placeholder="Ajouter un article" onAdd={(name) => create<Shop>('shop', { name, done: false, order: Date.now() })} />
        {items.length === 0 && <Empty>Ta liste de courses est vide.</Empty>}
        <ul className="tasks">
          {[...open, ...done].map((i) => (
            <li key={i.id} className={'task' + (i.done ? ' done' : '')}>
              <Check on={i.done} onClick={() => update<Shop>(i.id, { done: !i.done })} label={i.name} />
              <span className="task-title static">{i.name}</span>
              <button className="x" onClick={() => remove(i.id)} aria-label="Supprimer">
                ×
              </button>
            </li>
          ))}
        </ul>
        {done.length > 0 && (
          <button className="linkish" onClick={() => removeMany(done.map((i) => i.id))}>
            Vider les articles cochés ({done.length})
          </button>
        )}
      </main>
    </>
  )
}
