import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { back, nav } from '../lib/router'
import { EVENT_COLORS, GRADIENTS } from '../lib/palette'

/* ------------------------------------------------------------------ */
/* En-tête : "kriterium" + titre + « + » (le trait croisé de la maquette) */
/* ------------------------------------------------------------------ */

export function Header(props: {
  title?: string
  onAdd?: () => void
  addLabel?: string
  /** boutons supplémentaires à gauche du « + » */
  extra?: ReactNode
  showBack?: boolean
  italicTitle?: boolean
}) {
  const { title, onAdd, extra, showBack } = props
  return (
    <header className={'hdr' + (title ? ' hdr--title' : '')}>
      <button className="wordmark" onClick={() => nav('/')} aria-label="Accueil">
        kriterium
      </button>
      <div className="hdr-actions">
        {extra}
        <button className="icon-btn" onClick={() => nav('/reglages')} aria-label="Réglages">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
          </svg>
        </button>
        {onAdd && (
          <button className="plus" onClick={onAdd} aria-label={props.addLabel ?? 'Ajouter'}>
            <i />
            <i />
          </button>
        )}
      </div>
      {title && (
        <h1 className="title">
          {showBack && (
            <button className="back" onClick={() => back('/')} aria-label="Retour">
              ‹
            </button>
          )}
          {title}
        </h1>
      )}
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Feuille modale qui monte du bas                                       */
/* ------------------------------------------------------------------ */

export function Sheet(props: { open: boolean; onClose: () => void; title?: string; children: ReactNode; tall?: boolean }) {
  const { open, onClose } = props
  const ref = useRef<HTMLDivElement>(null)
  const ov = useRef<HTMLDivElement>(null)
  // Sur téléphone, le clavier réduit la zone visible sans réduire la page : on cale la feuille sur la zone réellement visible
  useEffect(() => {
    if (!open) return
    const vv = window.visualViewport
    if (!vv) return
    const fit = () => {
      const el = ov.current
      if (!el) return
      el.style.top = vv.offsetTop + 'px'
      el.style.bottom = 'auto'
      el.style.height = vv.height + 'px'
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-ov" ref={ov} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'sheet' + (props.tall ? ' sheet--tall' : '')} ref={ref} role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="sheet-grip" />
        {props.title && <h2 className="sheet-title">{props.title}</h2>}
        {props.children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Petits composants                                                     */
/* ------------------------------------------------------------------ */

export function Check({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      className={'chk' + (on ? ' on' : '')}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      role="checkbox"
      aria-checked={on}
      aria-label={label ?? 'Terminer'}
    >
      {on && (
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      )}
    </button>
  )
}

export function GradientPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Fond">
      {GRADIENTS.map((g) => (
        <button
          key={g.id}
          className={'swatch' + (value === g.id ? ' sel' : '')}
          style={{ background: g.css } as CSSProperties}
          onClick={() => onChange(g.id)}
          role="radio"
          aria-checked={value === g.id}
          aria-label={g.label}
          title={g.label}
        />
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="swatches swatches--event" role="radiogroup" aria-label="Couleur">
      {EVENT_COLORS.map((c) => (
        <button
          key={c.id}
          className={'swatch' + (value === c.id ? ' sel' : '')}
          style={{ background: c.css } as CSSProperties}
          onClick={() => onChange(c.id)}
          role="radio"
          aria-checked={value === c.id}
          aria-label={c.label}
          title={c.label}
        />
      ))}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

/** Ligne « ajouter » : un champ + validation avec Entrée. */
export function AddRow(props: { placeholder: string; onAdd: (text: string) => void; dark?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const submit = () => {
    const v = ref.current?.value.trim()
    if (!v) return
    props.onAdd(v)
    if (ref.current) ref.current.value = ''
  }
  return (
    <form
      className="addrow"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input ref={ref} className={'field' + (props.dark ? ' dark' : '')} placeholder={props.placeholder} enterKeyHint="done" />
      <button className="btn" type="submit" aria-label="Ajouter">
        +
      </button>
    </form>
  )
}
