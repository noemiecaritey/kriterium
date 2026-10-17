import { useEffect, useState } from 'react'

/** Jours fériés français via l'API publique calendrier.api.gouv.fr. */

type Holidays = Record<string, string>
const mem: Record<number, Holidays> = {}
const listeners = new Set<() => void>()

async function loadYear(year: number) {
  if (mem[year]) return
  const key = `kriterium:holidays:${year}`
  try {
    const c = localStorage.getItem(key)
    if (c) {
      mem[year] = JSON.parse(c)
      return
    }
  } catch {
    /* ignore */
  }
  mem[year] = {} // évite les appels en double pendant le chargement
  try {
    const res = await fetch(`https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`)
    if (!res.ok) throw new Error(String(res.status))
    mem[year] = (await res.json()) as Holidays
    try {
      localStorage.setItem(key, JSON.stringify(mem[year]))
    } catch {
      /* ignore */
    }
  } catch {
    delete mem[year] // on réessaiera au prochain démarrage
  }
  listeners.forEach((l) => l())
}

/** Renvoie une fonction `nom du jour férié | undefined` pour une date YYYY-MM-DD. */
export function useHolidays(years: number[]): (day: string) => string | undefined {
  const [, force] = useState(0)
  const key = years.join(',')
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    years.forEach((y) => void loadYear(y).then(l))
    return () => {
      listeners.delete(l)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return (day: string) => mem[Number(day.slice(0, 4))]?.[day]
}
