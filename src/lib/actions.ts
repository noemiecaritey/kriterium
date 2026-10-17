import { useSyncExternalStore } from 'react'
import { create, list, update } from '../data/store'
import type { CardT, Rec, Task } from '../data/types'
import { dayOf, addDays, today } from './dates'
import { drawArtwork } from './met'

/* ------------------------------------------------------------------ */
/* Récompenses : une œuvre du Met par tâche terminée                    */
/* ------------------------------------------------------------------ */

let queue: string[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const inFlight = new Set<string>()

export function useReward(): { cardId: string | null; dismiss: () => void } {
  const head = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => queue[0] ?? null,
  )
  return {
    cardId: head,
    dismiss: () => {
      queue = queue.slice(1)
      emit()
    },
  }
}

export async function resolveCard(id: string): Promise<void> {
  if (inFlight.has(id)) return
  inFlight.add(id)
  try {
    const a = await drawArtwork()
    update<CardT>(id, {
      status: 'ready',
      objectId: a.objectId,
      title: a.title,
      artist: a.artist,
      year: a.year,
      medium: a.medium,
      dept: a.dept,
      image: a.image,
      imageLarge: a.imageLarge,
      url: a.url,
    })
  } catch {
    /* hors ligne : la carte reste « en attente » et sera révélée plus tard */
  } finally {
    inFlight.delete(id)
  }
}

/** Révèle les cartes gagnées hors ligne. */
export function resolvePending() {
  for (const c of list<CardT>('card')) if (c.status === 'pending') void resolveCard(c.id)
}

export function awardForTask(title: string) {
  const id = create<CardT>('card', { taskTitle: title, wonAt: Date.now(), status: 'pending' })
  queue = [...queue, id]
  emit()
  void resolveCard(id)
}

/** Coche / décoche une tâche. La première fois qu'elle est terminée, elle rapporte une œuvre. */
export function toggleTask(t: Rec<Task>) {
  const done = !t.done
  update<Task>(t.id, { done, doneAt: done ? Date.now() : undefined })
  if (done && !t.rewarded) {
    update<Task>(t.id, { rewarded: true })
    awardForTask(t.title)
  }
}

/* ------------------------------------------------------------------ */
/* Statistiques                                                         */
/* ------------------------------------------------------------------ */

export function doneByDay(tasks: Rec<Task>[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of tasks) {
    if (t.done && t.doneAt) {
      const d = dayOf(t.doneAt)
      m.set(d, (m.get(d) ?? 0) + 1)
    }
  }
  return m
}

/** Série en cours (jours consécutifs avec au moins une tâche terminée) et meilleure série. */
export function streaks(tasks: Rec<Task>[]): { current: number; best: number } {
  const days = doneByDay(tasks)
  let current = 0
  let cursor = today()
  if (!days.has(cursor)) cursor = addDays(cursor, -1) // la série n'est pas cassée tant que la journée n'est pas finie
  while (days.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  const sorted = [...days.keys()].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return { current, best }
}
