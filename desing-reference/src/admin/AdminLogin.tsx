import { useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound, LoaderCircle } from 'lucide-react'
import { WayuuBand, WayuuField } from '../components/Wayuu'
import { Simbolo } from '../components/ui'
import { ERR } from '../lib/copy'
import { adminLogin, ApiError, type ErrCode } from '../lib/store'

export function AdminLogin({ onLogin, onExit, notice }: { onLogin: (user: string) => void; onExit: () => void; notice?: string }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState<ErrCode | null>(null)
  const [k, setK] = useState(0)
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    try {
      onLogin(await adminLogin(user, pass))
    } catch (x) {
      setErr(x instanceof ApiError ? x.code : 'auth')
      setK((n) => n + 1)
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-full bg-papel lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-teal text-white lg:flex lg:flex-col lg:justify-between">
        <WayuuField color="#fff" opacity={0.09} cell={7} />
        <div className="relative p-12">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-papel">
              <Simbolo height={36} />
            </span>
            <span className="text-[15px] font-bold uppercase tracking-[0.25em] text-white/85">Uniguajira</span>
          </div>
        </div>
        <div className="relative p-12">
          <h1 className="text-[64px] font-black leading-[0.9] tracking-[-0.04em]">
            Panel de
            <br />
            portería.
          </h1>
          <p className="mt-5 max-w-sm text-[17px] leading-relaxed text-white/85">Quién entró, quién salió y qué quedó pendiente de sincronizar, en un solo lugar.</p>
        </div>
        <WayuuBand height={18} c="#FAF8F5" bg="#2B8496" className="relative" />
      </aside>

      <main className="flex flex-col p-6 sm:p-12">
        <button onClick={onExit} className="flex items-center gap-2 self-start rounded-full px-3 py-2 text-[14px] font-semibold text-sub hover:bg-cont">
          <ArrowLeft className="size-4" /> Volver a la app
        </button>
        <form onSubmit={submit} className="mx-auto my-auto w-full max-w-sm py-10">
          <span className="mb-6 grid size-12 place-items-center rounded-xl bg-tinta text-white">
            <KeyRound className="size-5" />
          </span>
          <h2 className="text-[32px] font-extrabold tracking-tight">Acceso administrativo</h2>
          <p className="mt-1 text-[15px] text-sub">Solo para portería y administración del servidor.</p>
          {notice && <p className="mt-4 rounded-xl bg-cont px-4 py-3 text-[14px] text-tinta">{notice}</p>}
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold uppercase tracking-[0.12em] text-sub">Usuario</span>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
                autoFocus
                className="h-14 w-full rounded-xl border-2 border-borde bg-white px-4 text-[17px] outline-none focus:border-tinta"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold uppercase tracking-[0.12em] text-sub">Clave</span>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                className="h-14 w-full rounded-xl border-2 border-borde bg-white px-4 text-[17px] outline-none focus:border-tinta"
              />
            </label>
          </div>
          {err && (
            <p key={k} role="alert" className="mt-3 animate-shake text-[15px] font-medium text-aviso">
              {ERR[err]}
            </p>
          )}
          <button
            disabled={loading}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-tinta text-[17px] font-bold text-white transition hover:bg-black active:scale-[0.99]"
          >
            {loading ? <LoaderCircle className="size-5 animate-spin" /> : 'Entrar'}
          </button>
          <p className="mt-6 rounded-xl border border-dashed border-borde px-4 py-3 text-[13px] text-sub">
            Prototipo · usuario <b className="text-tinta">porteria</b> · clave <b className="text-tinta">wayuu2025</b>
          </p>
        </form>
      </main>
    </div>
  )
}
