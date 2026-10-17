const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** 15 caractères [a-z0-9] : format d'id accepté par PocketBase, généré côté client (hors ligne). */
export function uid(): string {
  const bytes = new Uint8Array(15)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length]
  return s
}
