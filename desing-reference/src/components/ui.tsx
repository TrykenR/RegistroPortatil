import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { AlertCircle, Check, ChevronDown, ChevronLeft, LoaderCircle, ServerOff, WifiOff } from 'lucide-react'
import type { ErrCode } from '../lib/store'
import { ERR } from '../lib/copy'
import { WayuuBand } from './Wayuu'
import simbolo from '../assets/uniguajira-simbolo.png'

export function PrimaryButton({
  children,
  loading,
  loadingText,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`relative flex h-16 w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-coral text-[19px] font-bold tracking-tight text-white shadow-[0_6px_0_0_#A8473C] transition-[transform,box-shadow,background-color] duration-100 active:translate-y-[4px] active:bg-coral-dark active:shadow-[0_2px_0_0_#A8473C] disabled:cursor-wait ${className}`}
    >
      {loading ? (
        <>
          <LoaderCircle className="size-5 animate-spin" />
          {loadingText ?? 'Guardando…'}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`flex h-16 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-borde bg-white text-[17px] font-semibold text-tinta transition active:scale-[0.985] active:bg-cont ${className}`}
    >
      {children}
    </button>
  )
}

export function TextField({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-semibold uppercase tracking-[0.12em] text-sub">
        {label}
        {hint && <span className="text-[12px] font-normal normal-case tracking-normal">{hint}</span>}
      </span>
      <input
        {...rest}
        className="h-16 w-full rounded-[14px] border-2 border-transparent bg-cont px-4 text-[18px] text-tinta outline-none transition placeholder:text-sub/60 focus:border-coral focus:bg-white"
      />
    </label>
  )
}

/** Errors read like a person talking. System-wide failures get their own calmer card. */
export function ErrorNote({ code, k }: { code: ErrCode | null; k?: number }) {
  if (!code) return null
  if (code === 'down' || code === 'noconn') {
    const Icon = code === 'down' ? ServerOff : WifiOff
    return (
      <div key={k} role="alert" className="flex animate-rise gap-3 rounded-[14px] border border-coral/25 bg-coral-soft p-4 text-[15px] leading-snug text-coral-dark">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral text-white">
          <Icon className="size-5" />
        </span>
        <p>
          <strong className="block text-[16px] text-tinta">{code === 'down' ? 'No eres tú, es el sistema.' : 'No hay señal aquí.'}</strong>
          {ERR[code]}
        </p>
      </div>
    )
  }
  return (
    <p key={k} role="alert" className="flex animate-shake items-start gap-2 text-[15px] font-medium leading-snug text-aviso">
      <AlertCircle className="mt-0.5 size-[18px] shrink-0" />
      {ERR[code]}
    </p>
  )
}

export function ConsentBox({ checked, onChange, invalid }: { checked: boolean; onChange: (v: boolean) => void; invalid?: boolean }) {
  return (
    <div className="space-y-2">
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-[14px] border-2 bg-cont p-4 transition ${
          checked ? 'border-teal bg-teal-soft/60' : invalid ? 'border-aviso' : 'border-transparent'
        }`}
      >
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-coral ${
            checked ? 'border-teal bg-teal text-white' : 'border-sub/50 bg-white'
          }`}
        >
          {checked && <Check className="size-4 animate-pop" strokeWidth={3.5} />}
        </span>
        <span className="text-[15px] leading-snug">
          Autorizo a la Universidad de La Guajira a tratar mis datos personales <span className="text-sub">(Ley 1581 de 2012)</span>.
        </span>
      </label>
      <details className="group rounded-[14px] px-1">
        <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-[14px] font-semibold text-teal">
          ¿Para qué usamos tus datos?
          <ChevronDown className="size-4 transition group-open:rotate-180" />
        </summary>
        <p className="pb-1 pt-1 text-[14px] leading-relaxed text-sub">
          Solo para registrar cuándo entra y sale tu portátil del campus, y así poder ayudarte si se pierde o hay una duda en portería. No se comparten con terceros. Puedes pedir que
          se corrijan o borren escribiendo a la oficina de Bienestar.
        </p>
      </details>
    </div>
  )
}

export function Simbolo({ height = 26, className = '' }: { height?: number; className?: string }) {
  return <img src={simbolo} alt="" aria-hidden style={{ height, width: 'auto' }} className={className} />
}

/**
 * Shared mobile layout: woven top band, header, scroll-safe middle, actions in the thumb zone.
 * `center` vertically centers sparse content; it falls back to scrolling from the top when it overflows.
 */
export function Screen({
  children,
  actions,
  onBack,
  headerRight,
  enter = 'rise',
  center = false,
}: {
  children: ReactNode
  actions?: ReactNode
  onBack?: () => void
  headerRight?: ReactNode
  enter?: 'rise' | 'fade'
  center?: boolean
}) {
  return (
    <div className="@container flex h-full flex-col bg-papel">
      <WayuuBand height={10} bg="#FAF8F5" />
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        {onBack ? (
          <button onClick={onBack} className="-ml-2 flex h-11 items-center gap-0.5 rounded-full pl-1 pr-3 text-[15px] font-semibold text-sub active:bg-cont">
            <ChevronLeft className="size-5" /> Atrás
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Simbolo height={26} />
            <span className="text-[15px] font-extrabold tracking-tight text-teal">Uniguajira</span>
            <span className="text-[15px] text-sub">· Portería</span>
          </div>
        )}
        {headerRight}
      </header>
      <main className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-3 ${enter === 'rise' ? 'animate-rise' : 'animate-fade'}`}>
        <div className={center ? 'my-auto w-full py-4' : 'w-full'}>{children}</div>
      </main>
      {actions && <footer className="shrink-0 space-y-3 px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-2">{actions}</footer>}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.22em] text-oro-dark">{children}</p>
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-balance text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-tinta">{children}</h1>
}
