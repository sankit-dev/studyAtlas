// The brand motif for page headers: a few faint stars and a crescent moon,
// drawn in the theme's own colours. Same family as the home constellation.
// Purely decorative; place it inside a positioned header.

type Star = readonly [x: number, y: number, r: number, opacity: number]

const skies: Record<'library' | 'dsa' | 'books', Star[]> = {
  library: [
    [40, 120, 1, 0.35], [92, 54, 1.2, 0.5], [150, 150, 1, 0.3], [206, 90, 1.3, 0.55],
    [262, 30, 1, 0.35], [300, 140, 1.1, 0.4], [250, 196, 1, 0.25], [120, 220, 1, 0.2],
  ],
  dsa: [
    [30, 70, 1.1, 0.4], [80, 26, 1, 0.3], [140, 96, 1.2, 0.5], [190, 40, 1, 0.35],
    [236, 118, 1, 0.3], [286, 60, 1.2, 0.45],
  ],
  books: [
    [24, 96, 1, 0.3], [76, 40, 1.2, 0.5], [128, 120, 1, 0.35], [176, 70, 1.3, 0.55],
    [226, 150, 1, 0.3], [262, 36, 1, 0.4], [300, 110, 1.1, 0.35], [160, 200, 1, 0.2],
  ],
}

// A small three-star line, echoing the path on the home page.
const trails: Partial<Record<keyof typeof skies, Star[]>> = {
  library: [[92, 54, 0, 0], [206, 90, 0, 0], [300, 140, 0, 0]],
  books: [[76, 40, 0, 0], [176, 70, 0, 0], [262, 36, 0, 0]],
}

type NightSkyProps = {
  variant: keyof typeof skies
  className?: string
}

export function NightSky({ variant, className = '' }: NightSkyProps) {
  const stars = skies[variant]
  const trail = trails[variant]
  const maskId = `night-sky-moon-${variant}`

  return (
    <svg aria-hidden="true" className={`night-sky ${className}`} focusable="false" viewBox="0 0 420 240">
      <defs>
        <mask id={maskId}>
          <rect fill="#fff" height="240" width="420" />
          <circle cx="388" cy="46" fill="#000" r="25" />
        </mask>
      </defs>
      {trail && (
        <polyline
          className="night-sky__trail"
          fill="none"
          points={trail.map(([x, y]) => `${x},${y}`).join(' ')}
        />
      )}
      {stars.map(([x, y, r, opacity]) => (
        <circle className="night-sky__star" cx={x} cy={y} key={`${x}-${y}`} opacity={opacity} r={r} />
      ))}
      <circle className="night-sky__moon" cx="374" cy="58" mask={`url(#${maskId})`} r="27" />
    </svg>
  )
}
