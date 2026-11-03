import { useId, type ReactNode } from 'react'
import { colorHex, isLight, shade } from '../lib/data'

/** An illustrated laptop: real lid color + a brand-specific lid emblem (abstract, not a logo). */
export function LaptopGlyph({ brand, color, size = 96, className }: { brand: string; color: string; size?: number; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const hex = colorHex(color)
  const fill = hex ?? '#C9C2B7'
  const light = isLight(fill)
  const ink = light ? 'rgba(36,28,22,.62)' : 'rgba(255,255,255,.85)'
  return (
    <svg viewBox="0 0 120 86" width={size} height={(size * 86) / 120} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.28} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <pattern id={`${id}p`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#D6D0C6" />
          <rect width="3" height="6" fill="#BDB5A9" />
        </pattern>
      </defs>
      <rect x="12" y="3" width="96" height="64" rx="7" fill={hex ? fill : `url(#${id}p)`} stroke={light ? '#BDB6AB' : 'none'} strokeWidth="1.2" />
      <rect x="12" y="3" width="96" height="64" rx="7" fill={`url(#${id}g)`} />
      <Emblem brand={brand} ink={ink} bg={fill} />
      <path d="M2 69 H118 L112 79.5 Q111 82 108 82 H12 Q9 82 8 79.5 Z" fill={shade(fill, light ? -0.14 : -0.3)} />
      <rect x="48" y="69" width="24" height="3" rx="1.5" fill="rgba(0,0,0,.2)" />
    </svg>
  )
}

function Emblem({ brand, ink, bg }: { brand: string; ink: string; bg: string }) {
  const t = (txt: string, size: number, extra: Record<string, string | number> = {}): ReactNode => (
    <text x="60" y="35" textAnchor="middle" dominantBaseline="central" fill={ink} fontSize={size} fontWeight={700} fontFamily="system-ui, sans-serif" {...extra}>
      {txt}
    </text>
  )
  switch (brand) {
    case 'Lenovo':
      return (
        <g>
          <rect x="18" y="54" width="28" height="8" rx="1" fill={ink} />
          <text x="32" y="58.3" textAnchor="middle" dominantBaseline="central" fill={bg} fontSize="5.4" fontWeight={700} fontFamily="system-ui">
            Lenovo
          </text>
        </g>
      )
    case 'HP':
      return (
        <g>
          <circle cx="60" cy="35" r="11" fill="none" stroke={ink} strokeWidth="1.8" />
          {t('hp', 11, { fontStyle: 'italic' })}
        </g>
      )
    case 'Dell':
      return (
        <g>
          <circle cx="60" cy="35" r="12" fill="none" stroke={ink} strokeWidth="1.6" />
          {t('DELL', 7, { letterSpacing: 0.4 })}
        </g>
      )
    case 'Asus':
      return t('ASUS', 8.5, { letterSpacing: 3 })
    case 'Acer':
      return t('acer', 12, { fontWeight: 600 })
    case 'Apple':
      return (
        <g fill={ink}>
          <circle cx="60" cy="37" r="8" />
          <ellipse cx="62.5" cy="25.5" rx="2.2" ry="4" transform="rotate(35 62.5 25.5)" />
        </g>
      )
    case 'Samsung':
      return t('SAMSUNG', 6.6, { letterSpacing: 1.6 })
    case 'Huawei':
      return (
        <g fill={ink}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
            <ellipse key={r} cx="60" cy="28" rx="2" ry="6.5" transform={`rotate(${r} 60 35)`} opacity={0.9} />
          ))}
        </g>
      )
    default: {
      const initial = (brand.trim()[0] ?? '?').toUpperCase()
      return (
        <g>
          <path d="M60 21 L74 35 L60 49 L46 35 Z" fill="none" stroke={ink} strokeWidth="1.6" />
          {t(initial, 12)}
        </g>
      )
    }
  }
}
