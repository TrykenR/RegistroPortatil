import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminDashboard } from './AdminDashboard'
import { AdminLogin } from './AdminLogin'

const IDLE_MS = 30 * 60000

export function AdminApp({ onExit }: { onExit: () => void }) {
  const [user, setUser] = useState<string | null>(null)
  const [notice, setNotice] = useState<string>()
  const [remaining, setRemaining] = useState(IDLE_MS)
  const lastAct = useRef(Date.now())

  const logout = useCallback((why?: string) => {
    setUser(null)
    setNotice(why)
  }, [])

  useEffect(() => {
    if (!user) return
    lastAct.current = Date.now()
    const bump = () => (lastAct.current = Date.now())
    const evts = ['pointerdown', 'keydown', 'scroll', 'pointermove'] as const
    evts.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const tick = setInterval(() => {
      const left = IDLE_MS - (Date.now() - lastAct.current)
      setRemaining(left)
      if (left <= 0) logout('Cerramos tu sesión tras 30 minutos sin actividad.')
    }, 1000)
    // Leaving the page ends the session, not just the button.
    const leave = () => logout()
    window.addEventListener('pagehide', leave)
    return () => {
      evts.forEach((e) => window.removeEventListener(e, bump))
      clearInterval(tick)
      window.removeEventListener('pagehide', leave)
    }
  }, [user, logout])

  if (!user) return <AdminLogin onLogin={(u) => { setNotice(undefined); setUser(u) }} onExit={onExit} notice={notice} />
  return <AdminDashboard user={user} remaining={remaining} onLogout={() => logout('Sesión cerrada.')} onExit={onExit} />
}
