import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { remove, updateMany, useItem } from '../data/store'
import type { ListT, Rec, WidgetT } from '../data/types'
import { nav } from '../lib/router'
import { gradientCss } from '../lib/palette'
import { widgetDef } from './widgets'

export const COLS = 8
export const GAP = 6
export const ROW = 34

export interface Cell {
  x: number
  y: number
  w: number
  h: number
}

const overlap = (a: Cell, b: Cell) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/**
 * Place `fixedId` à `cell`, puis repousse vers le bas tout ce qui le gêne.
 * Pas de "gravité" : un widget posé plus bas laisse le haut vide, exactement comme on l'a placé.
 */
export function resolve(cells: Map<string, Cell>, fixedId: string, cell: Cell): Map<string, Cell> {
  const out = new Map<string, Cell>()
  const fixed = clamp(cell)
  out.set(fixedId, fixed)
  const placed: Cell[] = [fixed]
  const others = [...cells.entries()]
    .filter(([id]) => id !== fixedId)
    .sort(([, a], [, b]) => a.y - b.y || a.x - b.x)
  for (const [id, c0] of others) {
    const c = { ...c0 }
    for (let guard = 0; guard < 200; guard++) {
      const hit = placed.find((p) => overlap(p, c))
      if (!hit) break
      c.y = hit.y + hit.h
    }
    out.set(id, c)
    placed.push(c)
  }
  return out
}

export function clamp(c: Cell, minW = 1, minH = 2): Cell {
  const w = Math.min(COLS, Math.max(minW, c.w))
  const h = Math.min(12, Math.max(minH, c.h))
  return { w, h, x: Math.min(COLS - w, Math.max(0, c.x)), y: Math.max(0, c.y) }
}

/** Première place libre (en haut à gauche d'abord) pour un widget de taille w×h. */
export function firstFree(cells: Cell[], w: number, h: number): Cell {
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x + w <= COLS; x++) {
      const c = { x, y, w, h }
      if (!cells.some((o) => overlap(o, c))) return c
    }
  }
  return { x: 0, y: 0, w, h }
}

interface DragState {
  id: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  dx: number
  dy: number
  origin: Cell
  cell: Cell
  moved: boolean
}

export function WidgetGrid(props: {
  widgets: Rec<WidgetT>[]
  editing: boolean
  onEdit: (on: boolean) => void
  onAction: (action: string) => void
  onSettings: (id: string) => void
  onSlot: (x: number, y: number) => void
}) {
  const { widgets, editing, onEdit, onAction, onSettings, onSlot } = props
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(374)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  const press = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth || 374)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const colW = (width - GAP * (COLS - 1)) / COLS
  const px = (x: number) => x * (colW + GAP)
  const py = (y: number) => y * (ROW + GAP)
  const pw = (w: number) => w * colW + (w - 1) * GAP
  const ph = (h: number) => h * ROW + (h - 1) * GAP

  const base = useMemo(() => {
    const m = new Map<string, Cell>()
    for (const w of widgets) m.set(w.id, { x: w.x, y: w.y, w: w.w, h: w.h })
    return m
  }, [widgets])

  // pendant un glissement, tout le monde se réarrange en direct
  const layout = useMemo(() => (drag ? resolve(base, drag.id, drag.cell) : base), [base, drag])

  const bottom = Math.max(0, ...[...layout.values()].map((c) => c.y + c.h))
  const rows = editing ? Math.max(bottom + 3, 8) : bottom
  const height = rows > 0 ? ph(rows) : 0

  /* ---------------- gestes ---------------- */

  const onDown = (e: RPointerEvent<HTMLDivElement>, rec: Rec<WidgetT>, mode: 'move' | 'resize') => {
    if ((e.target as HTMLElement).closest('[data-nodrag]')) return
    const origin = base.get(rec.id)!
    if (!editing) {
      // appui long = passer en mode édition
      const sx = e.clientX
      const sy = e.clientY
      window.clearTimeout(press.current)
      press.current = window.setTimeout(() => {
        navigator.vibrate?.(15)
        onEdit(true)
      }, 550)
      const cancel = (ev: PointerEvent) => {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) stop()
      }
      const stop = () => {
        window.clearTimeout(press.current)
        window.removeEventListener('pointermove', cancel)
        window.removeEventListener('pointerup', stop)
        window.removeEventListener('pointercancel', stop)
      }
      window.addEventListener('pointermove', cancel)
      window.addEventListener('pointerup', stop)
      window.addEventListener('pointercancel', stop)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ id: rec.id, mode, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, origin, cell: origin, moved: false })
  }

  const onMove = (e: RPointerEvent<HTMLDivElement>, rec: Rec<WidgetT>) => {
    const d = dragRef.current
    if (!d || d.id !== rec.id) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    const moved = d.moved || Math.hypot(dx, dy) > 6
    const def = widgetDef(rec.type)
    const dc = Math.round(dx / (colW + GAP))
    const dr = Math.round(dy / (ROW + GAP))
    const cell =
      d.mode === 'move'
        ? clamp({ ...d.origin, x: d.origin.x + dc, y: d.origin.y + dr })
        : clamp({ ...d.origin, w: d.origin.w + dc, h: d.origin.h + dr }, def?.minW ?? 1, def?.minH ?? 2)
    // on borne le résultat pour ne pas dépasser le bord droit
    const fitted = d.mode === 'resize' ? { ...cell, w: Math.min(cell.w, COLS - d.origin.x) } : cell
    setDrag({ ...d, dx, dy, cell: fitted, moved })
  }

  const onUp = (rec: Rec<WidgetT>) => {
    const d = dragRef.current
    if (!d || d.id !== rec.id) return
    setDrag(null)
    if (!d.moved) {
      onSettings(rec.id) // simple toucher en mode édition = réglages du widget
      return
    }
    const next = resolve(base, d.id, d.cell)
    const patches: { id: string; patch: Cell }[] = []
    for (const [id, c] of next) {
      const o = base.get(id)
      if (!o || o.x !== c.x || o.y !== c.y || o.w !== c.w || o.h !== c.h) patches.push({ id, patch: c })
    }
    if (patches.length) updateMany(patches)
  }

  // sortie du mode édition avec Échap
  useEffect(() => {
    if (!editing) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onEdit(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [editing, onEdit])

  const dragged = drag?.moved ? drag : null

  return (
    <div
      ref={boxRef}
      className={'wgrid' + (editing ? ' editing' : '')}
      style={{ height }}
      data-testid="widget-grid"
    >
      {editing &&
        Array.from({ length: rows * COLS }, (_, i) => {
          const x = i % COLS
          const y = Math.floor(i / COLS)
          return (
            <button
              key={i}
              className="slot"
              style={{ left: px(x), top: py(y), width: colW, height: ROW }}
              onClick={() => onSlot(x, y)}
              aria-label={`Ajouter un widget ici (colonne ${x + 1}, ligne ${y + 1})`}
              tabIndex={-1}
            />
          )
        })}

      {dragged && (
        <div
          className="drop"
          style={{ left: px(dragged.cell.x), top: py(dragged.cell.y), width: pw(dragged.cell.w), height: ph(dragged.cell.h) }}
        />
      )}

      {widgets.map((rec) => {
        const c = layout.get(rec.id) ?? { x: rec.x, y: rec.y, w: rec.w, h: rec.h }
        const isDragged = dragged?.id === rec.id
        const free = isDragged && dragged.mode === 'move'
        const left = free ? px(dragged.origin.x) + dragged.dx : px(c.x)
        const top = free ? py(dragged.origin.y) + dragged.dy : py(c.y)
        const w = isDragged && dragged.mode === 'resize' ? pw(Math.max(1, dragged.origin.w)) + dragged.dx : pw(c.w)
        const h = isDragged && dragged.mode === 'resize' ? ph(Math.max(1, dragged.origin.h)) + dragged.dy : ph(c.h)
        return (
          <Tile
            key={rec.id}
            rec={rec}
            cell={c}
            style={{ left, top, width: Math.max(40, w), height: Math.max(40, h) }}
            editing={editing}
            lifted={isDragged}
            onDown={(e, mode) => onDown(e, rec, mode)}
            onMove={(e) => onMove(e, rec)}
            onUp={() => onUp(rec)}
            onAction={onAction}
          />
        )
      })}
    </div>
  )
}

function Tile(props: {
  rec: Rec<WidgetT>
  cell: Cell
  style: React.CSSProperties
  editing: boolean
  lifted: boolean
  onDown: (e: RPointerEvent<HTMLDivElement>, mode: 'move' | 'resize') => void
  onMove: (e: RPointerEvent<HTMLDivElement>) => void
  onUp: () => void
  onAction: (a: string) => void
}) {
  const { rec, cell, editing, lifted } = props
  const def = widgetDef(rec.type)
  const list = useItem<ListT>(rec.type === 'list' ? rec.ref : undefined)
  if (!def) return null
  const title = rec.title || (rec.type === 'list' && list ? list.name : def.label)
  const tap = rec.type === 'list' && list ? `/listes/${list.id}` : def.tap
  const size = cell.h >= 4 ? 'xl' : cell.h === 3 ? 'l' : cell.w <= 2 ? 's' : 'm'
  // le titre rétrécit si son plus long mot ne tient pas dans la tuile
  const base = { xl: 44, l: 38, m: 24, s: 22 }[size]
  const longest = Math.max(...title.split(/\s+/).map((w) => w.length), 1)
  const fit = Math.floor((Number(props.style.width) - 22) / (longest * 0.6))
  const fontSize = rec.type === 'reschedule' && !rec.title ? 17 : Math.max(14, Math.min(base, fit))
  const Body = def.Body

  const activate = (e: React.MouseEvent) => {
    if (editing) return
    if ((e.target as HTMLElement).closest('button,input,a,label,textarea')) return
    if (!tap) return
    if (tap.startsWith('/')) nav(tap)
    else props.onAction(tap)
  }

  return (
    <div
      className={'tile' + (editing ? ' editing' : '') + (lifted ? ' lifted' : '') + (tap ? ' tappable' : '')}
      style={{ ...props.style, background: gradientCss(rec.gradient) }}
      data-type={rec.type}
      onPointerDown={(e) => props.onDown(e, 'move')}
      onPointerMove={props.onMove}
      onPointerUp={props.onUp}
      onPointerCancel={props.onUp}
      onClick={activate}
      onContextMenu={(e) => editing && e.preventDefault()}
      role={tap ? 'button' : undefined}
      aria-label={editing ? `${title} : toucher pour régler, glisser pour déplacer` : title}
    >
      <h2 className={'tile-title t-' + size} style={{ fontSize }}>
        {rec.type === 'reschedule' && !rec.title ? (
          <>
            Tâches à <span className="sm">reprogrammer</span>
          </>
        ) : (
          title
        )}
      </h2>
      <div className="tile-body">
        <Body rec={rec} />
      </div>
      {editing && (
        <>
          <button
            data-nodrag
            className="tile-x"
            aria-label={`Retirer ${title}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              remove(rec.id)
            }}
          >
            ×
          </button>
          <div
            className="tile-rs"
            aria-label="Redimensionner"
            onPointerDown={(e) => {
              e.stopPropagation()
              props.onDown(e, 'resize')
            }}
          />
        </>
      )}
    </div>
  )
}
