import { useEffect, useRef, useState } from 'react'
import { Calendar } from './components/Calendar'
import { DaySheet } from './components/DaySheet'
import { RewardModal } from './components/Reward'
import { boot, completeGoogle, useItems } from './data/store'
import type { EventT } from './data/types'
import { resolvePending } from './lib/actions'
import { today } from './lib/dates'
import { scheduleReminders } from './lib/notify'
import { nav, useRoute } from './lib/router'
import { EventEditor, EventsList } from './pages/Events'
import { Gallery } from './pages/Gallery'
import Home from './pages/Home'
import { ListDetail, Lists } from './pages/Lists'
import { MoodPage } from './pages/Mood'
import { Notes } from './pages/Notes'
import { ProjectDetail, ProjectsList } from './pages/Projects'
import { Reschedule } from './pages/Reschedule'
import { Settings } from './pages/Settings'
import { Shopping } from './pages/Shopping'
import { Stats } from './pages/Stats'
import { usePalette } from './lib/palette'
import { Horizon } from './components/Horizon'

export default function App() {
  usePalette() // redessine tout quand la palette change
  const route = useRoute()
  const [selected, setSelected] = useState(today())
  const [day, setDay] = useState<string | null>(null)
  // hauteur choisie pour la zone du haut (null = automatique), gardée sur l'appareil
  const [topH, setTopH] = useState<number | null>(() => {
    try {
      const v = Number(localStorage.getItem('kriterium:split'))
      return v > 0 ? v : null
    } catch {
      return null
    }
  })
  const topRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    try {
      if (topH) localStorage.setItem('kriterium:split', String(topH))
      else localStorage.removeItem('kriterium:split')
    } catch {
      /* ignore */
    }
  }, [topH])
  const events = useItems<EventT>('event')
  const [a, b] = route.parts

  useEffect(() => {
    // retour de Google ? on termine la connexion, sinon démarrage normal
    void completeGoogle().then((r) => {
      if (r) {
        if (r !== 'ok') sessionStorage.setItem('kriterium:authmsg', r)
        nav('/reglages')
      } else void boot()
    })
    resolvePending()
    const on = () => resolvePending()
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [])

  useEffect(() => scheduleReminders(events), [events])

  // /evenements/new?date=2026-10-20&project=abc : on arrive avec la date déjà choisie
  const qDate = route.query.get('date')
  useEffect(() => {
    if (qDate) setSelected(qDate)
  }, [qDate])

  // en changeant de page on repart d'aujourd'hui (sauf si la date vient de l'adresse, ou si on modifie un évènement)
  useEffect(() => {
    if (!qDate && !(a === 'evenements' && b && b !== 'new')) setSelected(today())
  }, [a, b, qDate])

  // changer de page (ex. toucher le nom d'un projet) referme la feuille du jour
  const here = route.parts.join('/')
  useEffect(() => setDay(null), [here])

  const picksDate = a === 'evenements' && !!b
  const quiet = picksDate || a === 'humeur'
  const projectId = a === 'projets' && b ? b : undefined

  let page
  switch (a) {
    case undefined:
      page = <Home onOpenDay={setDay} />
      break
    case 'listes':
      page = b ? <ListDetail key={b} id={b} /> : <Lists />
      break
    case 'evenements':
      page = !b ? (
        <EventsList />
      ) : b === 'new' ? (
        <EventEditor key="new" date={selected} setDate={setSelected} projectId={route.query.get('project') ?? undefined} />
      ) : (
        <EventEditor key={b} id={b} date={selected} setDate={setSelected} />
      )
      break
    case 'projets':
      page = b ? <ProjectDetail key={b} id={b} selectedDate={selected} /> : <ProjectsList />
      break
    case 'notes':
      page = <Notes />
      break
    case 'humeur':
      page = <MoodPage selected={selected} />
      break
    case 'courses':
      page = <Shopping />
      break
    case 'reprogrammer':
      page = <Reschedule />
      break
    case 'galerie':
      page = <Gallery />
      break
    case 'stats':
      page = <Stats />
      break
    case 'reglages':
      page = <Settings />
      break
    default:
      page = <Home onOpenDay={setDay} />
  }

  return (
    <div className="app">
      <div className="top" ref={topRef} style={topH ? { height: topH, maxHeight: 'calc(100dvh - 150px)', flex: 'none' } : undefined}>
        {page}
      </div>
      <div
        className="split"
        role="separator"
        aria-label="Agrandir ou réduire la zone du haut (glisse, ou touche pour basculer)"
        onPointerDown={(e) => {
          const el = topRef.current
          if (!el) return
          const startY = e.clientY
          const startH = el.getBoundingClientRect().height
          let moved = false
          const mv = (ev: PointerEvent) => {
            const dy = ev.clientY - startY
            if (Math.abs(dy) > 4) moved = true
            if (moved) setTopH(Math.max(90, Math.min(window.innerHeight - 150, Math.round(startH + dy))))
          }
          const up = () => {
            window.removeEventListener('pointermove', mv)
            window.removeEventListener('pointerup', up)
            window.removeEventListener('pointercancel', up)
            // simple toucher : bascule entre « tout en haut » et la disposition normale
            if (!moved) setTopH((h) => (h ? null : window.innerHeight - 150))
          }
          window.addEventListener('pointermove', mv)
          window.addEventListener('pointerup', up)
          window.addEventListener('pointercancel', up)
        }}
      >
        <i />
      </div>
      <Calendar
        selected={quiet ? selected : null}
        projectId={projectId}
        onSelect={(d) => {
          setSelected(d)
          if (!quiet) setDay(d)
        }}
      />
      <Horizon />
      <DaySheet day={day} onClose={() => setDay(null)} />
      <RewardModal />
    </div>
  )
}
