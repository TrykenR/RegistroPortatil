import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Laptop as LaptopIcon,
  LogIn,
  LogOut,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'
import { LaptopGlyph } from '../components/LaptopGlyph'
import { WayuuBand } from '../components/Wayuu'
import { Simbolo } from '../components/ui'
import { BRANDS, COLORS } from '../lib/data'
import { fmtDateTime, fmtTime } from '../lib/copy'
import { now, useStore, type Movement } from '../lib/store'

const PAGE = 25
const DAY = 86400000
const startOfDay = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-borde bg-white ${className}`}>{children}</section>
}

function CardHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h3 className="text-[15px] font-bold text-tinta">{title}</h3>
        {sub && <p className="text-[13px] text-sub">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function OriginTag({ m }: { m: Movement }) {
  if (m.origin === 'online')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-2.5 py-1 text-[12px] font-bold text-teal-dark"><span className="size-1.5 rounded-full bg-teal" />En línea</span>
  const delay = m.syncedAt ? Math.round((m.syncedAt - m.at) / 1000) : null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-2.5 py-1 text-[12px] font-bold text-coral-dark">
      <CloudOff className="size-3.5" />
      Offline{delay !== null && ` (+${delay}s)`}
    </span>
  )
}

export function AdminDashboard({ user, remaining, onLogout, onExit }: { user: string; remaining: number; onLogout: () => void; onExit: () => void }) {
  const movements = useStore((s) => s.server.movements)
  const students = useStore((s) => s.server.students)
  const laptops = useStore((s) => s.server.laptops)
  const logins = useStore((s) => s.server.logins)
  useStore((s) => s.clockOffset)
  const t = now()
  const today = startOfDay(t)

  const laptopById = useMemo(() => new Map(laptops.map((l) => [l.id, l])), [laptops])

  // ---------- metrics ----------
  const stats = useMemo(() => {
    const todays = movements.filter((m) => m.at >= today && m.at <= t)
    const last = new Map<string, Movement>()
    for (const m of todays) last.set(m.laptopId, m)
    const inside = [...last.values()].filter((m) => m.type === 'ENTRADA').length
    const hours = Array.from({ length: 17 }, (_, i) => ({ h: i + 5, in: 0, out: 0 }))
    for (const m of todays) {
      const h = new Date(m.at).getHours() - 5
      if (hours[h]) hours[h][m.type === 'ENTRADA' ? 'in' : 'out']++
    }
    const week = Array.from({ length: 7 }, (_, i) => {
      const d0 = today - (6 - i) * DAY
      const ms = movements.filter((m) => m.at >= d0 && m.at < d0 + DAY && m.at <= t)
      return { d0, total: ms.length, offline: ms.filter((m) => m.origin === 'offline').length }
    })
    const weekMs = movements.filter((m) => m.at >= today - 6 * DAY && m.at <= t)
    const brandCount = new Map<string, number>()
    for (const m of weekMs) {
      const b = laptopById.get(m.laptopId)?.brand ?? '—'
      brandCount.set(b, (brandCount.get(b) ?? 0) + 1)
    }
    const brands = [...brandCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    return {
      in: todays.filter((m) => m.type === 'ENTRADA').length,
      out: todays.filter((m) => m.type === 'SALIDA').length,
      inside,
      offToday: todays.filter((m) => m.origin === 'offline').length,
      todayTotal: todays.length,
      hours,
      week,
      weekOffline: weekMs.filter((m) => m.origin === 'offline').length,
      weekTotal: weekMs.length,
      brands,
    }
  }, [movements, today, t, laptopById])

  // ---------- filters ----------
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('')
  const [type, setType] = useState('')
  const [origin, setOrigin] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const active = [q, brand, color, type, origin, from, to].filter(Boolean).length
  const clear = () => {
    setQ('')
    setBrand('')
    setColor('')
    setType('')
    setOrigin('')
    setFrom('')
    setTo('')
    setPage(0)
  }

  const filtered = useMemo(() => {
    const fromT = from ? new Date(`${from}T00:00`).getTime() : -Infinity
    const toT = to ? new Date(`${to}T23:59:59`).getTime() : Infinity
    return movements
      .filter((m) => {
        if (m.at > t) return false
        const s = students[m.doc]
        const l = laptopById.get(m.laptopId)
        if (q && !(m.doc.includes(q) || s?.code.includes(q))) return false
        if (brand && l?.brand !== brand) return false
        if (color && l?.color !== color) return false
        if (type && m.type !== type) return false
        if (origin && m.origin !== origin) return false
        return m.at >= fromT && m.at <= toT
      })
      .sort((a, b) => b.at - a.at)
  }, [movements, students, laptopById, q, brand, color, type, origin, from, to, t])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const pg = Math.min(page, pages - 1)
  const rows = filtered.slice(pg * PAGE, pg * PAGE + PAGE)
  const upd = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(0)
  }

  // ---------- security ----------
  const [secOpen, setSecOpen] = useState(false)
  const recentLogins = useMemo(() => [...logins].sort((a, b) => b.at - a.at), [logins])
  const fails24 = logins.filter((a) => !a.ok && t - a.at < DAY)
  const suspicious = useMemo(() => {
    const byIp = new Map<string, number>()
    for (const a of fails24) byIp.set(a.ip, (byIp.get(a.ip) ?? 0) + 1)
    return [...byIp.entries()].filter(([, n]) => n >= 3)
  }, [fails24])

  const mm = Math.max(0, Math.floor(remaining / 60000))
  const ss = Math.max(0, Math.floor((remaining % 60000) / 1000))
  const dateLabel = new Date(t).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-full bg-[#F4F1EC] text-tinta">
      {/* header */}
      <header className="bg-tinta text-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-papel">
              <Simbolo height={30} />
            </span>
            <div className="leading-tight">
              <p className="text-[16px] font-extrabold tracking-tight">Panel de portería</p>
              <p className="text-[13px] capitalize text-white/60">{dateLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 sm:flex">
              <span className="size-2 rounded-full bg-[#4ADE80]" />
              {user} · cierra en <span className="tabular-nums">{mm}:{String(ss).padStart(2, '0')}</span>
            </span>
            <button onClick={onExit} className="rounded-full px-3 py-1.5 text-white/75 hover:bg-white/10 hover:text-white">
              Vista estudiante
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 font-semibold text-tinta hover:bg-papel">
              <LogOut className="size-4" /> Salir
            </button>
          </div>
        </div>
        <WayuuBand height={8} bg="#241C16" />
      </header>

      <div className="mx-auto max-w-[1280px] space-y-5 px-5 py-6 sm:px-8">
        {suspicious.length > 0 && (
          <button
            onClick={() => setSecOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-aviso/30 bg-[#FBEAE8] px-5 py-3.5 text-left text-[14px] text-aviso"
          >
            <ShieldAlert className="size-5 shrink-0" />
            <span className="flex-1">
              <b>Posible intento de adivinar la clave:</b>{' '}
              {suspicious.map(([ip, n]) => `${ip} falló ${n} veces`).join(' · ')} en las últimas 24 h.
            </span>
            <span className="font-semibold underline underline-offset-2">Revisar</span>
          </button>
        )}

        {/* history */}
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
            <div>
              <h3 className="text-[18px] font-extrabold tracking-tight">Historial</h3>
              <p className="text-[13px] text-sub">{filtered.length.toLocaleString('es-CO')} registros{active ? ` · ${active} filtro(s)` : ''}</p>
            </div>
            {active > 0 && (
              <button onClick={clear} className="flex items-center gap-1 rounded-full bg-cont px-3 py-1.5 text-[13px] font-semibold hover:bg-borde">
                <X className="size-3.5" /> Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid gap-2.5 px-5 pt-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sub" />
              <input
                value={q}
                onChange={(e) => upd(setQ)(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="Documento o código"
                className="h-11 w-full rounded-xl border border-borde bg-papel pl-9 pr-3 text-[14px] outline-none focus:border-tinta focus:bg-white"
              />
            </label>
            <Select value={brand} onChange={upd(setBrand)} label="Marca" options={BRANDS.filter((b) => b !== 'Otra')} />
            <Select value={color} onChange={upd(setColor)} label="Color" options={COLORS.map((c) => c.name)} />
            <Select value={type} onChange={upd(setType)} label="Movimiento" options={['ENTRADA', 'SALIDA']} labels={{ ENTRADA: 'Entrada', SALIDA: 'Salida' }} />
            <Select value={origin} onChange={upd(setOrigin)} label="Origen" options={['online', 'offline']} labels={{ online: 'En línea', offline: 'Sincronizado sin conexión' }} />
            <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-1">
              <input type="date" value={from} onChange={(e) => upd(setFrom)(e.target.value)} aria-label="Desde" className="h-11 min-w-0 flex-1 rounded-xl border border-borde bg-papel px-2 text-[13px] outline-none focus:border-tinta" />
              <span className="text-sub">–</span>
              <input type="date" value={to} onChange={(e) => upd(setTo)(e.target.value)} aria-label="Hasta" className="h-11 min-w-0 flex-1 rounded-xl border border-borde bg-papel px-2 text-[13px] outline-none focus:border-tinta" />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-[14px]">
              <thead>
                <tr className="border-y border-borde bg-papel text-[12px] uppercase tracking-[0.08em] text-sub">
                  {['Fecha', 'Movimiento', 'Estudiante', 'Documento', 'Código', 'Equipo', 'Origen'].map((h) => (
                    <th key={h} className="px-5 py-2.5 font-semibold first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const s = students[m.doc]
                  const l = laptopById.get(m.laptopId)
                  return (
                    <tr key={m.id} className="border-b border-cont hover:bg-papel">
                      <td className="whitespace-nowrap px-5 py-2.5 tabular-nums text-sub">{fmtDateTime(m.at)}</td>
                      <td className="px-5 py-2.5">
                        <span className="inline-flex items-center gap-1.5 font-bold">
                          {m.type === 'ENTRADA' ? <LogIn className="size-4" /> : <LogOut className="size-4 text-sub" />}
                          {m.type === 'ENTRADA' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 font-medium">{s ? `${s.first} ${s.last}` : '—'}</td>
                      <td className="px-5 py-2.5 tabular-nums">{m.doc}</td>
                      <td className="px-5 py-2.5 tabular-nums text-sub">{s?.code}</td>
                      <td className="px-5 py-2.5">
                        {l && (
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <LaptopGlyph brand={l.brand} color={l.color} size={30} />
                            {l.brand} · <span className="text-sub">{l.color}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5"><OriginTag m={m} /></td>
                    </tr>
                  )
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center text-sub">Nada coincide con esos filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-4 text-[13px] text-sub">
            <span>
              Página <b className="text-tinta">{pg + 1}</b> de {pages} · {filtered.length.toLocaleString('es-CO')} registros
            </span>
            <div className="flex gap-2">
              <PageBtn disabled={pg === 0} onClick={() => setPage(pg - 1)}><ChevronLeft className="size-4" /> Anterior</PageBtn>
              <PageBtn disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}>Siguiente <ChevronRight className="size-4" /></PageBtn>
            </div>
          </div>
        </Card>

        {/* summary: secondary to the history, so it comes after */}
        <div className="flex items-end justify-between pt-3">
          <div>
            <h3 className="text-[18px] font-extrabold tracking-tight">Resumen</h3>
            <p className="text-[13px] text-sub">Cómo va el día y la semana</p>
          </div>
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icon={<LogIn className="size-4" />} label="Entradas hoy" value={stats.in} />
          <Kpi icon={<LogOut className="size-4" />} label="Salidas hoy" value={stats.out} />
          <Kpi icon={<LaptopIcon className="size-4" />} label="Equipos adentro ahora" value={stats.inside} accent />
          <Kpi
            icon={<CloudOff className="size-4" />}
            label="Llegaron sin conexión"
            value={stats.offToday}
            foot={stats.todayTotal ? `${Math.round((stats.offToday / stats.todayTotal) * 100)}% de hoy` : 'sin registros hoy'}
            tone="coral"
          />
        </div>

        {/* charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHead
              title="Movimiento de hoy, por hora"
              sub="El pico de la mañana es la fila de la portería."
              right={
                <div className="flex gap-3 text-[12px] text-sub">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-tinta" />Entradas</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#C9BFB1]" />Salidas</span>
                </div>
              }
            />
            <HourChart hours={stats.hours} nowH={new Date(t).getHours() + new Date(t).getMinutes() / 60} />
          </Card>
          <Card>
            <CardHead title="Origen de los registros" sub="Últimos 7 días" />
            <OriginDonut online={stats.weekTotal - stats.weekOffline} offline={stats.weekOffline} />
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHead title="Última semana" sub="Registros por día · la franja coral es lo que llegó sin conexión" />
            <WeekBars week={stats.week} />
          </Card>
          <Card>
            <CardHead title="Marcas más vistas" sub="Últimos 7 días" />
            <ul className="space-y-2.5 px-5 pb-5 pt-4">
              {stats.brands.map(([b, n]) => (
                <li key={b} className="flex items-center gap-3 text-[14px]">
                  <span className="w-16 font-semibold">{b}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-cont">
                    <span className="block h-full rounded-full bg-tinta" style={{ width: `${(n / (stats.brands[0]?.[1] || 1)) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right tabular-nums text-sub">{n}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* security */}
        <Card>
          <button onClick={() => setSecOpen(!secOpen)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
            <span className={`grid size-9 place-items-center rounded-lg ${fails24.length ? 'bg-[#FBEAE8] text-aviso' : 'bg-teal-soft text-teal'}`}>
              {fails24.length ? <ShieldAlert className="size-5" /> : <ShieldCheck className="size-5" />}
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-bold">Seguridad · intentos de acceso al panel</span>
              <span className="text-[13px] text-sub">{fails24.length ? `${fails24.length} intento(s) fallido(s) en las últimas 24 h` : 'Sin intentos fallidos en las últimas 24 h'}</span>
            </span>
            <ChevronDown className={`size-5 text-sub transition ${secOpen ? 'rotate-180' : ''}`} />
          </button>
          {secOpen && (
            <ul className="animate-fade border-t border-borde">
              {recentLogins.slice(0, 12).map((a) => {
                const flagged = suspicious.some(([ip]) => ip === a.ip)
                return (
                  <li key={a.id} className="flex items-center gap-4 border-b border-cont px-5 py-2.5 text-[14px] last:border-0">
                    <span className={`size-2 shrink-0 rounded-full ${a.ok ? 'bg-teal' : 'bg-aviso'}`} />
                    <span className="w-36 tabular-nums text-sub">{fmtDateTime(a.at)}</span>
                    <span className="w-28 font-medium">{a.user}</span>
                    <span className={`flex-1 tabular-nums ${flagged ? 'font-semibold text-aviso' : 'text-sub'}`}>
                      {a.ip} {flagged && <AlertTriangle className="ml-1 inline size-3.5" />}
                    </span>
                    <span className={`text-[12px] font-bold uppercase tracking-wide ${a.ok ? 'text-teal' : 'text-aviso'}`}>{a.ok ? 'Exitoso' : 'Fallido'}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <p className="flex items-center justify-center gap-2 pb-4 text-[12px] text-sub">
          <Smartphone className="size-3.5" /> Los registros guardados en celulares sin conexión aparecen aquí cuando se sincronizan · última actualización {fmtTime(t)}
        </p>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, foot, accent, tone }: { icon: ReactNode; label: string; value: number; foot?: string; accent?: boolean; tone?: 'coral' }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-tinta bg-tinta text-white' : 'border-borde bg-white'}`}>
      <p className={`flex items-center gap-2 text-[13px] font-semibold ${accent ? 'text-white/70' : tone === 'coral' ? 'text-coral' : 'text-sub'}`}>
        {icon} {label}
      </p>
      <p className="mt-2 text-[44px] font-black leading-none tracking-[-0.03em] tabular-nums">{value}</p>
      {foot && <p className="mt-1.5 text-[12px] text-sub">{foot}</p>}
    </div>
  )
}

function HourChart({ hours, nowH }: { hours: { h: number; in: number; out: number }[]; nowH: number }) {
  const W = 720
  const H = 230
  const pad = { l: 28, r: 8, t: 16, b: 26 }
  const max = Math.max(4, ...hours.map((h) => Math.max(h.in, h.out)))
  const slot = (W - pad.l - pad.r) / hours.length
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b)
  const bw = Math.min(14, slot / 2 - 3)
  const nowX = pad.l + (nowH - 5) * slot
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full px-3 pb-3">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="#EEEBE6" />
          <text x={pad.l - 6} y={y(max * f)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#6B655C">{Math.round(max * f)}</text>
        </g>
      ))}
      {hours.map((h, i) => {
        const cx = pad.l + slot * i + slot / 2
        return (
          <g key={h.h}>
            <rect x={cx - bw - 1} y={y(h.in)} width={bw} height={H - pad.b - y(h.in)} rx="3" fill="#241C16" />
            <rect x={cx + 1} y={y(h.out)} width={bw} height={H - pad.b - y(h.out)} rx="3" fill="#C9BFB1" />
            {i % 2 === 0 && (
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B655C">{h.h > 12 ? `${h.h - 12}p` : `${h.h}${h.h === 12 ? 'p' : 'a'}`}</text>
            )}
          </g>
        )
      })}
      {nowH >= 5 && nowH <= 22 && (
        <g>
          <line x1={nowX} x2={nowX} y1={pad.t - 6} y2={H - pad.b} stroke="#241C16" strokeDasharray="3 4" />
          <text x={nowX + 5} y={pad.t} fontSize="11" fontWeight="700" fill="#241C16">ahora</text>
        </g>
      )}
    </svg>
  )
}

function OriginDonut({ online, offline }: { online: number; offline: number }) {
  const total = online + offline || 1
  const pOff = (offline / total) * 100
  return (
    <div className="flex flex-col items-center gap-5 px-5 pb-5 pt-4">
      <div className="relative size-40">
        <svg viewBox="0 0 42 42" className="size-full -rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#2B8496" strokeWidth="5.5" />
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#CC5C50" strokeWidth="5.5" pathLength={100} strokeDasharray={`${pOff} ${100 - pOff}`} />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="text-[32px] font-black leading-none tabular-nums">{Math.round(100 - pOff)}%</p>
          <p className="text-[12px] text-sub">en línea</p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 text-[13px]">
        <div className="rounded-xl bg-teal-soft px-3 py-2 text-teal-dark">
          <p className="font-bold">En línea</p>
          <p className="tabular-nums">{online} registros</p>
        </div>
        <div className="rounded-xl bg-coral-soft px-3 py-2 text-coral-dark">
          <p className="font-bold">Sin conexión</p>
          <p className="tabular-nums">{offline} sincronizados</p>
        </div>
      </div>
    </div>
  )
}

function WeekBars({ week }: { week: { d0: number; total: number; offline: number }[] }) {
  const max = Math.max(1, ...week.map((w) => w.total))
  return (
    <div className="flex h-48 items-end gap-3 px-5 pb-5 pt-6">
      {week.map((w, i) => {
        const h = (w.total / max) * 100
        const isToday = i === week.length - 1
        return (
          <div key={w.d0} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[12px] font-semibold tabular-nums text-sub">{w.total}</span>
            <div className="flex w-full max-w-14 flex-col justify-end overflow-hidden rounded-lg bg-cont" style={{ height: `${Math.max(h, 3)}%` }}>
              <div className="bg-coral" style={{ height: `${w.total ? (w.offline / w.total) * 100 : 0}%` }} />
              <div className={`flex-1 ${isToday ? 'bg-tinta' : 'bg-[#8C8377]'}`} />
            </div>
            <span className={`text-[12px] capitalize ${isToday ? 'font-bold text-tinta' : 'text-sub'}`}>
              {isToday ? 'Hoy' : new Date(w.d0).toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Select({ value, onChange, label, options, labels }: { value: string; onChange: (v: string) => void; label: string; options: readonly string[]; labels?: Record<string, string> }) {
  return (
    <label className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`h-11 w-full appearance-none rounded-xl border bg-papel pl-3 pr-8 text-[14px] outline-none focus:border-tinta ${value ? 'border-tinta bg-white font-semibold' : 'border-borde text-sub'}`}
      >
        <option value="">{label}: todas</option>
        {options.map((o) => (
          <option key={o} value={o}>{labels?.[o] ?? o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-sub" />
    </label>
  )
}

function PageBtn({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button disabled={disabled} onClick={onClick} className="flex items-center gap-1 rounded-lg border border-borde bg-white px-3 py-1.5 font-semibold text-tinta hover:bg-papel disabled:opacity-40">
      {children}
    </button>
  )
}
