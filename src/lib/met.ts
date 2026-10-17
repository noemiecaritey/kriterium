/**
 * Met Museum Open Access (même jeu de données que https://github.com/metmuseum/openaccess),
 * lu via l'API publique : https://metmuseum.github.io/ — pas de clé nécessaire.
 */
const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

export interface Artwork {
  objectId: number
  title: string
  artist: string
  year: string
  medium: string
  dept: string
  image: string
  imageLarge: string
  url: string
}

/** Thèmes de recherche : un tirage = un thème au hasard puis une œuvre au hasard dedans. */
const THEMES = [
  'painting', 'portrait', 'landscape', 'still life', 'sculpture', 'flowers', 'garden', 'sea',
  'night', 'horse', 'woman', 'japan', 'egypt', 'armor', 'textile', 'impressionism', 'ceramic',
  'bird', 'mountain', 'city', 'ship', 'cat', 'moon', 'river',
]

interface MetObject {
  objectID: number
  title: string
  artistDisplayName: string
  objectDate: string
  medium: string
  department: string
  primaryImage: string
  primaryImageSmall: string
  objectURL: string
  isPublicDomain: boolean
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Met API ${res.status}`)
  return (await res.json()) as T
}

/** Liste des identifiants d'un thème, mise en cache (localStorage) pour éviter de refaire la recherche. */
async function idsFor(theme: string): Promise<number[]> {
  const key = `kriterium:met:${theme}`
  try {
    const cached = localStorage.getItem(key)
    if (cached) return JSON.parse(cached) as number[]
  } catch {
    /* ignore */
  }
  const r = await getJson<{ total: number; objectIDs: number[] | null }>(
    `${BASE}/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(theme)}`,
  )
  const ids = (r.objectIDs ?? []).slice(0, 1500)
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
  return ids
}

export async function fetchArtwork(objectId: number): Promise<Artwork | null> {
  const o = await getJson<MetObject>(`${BASE}/objects/${objectId}`)
  if (!o.primaryImageSmall || !o.isPublicDomain) return null
  return {
    objectId: o.objectID,
    title: o.title || 'Sans titre',
    artist: o.artistDisplayName || 'Artiste inconnu·e',
    year: o.objectDate || '',
    medium: o.medium || '',
    dept: o.department || '',
    image: o.primaryImageSmall,
    imageLarge: o.primaryImage || o.primaryImageSmall,
    url: o.objectURL,
  }
}

/** Tire une œuvre au hasard (réessaie si l'objet n'a pas d'image libre). */
export async function drawArtwork(): Promise<Artwork> {
  let lastError: unknown
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const ids = await idsFor(pick(THEMES))
      if (!ids.length) continue
      const art = await fetchArtwork(pick(ids))
      if (art) return art
    } catch (e) {
      lastError = e
      if (!navigator.onLine) break
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Aucune œuvre trouvée')
}

/** Œuvre du jour : la même toute la journée (mémorisée localement). */
export async function artworkOfTheDay(day: string): Promise<Artwork> {
  const key = `kriterium:artday:${day}`
  try {
    const cached = localStorage.getItem(key)
    if (cached) return JSON.parse(cached) as Artwork
  } catch {
    /* ignore */
  }
  const art = await drawArtwork()
  try {
    // on ne garde qu'une journée en cache
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith('kriterium:artday:')) localStorage.removeItem(k)
    }
    localStorage.setItem(key, JSON.stringify(art))
  } catch {
    /* ignore */
  }
  return art
}
