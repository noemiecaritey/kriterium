export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const WEEKDAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

const pad = (n: number) => String(n).padStart(2, '0')

/** Date locale -> "YYYY-MM-DD" */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => ymd(new Date())

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}

/** Lundi = 0 … dimanche = 6 */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7

/** Prochain lundi strictement après `s`. */
export function nextMonday(s: string): string {
  const d = parseYmd(s)
  return addDays(s, 7 - weekdayIndex(d))
}

/** Semaines (lundi d'abord) d'un mois ; null = case hors du mois. */
export function monthMatrix(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const count = new Date(year, month + 1, 0).getDate()
  const lead = weekdayIndex(first)
  const cells: (string | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= count; d++) cells.push(ymd(new Date(year, month, d)))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function fmtLong(s: string): string {
  const d = parseYmd(s)
  return `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`
}

export function fmtShort(s: string): string {
  const d = parseYmd(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 4).toLowerCase()}.`
}

export function relativeLabel(s: string): string {
  const t = today()
  if (s === t) return "aujourd'hui"
  if (s === addDays(t, 1)) return 'demain'
  if (s === addDays(t, -1)) return 'hier'
  return fmtShort(s)
}

export const dayOf = (ts: number) => ymd(new Date(ts))
