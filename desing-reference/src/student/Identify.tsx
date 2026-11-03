import { useState, type FormEvent } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { ErrorNote, Eyebrow, PrimaryButton, Screen, Title } from '../components/ui'
import { ApiError, lookup, now, type ErrCode, type LookupResult } from '../lib/store'

function greeting() {
  const h = new Date(now()).getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export function Identify({
  initialDoc,
  onFound,
  onAdmin,
}: {
  initialDoc: string
  onFound: (doc: string, r: LookupResult) => void
  onAdmin: () => void
}) {
  const [doc, setDoc] = useState(initialDoc)
  const [remembered, setRemembered] = useState(Boolean(initialDoc))
  const [err, setErr] = useState<ErrCode | null>(null)
  const [errKey, setErrKey] = useState(0)
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      onFound(doc, await lookup(doc))
    } catch (x) {
      setErr(x instanceof ApiError ? x.code : 'down')
      setErrKey((k) => k + 1)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="h-full">
      <Screen
        center
        actions={
          <>
            <PrimaryButton type="submit" loading={loading} loadingText="Buscando…">
              Continuar <ArrowRight className="size-5" />
            </PrimaryButton>
            <button type="button" onClick={onAdmin} className="mx-auto block px-4 py-0.5 text-[12px] text-sub/35">
              Acceder
            </button>
          </>
        }
      >
        <div className="text-center">
          <Eyebrow>{greeting()}</Eyebrow>
          <Title>¿Quién pasa hoy?</Title>
          <p className="mt-2 text-[16px] text-sub">Tu cédula o código estudiantil.</p>
        </div>

        <div className={`mt-6 rounded-[18px] border-2 bg-cont transition focus-within:border-coral focus-within:bg-white ${err === 'invalid' ? 'border-aviso' : 'border-transparent'}`}>
          <input
            autoFocus={!initialDoc}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label="Documento o código estudiantil"
            value={doc}
            onChange={(e) => {
              setDoc(e.target.value.replace(/\D/g, '').slice(0, 10))
              setRemembered(false)
              if (err === 'invalid') setErr(null)
            }}
            placeholder="0000000000"
            className="h-[84px] w-full rounded-[16px] bg-transparent px-3 text-center text-[32px] font-bold tabular-nums tracking-[0.16em] text-tinta outline-none placeholder:text-borde"
          />
        </div>

        <div className="mt-3 min-h-6">
          {err ? (
            <ErrorNote code={err} k={errKey} />
          ) : remembered ? (
            <div className="flex items-center justify-center gap-2 text-[14px] text-sub">
              <span>Te recordamos de la última vez.</span>
              <button
                type="button"
                onClick={() => {
                  setDoc('')
                  setRemembered(false)
                }}
                className="flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-tinta active:bg-cont"
              >
                <X className="size-4" /> No soy yo
              </button>
            </div>
          ) : null}
        </div>
      </Screen>
    </form>
  )
}
