import { useEffect, useState, type CSSProperties } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { AdminApp } from './admin/AdminApp'
import { DemoPanel } from './components/DemoPanel'
import { WayuuField } from './components/Wayuu'
import { useStore } from './lib/store'
import { StudentApp } from './student/StudentApp'

const FRAMES = { se: { w: 375, h: 667 }, pro: { w: 393, h: 852 } }

export default function App() {
  const [admin, setAdmin] = useState(() => location.hash === '#admin')
  const [sheet, setSheet] = useState(false)
  const frame = useStore((s) => s.frame)

  useEffect(() => {
    const onHash = () => setAdmin(location.hash === '#admin')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openAdmin = () => {
    setSheet(false)
    location.hash = 'admin'
  }
  const exitAdmin = () => {
    history.pushState(null, '', location.pathname + location.search)
    setAdmin(false)
  }

  if (admin) return <AdminApp onExit={exitAdmin} />

  const f = FRAMES[frame]
  return (
    <div className="relative h-full overflow-hidden md:flex md:items-center md:justify-center md:gap-12 md:p-6">
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <WayuuField color="#CC5C50" opacity={0.05} cell={9} />
      </div>

      <div className="relative hidden md:block">
        <DemoPanel onAdmin={openAdmin} />
      </div>

      <div
        className="fixed inset-0 overflow-hidden bg-papel md:relative md:inset-auto md:box-content md:h-[min(var(--ph),calc(100dvh-68px))] md:w-[var(--pw)] md:shrink-0 md:rounded-[48px] md:border-[10px] md:border-tinta md:shadow-[0_40px_80px_-30px_rgba(36,28,22,.55)]"
        style={{ '--pw': `${f.w}px`, '--ph': `${f.h}px` } as CSSProperties}
      >
        <StudentApp onAdmin={openAdmin} />
      </div>

      {/* Mobile: prototype controls live behind a slim edge tab. */}
      <button
        onClick={() => setSheet(true)}
        aria-label="Controles del prototipo"
        className="fixed right-0 top-1/2 z-50 grid h-14 w-7 -translate-y-1/2 place-items-center rounded-l-xl bg-tinta/80 text-white md:hidden"
      >
        <SlidersHorizontal className="size-4" />
      </button>
      {sheet && (
        <div className="fixed inset-0 z-[60] flex animate-fade items-end justify-center bg-black/40 p-3 md:hidden" onClick={() => setSheet(false)}>
          <div className="relative max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSheet(false)} aria-label="Cerrar" className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-cont">
              <X className="size-4" />
            </button>
            <DemoPanel onAdmin={openAdmin} onPicked={() => setSheet(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
