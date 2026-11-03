import { Check, RefreshCw, ServerOff, WifiOff } from 'lucide-react'
import { useStore } from '../lib/store'

/** Only present when there is something real to say; leaves on its own. */
export function StatusBanner() {
  const net = useStore((s) => s.net)
  const queue = useStore((s) => s.device.queue)
  const syncing = useStore((s) => s.syncing)
  const justSynced = useStore((s) => s.justSynced)
  const n = queue.length

  let tone: 'coral' | 'teal' = 'coral'
  let Icon = WifiOff
  let title = ''
  let detail = ''
  let key = ''

  if (syncing) {
    tone = 'teal'
    Icon = RefreshCw
    title = `Sincronizando ${syncing} registro(s)…`
    detail = 'Volvió la conexión'
    key = 'sync'
  } else if (justSynced) {
    tone = 'teal'
    Icon = Check
    title = `${justSynced} registro(s) enviados`
    detail = 'Todo quedó en el sistema'
    key = 'done'
  } else if (net === 'offline') {
    title = 'Sin conexión'
    detail = n ? `${n} registro(s) en espera` : 'tus registros se guardarán en el celular'
    key = 'off'
  } else if (net === 'down') {
    Icon = ServerOff
    title = 'Sistema fuera de servicio'
    detail = n ? `${n} registro(s) en espera` : 'tus registros se guardarán en el celular'
    key = 'down'
  } else return null

  const stitches = syncing || n
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-30" role="status" aria-live="polite">
      <div
        key={key}
        className={`pointer-events-auto flex animate-banner items-center gap-3 rounded-2xl px-3.5 py-2.5 text-white shadow-[0_10px_30px_-10px_rgba(36,28,22,.55)] ${
          tone === 'teal' ? 'bg-teal' : 'bg-coral'
        }`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/18">
          <Icon className={`size-[18px] ${syncing ? 'animate-spin [animation-duration:1.6s]' : ''}`} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[15px] font-bold">{title}</p>
          <p className="truncate text-[13px] text-white/85">{detail}</p>
        </div>
        {stitches > 0 && !justSynced && (
          <div className="flex shrink-0 items-center gap-1" aria-hidden>
            {Array.from({ length: Math.min(stitches, 5) }).map((_, i) => (
              <span
                key={i}
                className={`block size-2.5 rotate-45 rounded-[2px] bg-white ${syncing ? 'animate-float-up' : 'animate-thread'}`}
                style={{ animationDelay: `${i * (syncing ? 260 : 140)}ms` }}
              />
            ))}
            {stitches > 5 && <span className="ml-0.5 text-[12px] font-bold">+{stitches - 5}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
