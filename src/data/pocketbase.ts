import type { Item } from './types'

/** Petit client PocketBase (fetch uniquement, aucune dépendance). */

export interface Session {
  url: string
  token: string
  userId: string
  email: string
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const DEFAULT_URL: string = (import.meta.env.VITE_PB_URL as string | undefined) || 'http://127.0.0.1:8090'
const COLLECTION = 'items'

const clean = (url: string) => url.trim().replace(/\/+$/, '')

async function request<T>(url: string, path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${clean(url)}/api/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body?.message ?? message
      const first = body?.data && Object.values(body.data as Record<string, { message?: string }>)[0]
      if (first?.message) message += ` — ${first.message}`
    } catch {
      /* corps non JSON */
    }
    throw new HttpError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

interface AuthResponse {
  token: string
  record: { id: string; email: string }
}

export async function login(url: string, email: string, password: string): Promise<Session> {
  const r = await request<AuthResponse>(url, 'collections/users/auth-with-password', null, {
    method: 'POST',
    body: JSON.stringify({ identity: email, password }),
  })
  return { url: clean(url), token: r.token, userId: r.record.id, email: r.record.email }
}

/* ------------------------------------------------------------------ */
/* Connexion Google (OAuth2 de PocketBase, par redirection)             */
/* ------------------------------------------------------------------ */

const OAUTH_KEY = 'kriterium:oauth'
/** Adresse où Google renvoie après la connexion : celle de l'app, sans # ni paramètres. */
const redirectUrl = () => window.location.origin + window.location.pathname

interface Pending {
  url: string
  provider: string
  state: string
  codeVerifier: string
  redirectUrl: string
}

/** Étape 1 : demande à PocketBase l'adresse de connexion Google, puis y envoie le navigateur. */
export async function startOAuth(url: string, provider = 'google'): Promise<void> {
  const m = await request<any>(url, 'collections/users/auth-methods', null)
  const list: any[] = m?.oauth2?.providers ?? m?.authProviders ?? []
  const p = list.find((x) => x.name === provider)
  if (!p) throw new Error("La connexion Google n'est pas activée dans PocketBase (voir le README).")
  const base: string = p.authURL ?? p.authUrl
  const redirect = redirectUrl()
  const pending: Pending = { url: clean(url), provider, state: p.state, codeVerifier: p.codeVerifier, redirectUrl: redirect }
  localStorage.setItem(OAUTH_KEY, JSON.stringify(pending))
  window.location.assign(base + encodeURIComponent(redirect))
}

/** Étape 2 : au retour de Google (?code=…&state=…), échange le code contre une session. Renvoie null s'il n'y a rien à faire. */
export async function finishOAuth(): Promise<Session | null> {
  const q = new URLSearchParams(window.location.search)
  const code = q.get('code')
  const state = q.get('state')
  const err = q.get('error')
  let pending: Pending | null = null
  try {
    pending = JSON.parse(localStorage.getItem(OAUTH_KEY) ?? 'null')
  } catch {
    /* ignore */
  }
  if (!pending || !(code || err)) return null
  // on nettoie l'adresse tout de suite : le code ne sert qu'une fois
  window.history.replaceState(null, '', window.location.pathname)
  localStorage.removeItem(OAUTH_KEY)
  if (err) throw new Error(err === 'access_denied' ? 'Connexion Google annulée.' : `Google : ${err}`)
  if (!code || state !== pending.state) throw new Error('Connexion Google invalide (état inattendu). Réessaie.')
  const r = await request<AuthResponse>(pending.url, 'collections/users/auth-with-oauth2', null, {
    method: 'POST',
    body: JSON.stringify({ provider: pending.provider, code, codeVerifier: pending.codeVerifier, redirectUrl: pending.redirectUrl }),
  })
  return { url: pending.url, token: r.token, userId: r.record.id, email: r.record.email }
}

export async function register(url: string, email: string, password: string): Promise<Session> {
  await request(url, 'collections/users/records', null, {
    method: 'POST',
    body: JSON.stringify({ email, password, passwordConfirm: password }),
  })
  return login(url, email, password)
}

export async function refresh(s: Session): Promise<Session> {
  const r = await request<AuthResponse>(s.url, 'collections/users/auth-refresh', s.token, { method: 'POST' })
  return { ...s, token: r.token, email: r.record.email }
}

interface Remote {
  id: string
  kind: Item['kind']
  data: Item['data']
  deleted: boolean
  u: number
  updated: string
}

/** Crée ou met à jour un enregistrement (id généré côté client). */
export async function upsert(s: Session, item: Item): Promise<void> {
  const body = { kind: item.kind, data: item.data, deleted: item.deleted, u: item.u }
  try {
    await request(s.url, `collections/${COLLECTION}/records/${item.id}`, s.token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) {
      await request(s.url, `collections/${COLLECTION}/records`, s.token, {
        method: 'POST',
        body: JSON.stringify({ id: item.id, owner: s.userId, ...body }),
      })
    } else {
      throw e
    }
  }
}

/** Récupère tout ce qui a changé côté serveur depuis `since` (valeur `updated` de PocketBase). */
export async function pull(s: Session, since: string): Promise<{ records: Remote[]; last: string }> {
  const records: Remote[] = []
  let page = 1
  for (;;) {
    const filter = since ? `&filter=${encodeURIComponent(`updated>"${since}"`)}` : ''
    const r = await request<{ items: Remote[]; totalPages: number }>(
      s.url,
      `collections/${COLLECTION}/records?perPage=200&page=${page}&sort=updated${filter}`,
      s.token,
    )
    records.push(...r.items)
    if (page >= r.totalPages) break
    page++
  }
  const last = records.length ? records[records.length - 1].updated : since
  return { records, last }
}
