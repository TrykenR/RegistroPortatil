import { useId } from 'react'

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '')

const ORO = '#E1A140'
const TURQUESA = '#60A8B8'
const CORAL = '#CC5C50'

/** Stepped diamond drawn on a pixel grid, the way kanaas motifs are woven (three brand threads). */
export function WayuuMark({
  size = 28,
  animate = false,
  a = ORO,
  b = TURQUESA,
  c: c3 = CORAL,
  className,
}: {
  size?: number
  animate?: boolean
  a?: string
  b?: string
  c?: string
  className?: string
}) {
  const n = 11
  const c = 5
  const cells: { x: number; y: number; fill: string; d: number }[] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.abs(x - c) + Math.abs(y - c)
      const fill = d === 5 ? a : d === 3 ? b : d === 1 ? c3 : null
      if (fill) cells.push({ x, y, fill, d })
    }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} className={className} aria-hidden shapeRendering="crispEdges">
      {cells.map((k) => (
        <rect
          key={`${k.x}-${k.y}`}
          x={k.x}
          y={k.y}
          width={1}
          height={1}
          fill={k.fill}
          className={animate ? 'animate-cell' : undefined}
          style={animate ? { animationDelay: `${(5 - k.d) * 110 + 80}ms`, transformOrigin: `${k.x + 0.5}px ${k.y + 0.5}px` } : undefined}
        />
      ))}
    </svg>
  )
}

/** A woven border strip, tiled from the same pixel diamond. */
export function WayuuBand({
  height = 10,
  a = ORO,
  b = CORAL,
  c = TURQUESA,
  bg = 'transparent',
  className,
}: {
  height?: number
  a?: string
  b?: string
  c?: string
  bg?: string
  className?: string
}) {
  const id = safeId(useId())
  const s = height / 5
  const cells: { x: number; y: number; fill: string }[] = []
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 10; x++) {
      const d = Math.abs(x - 5) + Math.abs(y - 2)
      if (d === 2) cells.push({ x, y, fill: a })
      else if (d === 0) cells.push({ x, y, fill: b })
      else if (x === 0 && y === 2) cells.push({ x, y, fill: c })
    }
  return (
    <svg width="100%" height={height} className={className} aria-hidden shapeRendering="crispEdges">
      <defs>
        <pattern id={id} width={10 * s} height={5 * s} patternUnits="userSpaceOnUse">
          <rect width={10 * s} height={5 * s} fill={bg} />
          {cells.map((k) => (
            <rect key={`${k.x}-${k.y}`} x={k.x * s} y={k.y * s} width={s} height={s} fill={k.fill} />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Large faint woven field for backgrounds (login side panel, splash). */
export function WayuuField({ color = '#ffffff', opacity = 0.12, cell = 6 }: { color?: string; opacity?: number; cell?: number }) {
  const id = safeId(useId())
  const n = 12
  const cells: [number, number][] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.abs(x - 6) + Math.abs(y - 6)
      if (d === 6 || d === 4 || d === 1) cells.push([x, y])
    }
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden shapeRendering="crispEdges">
      <defs>
        <pattern id={id} width={n * cell} height={n * cell} patternUnits="userSpaceOnUse">
          {cells.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={color} />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </svg>
  )
}
