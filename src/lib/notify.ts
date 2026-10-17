import type { EventT, Rec } from '../data/types'

/**
 * Rappels d'évènements.
 * Remarque : sans serveur de push, les notifications ne partent que lorsque l'app est ouverte
 * (ou en arrière-plan mais encore vivante). Elles sont reprogrammées à chaque ouverture.
 */

export const notificationsSupported = () => typeof Notification !== 'undefined'
export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported'

export async function enableNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.requestPermission()
}

async function show(title: string, body: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' })
      return
    }
  } catch {
    /* on retombe sur l'API classique */
  }
  new Notification(title, { body, icon: '/icons/icon-192.png' })
}

let timers: number[] = []

export function scheduleReminders(events: Rec<EventT>[]) {
  timers.forEach((t) => window.clearTimeout(t))
  timers = []
  if (notificationPermission() !== 'granted') return
  const now = Date.now()
  const horizon = now + 36 * 3_600_000
  for (const e of events) {
    if (e.remind === null || e.remind === undefined) continue
    const [h, m] = (e.time || '09:00').split(':').map(Number)
    const [y, mo, d] = e.date.split('-').map(Number)
    const at = new Date(y, mo - 1, d, h, m).getTime() - e.remind * 60_000
    if (at < now || at > horizon) continue
    const key = `kriterium:notified:${e.id}:${at}`
    if (localStorage.getItem(key)) continue
    timers.push(
      window.setTimeout(() => {
        try {
          localStorage.setItem(key, '1')
        } catch {
          /* ignore */
        }
        void show(e.title, e.time ? `À ${e.time}${e.info ? ' · ' + e.info : ''}` : e.info || "C'est aujourd'hui")
      }, at - now),
    )
  }
}
