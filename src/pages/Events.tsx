import { useEffect, useState } from 'react'
import { create, remove, update, useItem, useItems } from '../data/store'
import type { EventT, Project } from '../data/types'
import { fmtLong, fmtShort, today } from '../lib/dates'
import { eventColorCss } from '../lib/palette'
import { nav } from '../lib/router'
import { ColorPicker, Empty, Header } from '../ui/ui'

export function EventsList() {
  const events = useItems<EventT>('event')
  const t0 = today()
  const upcoming = events.filter((e) => e.date >= t0).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const past = events.filter((e) => e.date < t0).sort((a, b) => b.date.localeCompare(a.date))
  const [showPast, setShowPast] = useState(false)
  const row = (e: (typeof events)[number]) => (
    <li key={e.id}>
      <button className="ev-card" onClick={() => nav(`/evenements/${e.id}`)}>
        <i className="ev-chip" style={{ background: eventColorCss(e.color) }} />
        <span>
          <strong>{e.major ? '★ ' : ''}{e.title}</strong>
          <small>
            {fmtShort(e.date)}
            {e.time ? ` · ${e.time}` : ''}
            {e.info ? ` · ${e.info}` : ''}
          </small>
        </span>
      </button>
    </li>
  )
  return (
    <>
      <Header title="Évènements" onAdd={() => nav('/evenements/new')} addLabel="Nouvel évènement" />
      <main className="page">
        {upcoming.length === 0 && <Empty>Aucun évènement à venir. Touche + pour en ajouter un.</Empty>}
        <ul className="ev-cards">{upcoming.map(row)}</ul>
        {past.length > 0 && (
          <>
            <button className="linkish" onClick={() => setShowPast((s) => !s)}>
              {showPast ? 'Masquer' : 'Voir'} les évènements passés ({past.length})
            </button>
            {showPast && <ul className="ev-cards past">{past.map(row)}</ul>}
          </>
        )}
      </main>
    </>
  )
}

/**
 * Formulaire de la maquette : nom, couleurs, description, lien / heure / infos pratiques.
 * La date se choisit en touchant le calendrier juste en dessous (case jaune).
 */
export function EventEditor(props: { id?: string; date: string; setDate: (d: string) => void; projectId?: string }) {
  const cur = useItem<EventT>(props.id)
  const projects = useItems<Project>('project')
  const [loaded, setLoaded] = useState(!props.id)
  const [f, setF] = useState({ title: '', color: 'yellow', desc: '', link: '', time: '', info: '', remind: '' as string, projectId: props.projectId ?? '', major: false })

  useEffect(() => {
    if (cur && !loaded) {
      setF({
        title: cur.title,
        color: cur.color,
        desc: cur.desc,
        link: cur.link,
        time: cur.time ?? '',
        info: cur.info,
        remind: cur.remind === null || cur.remind === undefined ? '' : String(cur.remind),
        projectId: cur.projectId ?? '',
        major: !!cur.major,
      })
      props.setDate(cur.date)
      setLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, loaded])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  if (props.id && !cur && loaded) {
    return (
      <>
        <Header title="Évènement" showBack />
        <main className="page">
          <Empty>Cet évènement n'existe plus.</Empty>
        </main>
      </>
    )
  }

  const save = () => {
    if (!f.title.trim()) return
    const data: EventT = {
      title: f.title.trim(),
      date: props.date,
      time: f.time || undefined,
      color: f.color,
      desc: f.desc,
      link: f.link.trim(),
      info: f.info,
      projectId: f.projectId || undefined,
      remind: f.remind === '' ? null : Number(f.remind),
      major: f.major || undefined,
      startAt: f.major ? cur?.startAt ?? Date.now() : cur?.startAt,
    }
    if (cur) update<EventT>(cur.id, data)
    else create<EventT>('event', data)
    nav(f.projectId ? `/projets/${f.projectId}` : '/evenements')
  }

  return (
    <>
      <Header title={cur ? 'Évènement' : 'Nouvel évènement'} showBack />
      <main className="page evform">
        <input className="field y" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Nom évènement" aria-label="Nom" autoFocus={!cur} />

        <div className="field y block">
          <span className="cap">Couleurs</span>
          <ColorPicker value={f.color} onChange={(c) => set('color', c)} />
        </div>

        <textarea className="field y" rows={3} value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Description" aria-label="Description" />

        <div className="trio">
          <label className="field y cell3 w-lien">
            <span className="cap">Lien</span>
            <input type="url" inputMode="url" value={f.link} onChange={(e) => set('link', e.target.value)} placeholder="https://" />
          </label>
          <label className="field y cell3 w-heure">
            <span className="cap">Heure</span>
            <input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} />
          </label>
          <label className="field y cell3 w-infos">
            <span className="cap">Infos pratiques</span>
            <input value={f.info} onChange={(e) => set('info', e.target.value)} placeholder="Lieu, code…" />
          </label>
        </div>

        <div className="duo">
          <label className="field y cell3">
            <span className="cap">Rappel</span>
            <select value={f.remind} onChange={(e) => set('remind', e.target.value)}>
              <option value="">Aucun</option>
              <option value="0">À l'heure</option>
              <option value="10">10 min avant</option>
              <option value="60">1 h avant</option>
              <option value="1440">1 jour avant</option>
            </select>
          </label>
          <label className="field y cell3">
            <span className="cap">Projet</span>
            <select value={f.projectId} onChange={(e) => set('projectId', e.target.value)}>
              <option value="">Aucun</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="check-line major-line">
          <input type="checkbox" checked={f.major} onChange={(e) => set('major', e.target.checked)} />
          <span>
            Gros rendez-vous
            <small>Une jauge en bas de l'écran compte les jours et les heures qui restent.</small>
          </span>
        </label>

        <p className="datepick">
          Date : <strong>{fmtLong(props.date)}</strong>
          <small> — touche un jour dans le calendrier pour la changer</small>
        </p>

        <div className="row-actions">
          {cur && (
            <button
              className="btn ghost"
              onClick={() => {
                remove(cur.id)
                nav('/evenements')
              }}
            >
              Supprimer
            </button>
          )}
          <button className="btn" onClick={save} disabled={!f.title.trim()}>
            Enregistrer
          </button>
        </div>
      </main>
    </>
  )
}
