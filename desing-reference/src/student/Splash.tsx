import { useEffect } from 'react'
import { WayuuBand } from '../components/Wayuu'
import logo from '../assets/uniguajira-logo.png'

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <button onClick={onDone} className="flex h-full w-full flex-col items-center justify-between overflow-hidden bg-papel text-center">
      <WayuuBand height={15} bg="#FAF8F5" />
      <div className="flex flex-col items-center px-8">
        <img src={logo} alt="Universidad de La Guajira" className="w-auto animate-rise" style={{ height: "min(250px, 36vh)" }} />
        <h1 className="mt-8 animate-rise text-[46px] font-black leading-[0.92] tracking-[-0.035em] text-tinta [animation-delay:780ms]">
          Pasa, toca
          <br />y <span className="text-coral">sigue.</span>
        </h1>
        <p className="mt-4 animate-rise text-[16px] text-sub [animation-delay:900ms]">Registro de portátiles en portería</p>
      </div>
      <div className="w-full">
        <p className="animate-fade pb-4 text-[13px] text-sub/80 [animation-delay:1500ms]">Toca para empezar</p>
        <WayuuBand height={15} bg="#FAF8F5" />
      </div>
    </button>
  )
}
