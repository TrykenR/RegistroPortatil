import type { ReactNode } from 'react'
import { Clock, LayoutDashboard, RotateCcw, ServerOff, Wifi, WifiOff } from 'lucide-react'
import { DEMO_DOC, LEGACY_DOC } from '../lib/data'
import { fmtTime } from '../lib/copy'
import { advanceClock, demoFill, now, resetClock, resetDemo, setFrame, setNet, useStore, type NetMode } from '../lib/store'
import { Simbolo } from './ui'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sub">{title}</p>
      {children}
    </div>
  )
}

const NETS: { id: NetMode; label: string; icon: typeof Wifi }[] = [
  { id: 'online', label: 'En línea', icon: Wifi },
  { id: 'offline', label: 'Sin señal', icon: WifiOff },
  { id: 'down', label: 'Servidor caído', icon: ServerOff },
]

/** Prototype-only controls to walk every state of the real system. */
export function DemoPanel({ onAdmin, onPicked }: { onAdmin: () => void; onPicked?: () => void }) {
  const net = useStore((s) => s.net)
  const frame = useStore((s) => s.frame)
  const offset = useStore((s) => s.clockOffset)
  const queue = useStore((s) => s.device.queue.length)
  const docs = [
    { doc: DEMO_DOC, label: 'Frecuente · 2 equipos' },
    { doc: LEGACY_DOC, label: 'Sin consentimiento previo' },
    { doc: '1098765432', label: 'Estudiante nuevo' },
  ]
  return (
    <div className="w-[300px] space-y-5 rounded-3xl border border-black/5 bg-white/90 p-5 shadow-[0_20px_50px_-25px_rgba(36,28,22,.35)] backdrop-blur">
      <div className="flex items-center gap-2.5">
        <Simbolo height={30} />
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight">Prototipo · Portería</p>
          <p className="text-[12px] text-sub">Controles para recorrer cada estado</p>
        </div>
      </div>

      <Group title="Conexión del celular">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-cont p-1">
          {NETS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setNet(id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold leading-tight transition ${
                net === id ? (id === 'online' ? 'bg-teal text-white' : 'bg-coral text-white') : 'text-sub hover:bg-white'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        {queue > 0 && <p className="mt-2 text-[12px] text-coral">{queue} registro(s) esperando en el celular. Vuelve a “En línea” para sincronizar.</p>}
      </Group>

      <Group title="Documentos de prueba">
        <div className="space-y-1.5">
          {docs.map((d) => (
            <button
              key={d.doc}
              onClick={() => {
                demoFill(d.doc)
                onPicked?.()
              }}
              className="flex w-full items-center justify-between rounded-xl border border-borde px-3 py-2 text-left hover:border-tinta"
            >
              <span className="text-[13px] font-semibold tabular-nums">{d.doc}</span>
              <span className="text-[11px] text-sub">{d.label}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Reloj simulado · regla de 45 min">
        <div className="flex items-center gap-2">
          <span className="flex flex-1 items-center gap-1.5 rounded-xl bg-cont px-3 py-2 text-[13px] font-semibold tabular-nums">
            <Clock className="size-4 text-sub" /> {fmtTime(now())}
          </span>
          <button onClick={() => advanceClock(60 * 60000)} className="rounded-xl bg-tinta px-3 py-2 text-[13px] font-semibold text-white">
            +1 h
          </button>
          {offset !== 0 && (
            <button onClick={resetClock} className="rounded-xl border border-borde px-2.5 py-2 text-[12px] text-sub">
              Ahora
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-sub">Toca el mismo equipo dos veces seguidas: re-confirma. Adelanta 1 h y cambia a SALIDA.</p>
      </Group>

      <Group title="Pantalla">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-cont p-1 text-[12px] font-semibold">
          {(['se', 'pro'] as const).map((f) => (
            <button key={f} onClick={() => setFrame(f)} className={`rounded-lg py-1.5 ${frame === f ? 'bg-white shadow-sm' : 'text-sub'}`}>
              {f === 'se' ? 'iPhone SE' : 'iPhone 15'}
            </button>
          ))}
        </div>
      </Group>

      <div className="flex gap-2 border-t border-borde pt-4">
        <button onClick={onAdmin} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-tinta py-2.5 text-[13px] font-semibold text-white">
          <LayoutDashboard className="size-4" /> Panel admin
        </button>
        <button
          onClick={() => {
            resetDemo()
            sessionStorage.removeItem('splash-seen')
            location.reload()
          }}
          className="flex items-center gap-1.5 rounded-xl border border-borde px-3 text-[13px] text-sub hover:text-tinta"
        >
          <RotateCcw className="size-4" /> Reiniciar
        </button>
      </div>
    </div>
  )
}
