import { useMemo, useSyncExternalStore } from 'react'
import { uid } from '../lib/ids'
import * as pb from './pocketbase'
import type { Item, Kind, Rec } from './types'

/**
 * Magasin "local d'abord" :
 *  - tout est lu/écrit en mémoire et recopié dans localStorage (donc rien n'est perdu quand on ferme l'app) ;
 *  - si un compte PocketBase est connecté, les changements sont poussés/tirés en arrière-plan.
 */

const KEY = 'kriterium:v1'

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'auth'

interface Snapshot {
  items: Record<string, Item>
  session: pb.Session | null
  /** valeur `updated` du dernier enregistrement serveur reçu */
  lastSync: string
  /** compte auquel appartiennent les données locales */
  owner: string | null
  pbUrl: string
  status: SyncStatus
  error: string
  lastSyncAt: number
}

function load(): Snapshot {
  const base: Snapshot = {
    items: {},
    session: null,
    lastSync: '',
    owner: null,
    pbUrl: pb.DEFAULT_URL,
    status: 'off',
    error: '',
    lastSyncAt: 0,
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Snapshot>
      return {
        ...base,
        items: p.items ?? {},
        session: p.session ?? null,
        lastSync: p.lastSync ?? '',
        owner: p.owner ?? null,
        pbUrl: p.pbUrl ?? base.pbUrl,
        lastSyncAt: p.lastSyncAt ?? 0,
        status: p.session ? 'idle' : 'off',
      }
    }
  } catch {
    /* stockage indisponible ou corrompu : on repart de zéro */
  }
  return base
}

let snap: Snapshot = load()
const listeners = new Set<() => void>()

let persistTimer: number | undefined
function persist() {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      const { items, session, lastSync, owner, pbUrl, lastSyncAt } = snap
      localStorage.setItem(KEY, JSON.stringify({ items, session, lastSync, owner, pbUrl, lastSyncAt }))
    } catch {
      /* quota dépassé / navigation privée */
    }
  }, 150)
}
// on force l'écriture quand l'onglet se ferme ou passe en arrière-plan
if (typeof window !== 'undefined') {
  const flush = () => {
    window.clearTimeout(persistTimer)
    try {
      const { items, session, lastSync, owner, pbUrl, lastSyncAt } = snap
      localStorage.setItem(KEY, JSON.stringify({ items, session, lastSync, owner, pbUrl, lastSyncAt }))
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

function set(patch: Partial<Snapshot>, save = true) {
  snap = { ...snap, ...patch }
  listeners.forEach((l) => l())
  if (save) persist()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => snap

export const useStore = () => useSyncExternalStore(subscribe, getSnapshot)
export const getState = () => snap

function toRec<T>(it: Item): Rec<T> {
  return { ...(it.data as object), id: it.id, u: it.u } as Rec<T>
}

export function list<T>(kind: Kind): Rec<T>[] {
  return Object.values(snap.items)
    .filter((i) => i.kind === kind && !i.deleted)
    .map((i) => toRec<T>(i))
}

export function useItems<T>(kind: Kind): Rec<T>[] {
  const { items } = useStore()
  return useMemo(
    () =>
      Object.values(items)
        .filter((i) => i.kind === kind && !i.deleted)
        .map((i) => toRec<T>(i)),
    [items, kind],
  )
}

export function useItem<T>(id: string | undefined): Rec<T> | undefined {
  const { items } = useStore()
  const it = id ? items[id] : undefined
  return useMemo(() => (it && !it.deleted ? toRec<T>(it) : undefined), [it])
}

export function create<T extends object>(kind: Kind, data: T, id: string = uid()): string {
  const item: Item = { id, kind, data: data as Record<string, unknown>, u: Date.now(), dirty: true, deleted: false }
  set({ items: { ...snap.items, [id]: item } })
  scheduleSync()
  return id
}

export function update<T extends object>(id: string, patch: Partial<T>) {
  const cur = snap.items[id]
  if (!cur) return
  const next: Item = {
    ...cur,
    data: { ...cur.data, ...(patch as object) },
    u: Math.max(Date.now(), cur.u + 1),
    dirty: true,
  }
  set({ items: { ...snap.items, [id]: next } })
  scheduleSync()
}

/** Plusieurs mises à jour en un seul rendu (déplacement de widgets par exemple). */
export function updateMany(patches: { id: string; patch: object }[]) {
  const items = { ...snap.items }
  const now = Date.now()
  for (const { id, patch } of patches) {
    const cur = items[id]
    if (!cur) continue
    items[id] = { ...cur, data: { ...cur.data, ...patch }, u: Math.max(now, cur.u + 1), dirty: true }
  }
  set({ items })
  scheduleSync()
}

export function remove(id: string) {
  const cur = snap.items[id]
  if (!cur) return
  set({ items: { ...snap.items, [id]: { ...cur, deleted: true, dirty: true, u: Math.max(Date.now(), cur.u + 1) } } })
  scheduleSync()
}

export function removeMany(ids: string[]) {
  const items = { ...snap.items }
  const now = Date.now()
  for (const id of ids) {
    const cur = items[id]
    if (cur) items[id] = { ...cur, deleted: true, dirty: true, u: Math.max(now, cur.u + 1) }
  }
  set({ items })
  scheduleSync()
}

export function exportData(): string {
  const items = Object.values(snap.items).filter((i) => !i.deleted)
  return JSON.stringify({ app: 'kriterium', exportedAt: new Date().toISOString(), items }, null, 2)
}

export function clearLocal() {
  set({ items: {}, lastSync: '', owner: snap.session?.userId ?? null })
  scheduleSync(100)
}

/* ------------------------------------------------------------------ */
/* Compte + synchronisation                                            */
/* ------------------------------------------------------------------ */

export function setPbUrl(url: string) {
  set({ pbUrl: url })
}

async function adopt(session: pb.Session) {
  // Les données locales d'un autre compte ne doivent pas être mélangées avec celui-ci.
  if (snap.owner && snap.owner !== session.userId) {
    set({ items: {}, lastSync: '' }, false)
  }
  set({ session, owner: session.userId, status: 'idle', error: '', pbUrl: session.url })
  await syncNow()
}

export async function signIn(url: string, email: string, password: string) {
  await adopt(await pb.login(url, email, password))
}

export async function signUp(url: string, email: string, password: string) {
  await adopt(await pb.register(url, email, password))
}

/** Ouvre Google (la page est quittée puis rechargée au retour : voir completeGoogle). */
export async function signInWithGoogle(url: string) {
  set({ pbUrl: url })
  await pb.startOAuth(url, 'google')
}

/** À appeler au démarrage : termine la connexion Google si on revient de chez Google. Renvoie un message d'erreur, 'ok', ou null. */
export async function completeGoogle(): Promise<string | null> {
  try {
    const session = await pb.finishOAuth()
    if (!session) return null
    await adopt(session)
    return 'ok'
  } catch (e) {
    return e instanceof TypeError ? "Serveur injoignable. Vérifie l'adresse de PocketBase." : e instanceof Error ? e.message : String(e)
  }
}

export function signOut() {
  set({ session: null, status: 'off', error: '' })
}

let syncing = false
let queued = false
let syncTimer: number | undefined

export function scheduleSync(delay = 1500) {
  if (!snap.session) return
  window.clearTimeout(syncTimer)
  syncTimer = window.setTimeout(() => void syncNow(), delay)
}

export async function syncNow() {
  const session = snap.session
  if (!session) return
  if (syncing) {
    queued = true
    return
  }
  syncing = true
  set({ status: 'syncing', error: '' }, false)
  try {
    // 1) envoyer ce qui a changé ici
    const dirty = Object.values(snap.items).filter((i) => i.dirty)
    for (const it of dirty) {
      await pb.upsert(session, it)
      const cur = snap.items[it.id]
      if (cur && cur.u === it.u) {
        set({ items: { ...snap.items, [it.id]: { ...cur, dirty: false } } })
      }
    }
    // 2) récupérer ce qui a changé ailleurs
    const { records, last } = await pb.pull(session, snap.lastSync)
    if (records.length) {
      const items = { ...snap.items }
      for (const r of records) {
        const local = items[r.id]
        if (local && local.dirty && local.u > r.u) continue // la version locale est plus récente
        if (local && !local.dirty && local.u > r.u) continue
        items[r.id] = { id: r.id, kind: r.kind, data: r.data, u: r.u, dirty: false, deleted: !!r.deleted }
      }
      set({ items })
    }
    set({ lastSync: last, status: 'idle', lastSyncAt: Date.now() })
  } catch (e) {
    if (e instanceof pb.HttpError && (e.status === 401 || e.status === 403)) {
      set({ status: 'auth', error: 'Session expirée, reconnecte-toi.' }, false)
    } else if (!navigator.onLine || e instanceof TypeError) {
      set({ status: 'offline', error: 'Serveur injoignable : tes données restent sur cet appareil.' }, false)
    } else {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) }, false)
    }
  } finally {
    syncing = false
    if (queued) {
      queued = false
      void syncNow()
    }
  }
}

/** À appeler au démarrage : renouvelle le jeton et lance une première synchro. */
export async function boot() {
  if (!snap.session) return
  try {
    const s = await pb.refresh(snap.session)
    set({ session: s })
  } catch (e) {
    if (e instanceof pb.HttpError && (e.status === 401 || e.status === 403)) {
      set({ status: 'auth', error: 'Session expirée, reconnecte-toi.' }, false)
      return
    }
  }
  await syncNow()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow()
  }, 60_000)
}
