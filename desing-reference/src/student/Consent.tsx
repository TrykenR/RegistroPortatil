import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { ConsentBox, ErrorNote, Eyebrow, PrimaryButton, Screen, Title } from '../components/ui'
import { ApiError, giveConsent, type ErrCode, type Student } from '../lib/store'

export function Consent({ student, onBack, onDone }: { student: Student; onBack: () => void; onDone: (s: Student) => void }) {
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState<ErrCode | null>(null)
  const [errKey, setErrKey] = useState(0)
  const [loading, setLoading] = useState(false)

  async function submit() {
    setErr(null)
    setLoading(true)
    try {
      onDone(await giveConsent(student.doc, consent))
    } catch (x) {
      setErr(x instanceof ApiError ? x.code : 'down')
      setErrKey((k) => k + 1)
      setLoading(false)
    }
  }

  return (
    <Screen center onBack={onBack} actions={<PrimaryButton onClick={submit} loading={loading}>Aceptar y continuar</PrimaryButton>}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-oro-soft text-oro-dark">
          <ShieldCheck className="size-8" />
        </div>
        <Eyebrow>Una sola vez</Eyebrow>
        <Title>{student.first.split(' ')[0]}, antes de seguir…</Title>
        <p className="mt-3 max-w-[32ch] text-[16px] leading-relaxed text-sub">
          Actualizamos cómo cuidamos tu información. Necesitamos tu autorización para seguir registrando tu equipo. No te lo volveremos a preguntar.
        </p>
      </div>
      <div className="mt-5">
        <ConsentBox checked={consent} onChange={setConsent} invalid={err === 'consent'} />
      </div>
      <div className="mt-2">
        <ErrorNote code={err} k={errKey} />
      </div>
    </Screen>
  )
}
