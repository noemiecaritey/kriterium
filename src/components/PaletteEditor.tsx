import { COLOR_LABELS, PRESETS, randomColors, setCustom, setPreset, usePalette, type Colors } from '../lib/palette'

/** Choisir une palette toute faite, en composer une avec ses couleurs, ou en tirer une au hasard. */
export function PaletteEditor() {
  const cur = usePalette()
  const keys = Object.keys(COLOR_LABELS) as (keyof Colors)[]
  return (
    <div className="pal">
      <ul className="pal-list">
        {PRESETS.map((p) => (
          <li key={p.id}>
            <button className={'pal-item' + (cur.id === p.id ? ' on' : '')} onClick={() => setPreset(p.id)}>
              <span className="pal-dots">
                {keys.map((k) => (
                  <i key={k} style={{ background: p.colors[k] }} />
                ))}
              </span>
              <span>{p.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <label className="lbl">Tes couleurs{cur.id === 'perso' ? ' (palette perso active)' : ''}</label>
      <div className="pal-custom">
        {keys.map((k) => (
          <label key={k} className="pal-pick">
            <input type="color" value={cur.colors[k]} onChange={(e) => setCustom({ ...cur.colors, [k]: e.target.value })} aria-label={COLOR_LABELS[k]} />
            <span>{COLOR_LABELS[k]}</span>
          </label>
        ))}
      </div>
      <div className="row-actions">
        <button className="btn ghost" onClick={() => setPreset('maquette')}>
          Maquette
        </button>
        <button className="btn" onClick={() => setCustom(randomColors())}>
          Au hasard
        </button>
      </div>
    </div>
  )
}
