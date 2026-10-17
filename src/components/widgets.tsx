import { useEffect, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { create, update, useItem, useItems } from '../data/store'
import type { CardT, EventT, ListT, Mood, Note, Project, Rec, Shop, Task, WidgetT } from '../data/types'
import { streaks, toggleTask } from '../lib/actions'
import { ProjectTag } from './Tasks'
import { fmtShort, today } from '../lib/dates'
import { artworkOfTheDay, type Artwork } from '../lib/met'
import { MOODS } from '../lib/palette'
import { fetchWeather, locateByGps, savedPlace, savePlace, searchCity, type Place, type Weather } from '../lib/weather'
import { AddRow, Check, Sheet } from '../ui/ui'

/* ------------------------------------------------------------------ */
/* Catalogue des widgets                                                */
/* ------------------------------------------------------------------ */

export interface WidgetDef {
  type: string
  label: string
  blurb: string
  /** taille par défaut en cases (grille de 8 colonnes) */
  w: number
  h: number
  gradient: string
  minW: number
  minH: number
  /** "/chemin" = navigation, sinon nom d'une action gérée par l'accueil ; undefined = rien */
  tap?: string
  Body: ComponentType<{ rec: Rec<WidgetT> }>
}

const Hint = ({ children }: { children: string }) => <p className="tile-hint">{children}</p>

function ConvertBody({ rec }: { rec: Rec<WidgetT> }) {
  return rec.h >= 3 ? <Hint>Colle du texte : chaque ligne devient une tâche.</Hint> : null
}

function RescheduleBody({ rec }: { rec: Rec<WidgetT> }) {
  const tasks = useItems<Task>('task')
  const late = tasks.filter((t) => !t.done && t.due && t.due < today())
  return (
    <>
      {late.length > 0 && <span className="badge" aria-label={`${late.length} à reprogrammer`}>{late.length}</span>}
      {rec.h >= 3 && (late.length ? <ul className="mini">{late.slice(0, 2).map((t) => <li key={t.id}>{t.title}</li>)}</ul> : <Hint>Rien en retard.</Hint>)}
    </>
  )
}

function GalleryBody({ rec }: { rec: Rec<WidgetT> }) {
  const cards = useItems<CardT>('card').sort((a, b) => b.wonAt - a.wonAt)
  const last = cards.find((c) => c.image)
  return (
    <>
      <p className="tile-meta">{cards.length} œuvre{cards.length > 1 ? 's' : ''}</p>
      {rec.h >= 3 && last?.image && <img className="tile-thumb" src={last.image} alt="" loading="lazy" />}
    </>
  )
}

function ProjectsBody({ rec }: { rec: Rec<WidgetT> }) {
  const projects = useItems<Project>('project')
  return rec.h >= 3 ? (
    projects.length ? (
      <ul className="mini">{projects.slice(0, 4).map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    ) : (
      <Hint>Aucun projet pour l'instant.</Hint>
    )
  ) : (
    <p className="tile-meta">{projects.length}</p>
  )
}

function NotesBody({ rec }: { rec: Rec<WidgetT> }) {
  const notes = useItems<Note>('note').sort((a, b) => b.createdAt - a.createdAt)
  return rec.h >= 3 ? (
    notes.length ? (
      <ul className="mini">{notes.slice(0, 3).map((n) => <li key={n.id}>{n.url ? n.text || n.url : n.text}</li>)}</ul>
    ) : (
      <Hint>Notes et liens à garder sous la main.</Hint>
    )
  ) : (
    <p className="tile-meta">{notes.length}</p>
  )
}

function MoodBody({ rec }: { rec: Rec<WidgetT> }) {
  const moods = useItems<Mood>('mood')
  const cur = moods.find((m) => m.date === today())
  const set = (value: number) => (cur ? update<Mood>(cur.id, { value }) : create<Mood>('mood', { date: today(), value }))
  return (
    <div className={'mood-row' + (rec.h < 3 ? ' tight' : '')} role="radiogroup" aria-label="Humeur du jour">
      {MOODS.map((m) => (
        <button
          key={m.value}
          role="radio"
          aria-checked={cur?.value === m.value}
          aria-label={m.label}
          title={m.label}
          className={'mood-dot' + (cur?.value === m.value ? ' on' : '')}
          style={{ background: m.color }}
          onClick={() => set(m.value)}
        />
      ))}
    </div>
  )
}

function ShoppingBody({ rec }: { rec: Rec<WidgetT> }) {
  const items = useItems<Shop>('shop').sort((a, b) => a.order - b.order)
  const open = items.filter((i) => !i.done)
  return rec.h >= 4 ? (
    <ul className="mini checks">
      {open.slice(0, 4).map((i) => (
        <li key={i.id}>
          <Check on={false} onClick={() => update<Shop>(i.id, { done: true })} label={`Cocher ${i.name}`} />
          <span>{i.name}</span>
        </li>
      ))}
      {open.length === 0 && <Hint>Panier vide.</Hint>}
    </ul>
  ) : (
    <p className="tile-meta">{open.length} à acheter</p>
  )
}

function TodayBody({ rec }: { rec: Rec<WidgetT> }) {
  const tasks = useItems<Task>('task')
  const t0 = today()
  const list = tasks.filter((t) => t.due === t0).sort((a, b) => Number(a.done) - Number(b.done) || a.order - b.order)
  const open = list.filter((t) => !t.done).length
  const rows = Math.max(1, rec.h - 3)
  return (
    <>
      <p className="tile-meta">{open ? `${open} à faire` : list.length ? 'Tout est fait' : 'Rien de prévu'}</p>
      {rec.h >= 4 && (
        <>
          <ul className="mini checks">
            {list.slice(0, rows).map((t) => (
              <li key={t.id} className={t.done ? 'done' : ''}>
                <Check on={t.done} onClick={() => toggleTask(t)} />
                <span>
                  <ProjectTag id={t.projectId} />
                  {t.title}
                </span>
              </li>
            ))}
          </ul>
          <AddRow placeholder="Ajouter" onAdd={(title) => create<Task>('task', { title, done: false, due: t0, order: Date.now() })} />
        </>
      )}
    </>
  )
}

function WeatherBody({ rec }: { rec: Rec<WidgetT> }) {
  const [w, setW] = useState<Weather | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setErr(null)
    fetchWeather().then(
      (r) => live && setW(r),
      (e) => live && setErr(navigator.onLine ? `Météo indisponible (${e?.name === 'AbortError' ? 'trop long' : e?.message ?? 'erreur'}).` : 'Pas de connexion.'),
    )
    return () => {
      live = false
    }
  }, [tick])
  const sheet = open ? <WeatherPlace onClose={() => setOpen(false)} onChange={() => setTick((t) => t + 1)} /> : null
  return (
    <>
      {err ? (
        <button className="weather-btn" onClick={() => setOpen(true)}>
          <span className="tile-hint">{err} Touche pour choisir ta ville.</span>
        </button>
      ) : !w ? (
        <Hint>…</Hint>
      ) : (
        <button className="weather weather-btn" onClick={() => setOpen(true)} aria-label="Changer de lieu">
          <span className="temp">{w.temp}°</span>
          <span>
            {w.label}
            {rec.h >= 3 && (
              <small>
                {w.min}° / {w.max}° · {w.place}
              </small>
            )}
          </span>
        </button>
      )}
      {sheet && createPortal(sheet, document.body)}
    </>
  )
}

/** Choisir le lieu de la météo : ma position, ou une ville. */
function WeatherPlace({ onClose, onChange }: { onClose: () => void; onChange: () => void }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Place[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const cur = savedPlace()
  const pick = (p: Place) => {
    savePlace(p)
    onChange()
    onClose()
  }
  const gps = () => {
    setBusy(true)
    setMsg(null)
    locateByGps().then(
      (p) => pick(p),
      (e) => {
        setBusy(false)
        setMsg(e.message)
      },
    )
  }
  const search = async () => {
    if (q.trim().length < 2) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await searchCity(q.trim())
      setFound(r)
      if (!r.length) setMsg('Aucune ville trouvée.')
    } catch {
      setMsg('Recherche impossible pour le moment (réseau ?).')
    }
    setBusy(false)
  }
  return (
    <Sheet open onClose={onClose} title="Lieu de la météo">
      {cur && <p className="muted">Actuellement : {cur.name}{cur.src === 'ip' ? ' (position approximative)' : ''}</p>}
      <button className="btn" disabled={busy} onClick={gps}>
        Utiliser ma position
      </button>
      <label className="lbl">Ou cherche une ville</label>
      <div className="addrow-like">
        <input
          className="field dark"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Lyon, Bruxelles, Montréal…"
        />
        <button className="btn ghost" disabled={busy} onClick={search}>
          Chercher
        </button>
      </div>
      {msg && <p className="muted">{msg}</p>}
      <ul className="cat">
        {found.map((p, i) => (
          <li key={i}>
            <button className="cat-item" onClick={() => pick(p)}>
              <span>
                <strong>{p.name}</strong>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function StreakBody({ rec }: { rec: Rec<WidgetT> }) {
  const tasks = useItems<Task>('task')
  const s = streaks(tasks)
  return (
    <div className="weather">
      <span className="temp">{s.current}</span>
      <span>
        jour{s.current > 1 ? 's' : ''} d'affilée
        {rec.h >= 3 && <small>record : {s.best}</small>}
      </span>
    </div>
  )
}

function ArtDayBody() {
  const [art, setArt] = useState<Artwork | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let live = true
    artworkOfTheDay(today()).then((a) => live && setArt(a), () => live && setErr(true))
    return () => {
      live = false
    }
  }, [])
  if (err) return <Hint>Œuvre indisponible hors ligne.</Hint>
  if (!art) return <Hint>…</Hint>
  return (
    <a className="art-day" href={art.url} target="_blank" rel="noreferrer">
      <img src={art.image} alt={art.title} loading="lazy" />
      <span>
        <strong>{art.title}</strong>
        {art.artist}
      </span>
    </a>
  )
}

function EventsBody({ rec }: { rec: Rec<WidgetT> }) {
  const events = useItems<EventT>('event')
  const t0 = today()
  const next = events.filter((e) => e.date >= t0).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  return next.length ? (
    <ul className="mini">
      {next.slice(0, Math.max(1, rec.h - 2)).map((e) => (
        <li key={e.id}>
          <b>{fmtShort(e.date)}</b> {e.title}
        </li>
      ))}
    </ul>
  ) : (
    <Hint>Aucun évènement à venir.</Hint>
  )
}

function PinnedListBody({ rec }: { rec: Rec<WidgetT> }) {
  const tasks = useItems<Task>('task')
  const list = useItem<ListT>(rec.ref)
  if (!list) return <Hint>Cette liste n'existe plus.</Hint>
  const mine = tasks.filter((t) => t.listId === list.id && !t.done).sort((a, b) => a.order - b.order)
  return (
    <ul className="mini checks">
      {mine.slice(0, Math.max(1, rec.h - 2)).map((t) => (
        <li key={t.id}>
          <Check on={false} onClick={() => toggleTask(t)} />
          <span>{t.title}</span>
        </li>
      ))}
      {mine.length === 0 && <Hint>Tout est fait.</Hint>}
    </ul>
  )
}

export const WIDGETS: WidgetDef[] = [
  { type: 'today', label: "Aujourd'hui", blurb: 'Tes tâches du jour, à cocher directement.', w: 4, h: 6, gradient: 'peach-lemon', minW: 4, minH: 2, tap: 'day', Body: TodayBody },
  { type: 'convert', label: 'Transformer en liste', blurb: 'Reprends les tâches de tes jours, ou colle du texte : ça devient une liste à cocher.', w: 4, h: 2, gradient: 'ember', minW: 3, minH: 2, tap: 'convert', Body: ConvertBody },
  { type: 'reschedule', label: 'Tâches à reprogrammer', blurb: 'Les tâches en retard, avec un badge.', w: 2, h: 2, gradient: 'rose-orange', minW: 2, minH: 2, tap: '/reprogrammer', Body: RescheduleBody },
  { type: 'gallery', label: 'Galerie', blurb: 'Les œuvres gagnées en finissant des tâches.', w: 2, h: 2, gradient: 'aurora', minW: 2, minH: 2, tap: '/galerie', Body: GalleryBody },
  { type: 'projects', label: 'Projets', blurb: 'Tes projets et leurs espaces.', w: 4, h: 4, gradient: 'haze', minW: 2, minH: 2, tap: '/projets', Body: ProjectsBody },
  { type: 'notes', label: 'Liens et notes', blurb: 'Notes rapides et liens à garder.', w: 4, h: 4, gradient: 'meadow', minW: 2, minH: 2, tap: '/notes', Body: NotesBody },
  { type: 'mood', label: 'Humeur', blurb: "Un toucher pour noter l'humeur du jour.", w: 4, h: 3, gradient: 'heat', minW: 4, minH: 2, tap: '/humeur', Body: MoodBody },
  { type: 'shopping', label: 'Courses', blurb: 'La liste de courses.', w: 4, h: 3, gradient: 'lemon', minW: 2, minH: 2, tap: '/courses', Body: ShoppingBody },
  { type: 'events', label: 'Évènements', blurb: 'Les prochains rendez-vous.', w: 4, h: 4, gradient: 'sunset', minW: 3, minH: 2, tap: '/evenements', Body: EventsBody },
  { type: 'list', label: 'Liste épinglée', blurb: "Une de tes listes, toujours sous les yeux.", w: 4, h: 4, gradient: 'periwinkle', minW: 3, minH: 3, Body: PinnedListBody },
  { type: 'weather', label: 'Météo', blurb: "La météo d'aujourd'hui à ta position (Open-Meteo).", w: 4, h: 2, gradient: 'periwinkle', minW: 3, minH: 2, Body: WeatherBody },
  { type: 'streak', label: 'Série', blurb: "Jours d'affilée avec au moins une tâche finie.", w: 4, h: 2, gradient: 'glow', minW: 3, minH: 2, tap: '/stats', Body: StreakBody },
  { type: 'artday', label: 'Œuvre du jour', blurb: 'Une œuvre du Met Museum, chaque jour.', w: 4, h: 5, gradient: 'paper', minW: 3, minH: 3, Body: ArtDayBody },
]

export const widgetDef = (type: string) => WIDGETS.find((w) => w.type === type)

/** Disposition de la maquette Figma, proposée à la demande (le haut est vide par défaut). */
export const FIGMA_PRESET: Omit<WidgetT, 'ref' | 'title'>[] = [
  { type: 'convert', x: 0, y: 0, w: 4, h: 2, gradient: 'ember' },
  { type: 'reschedule', x: 4, y: 0, w: 2, h: 2, gradient: 'rose-orange' },
  { type: 'gallery', x: 6, y: 0, w: 2, h: 2, gradient: 'aurora' },
  { type: 'projects', x: 0, y: 2, w: 4, h: 4, gradient: 'haze' },
  { type: 'notes', x: 4, y: 2, w: 4, h: 4, gradient: 'meadow' },
  { type: 'mood', x: 0, y: 6, w: 4, h: 3, gradient: 'heat' },
  { type: 'shopping', x: 4, y: 6, w: 4, h: 3, gradient: 'lemon' },
]
