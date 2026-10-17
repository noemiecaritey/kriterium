import { useEffect, useState } from 'react'
import { create, update, useItems } from '../data/store'
import type { Mood } from '../data/types'
import { addDays, fmtLong, parseYmd, today } from '../lib/dates'
import { MOODS, moodColor } from '../lib/palette'
import { Header } from '../ui/ui'

const DAYS = 30

/** Humeur du jour (ou du jour touché dans le calendrier) + courbe sur 30 jours. */
export function MoodPage({ selected }: { selected: string }) {
  const moods = useItems<Mood>('mood')
  const cur = moods.find((m) => m.date === selected)
  const [note, setNote] = useState('')
  useEffect(() => setNote(cur?.note ?? ''), [cur?.id, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (value: number) => {
    if (cur) update<Mood>(cur.id, { value })
    else create<Mood>('mood', { date: selected, value, note: note || undefined })
  }

  const t0 = today()
  const days = Array.from({ length: DAYS }, (_, i) => addDays(t0, i - (DAYS - 1)))
  const byDate = new Map(moods.map((m) => [m.date, m.value]))
  const W = 374
  const H = 150
  const pad = 14
  const x = (i: number) => pad + (i * (W - pad * 2)) / (DAYS - 1)
  const y = (v: number) => H - pad - ((v - 1) * (H - pad * 2)) / 4
  const segments: string[] = []
  let current = ''
  days.forEach((d, i) => {
    const v = byDate.get(d)
    if (v === undefined) {
      if (current) segments.push(current)
      current = ''
    } else current += `${current ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `
  })
  if (current) segments.push(current)
  const last7 = days.slice(-7).map((d) => byDate.get(d)).filter((v): v is number => v !== undefined)
  const avg = last7.length ? (last7.reduce((a, b) => a + b, 0) / last7.length).toFixed(1) : null

  return (
    <>
      <Header title="Humeur" showBack />
      <main className="page">
        <p className="muted">{selected === t0 ? "Aujourd'hui" : fmtLong(selected)} — touche un autre jour du calendrier pour le modifier.</p>
        <div className="mood-pick" role="radiogroup" aria-label="Humeur">
          {MOODS.map((m) => (
            <button
              key={m.value}
              role="radio"
              aria-checked={cur?.value === m.value}
              className={'mood-big' + (cur?.value === m.value ? ' on' : '')}
              style={{ background: m.color }}
              onClick={() => set(m.value)}
            >
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <textarea
          className="field dark"
          rows={2}
          value={note}
          placeholder="Un mot sur la journée (facultatif)"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => cur && note !== (cur.note ?? '') && update<Mood>(cur.id, { note: note || undefined })}
        />

        <h3 className="sec">30 derniers jours{avg ? ` · moyenne 7 j : ${avg}/5` : ''}</h3>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Courbe d'humeur">
          {[1, 2, 3, 4, 5].map((v) => (
            <line key={v} x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="#363636" strokeWidth="0.5" />
          ))}
          {segments.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#d8dfe9" strokeWidth="1.2" />
          ))}
          {days.map((d, i) => {
            const v = byDate.get(d)
            return v === undefined ? null : <circle key={d} cx={x(i)} cy={y(v)} r={d === selected ? 6 : 4.5} fill={moodColor(v)} stroke={d === selected ? '#fff' : 'none'} />
          })}
        </svg>
        <div className="chart-axis">
          <span>{parseYmd(days[0]).getDate()}/{parseYmd(days[0]).getMonth() + 1}</span>
          <span>aujourd'hui</span>
        </div>
      </main>
    </>
  )
}
