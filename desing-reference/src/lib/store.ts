import { useSyncExternalStore } from 'react'
import { seed } from './data'

export type NetMode = 'online' | 'offline' | 'down'
export type MoveType = 'ENTRADA' | 'SALIDA'
export type Origin = 'online' | 'offline'

export interface Student {
  doc: string
  code: string
  first: string
  last: string
  consent: boolean
}
export interface Laptop {
  id: string
  doc: string
  brand: string
  color: string
  nickname?: string
}
export interface Movement {
  id: string
  doc: string
  laptopId: string
  type: MoveType
  at: number
  origin: Origin
  syncedAt?: number
}
export interface LoginAttempt {
  id: string
  at: number
  user: string
  ip: string
  ok: boolean
}

interface Server {
  students: Record<string, Student>
  laptops: Laptop[]
  movements: Movement[]
  logins: LoginAttempt[]
}
interface Device {
  lastDoc: string
  cache: Record<string, { student: Student; laptops: Laptop[] }>
  queue: Movement[]
}
export interface State {
  net: NetMode
  clockOffset: number
  frame: 'se' | 'pro'
  server: Server
  device: Device
  syncing: number
  justSynced: number
  demoFill: { doc: string; n: number } | null
}

const KEY = 'uniguajira-porteria-v1'

function fresh(): State {
  return {
    net: 'online',
    clockOffset: 0,
    frame: 'se',
    server: seed(Date.now()),
    device: { lastDoc: '', cache: {}, queue: [] },
    syncing: 0,
    justSynced: 0,
    demoFill: null,
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...JSON.parse(raw), syncing: 0, justSynced: 0, demoFill: null }
  } catch {
    /* corrupt storage: start fresh */
  }
  return fresh()
}

let state = load()
const listeners = new Set<() => void>()

function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  try {
    const { syncing: _s, justSynced: _j, demoFill: _d, ...persist } = state
    localStorage.setItem(KEY, JSON.stringify(persist))
  } catch {
    /* storage full or unavailable */
  }
  listeners.forEach((l) => l())
}

export const getState = () => state
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => sel(state),
  )
}

export const now = () => Date.now() + state.clockOffset

// ---------- errors ----------
export type ErrCode = 'invalid' | 'not_owner' | 'rate' | 'down' | 'consent' | 'noconn' | 'name' | 'laptop' | 'auth'
export class ApiError extends Error {
  code: ErrCode
  constructor(code: ErrCode) {
    super(code)
    this.code = code
  }
}

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms + Math.random() * 250))
let uid = Date.now()
const newId = (p: string) => `${p}${(uid++).toString(36)}`

function requireServer() {
  if (state.net === 'offline') throw new ApiError('noconn')
  if (state.net === 'down') throw new ApiError('down')
}

function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export function lastMoveToday(laptopId: string, s: State = state): Movement | undefined {
  const t = Date.now() + s.clockOffset
  let last: Movement | undefined
  for (const m of [...s.server.movements, ...s.device.queue]) {
    if (m.laptopId === laptopId && sameDay(m.at, t) && m.at <= t && (!last || m.at > last.at)) last = m
  }
  return last
}

// ---------- student API ----------
const lookups: number[] = []

export type LookupResult =
  | { kind: 'new' }
  | { kind: 'consent'; student: Student; laptops: Laptop[] }
  | { kind: 'existing'; student: Student; laptops: Laptop[]; fromCache: boolean }

export async function lookup(doc: string): Promise<LookupResult> {
  if (!/^\d{6,10}$/.test(doc)) throw new ApiError('invalid')
  const t = Date.now()
  while (lookups.length && t - lookups[0] > 20000) lookups.shift()
  lookups.push(t)
  if (lookups.length > 6) throw new ApiError('rate')
  await wait()
  set((s) => ({ device: { ...s.device, lastDoc: doc } }))

  if (state.net !== 'online') {
    const c = state.device.cache[doc]
    if (c) return { kind: 'existing', student: c.student, laptops: c.laptops, fromCache: true }
    throw new ApiError(state.net === 'down' ? 'down' : 'noconn')
  }
  const student = state.server.students[doc]
  if (!student) return { kind: 'new' }
  const laptops = state.server.laptops.filter((l) => l.doc === doc)
  if (!student.consent) return { kind: 'consent', student, laptops }
  cache(student, laptops)
  return { kind: 'existing', student, laptops, fromCache: false }
}

function cache(student: Student, laptops: Laptop[]) {
  set((s) => ({ device: { ...s.device, cache: { ...s.device.cache, [student.doc]: { student, laptops } } } }))
}

export async function registerStudent(doc: string, first: string, last: string, consent: boolean) {
  if (!first.trim() || !last.trim()) throw new ApiError('name')
  if (!consent) throw new ApiError('consent')
  await wait()
  requireServer()
  const student: Student = {
    doc,
    first: first.trim(),
    last: last.trim(),
    consent: true,
    code: `2025${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
  }
  set((s) => ({ server: { ...s.server, students: { ...s.server.students, [doc]: student } } }))
  cache(student, [])
  return student
}

export async function giveConsent(doc: string, consent: boolean) {
  if (!consent) throw new ApiError('consent')
  await wait()
  requireServer()
  const student = { ...state.server.students[doc], consent: true }
  set((s) => ({ server: { ...s.server, students: { ...s.server.students, [doc]: student } } }))
  cache(student, state.server.laptops.filter((l) => l.doc === doc))
  return student
}

export interface MoveResult {
  type: MoveType
  origin: Origin
  at: number
  reconfirmed: boolean
  laptop: Laptop
  student: Student
}

export async function addLaptop(student: Student, brand: string, color: string, nickname: string) {
  if (!brand.trim() || !color.trim()) throw new ApiError('laptop')
  await wait()
  requireServer()
  const laptop: Laptop = { id: newId('L'), doc: student.doc, brand: brand.trim(), color: color.trim(), nickname: nickname.trim() || undefined }
  set((s) => ({ server: { ...s.server, laptops: [...s.server.laptops, laptop] } }))
  cache(student, state.server.laptops.filter((l) => l.doc === student.doc))
  const result = commitMovement(student, laptop)
  return { laptop, result }
}

const GUARD_MS = 45 * 60000

export async function registerMovement(student: Student, laptop: Laptop): Promise<MoveResult> {
  if (laptop.doc !== student.doc) throw new ApiError('not_owner')
  await wait(state.net === 'online' ? 550 : 250)
  return commitMovement(student, laptop)
}

/** Direction is decided by the day's last movement; a flip within 45 min only re-confirms. */
function commitMovement(student: Student, laptop: Laptop): MoveResult {
  const t = now()
  const last = lastMoveToday(laptop.id)
  if (last && t - last.at < GUARD_MS) {
    const pending = state.device.queue.some((q) => q.id === last.id)
    return { type: last.type, origin: pending ? 'offline' : 'online', at: last.at, reconfirmed: true, laptop, student }
  }
  const origin: Origin = state.net === 'online' ? 'online' : 'offline'
  const type: MoveType = !last || last.type === 'SALIDA' ? 'ENTRADA' : 'SALIDA'
  const m: Movement = { id: newId('M'), doc: student.doc, laptopId: laptop.id, type, at: t, origin }
  if (origin === 'online') set((s) => ({ server: { ...s.server, movements: [...s.server.movements, m] } }))
  else set((s) => ({ device: { ...s.device, queue: [...s.device.queue, m] } }))
  return { type, origin, at: t, reconfirmed: false, laptop, student }
}

// ---------- network / sync ----------
let syncTimer: ReturnType<typeof setTimeout> | undefined
export function setNet(net: NetMode) {
  clearTimeout(syncTimer)
  set({ net, syncing: 0, justSynced: 0 })
  if (net !== 'online' || !state.device.queue.length) return
  set({ syncing: state.device.queue.length })
  syncTimer = setTimeout(() => {
    const t = now()
    const sent = state.device.queue.map((m) => ({ ...m, syncedAt: t }))
    set((s) => ({
      server: { ...s.server, movements: [...s.server.movements, ...sent].sort((a, b) => a.at - b.at) },
      device: { ...s.device, queue: [] },
      syncing: 0,
      justSynced: sent.length,
    }))
    syncTimer = setTimeout(() => set({ justSynced: 0 }), 2200)
  }, 2000)
}

// ---------- demo controls ----------
export const advanceClock = (ms: number) => set((s) => ({ clockOffset: s.clockOffset + ms }))
export const resetClock = () => set({ clockOffset: 0 })
export const setFrame = (frame: State['frame']) => set({ frame })
export const demoFill = (doc: string) => set((s) => ({ demoFill: { doc, n: (s.demoFill?.n ?? 0) + 1 } }))
export function resetDemo() {
  localStorage.removeItem(KEY)
  clearTimeout(syncTimer)
  state = fresh()
  set({})
}

// ---------- admin ----------
const ADMIN = { user: 'porteria', pass: 'wayuu2025' }
export async function adminLogin(user: string, pass: string) {
  await wait(500)
  const ok = user.trim() === ADMIN.user && pass === ADMIN.pass
  const attempt: LoginAttempt = { id: newId('A'), at: now(), user: user.trim() || '(vacío)', ip: '10.0.0.12', ok }
  set((s) => ({ server: { ...s.server, logins: [...s.server.logins, attempt] } }))
  const recentFails = state.server.logins.filter((a) => !a.ok && a.ip === attempt.ip && now() - a.at < 10 * 60000).length
  if (!ok && recentFails >= 5) throw new ApiError('rate')
  if (!ok) throw new ApiError('auth')
  return user.trim()
}
