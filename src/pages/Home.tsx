import { useEffect, useState } from 'react'
import { Header, GradientPicker, Sheet, Empty } from '../ui/ui'
import { WidgetGrid, clamp, firstFree, resolve, type Cell } from '../components/WidgetGrid'
import { FIGMA_PRESET, WIDGETS, widgetDef, type WidgetDef } from '../components/widgets'
import { create, remove, update, updateMany, useItem, useItems } from '../data/store'
import type { EventT, ListT, Rec, Task, WidgetT } from '../data/types'
import { addDays, fmtShort, today } from '../lib/dates'
import { gradientCss, nextPalette } from '../lib/palette'
import { PaletteEditor } from '../components/PaletteEditor'
import { nav } from '../lib/router'

/** Les widgets déjà posés, sous forme de cases. */
const cellsOf = (ws: Rec<WidgetT>[]) => new Map<string, Cell>(ws.map((w) => [w.id, { x: w.x, y: w.y, w: w.w, h: w.h }]))

/** Pose un widget (à l'endroit demandé ou à la première place libre) et repousse ce qui gêne. */
export function placeWidget(existing: Rec<WidgetT>[], def: WidgetDef, slot?: { x: number; y: number }, ref?: string) {
  const cells = cellsOf(existing)
  const wanted = slot
    ? clamp({ x: slot.x, y: slot.y, w: def.w, h: def.h }, def.minW, def.minH)
    : firstFree([...cells.values()], def.w, def.h)
  const id = create<WidgetT>('widget', { type: def.type, ...wanted, gradient: def.gradient, ref })
  cells.set(id, wanted)
  const next = resolve(cells, id, wanted)
  const patches = [...next]
    .filter(([wid, c]) => wid !== id && (cells.get(wid)!.y !== c.y))
    .map(([wid, c]) => ({ id: wid, patch: c }))
  if (patches.length) updateMany(patches)
  return id
}

export function applyFigmaPreset(existing: Rec<WidgetT>[]) {
  // on repart d'un accueil propre pour que la maquette soit fidèle
  for (const w of existing) remove(w.id)
  for (const p of FIGMA_PRESET) create<WidgetT>('widget', p)
}

export default function Home(props: { onOpenDay: (d: string) => void }) {
  const widgets = useItems<WidgetT>('widget')
  const [editing, setEditing] = useState(false)
  const [catalog, setCatalog] = useState<{ slot?: { x: number; y: number } } | null>(null)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [convert, setConvert] = useState(false)
  const [showLists, setShowLists] = useState(false)
  const allLists = useItems<ListT>('list')
  const [toast, setToast] = useState<string | null>(null)
  const [palSheet, setPalSheet] = useState(false)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(t)
  }, [toast])

  const onAction = (a: string) => {
    if (a === 'convert') setConvert(true)
    if (a === 'day') props.onOpenDay(today())
  }

  const empty = widgets.length === 0

  return (
    <>
      <Header
        onAdd={() => setCatalog({})}
        addLabel="Ajouter un widget"
        extra={
          <>
            {allLists.length > 0 && (
              <button className="txt-btn" onClick={() => setShowLists(true)}>
                listes ({allLists.length})
              </button>
            )}
            <button className="txt-btn" onClick={() => setToast(nextPalette())}>
              couleurs
            </button>
            {editing ? (
              <button className="txt-btn on" onClick={() => setEditing(false)}>
                ok
              </button>
            ) : !empty ? (
              <button className="txt-btn" onClick={() => setEditing(true)}>
                modifier
              </button>
            ) : null}
          </>
        }
      />
      <main className="page home">
        {empty && !editing ? (
          <div className="home-empty">
            <p>Ton accueil est vide.</p>
            <p className="muted">Appuie sur + pour poser ton premier widget, où tu veux.</p>
            <button className="btn ghost" onClick={() => applyFigmaPreset(widgets)}>
              Reprendre la disposition de la maquette
            </button>
          </div>
        ) : (
          <WidgetGrid
            widgets={widgets}
            editing={editing}
            onEdit={setEditing}
            onAction={onAction}
            onSettings={setSettingsId}
            onSlot={(x, y) => setCatalog({ slot: { x, y } })}
          />
        )}
        {editing && <p className="muted center edit-hint">Glisse un widget pour le déplacer, tire le coin pour le redimensionner, touche-le pour le régler. Touche une case vide pour en ajouter un.</p>}
      </main>

      <Catalog
        state={catalog}
        onClose={() => setCatalog(null)}
        onPick={(def, ref) => {
          placeWidget(widgets, def, catalog?.slot, ref)
          setCatalog(null)
          setEditing(true)
        }}
      />
      <WidgetSettings id={settingsId} widgets={widgets} onClose={() => setSettingsId(null)} />
      {toast && (
        <div className="toast" role="status">
          <span>Palette : {toast}</span>
          <button onClick={() => (setToast(null), setPalSheet(true))}>Personnaliser</button>
        </div>
      )}
      <Sheet open={palSheet} onClose={() => setPalSheet(false)} title="Couleurs" tall>
        <PaletteEditor />
      </Sheet>
      <AllLists open={showLists} onClose={() => setShowLists(false)} />
      <ConvertSheet open={convert} onClose={() => setConvert(false)} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Catalogue : choisir un widget à poser                                */
/* ------------------------------------------------------------------ */

function Catalog(props: {
  state: { slot?: { x: number; y: number } } | null
  onClose: () => void
  onPick: (def: WidgetDef, ref?: string) => void
}) {
  const lists = useItems<ListT>('list')
  const [pickList, setPickList] = useState(false)
  const close = () => {
    setPickList(false)
    props.onClose()
  }
  if (!props.state) return null
  return (
    <Sheet open onClose={close} title={pickList ? 'Quelle liste épingler ?' : 'Ajouter un widget'} tall>
      {pickList ? (
        <>
          {lists.length === 0 && <Empty>Tu n'as pas encore de liste. Crée-en une dans « Listes ».</Empty>}
          <ul className="cat">
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  className="cat-item"
                  onClick={() => {
                    const def = widgetDef('list')!
                    setPickList(false)
                    props.onPick({ ...def, gradient: l.gradient }, l.id)
                  }}
                >
                  <i className="cat-chip" style={{ background: gradientCss(l.gradient) }} />
                  <span>
                    <strong>{l.name}</strong>
                    <small>{l.desc || 'Liste'}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button className="btn ghost" onClick={() => setPickList(false)}>
            Retour
          </button>
        </>
      ) : (
        <ul className="cat">
          {WIDGETS.map((d) => (
            <li key={d.type}>
              <button className="cat-item" onClick={() => (d.type === 'list' ? setPickList(true) : props.onPick(d))}>
                <i className="cat-chip" style={{ background: gradientCss(d.gradient) }} />
                <span>
                  <strong>{d.label}</strong>
                  <small>{d.blurb}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

/** Toutes les listes d'un coup d'œil, un toucher ouvre la liste. */
function AllLists({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lists = useItems<ListT>('list')
  const tasks = useItems<Task>('task')
  return (
    <Sheet open={open} onClose={onClose} title="Mes listes" tall>
      {lists.length === 0 && <Empty>Aucune liste pour l'instant.</Empty>}
      <ul className="cat">
        {[...lists].sort((a, b) => a.order - b.order).map((l) => {
          const mine = tasks.filter((t) => t.listId === l.id)
          const open = mine.filter((t) => !t.done).length
          return (
            <li key={l.id}>
              <button
                className="cat-item"
                onClick={() => {
                  onClose()
                  nav(`/listes/${l.id}`)
                }}
              >
                <i className="cat-chip" style={{ background: gradientCss(l.gradient) }} />
                <span>
                  <strong>{l.name}</strong>
                  <small>{mine.length ? `${open} à faire sur ${mine.length}` : 'Vide'}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="row-actions">
        <button
          className="btn"
          onClick={() => {
            onClose()
            nav('/listes')
          }}
        >
          Ouvrir la page Listes
        </button>
      </div>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Réglages d'un widget : nom, fond, taille                              */
/* ------------------------------------------------------------------ */

const SIZES = [
  { label: 'Petit', w: 2, h: 2 },
  { label: 'Large', w: 4, h: 2 },
  { label: 'Carré', w: 4, h: 4 },
  { label: 'Pleine largeur', w: 8, h: 3 },
  { label: 'Grand', w: 8, h: 6 },
]

function WidgetSettings(props: { id: string | null; widgets: Rec<WidgetT>[]; onClose: () => void }) {
  const rec = useItem<WidgetT>(props.id ?? undefined)
  if (!props.id || !rec) return null
  const def = widgetDef(rec.type)
  const resize = (w: number, h: number) => {
    const cell = clamp({ x: rec.x, y: rec.y, w, h }, def?.minW ?? 1, def?.minH ?? 2)
    const next = resolve(cellsOf(props.widgets), rec.id, cell)
    updateMany([...next].map(([id, c]) => ({ id, patch: c })))
  }
  return (
    <Sheet open onClose={props.onClose} title={def?.label ?? 'Widget'}>
      <label className="lbl">Nom affiché</label>
      <input
        className="field dark"
        defaultValue={rec.title ?? ''}
        placeholder={def?.label}
        onChange={(e) => update<WidgetT>(rec.id, { title: e.target.value || undefined })}
      />
      <label className="lbl">Fond</label>
      <GradientPicker value={rec.gradient} onChange={(g) => update<WidgetT>(rec.id, { gradient: g })} />
      <label className="lbl">Taille</label>
      <div className="chips">
        {SIZES.map((s) => (
          <button
            key={s.label}
            className={'chip' + (rec.w === s.w && rec.h === s.h ? ' on' : '')}
            disabled={!!def && (s.w < def.minW || s.h < def.minH)}
            onClick={() => resize(s.w, s.h)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="row-actions">
        <button
          className="btn ghost"
          onClick={() => {
            remove(rec.id)
            props.onClose()
          }}
        >
          Retirer
        </button>
        <button className="btn" onClick={props.onClose}>
          Terminé
        </button>
      </div>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* « Transformer en liste » : du texte brut -> une liste de tâches        */
/* ------------------------------------------------------------------ */

export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•–—]|\d+[.)]|\[[ xX]?\])\s*/, '').trim())
    .filter(Boolean)
}

function ConvertSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'jours' | 'texte'>('jours')
  const [name, setName] = useState('')
  const [gradient, setGradient] = useState('meadow')
  // --- depuis les jours
  const [start, setStart] = useState(today())
  const [span, setSpan] = useState(1)
  const [withEvents, setWithEvents] = useState(false)
  const [off, setOff] = useState<Set<string>>(new Set()) // éléments décochés
  // --- depuis du texte
  const [text, setText] = useState('')
  const [asEvents, setAsEvents] = useState(false)
  const [evDate, setEvDate] = useState(today())

  const lists = useItems<ListT>('list')
  const allTasks = useItems<Task>('task')
  const allEvents = useItems<EventT>('event')

  const end = addDays(start, span - 1)
  const inRange = (d?: string) => !!d && d >= start && d <= end
  const dayTasks = allTasks.filter((t) => !t.done && inRange(t.due)).sort((a, b) => a.due!.localeCompare(b.due!) || a.order - b.order)
  const dayEvents = withEvents ? allEvents.filter((e) => inRange(e.date)).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')) : []
  const picked = dayTasks.filter((t) => !off.has(t.id)).length + dayEvents.filter((e) => !off.has(e.id)).length
  const toggle = (id: string) =>
    setOff((o) => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const lines = parseLines(text)
  const count = mode === 'jours' ? picked : lines.length

  const finish = (id: string) => {
    setText('')
    setName('')
    setOff(new Set())
    onClose()
    nav(`/listes/${id}`)
  }

  const go = () => {
    if (!count) return
    const label = name.trim() || (mode === 'jours' ? (span === 1 ? `Journée du ${fmtShort(start)}` : `${fmtShort(start)} → ${fmtShort(end)}`) : 'Nouvelle liste')
    const id = create<ListT>('list', { name: label, desc: `${count} élément${count > 1 ? 's' : ''}`, gradient, order: lists.length })
    if (mode === 'jours') {
      // les tâches rejoignent la liste en gardant leur date : cocher ici ou dans le calendrier, c'est la même chose
      updateMany(dayTasks.filter((t) => !off.has(t.id)).map((t) => ({ id: t.id, patch: { listId: id } })))
      dayEvents
        .filter((e) => !off.has(e.id))
        .forEach((e, i) => create<Task>('task', { title: `${e.time ? e.time + ' ' : ''}${e.title}`, done: false, due: e.date, listId: id, projectId: e.projectId, order: Date.now() + i }))
    } else {
      lines.forEach((title, i) => {
        if (asEvents) {
          const m = title.match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/i)
          const time = m ? `${m[1].padStart(2, '0')}:${m[2] ?? '00'}` : undefined
          const clean = m ? title.replace(m[0], '').replace(/\s{2,}/g, ' ').replace(/^[\s,\-–—@à]+|[\s,\-–—@à]+$/g, '') || title : title
          create<EventT>('event', { title: clean, date: evDate, time, color: 'blue', desc: '', link: '', info: '' })
        }
        create<Task>('task', { title, done: false, listId: id, order: Date.now() + i })
      })
    }
    finish(id)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Transformer en liste" tall>
      <div className="chips">
        <button className={'chip' + (mode === 'jours' ? ' on' : '')} onClick={() => setMode('jours')}>
          Mes jours
        </button>
        <button className={'chip' + (mode === 'texte' ? ' on' : '')} onClick={() => setMode('texte')}>
          Du texte
        </button>
      </div>

      {mode === 'jours' ? (
        <>
          <p className="muted">Reprend les tâches à faire sur un ou plusieurs jours et en fait une liste à cocher.</p>
          <label className="lbl">À partir du</label>
          <input className="field dark" type="date" value={start} onChange={(e) => e.target.value && (setStart(e.target.value), setOff(new Set()))} />
          <label className="lbl">Sur combien de jours</label>
          <div className="chips">
            {[1, 2, 3, 7].map((n) => (
              <button key={n} className={'chip' + (span === n ? ' on' : '')} onClick={() => (setSpan(n), setOff(new Set()))}>
                {n === 1 ? '1 jour' : `${n} jours`}
              </button>
            ))}
          </div>
          <label className="check-line">
            <input type="checkbox" checked={withEvents} onChange={(e) => (setWithEvents(e.target.checked), setOff(new Set()))} />
            <span>Ajouter aussi les évènements de ces jours</span>
          </label>
          {dayTasks.length + dayEvents.length === 0 ? (
            <Empty>Rien à reprendre sur cette période.</Empty>
          ) : (
            <ul className="conv-preview">
              {[...dayTasks.map((t) => ({ id: t.id, label: t.title, date: t.due!, ev: false })), ...dayEvents.map((e) => ({ id: e.id, label: `${e.time ? e.time + ' ' : ''}${e.title}`, date: e.date, ev: true }))]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((it) => (
                  <li key={it.id}>
                    <label>
                      <input type="checkbox" checked={!off.has(it.id)} onChange={() => toggle(it.id)} />
                      <span>{it.label}</span>
                      <small>{it.ev ? 'évènement · ' : ''}{fmtShort(it.date)}</small>
                    </label>
                  </li>
                ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="muted">Colle des notes, un message, une liste de courses… chaque ligne devient une tâche.</p>
          <textarea
            className="field dark"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'- appeler le garage\n- dîner chez Léa 19h30\n3) envoyer le dossier'}
          />
          <label className="check-line">
            <input type="checkbox" checked={asEvents} onChange={(e) => setAsEvents(e.target.checked)} />
            <span>En faire aussi des évènements du calendrier (l'heure écrite dans la ligne est reprise)</span>
          </label>
          {asEvents && (
            <>
              <label className="lbl">Jour des évènements</label>
              <input className="field dark" type="date" value={evDate} onChange={(e) => e.target.value && setEvDate(e.target.value)} />
            </>
          )}
        </>
      )}

      <label className="lbl">Nom de la liste</label>
      <input className="field dark" value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'jours' ? 'Journée du ' + fmtShort(start) : 'Nouvelle liste'} />
      <label className="lbl">Fond</label>
      <GradientPicker value={gradient} onChange={setGradient} />
      <div className="row-actions">
        <button className="btn ghost" onClick={onClose}>
          Annuler
        </button>
        <button className="btn" disabled={!count} onClick={go}>
          Créer {count ? `(${count})` : ''}
        </button>
      </div>
    </Sheet>
  )
}
