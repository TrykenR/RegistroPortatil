import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { ConsentBox, ErrorNote, Eyebrow, PrimaryButton, Screen, TextField, Title } from '../components/ui'
import { ApiError, registerStudent, type ErrCode, type Student } from '../lib/store'

export function NewStudent({ doc, onBack, onDone }: { doc: string; onBack: () => void; onDone: (s: Student) => void }) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState<ErrCode | null>(null)
  const [errKey, setErrKey] = useState(0)
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      onDone(await registerStudent(doc, first, last, consent))
    } catch (x) {
      setErr(x instanceof ApiError ? x.code : 'down')
      setErrKey((k) => k + 1)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="h-full" noValidate>
      <Screen
        center
        onBack={onBack}
        headerRight={<span className="text-[14px] tabular-nums text-sub">{doc}</span>}
        actions={
          <PrimaryButton type="submit" loading={loading}>
            Continuar <ArrowRight className="size-5" />
          </PrimaryButton>
        }
      >
        <div className="text-center">
          <Eyebrow>Primera vez por aquí</Eyebrow>
          <Title>¿Cómo te llamas?</Title>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <TextField label="Nombre" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" autoFocus />
          <TextField label="Apellido" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
        </div>
        <div className="mt-4">
          <ConsentBox checked={consent} onChange={setConsent} invalid={err === 'consent'} />
        </div>
        <div className="mt-2">
          <ErrorNote code={err} k={errKey} />
        </div>
      </Screen>
    </form>
  )
}
