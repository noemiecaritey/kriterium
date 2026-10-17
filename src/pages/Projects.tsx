import { useState } from 'react'
import { TaskList } from '../components/Tasks'
import { create, remove, removeMany, update, useItem, useItems } from '../data/store'
import type { EventT, Note, Project, Task } from '../data/types'
import { fmtShort } from '../lib/dates'
import { eventColorCss, gradientCss } from '../lib/palette'
import { nav } from '../lib/router'
import { AddRow, Empty, GradientPicker, Header, Sheet } from '../ui/ui'

const GRADS = ['sunset', 'peach-lemon', 'periwinkle', 'glow']

export function ProjectsList() {
  const projects = useItems<Project>('project')
  const tasks = useItems<Task>('task')
  const [creating, setCreating] = useState(false)

  // disposition de la maquette : pleine largeur, deux demi-cartes, pleine largeur, pleine largeur…
  const pattern: ('f' | 'h')[] = ['f', 'h', 'h', 'f', 'f']
  const rows: Project[][] = []
  const sorted = [...projects].sort((a, b) => a.u - b.u)
  for (let i = 0, p = 0; i < sorted.length; p++) {
    const kind = pattern[p % pattern.length]
    if (kind === 'h') {
      rows.push(sorted.slice(i, i + 2) as Project[])
      i += 2
    } else {
      rows.push([sorted[i]] as Project[])
      i += 1
    }
  }

  return (
    <>
      <Header title="Projets" onAdd={() => setCreating(true)} addLabel="Nouveau projet" />
      <main className="page">
        {projects.length === 0 && <Empty>Aucun projet pour l'instant. Touche + pour en créer un.</Empty>}
        {rows.map((row, ri) => (
          <div className={'prow' + (row.length > 1 ? ' two' : '')} key={ri}>
            {(row as (Project & { id: string })[]).map((p) => {
              const mine = tasks.filter((t) => t.projectId === p.id)
              return (
                <button
                  key={p.id}
                  className={'card' + (row.length > 1 ? ' half' : '')}
                  style={{ background: gradientCss(p.gradient) }}
                  onClick={() => nav(`/projets/${p.id}`)}
                >
                  <strong>{p.name}</strong>
                  <span>{p.space || 'espace'}</span>
                  {mine.length > 0 && (
                    <em>
                      {mine.filter((t) => t.done).length}/{mine.length}
                    </em>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </main>
      <ProjectForm open={creating} onClose={() => setCreating(false)} count={projects.length} />
    </>
  )
}

function ProjectForm(props: { open: boolean; onClose: () => void; id?: string; count?: number }) {
  const cur = useItem<Project>(props.id)
  const [name, setName] = useState<string | null>(null)
  const [space, setSpace] = useState<string | null>(null)
  const [gradient, setGradient] = useState<string | null>(null)
  const tasks = useItems<Task>('task')
  const events = useItems<EventT>('event')
  const notes = useItems<Note>('note')
  if (!props.open) return null
  const n = name ?? cur?.name ?? ''
  const s = space ?? cur?.space ?? ''
  const g = gradient ?? cur?.gradient ?? GRADS[(props.count ?? 0) % GRADS.length]
  const close = () => {
    setName(null)
    setSpace(null)
    setGradient(null)
    props.onClose()
  }
  return (
    <Sheet open onClose={close} title={cur ? 'Modifier le projet' : 'Nouveau projet'}>
      <input className="field dark" autoFocus value={n} onChange={(e) => setName(e.target.value)} placeholder="Nom du projet" />
      <input className="field dark" value={s} onChange={(e) => setSpace(e.target.value)} placeholder="Espace (travail, maison, perso…)" />
      <label className="lbl">Fond</label>
      <GradientPicker value={g} onChange={setGradient} />
      <div className="row-actions">
        {cur && (
          <button
            className="btn ghost"
            onClick={() => {
              removeMany([
                ...tasks.filter((t) => t.projectId === cur.id).map((t) => t.id),
                ...events.filter((e) => e.projectId === cur.id).map((e) => e.id),
                ...notes.filter((x) => x.projectId === cur.id).map((x) => x.id),
              ])
              remove(cur.id)
              close()
              nav('/projets')
            }}
          >
            Supprimer
          </button>
        )}
        <button
          className="btn"
          disabled={!n.trim()}
          onClick={() => {
            if (cur) update<Project>(cur.id, { name: n.trim(), space: s, gradient: g })
            else create<Project>('project', { name: n.trim(), space: s, gradient: g })
            close()
          }}
        >
          Enregistrer
        </button>
      </div>
    </Sheet>
  )
}

type Section = 'liste' | 'notes' | 'liens' | 'rdv' | null

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}
const asUrl = (s: string) => (/^https?:\/\//i.test(s) ? s : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) ? `https://${s}` : null)

/** Page d'un projet : les quatre blocs de la maquette (Liste, Notes, Liens, Rendez-vous). */
export function ProjectDetail({ id, selectedDate }: { id: string; selectedDate: string }) {
  const project = useItem<Project>(id)
  const tasks = useItems<Task>('task').filter((t) => t.projectId === id)
  const notes = useItems<Note>('note').filter((n) => n.projectId === id)
  const events = useItems<EventT>('event').filter((e) => e.projectId === id).sort((a, b) => a.date.localeCompare(b.date))
  const [section, setSection] = useState<Section>(null)
  const [editing, setEditing] = useState(false)

  if (!project) {
    return (
      <>
        <Header title="Projet" showBack />
        <main className="page">
          <Empty>Ce projet n'existe plus.</Empty>
        </main>
      </>
    )
  }
  const plain = notes.filter((n) => !n.url).sort((a, b) => b.createdAt - a.createdAt)
  const links = notes.filter((n) => n.url).sort((a, b) => b.createdAt - a.createdAt)
  const open = tasks.filter((t) => !t.done)

  return (
    <>
      <Header
        title={project.name}
        showBack
        extra={
          <button className="txt-btn" onClick={() => setEditing(true)}>
            modifier
          </button>
        }
      />
      <main className="page">
        <div className="pgrid">
          <button className="blk blk-liste" style={{ background: gradientCss('sunset') }} onClick={() => setSection('liste')}>
            <strong>Liste</strong>
            <ul className="mini">{open.slice(0, 3).map((t) => <li key={t.id}>{t.title}</li>)}</ul>
            {open.length === 0 && <small>{tasks.length ? 'Tout est fait' : 'Aucune tâche'}</small>}
          </button>
          <button className="blk blk-notes" style={{ background: gradientCss('peach-lemon') }} onClick={() => setSection('notes')}>
            <strong>Notes</strong>
            <ul className="mini">{plain.slice(0, 4).map((n) => <li key={n.id}>{n.text}</li>)}</ul>
            {plain.length === 0 && <small>Aucune note</small>}
          </button>
          <button className="blk blk-liens" style={{ background: gradientCss('periwinkle') }} onClick={() => setSection('liens')}>
            <strong>Liens</strong>
            <ul className="mini">{links.slice(0, 2).map((n) => <li key={n.id}>{n.text || hostOf(n.url!)}</li>)}</ul>
            {links.length === 0 && <small>Aucun lien</small>}
          </button>
          <button className="blk blk-rdv" style={{ background: gradientCss('glow') }} onClick={() => setSection('rdv')}>
            <strong>Rendez-vous</strong>
            <small>{events.length ? `${events.length} au calendrier` : 'Aucun'}</small>
          </button>
        </div>
      </main>

      <Sheet open={section === 'liste'} onClose={() => setSection(null)} title="Liste" tall>
        <AddRow dark placeholder="Nouvelle tâche" onAdd={(title) => create<Task>('task', { title, done: false, projectId: id, order: Date.now() })} />
        {tasks.length === 0 ? <Empty>Aucune tâche.</Empty> : <TaskList tasks={tasks} showProject={false} />}
      </Sheet>

      <Sheet open={section === 'notes'} onClose={() => setSection(null)} title="Notes" tall>
        <AddRow dark placeholder="Nouvelle note" onAdd={(text) => create<Note>('note', { text, projectId: id, createdAt: Date.now() })} />
        {plain.length === 0 && <Empty>Aucune note.</Empty>}
        <ul className="notes">
          {plain.map((n) => (
            <li key={n.id}>
              <span>{n.text}</span>
              <button className="x" onClick={() => remove(n.id)} aria-label="Supprimer la note">
                ×
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={section === 'liens'} onClose={() => setSection(null)} title="Liens" tall>
        <AddRow
          dark
          placeholder="Coller un lien"
          onAdd={(text) => {
            const url = asUrl(text.trim())
            if (url) create<Note>('note', { text: '', url, projectId: id, createdAt: Date.now() })
          }}
        />
        {links.length === 0 && <Empty>Aucun lien.</Empty>}
        <ul className="notes">
          {links.map((n) => (
            <li key={n.id}>
              <a href={n.url} target="_blank" rel="noreferrer">
                {n.text || hostOf(n.url!)}
              </a>
              <button className="x" onClick={() => remove(n.id)} aria-label="Supprimer le lien">
                ×
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={section === 'rdv'} onClose={() => setSection(null)} title="Rendez-vous" tall>
        <button
          className="btn"
          onClick={() => {
            setSection(null)
            nav(`/evenements/new?project=${id}&date=${selectedDate}`)
          }}
        >
          + Nouveau rendez-vous
        </button>
        {events.length === 0 && <Empty>Aucun rendez-vous.</Empty>}
        <ul className="ev-list">
          {events.map((e) => (
            <li key={e.id}>
              <button className="ev-item" onClick={() => { setSection(null); nav(`/evenements/${e.id}`) }}>
                <i className="dot" style={{ background: eventColorCss(e.color) }} />
                <span>{e.title}</span>
                <small>{fmtShort(e.date)}{e.time ? ` ${e.time}` : ''}</small>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <ProjectForm open={editing} onClose={() => setEditing(false)} id={id} />
    </>
  )
}
