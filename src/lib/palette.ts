/**
 * Couleurs, dégradés et pastilles repris de la maquette Figma.
 * (Les valeurs des dégradés radiaux/coniques sont des équivalents CSS des fills Figma.)
 */

import { useSyncExternalStore } from 'react'

export interface Swatch {
  id: string
  label: string
  css: string
}

/* ------------------------------------------------------------------ */
/* Palette : 6 couleurs de base, tous les dégradés en sont dérivés      */
/* ------------------------------------------------------------------ */

export interface Colors {
  yellow: string // accent (boutons, jour choisi)
  orange: string // chaud
  pink: string // doux
  blue: string // froid
  green: string // calme
  gray: string // papier
}

export const COLOR_LABELS: Record<keyof Colors, string> = {
  yellow: 'Accent',
  orange: 'Chaud',
  pink: 'Doux',
  blue: 'Froid',
  green: 'Calme',
  gray: 'Papier',
}

/** Les couleurs de la maquette Figma. */
export const DEFAULT_COLORS: Colors = { yellow: '#eff0a4', orange: '#ff6835', pink: '#f5cac4', blue: '#adbffd', green: '#cfdecb', gray: '#d8dfe9' }

export interface PaletteDef {
  id: string
  name: string
  colors: Colors
}

export const PRESETS: PaletteDef[] = [
  { id: 'maquette', name: 'Maquette', colors: DEFAULT_COLORS },
  { id: 'ocean', name: 'Océan', colors: { yellow: '#b6f0e8', orange: '#1f8fe5', pink: '#cdeaf7', blue: '#8fb4ff', green: '#a8e0c9', gray: '#dbe8f0' } },
  { id: 'foret', name: 'Forêt', colors: { yellow: '#d7ee8f', orange: '#3f9a5b', pink: '#e6d3b3', blue: '#8fc7a8', green: '#bcd9a6', gray: '#dfe6d6' } },
  { id: 'lavande', name: 'Lavande', colors: { yellow: '#e8d9ff', orange: '#a35bff', pink: '#ffd1ec', blue: '#9aa8ff', green: '#d3f0e6', gray: '#e6e1f2' } },
  { id: 'bonbon', name: 'Bonbon', colors: { yellow: '#ffe27a', orange: '#ff3d8b', pink: '#ffc2dc', blue: '#8be3ff', green: '#b8f5c0', gray: '#f3e4ee' } },
  { id: 'cafe', name: 'Café', colors: { yellow: '#f1dfb0', orange: '#b5562b', pink: '#e8c4a4', blue: '#a9b8c9', green: '#c9d1b0', gray: '#e2d9cf' } },
]

const hex2rgb = (h: string): [number, number, number] => {
  const v = h.replace('#', '')
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}
const rgb2hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')
/** Mélange de deux couleurs (t = 0 -> a, t = 1 -> b). */
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hex2rgb(a)
  const [r2, g2, b2] = hex2rgb(b)
  return rgb2hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

function hsl(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgb2hex(f(0) * 255, f(8) * 255, f(4) * 255)
}

/** Une palette au hasard, mais harmonieuse (teintes voisines, tons clairs comme la maquette). */
export function randomColors(): Colors {
  const h = Math.random() * 360
  return {
    yellow: hsl(h + 60, 75, 80),
    orange: hsl(h, 80, 58),
    pink: hsl(h + 20, 70, 85),
    blue: hsl(h + 200, 90, 82),
    green: hsl(h + 130, 45, 83),
    gray: hsl(h + 220, 25, 89),
  }
}

/** Dégradés d'origine de la maquette (valeurs exactes de Figma), utilisés tant que la palette est celle de la maquette. */
const FIGMA_CSS: Record<string, string> = {
  ember: 'radial-gradient(ellipse 120px 260px at 77% 29%, #ee5104 0%, #ea5814 6%, #e65f23 12%, #de6d42 25%, #d67a61 37%, #ce8881 50%, #bda4bf 75%, #adbffd 100%)',
  'rose-orange': 'linear-gradient(180deg, #f5cac4, #f06427)',
  aurora: 'conic-gradient(from 180deg at 50% 50%, #eff0a4 0%, #ced8d1 13%, #adbffd 26%, #ced8d1 63%, #eff0a4 100%)',
  haze: 'radial-gradient(100px 85px at 41% 44%, #d8dfe9 38.6%, #f5cac4 100%)',
  meadow: 'linear-gradient(180deg, #cfdecb, #eff0a4)',
  heat: 'conic-gradient(from 180deg at 50% 50%, #ee5104 0%, #ed5a12 6%, #eb6321 12.5%, #e9753d 25%, #e6865a 37.5%, #e39877 50%, #debcb0 75%, #d8dfe9 100%)',
  lemon: '#eff0a4',
  sunset: 'linear-gradient(90deg, #ff6835, #ffffff)',
  'peach-lemon': 'conic-gradient(from 90deg at 50% 50%, #f5cac4 0%, #eff0a4 100%)',
  periwinkle: 'linear-gradient(90deg, #adbffd, #ff6835)',
  glow: 'radial-gradient(ellipse 130px 110px at 72% 50%, #ff6835 0%, #f5734e 11%, #eb7e67 22%, #d69499 44%, #c2a9cb 66%, #adbffd 88%, #adbffd 100%)',
  paper: '#d8dfe9',
}

/** Mêmes formes que la maquette, avec les couleurs de la palette. */
function derive(c: Colors): Record<string, string> {
  const { yellow: y, orange: o, pink: p, blue: b, green: g, gray: gr } = c
  return {
    ember: `radial-gradient(ellipse 120px 260px at 77% 29%, ${o} 0%, ${mix(o, b, 0.2)} 25%, ${mix(o, b, 0.45)} 50%, ${mix(o, b, 0.75)} 75%, ${b} 100%)`,
    'rose-orange': `linear-gradient(180deg, ${p}, ${o})`,
    aurora: `conic-gradient(from 180deg at 50% 50%, ${y} 0%, ${mix(y, b, 0.5)} 13%, ${b} 26%, ${mix(y, b, 0.5)} 63%, ${y} 100%)`,
    haze: `radial-gradient(100px 85px at 41% 44%, ${gr} 38.6%, ${p} 100%)`,
    meadow: `linear-gradient(180deg, ${g}, ${y})`,
    heat: `conic-gradient(from 180deg at 50% 50%, ${o} 0%, ${mix(o, gr, 0.25)} 25%, ${mix(o, gr, 0.5)} 50%, ${mix(o, gr, 0.75)} 75%, ${gr} 100%)`,
    lemon: y,
    sunset: `linear-gradient(90deg, ${o}, #ffffff)`,
    'peach-lemon': `conic-gradient(from 90deg at 50% 50%, ${p} 0%, ${y} 100%)`,
    periwinkle: `linear-gradient(90deg, ${b}, ${o})`,
    glow: `radial-gradient(ellipse 130px 110px at 72% 50%, ${o} 0%, ${mix(o, b, 0.25)} 22%, ${mix(o, b, 0.5)} 44%, ${mix(o, b, 0.75)} 66%, ${b} 88%, ${b} 100%)`,
    paper: gr,
  }
}

const sameColors = (a: Colors, b: Colors) => (Object.keys(a) as (keyof Colors)[]).every((k) => a[k].toLowerCase() === b[k].toLowerCase())

/* ---- état de la palette (enregistré sur l'appareil) ---- */

const KEY = 'kriterium:palette'
let current: Colors = DEFAULT_COLORS
let currentId = 'maquette'
let version = 0
let cache: { v: number; css: Record<string, string> } | null = null
const subs = new Set<() => void>()

function applyCss() {
  if (typeof document === 'undefined') return
  const st = document.documentElement.style
  st.setProperty('--yellow', current.yellow)
  st.setProperty('--orange', current.orange)
  st.setProperty('--pink', current.pink)
  st.setProperty('--blue', current.blue)
  st.setProperty('--green', current.green)
  st.setProperty('--paper', current.gray)
}

function commit(id: string, colors: Colors) {
  current = colors
  currentId = id
  version++
  cache = null
  applyCss()
  try {
    localStorage.setItem(KEY, JSON.stringify({ id, colors }))
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f())
}

export const currentPalette = () => ({ id: currentId, colors: current, name: PRESETS.find((p) => p.id === currentId)?.name ?? 'Perso' })
export const setPreset = (id: string) => {
  const p = PRESETS.find((x) => x.id === id)
  if (p) commit(p.id, p.colors)
}
export const setCustom = (colors: Colors) => commit('perso', colors)
/** Palette suivante de la liste (revient à la première après la dernière). */
export function nextPalette() {
  const i = PRESETS.findIndex((p) => p.id === currentId)
  const p = PRESETS[(i + 1) % PRESETS.length]
  commit(p.id, p.colors)
  return p.name
}

/** À appeler dans un composant pour qu'il se redessine quand la palette change. */
export function usePalette() {
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => version,
  )
  return currentPalette()
}

const css = () => {
  if (!cache || cache.v !== version) cache = { v: version, css: sameColors(current, DEFAULT_COLORS) ? FIGMA_CSS : derive(current) }
  return cache.css
}

try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { id: string; colors: Colors } | null
  if (saved?.colors && (Object.keys(DEFAULT_COLORS) as (keyof Colors)[]).every((k) => /^#[0-9a-f]{6}$/i.test(saved.colors[k]))) {
    current = saved.colors
    currentId = saved.id
  }
} catch {
  /* ignore */
}
applyCss()

/** Fonds de cartes/tuiles. Texte toujours noir dessus (comme sur la maquette). */
const grad = (id: string, label: string): Swatch => ({
  id,
  label,
  get css() {
    return css()[id]
  },
})
export const GRADIENTS: Swatch[] = [
  grad('ember', 'Braise'),
  grad('rose-orange', 'Rose orangé'),
  grad('aurora', 'Aurore'),
  grad('haze', 'Brume'),
  grad('meadow', 'Prairie'),
  grad('heat', 'Chaleur'),
  grad('lemon', 'Citron'),
  grad('sunset', 'Coucher'),
  grad('peach-lemon', 'Pêche'),
  grad('periwinkle', 'Pervenche'),
  grad('glow', 'Lueur'),
  grad('paper', 'Papier'),
]

export const gradientCss = (id: string | undefined): string => (GRADIENTS.find((g) => g.id === id) ?? GRADIENTS[4]).css

/** Pastilles de couleur des évènements (les 9 de la maquette). */
const ev = (id: string, label: string, make: (c: Colors) => string): Swatch => ({
  id,
  label,
  get css() {
    return make(current)
  },
})
export const EVENT_COLORS: Swatch[] = [
  ev('blue', 'Bleu', (c) => c.blue),
  ev('orange', 'Orange', (c) => (sameColors(c, DEFAULT_COLORS) ? '#fd6938' : c.orange)),
  ev('white', 'Blanc', () => '#fffcfb'),
  ev('green', 'Vert', (c) => c.green),
  ev('gray', 'Gris', (c) => c.gray),
  ev('yellow', 'Jaune', (c) => c.yellow),
  ev('orange-blue', 'Orange/bleu', (c) => `linear-gradient(180deg, ${c.orange}, ${c.blue})`),
  ev('pink-blue', 'Rose/bleu', (c) => `radial-gradient(circle, ${c.blue}, ${c.pink})`),
  ev('yellow-green', 'Jaune/vert', (c) => `conic-gradient(from 90deg, ${c.yellow}, ${c.green})`),
]

export const eventColorCss = (id: string | undefined): string => (EVENT_COLORS.find((c) => c.id === id) ?? EVENT_COLORS[1]).css

/** Humeur 1..5 (froid -> chaud). */
const mood = (value: number, label: string, key: keyof Colors) => ({
  value,
  label,
  get color() {
    return current[key]
  },
})
export const MOODS = [mood(1, 'Très bas', 'blue'), mood(2, 'Bof', 'green'), mood(3, 'Neutre', 'yellow'), mood(4, 'Bien', 'pink'), mood(5, 'Super', 'orange')]
export const moodColor = (v: number) => MOODS.find((m) => m.value === v)?.color ?? current.gray
