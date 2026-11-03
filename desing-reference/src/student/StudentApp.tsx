import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusBanner } from '../components/StatusBanner'
import { getState, useStore, type Laptop, type LookupResult, type MoveResult, type Student } from '../lib/store'
import { Confirm } from './Confirm'
import { Consent } from './Consent'
import { Identify } from './Identify'
import { MyLaptops } from './MyLaptops'
import { NewLaptop } from './NewLaptop'
import { NewStudent } from './NewStudent'
import { Splash } from './Splash'

type ScreenId = 'splash' | 'identify' | 'newStudent' | 'consent' | 'myLaptops' | 'newLaptop' | 'confirm'

export function StudentApp({ onAdmin }: { onAdmin: () => void }) {
  const [screen, setScreen] = useState<ScreenId>(() => (sessionStorage.getItem('splash-seen') ? 'identify' : 'splash'))
  const [doc, setDoc] = useState(() => getState().device.lastDoc)
  const [student, setStudent] = useState<Student | null>(null)
  const [laptops, setLaptops] = useState<Laptop[]>([])
  const [fromCache, setFromCache] = useState(false)
  const [result, setResult] = useState<MoveResult | null>(null)
  const [identifyKey, setIdentifyKey] = useState(0)
  const depth = useRef(0)

  // Each screen is a history entry, so the phone's back button walks the flow instead of leaving the app.
  const go = useCallback((s: ScreenId) => {
    depth.current += 1
    history.pushState({ screen: s, depth: depth.current }, '')
    setScreen(s)
  }, [])

  useEffect(() => {
    history.replaceState({ screen: 'identify', depth: 0 }, '')
    const onPop = (e: PopStateEvent) => {
      const s = (e.state?.screen as ScreenId | undefined) ?? 'identify'
      depth.current = e.state?.depth ?? 0
      // Never land back on a stale confirmation.
      setScreen(s === 'confirm' ? 'identify' : s)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const toStart = useCallback((nextDoc: string) => {
    const d = depth.current
    depth.current = 0
    if (d > 0) history.go(-d)
    setDoc(nextDoc)
    setIdentifyKey((k) => k + 1)
    setScreen('identify')
  }, [])

  const demoFill = useStore((s) => s.demoFill)
  useEffect(() => {
    if (!demoFill) return
    sessionStorage.setItem('splash-seen', '1')
    toStart(demoFill.doc)
  }, [demoFill, toStart])

  const back = () => history.back()

  function onFound(d: string, r: LookupResult) {
    setDoc(d)
    if (r.kind === 'new') return go('newStudent')
    setStudent(r.student)
    setLaptops(r.laptops)
    setFromCache(r.kind === 'existing' && r.fromCache)
    if (r.kind === 'consent') return go('consent')
    go(r.laptops.length ? 'myLaptops' : 'newLaptop')
  }

  const finish = (r: MoveResult) => {
    setResult(r)
    go('confirm')
  }

  const needsStudent = screen === 'consent' || screen === 'myLaptops' || screen === 'newLaptop'
  const shown: ScreenId = needsStudent && !student ? 'identify' : screen

  return (
    <div className="relative h-full overflow-hidden bg-papel">
      {shown !== 'splash' && shown !== 'confirm' && <StatusBanner />}
      {shown === 'splash' && (
        <Splash
          onDone={() => {
            sessionStorage.setItem('splash-seen', '1')
            setScreen('identify')
          }}
        />
      )}
      {shown === 'identify' && <Identify key={identifyKey} initialDoc={doc} onFound={onFound} onAdmin={onAdmin} />}
      {shown === 'newStudent' && (
        <NewStudent
          doc={doc}
          onBack={back}
          onDone={(s) => {
            setStudent(s)
            setLaptops([])
            go('newLaptop')
          }}
        />
      )}
      {shown === 'consent' && student && (
        <Consent
          student={student}
          onBack={back}
          onDone={(s) => {
            setStudent(s)
            go(laptops.length ? 'myLaptops' : 'newLaptop')
          }}
        />
      )}
      {shown === 'myLaptops' && student && (
        <MyLaptops student={student} laptops={laptops} fromCache={fromCache} onBack={back} onAdd={() => go('newLaptop')} onDone={finish} />
      )}
      {shown === 'newLaptop' && student && (
        <NewLaptop
          student={student}
          firstTime={!laptops.length}
          onBack={back}
          onDone={(l, r) => {
            setLaptops((ls) => [...ls, l])
            finish(r)
          }}
        />
      )}
      {shown === 'confirm' && result && <Confirm result={result} onDone={() => toStart(getState().device.lastDoc)} />}
    </div>
  )
}
