import { useEffect, useState } from 'react'

/** Routeur minimal basé sur le hash : #/listes/abc?x=1 */

export interface Route {
  parts: string[]
  query: URLSearchParams
}

function read(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path, qs] = raw.split('?')
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs ?? '') }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo({ top: 0 }); document.querySelector('.top')?.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function nav(path: string) {
  window.location.hash = path.startsWith('/') ? path : '/' + path
}

export function back(fallback = '/') {
  if (window.history.length > 1) window.history.back()
  else nav(fallback)
}
