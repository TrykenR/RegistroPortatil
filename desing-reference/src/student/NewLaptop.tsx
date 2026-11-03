import { useState, type FormEvent } from 'react'
import { Check, Plus } from 'lucide-react'
import { LaptopGlyph } from '../components/LaptopGlyph'
import { ErrorNote, PrimaryButton, Screen, Title } from '../components/ui'
import { BRANDS, COLORS } from '../lib/data'
import { addLaptop, ApiError, type ErrCode, type Laptop, type MoveResult, type Student } from '../lib/store'

const label = 'mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-sub'

export function NewLaptop({
  student,
  firstTime,
  onBack,
  onDone,
}: {
  student: Student
  firstTime: boolean
  onBack: () => void
  onDone: (l: Laptop, r: MoveResult) => void
}) {
  const [brand, setBrand] = useState('')
  const [brandOther, setBrandOther] = useState('')
  const [color, setColor] = useState('')
  const [colorOther, setColorOther] = useState('')
  const [nick, setNick] = useState('')
  const [err, setErr] = useState<ErrCode | null>(null)
  const [errKey, setErrKey] = useState(0)
  const [loading, setLoading] = useState(false)

  const b = brand === 'Otra' ? brandOther.trim() : brand
  const c = color === 'Otra' ? colorOther.trim() : color

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const { laptop, result } = await addLaptop(student, b, c, nick)
      onDone(laptop, result)
    } catch (x) {
      setErr(x instanceof ApiError ? x.code : 'down')
      setErrKey((k) => k + 1)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="h-full">
      <Screen
        onBack={onBack}
        actions={
          <>
            <div className="flex items-center gap-3 rounded-[14px] bg-cont px-3 py-2" aria-live="polite">
              <LaptopGlyph brand={b || '?'} color={c} size={58} className={b || c ? '' : 'opacity-40'} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[17px] font-extrabold uppercase tracking-tight">
                  {b || 'Marca'} <span className="text-sub">-</span> {c || 'Color'}
                </p>
                <p className="truncate text-[13px] text-sub">{nick ? `“${nick}”` : 'Así lo verá el portero'}</p>
              </div>
            </div>
            <PrimaryButton type="submit" loading={loading}>
              {firstTime ? 'Guardar y registrar entrada' : 'Guardar y registrar'}
            </PrimaryButton>
          </>
        }
      >
        <Title>¿Qué equipo traes?</Title>

        <fieldset className="mt-4">
          <legend className={label}>Marca</legend>
          <div className="grid grid-cols-3 gap-2">
            {BRANDS.map((x) => (
              <button
                type="button"
                key={x}
                aria-pressed={brand === x}
                onClick={() => setBrand(x)}
                className={`h-11 rounded-xl border-2 text-[15px] font-semibold transition active:scale-95 ${
                  brand === x ? 'border-coral bg-coral-soft text-coral-dark' : 'border-transparent bg-cont text-tinta'
                }`}
              >
                {x}
              </button>
            ))}
          </div>
          {brand === 'Otra' && (
            <input
              autoFocus
              value={brandOther}
              onChange={(e) => setBrandOther(e.target.value)}
              placeholder="Escribe la marca"
              className="mt-2 h-14 w-full animate-rise rounded-xl border-2 border-coral bg-white px-4 text-[17px] outline-none"
            />
          )}
        </fieldset>

        <fieldset className="mt-4">
          <legend className={label}>Color {color && color !== 'Otra' && <span className="normal-case tracking-normal text-tinta">· {color}</span>}</legend>
          <div className="grid grid-cols-5 justify-items-center gap-y-2">
            {COLORS.map((x) => (
              <button
                type="button"
                key={x.name}
                aria-label={x.name}
                aria-pressed={color === x.name}
                onClick={() => setColor(x.name)}
                className={`grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-papel transition active:scale-90 ${color === x.name ? 'ring-[3px] ring-coral' : ''}`}
                style={{ background: x.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)' }}
              >
                {color === x.name && <Check className="size-5 animate-pop" strokeWidth={3} color={['Blanco', 'Plata', 'Dorado', 'Rosado'].includes(x.name) ? '#241C16' : '#fff'} />}
              </button>
            ))}
            <button
              type="button"
              aria-label="Otro color"
              aria-pressed={color === 'Otra'}
              onClick={() => setColor('Otra')}
              className={`grid size-11 place-items-center rounded-full border-2 border-dashed border-sub/50 text-sub ring-offset-2 ring-offset-papel ${color === 'Otra' ? 'ring-[3px] ring-coral' : ''}`}
            >
              <Plus className="size-5" />
            </button>
          </div>
          {color === 'Otra' && (
            <input
              autoFocus
              value={colorOther}
              onChange={(e) => setColorOther(e.target.value)}
              placeholder="Escribe el color (ej. morado)"
              className="mt-2 h-14 w-full animate-rise rounded-xl border-2 border-coral bg-white px-4 text-[17px] outline-none"
            />
          )}
        </fieldset>

        <label className="mt-4 block">
          <span className={`${label} flex justify-between`}>
            Apodo <span className="font-normal normal-case tracking-normal">opcional</span>
          </span>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value.slice(0, 24))}
            placeholder="“El de la U”, “El de la casa”"
            className="h-14 w-full rounded-xl border-2 border-transparent bg-cont px-4 text-[17px] outline-none placeholder:text-sub/60 focus:border-coral focus:bg-white"
          />
        </label>
        <div className="mt-2">
          <ErrorNote code={err} k={errKey} />
        </div>
      </Screen>
    </form>
  )
}
