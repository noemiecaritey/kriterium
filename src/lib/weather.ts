/** Météo via Open-Meteo (gratuit, sans clé) + position : GPS, ville choisie ou position approximative par l'IP. */

export interface Weather {
  place: string
  temp: number
  min: number
  max: number
  label: string
}

export interface Place {
  lat: number
  lon: number
  name: string
  /** gps = bouton « ma position », city = ville cherchée, ip = position approximative, default = Paris */
  src: 'gps' | 'city' | 'ip' | 'default'
  at: number
}

const PLACE_KEY = 'kriterium:place'
const WEATHER_KEY = 'kriterium:weather2'
const PARIS: Place = { lat: 48.8566, lon: 2.3522, name: 'Paris', src: 'default', at: 0 }
const IP_TTL = 12 * 3_600_000

const CODES: Record<number, string> = {
  0: 'Ciel dégagé', 1: 'Plutôt dégagé', 2: 'Nuageux par endroits', 3: 'Couvert',
  45: 'Brouillard', 48: 'Brouillard givrant',
  51: 'Bruine légère', 53: 'Bruine', 55: 'Bruine forte',
  56: 'Bruine verglaçante', 57: 'Bruine verglaçante',
  61: 'Pluie légère', 63: 'Pluie', 65: 'Forte pluie', 66: 'Pluie verglaçante', 67: 'Pluie verglaçante',
  71: 'Neige légère', 73: 'Neige', 75: 'Forte neige', 77: 'Grains de neige',
  80: 'Averses', 81: 'Averses', 82: 'Fortes averses', 85: 'Averses de neige', 86: 'Averses de neige',
  95: 'Orage', 96: 'Orage et grêle', 99: 'Orage et grêle',
}

const read = <T,>(k: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null
  } catch {
    return null
  }
}
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

async function getJson(url: string, ms = 8000): Promise<any> {
  const ctl = new AbortController()
  const t = window.setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    window.clearTimeout(t)
  }
}

export function savedPlace(): Place | null {
  const p = read<Place>(PLACE_KEY)
  if (!p) return null
  if (p.src === 'ip' && Date.now() - p.at > IP_TTL) return null
  return p
}
export function savePlace(p: Place) {
  write(PLACE_KEY, p)
  try {
    localStorage.removeItem(WEATHER_KEY)
  } catch {
    /* ignore */
  }
}

/** Nom de la ville pour des coordonnées (service gratuit, sans clé ; facultatif). */
async function nameOf(lat: number, lon: number): Promise<string> {
  try {
    const j = await getJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`, 5000)
    return j.city || j.locality || j.principalSubdivision || 'Ma position'
  } catch {
    return 'Ma position'
  }
}

/** Position exacte : doit être appelée depuis un toucher (le navigateur demande l'autorisation, et exige https ou localhost). */
export function locateByGps(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error("Ce navigateur ne sait pas donner ta position."))
    if (!window.isSecureContext) return reject(new Error("La position exacte demande une adresse en https (ou localhost). Cherche ta ville à la place."))
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const place: Place = { lat: p.coords.latitude, lon: p.coords.longitude, name: await nameOf(p.coords.latitude, p.coords.longitude), src: 'gps', at: Date.now() }
        savePlace(place)
        resolve(place)
      },
      (e) => reject(new Error(e.code === 1 ? "Position refusée : autorise-la dans les réglages du navigateur, ou cherche ta ville." : 'Position introuvable pour le moment.')),
      { timeout: 10_000, maximumAge: 600_000, enableHighAccuracy: false },
    )
  })
}

/** Position approximative d'après l'adresse IP : marche partout, sans autorisation. */
async function locateByIp(): Promise<Place | null> {
  const tries: (() => Promise<Place>)[] = [
    async () => {
      const j = await getJson('https://ipwho.is/', 6000)
      if (!j.success) throw new Error('ipwho')
      return { lat: j.latitude, lon: j.longitude, name: j.city || j.region || 'Ma position', src: 'ip', at: Date.now() }
    },
    async () => {
      const j = await getJson('https://ipapi.co/json/', 6000)
      if (j.error || typeof j.latitude !== 'number') throw new Error('ipapi')
      return { lat: j.latitude, lon: j.longitude, name: j.city || 'Ma position', src: 'ip', at: Date.now() }
    },
  ]
  for (const t of tries) {
    try {
      return await t()
    } catch {
      /* essaie le suivant */
    }
  }
  return null
}

export async function searchCity(q: string): Promise<Place[]> {
  const j = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=fr&format=json`)
  return (j.results ?? []).map((r: any) => ({
    lat: r.latitude,
    lon: r.longitude,
    name: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : '', r.country_code].filter(Boolean).join(', '),
    src: 'city' as const,
    at: Date.now(),
  }))
}

/** Où est la personne ? Choix enregistré > GPS déjà autorisé > position par l'IP > Paris. */
export async function resolvePlace(): Promise<Place> {
  const s = savedPlace()
  if (s) return s
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
    if (perm?.state === 'granted') return await locateByGps()
  } catch {
    /* ignore */
  }
  const ip = await locateByIp()
  if (ip) {
    savePlace(ip)
    return ip
  }
  return PARIS
}

export async function fetchWeather(place?: Place): Promise<Weather> {
  const pos = place ?? (await resolvePlace())
  const key = `${pos.lat.toFixed(2)},${pos.lon.toFixed(2)}`
  const c = read<{ at: number; key: string; w: Weather }>(WEATHER_KEY)
  if (c && c.key === key && Date.now() - c.at < 30 * 60_000) return { ...c.w, place: pos.name }
  const j = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}` +
      `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`,
  )
  const w: Weather = {
    place: pos.name,
    temp: Math.round(j.current.temperature_2m),
    min: Math.round(j.daily.temperature_2m_min[0]),
    max: Math.round(j.daily.temperature_2m_max[0]),
    label: CODES[j.current.weather_code] ?? 'Météo',
  }
  write(WEATHER_KEY, { at: Date.now(), key, w })
  return w
}
