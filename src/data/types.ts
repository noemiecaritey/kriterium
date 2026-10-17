export type Kind = 'task' | 'list' | 'event' | 'project' | 'note' | 'mood' | 'shop' | 'card' | 'widget'

/** Enregistrement générique stocké localement et synchronisé avec PocketBase (collection `items`). */
export interface Item<T = Record<string, unknown>> {
  id: string
  kind: Kind
  data: T
  /** Horodatage (ms) de la dernière modification locale : sert à résoudre les conflits. */
  u: number
  /** Modifié localement et pas encore envoyé au serveur. */
  dirty: boolean
  /** Suppression logique (pour que la suppression se propage). */
  deleted: boolean
}

/** Donnée + id, plus pratique à manipuler dans l'UI. */
export type Rec<T> = T & { id: string; u: number }

export interface Task {
  title: string
  done: boolean
  doneAt?: number
  due?: string // YYYY-MM-DD
  listId?: string
  projectId?: string
  rewarded?: boolean
  order: number
}

export interface ListT {
  name: string
  desc: string
  gradient: string
  order: number
}

export interface EventT {
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  color: string
  desc: string
  link: string
  info: string
  projectId?: string
  /** gros rendez-vous : une jauge en bas de l'écran compte le temps qui reste */
  major?: boolean
  /** début de la jauge (création du rendez-vous par défaut) */
  startAt?: number
  /** minutes avant l'évènement ; null/undefined = pas de rappel */
  remind?: number | null
}

export interface Project {
  name: string
  space: string
  gradient: string
}

export interface Note {
  text: string
  url?: string
  projectId?: string
  createdAt: number
}

export interface Mood {
  date: string
  value: number
  note?: string
}

export interface Shop {
  name: string
  done: boolean
  order: number
}

export interface CardT {
  taskTitle: string
  wonAt: number
  status: 'pending' | 'ready'
  objectId?: number
  title?: string
  artist?: string
  year?: string
  medium?: string
  dept?: string
  image?: string
  imageLarge?: string
  url?: string
}

export interface WidgetT {
  type: string
  x: number
  y: number
  w: number
  h: number
  gradient: string
  title?: string
  ref?: string
}
