import { useState } from 'react'
import { LoaderCircle, Plus, Smartphone } from 'lucide-react'
import { LaptopGlyph } from '../components/LaptopGlyph'
import { ErrorNote, PrimaryButton, Screen, SecondaryButton, Title } from '../components/ui'
import { fmtTime } from '../lib/copy'
import { ApiError, lastMoveToday, registerMovement, useStore, type ErrCode, type Laptop, type MoveResult, type Student } from '../lib/store'

export function MyLaptops({
  student,
  laptops,
  fromCache,
  onBack,
  onAdd,
  onDone,
}: {
  student: Student
  laptops: Laptop[]
  fromCache: boolean
  onBack: () => void
  onAdd: () => void
  onDone: (r: MoveResult) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<ErrCode | null>(null)
  const [errKey, setErrKey] = useState(0)
  // Re-render when movements change so the "adentro / afuera" chips stay current.
  useStore((s) => s.server.movements)
  useStore((s) => s.device.queue)
  useStore((s) => s.clockOffset)
  const net = useStore((s) => s.net)

  async function pick(l: Laptop) {
    if (busy) return
    setBusy(l.id)
    setErr(null)
    try {
      onDone(await registerMovement(student, l))
    } catch (x) {
      setErr(x instanceof ApiError ? x.code : 'down')
      setErrKey((k) => k + 1)
      setBusy(null)
    }
  }

  return (
    <Screen
      center={laptops.length <= 2}
      onBack={onBack}
      headerRight={
        <button onClick={onBack} className="rounded-full px-3 py-2 text-[14px] font-semibold text-sub active:bg-cont">
          No soy yo
        </button>
      }
      actions={
        laptops.length ? (
          <SecondaryButton onClick={onAdd}>
            <Plus className="size-5" /> Agregar otro equipo
          </SecondaryButton>
        ) : (
          <PrimaryButton onClick={onAdd}>
            <Plus className="size-5" /> Registrar mi equipo
          </PrimaryButton>
        )
      }
    >
      <div className={laptops.length <= 2 ? 'text-center' : ''}>
        <Title>Hola, {student.first.split(' ')[0]}.</Title>
        <p className="mt-1.5 text-[16px] text-sub">¿Cuál traes hoy? Un toque y listo.</p>
      </div>
      {(fromCache || net !== 'online') && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-coral-soft px-3 py-2 text-[13px] font-medium text-coral-dark">
          <Smartphone className="size-4 shrink-0" /> Tus equipos están guardados en este celular. Puedes registrar igual.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {laptops.map((l, i) => {
          const last = lastMoveToday(l.id)
          const isBusy = busy === l.id
          return (
            <li key={l.id} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
              <button
                onClick={() => pick(l)}
                disabled={Boolean(busy)}
                className={`relative flex min-h-[92px] w-full items-center gap-3.5 overflow-hidden rounded-[18px] border-2 bg-white p-2.5 pr-4 text-left transition duration-150 active:scale-[0.98] ${
                  isBusy ? 'border-coral' : 'border-borde'
                } ${busy && !isBusy ? 'opacity-50' : ''}`}
              >
                <span className="grid h-[72px] w-[84px] shrink-0 place-items-center rounded-xl bg-cont">
                  <LaptopGlyph brand={l.brand} color={l.color} size={70} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[22px] font-extrabold uppercase leading-none tracking-tight">{l.brand}</span>
                  <span className="mt-1 block truncate text-[17px] font-semibold leading-tight text-sub">{l.color}</span>
                  {l.nickname && <span className="mt-0.5 block truncate text-[14px] text-sub/80">“{l.nickname}”</span>}
                </span>
                {last && !isBusy && (
                  <span className="shrink-0 rounded-full bg-cont px-2.5 py-1 text-right text-[12px] font-semibold leading-tight text-sub">
                    {last.type === 'ENTRADA' ? 'Adentro' : 'Salió'}
                    <span className="block font-normal tabular-nums">{fmtTime(last.at)}</span>
                  </span>
                )}
                {isBusy && (
                  <span className="flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-coral">
                    <LoaderCircle className="size-4 animate-spin" /> Registrando…
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {!laptops.length && <p className="mt-6 text-center text-[15px] text-sub">Aún no tienes equipos vinculados.</p>}
      <div className="mt-3">
        <ErrorNote code={err} k={errKey} />
      </div>
    </Screen>
  )
}
