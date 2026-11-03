import type { Laptop, LoginAttempt, Movement, Student } from './store'

export const BRANDS = ['Lenovo', 'HP', 'Dell', 'Asus', 'Acer', 'Apple', 'Samsung', 'Huawei', 'Otra'] as const

export const COLORS: { name: string; hex: string }[] = [
  { name: 'Negro', hex: '#1F1D1B' },
  { name: 'Gris', hex: '#6E6C69' },
  { name: 'Plata', hex: '#C8CBCF' },
  { name: 'Blanco', hex: '#F4F3EF' },
  { name: 'Azul', hex: '#22508F' },
  { name: 'Rojo', hex: '#A8261C' },
  { name: 'Rosado', hex: '#E3A3B5' },
  { name: 'Dorado', hex: '#CFAE6C' },
  { name: 'Verde', hex: '#2E6A4E' },
]

const EXTRA_COLORS: Record<string, string> = {
  morado: '#5B3A8C',
  lila: '#A58BC9',
  naranja: '#D9732B',
  amarillo: '#E3C04A',
  cafe: '#6B4A32',
  café: '#6B4A32',
  beige: '#D9C8A9',
  vinotinto: '#5E1A24',
  celeste: '#7DB4DD',
  turquesa: '#2A9D9A',
  champaña: '#E2D2B0',
  grafito: '#3A3A3C',
}

/** Resolve a color name (including free-text "Otra") to a hex, or null if unknown. */
export function colorHex(name: string): string | null {
  const k = name.trim().toLowerCase()
  return COLORS.find((c) => c.name.toLowerCase() === k)?.hex ?? EXTRA_COLORS[k] ?? null
}

export function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62
}

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + c * amt)))
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// Deterministic PRNG so the seeded history looks the same on every reset.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const FIRST = ['María', 'José', 'Valentina', 'Andrés', 'Luisa', 'Camilo', 'Daniela', 'Jesús', 'Yeimy', 'Kevin', 'Laura', 'Óscar', 'Sofía', 'Jhon', 'Paola', 'Esteban', 'Karen', 'Luis', 'Natalia', 'Iván']
const LAST = ['Epieyú', 'Pushaina', 'Uriana', 'Ipuana', 'Jayariyú', 'Epinayú', 'Sapuana', 'Gómez', 'Brito', 'Fince', 'Mendoza', 'Daza', 'Pimienta', 'Iguarán', 'Bermúdez', 'Cotes']

export const DEMO_DOC = '1234567890'
export const LEGACY_DOC = '1122334455'

export function seed(now: number) {
  const r = rng(20250214)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]
  const students: Record<string, Student> = {
    [DEMO_DOC]: { doc: DEMO_DOC, code: '2021118034', first: 'Ana Lucía', last: 'Epieyú', consent: true },
    [LEGACY_DOC]: { doc: LEGACY_DOC, code: '2019104417', first: 'Carlos', last: 'Pushaina', consent: false },
  }
  const laptops: Laptop[] = [
    { id: 'L1', doc: DEMO_DOC, brand: 'Lenovo', color: 'Gris', nickname: 'El de la U' },
    { id: 'L2', doc: DEMO_DOC, brand: 'HP', color: 'Negro', nickname: 'El de la casa' },
    { id: 'L3', doc: LEGACY_DOC, brand: 'Asus', color: 'Azul' },
  ]
  for (let i = 0; i < 46; i++) {
    const doc = String(1000000000 + Math.floor(r() * 899999999))
    students[doc] = {
      doc,
      code: `20${18 + Math.floor(r() * 7)}1${String(Math.floor(r() * 99999)).padStart(5, '0')}`,
      first: pick(FIRST),
      last: `${pick(LAST)} ${pick(LAST)}`,
      consent: true,
    }
    laptops.push({ id: `L${laptops.length + 1}`, doc, brand: pick(BRANDS.slice(0, 8)), color: pick(COLORS).name })
    if (r() < 0.15) laptops.push({ id: `L${laptops.length + 1}`, doc, brand: pick(BRANDS.slice(0, 8)), color: pick(COLORS).name })
  }

  const movements: Movement[] = []
  const pool = laptops.filter((l) => l.doc !== DEMO_DOC && l.doc !== LEGACY_DOC)
  const day0 = new Date(now)
  day0.setHours(0, 0, 0, 0)
  let id = 1
  for (let d = 6; d >= 0; d--) {
    const base = day0.getTime() - d * 86400000
    const dow = new Date(base).getDay()
    const share = dow === 0 ? 0.08 : dow === 6 ? 0.3 : 0.72
    for (const l of pool) {
      if (r() > share) continue
      const inAt = base + (6.2 + r() * 4.5) * 3600000
      const outAt = inAt + (2 + r() * 7) * 3600000
      for (const [type, at] of [['ENTRADA', inAt], ['SALIDA', outAt]] as const) {
        if (at > now) continue
        const offline = r() < 0.12
        movements.push({
          id: `M${id++}`,
          doc: l.doc,
          laptopId: l.id,
          type,
          at,
          origin: offline ? 'offline' : 'online',
          syncedAt: offline ? at + Math.round(30 + r() * 870) * 1000 : undefined,
        })
      }
    }
  }
  movements.sort((a, b) => a.at - b.at)

  const logins: LoginAttempt[] = [
    { id: 'A1', at: now - 26 * 3600000, user: 'porteria', ip: '10.0.0.12', ok: true },
    { id: 'A2', at: now - 5 * 3600000, user: 'admin', ip: '181.49.12.77', ok: false },
    { id: 'A3', at: now - 4.9 * 3600000, user: 'admin', ip: '181.49.12.77', ok: false },
    { id: 'A4', at: now - 4.85 * 3600000, user: 'root', ip: '181.49.12.77', ok: false },
    { id: 'A5', at: now - 4.8 * 3600000, user: 'porteria', ip: '181.49.12.77', ok: false },
    { id: 'A6', at: now - 2 * 3600000, user: 'porteria', ip: '10.0.0.12', ok: true },
  ]
  return { students, laptops, movements, logins }
}
