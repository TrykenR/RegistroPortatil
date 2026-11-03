import { CloudOff, LogIn, LogOut, RotateCcw } from 'lucide-react'
import { fmtTime } from '../lib/copy'
import type { MoveResult } from '../lib/store'

/** Sized so the longest word fills the width, capped at 128px. */
function FitLine({ text, delay }: { text: string; delay: number }) {
  const cq = Math.min(48, 122 / Math.max(text.length, 2))
  return (
    <span
      className="block animate-rise font-black uppercase leading-[0.88] tracking-[-0.03em]"
      style={{ fontSize: `min(128px, ${cq}cqw)`, animationDelay: `${delay}ms` }}
    >
      {text}
    </span>
  )
}

/** The screen is for the guard, read from a meter away: one solid color, huge type. */
export function Confirm({ result, onDone }: { result: MoveResult; onDone: () => void }) {
  const online = result.origin === 'online'
  const entering = result.type === 'ENTRADA'
  const Dir = entering ? LogIn : LogOut
  const name = `${result.student.first.split(' ')[0]} ${result.student.last.split(' ')[0]}`

  return (
    <div role="status" aria-live="assertive" className={`@container absolute inset-0 z-40 flex flex-col text-white ${online ? 'bg-teal' : 'bg-coral'}`}>
      <div className={`flex flex-1 flex-col items-center justify-center px-5 text-center ${entering ? 'animate-rise' : 'animate-drop'}`}>
        <div className="relative grid place-items-center" style={{ width: 'min(112px, 28cqw)', aspectRatio: '1' }}>
          <span className="absolute inset-0 animate-ring rounded-full border-[6px] border-white" />
          <svg viewBox="0 0 52 52" className="size-full animate-pop">
            <circle cx="26" cy="26" r="24" fill="rgba(255,255,255,.18)" />
            <path d="M15 27 L23 35 L38 18" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" className="animate-draw" />
          </svg>
        </div>

        <p className="mt-5 flex items-center gap-3 text-[24px] font-extrabold tracking-[0.42em]">
          <Dir className="size-7" strokeWidth={2.75} />
          <span className="-mr-[0.42em]">{result.type}</span>
        </p>

        <div className="mt-5 w-full">
          <FitLine text={result.laptop.brand} delay={200} />
          <FitLine text={result.laptop.color} delay={290} />
        </div>
      </div>

      <div className="space-y-3 px-5 pb-[max(20px,env(safe-area-inset-bottom))] text-center">
        {!online && (
          <p className="flex items-center justify-center gap-2 text-[16px] font-bold">
            <CloudOff className="size-5" /> Guardado sin conexión · se enviará solo
          </p>
        )}
        {result.reconfirmed && (
          <p className="flex items-center justify-center gap-2 text-[14px] text-white/85">
            <RotateCcw className="size-4" /> Ya estaba registrado hace poco
          </p>
        )}
        <p className="text-[15px] text-white/80">
          {name} · <span className="tabular-nums">{fmtTime(result.at)}</span>
        </p>
        <button
          onClick={onDone}
          className="h-16 w-full rounded-[14px] border border-white/35 bg-white/15 text-[19px] font-bold backdrop-blur-sm transition active:scale-[0.985] active:bg-white/25"
        >
          Listo
        </button>
      </div>
    </div>
  )
}
