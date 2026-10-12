import type { LearningPathStep } from '../data/learningPath'

// The learning path drawn as a constellation: one star per track, joined in
// order and leading up to the moon. Lit stars are understood tracks, the ringed
// one is where to continue, dim ones are still ahead. Pure SVG so it follows the
// theme and stays sharp at any size.

const shortTitles: Record<string, string> = {
  'Operating Systems': 'Operating systems',
  'Computer Networks': 'Networks',
  'Databases & SQL': 'Databases',
  'MERN Integration': 'MERN',
  'AWS Fundamentals': 'AWS',
  'GitHub CI/CD': 'CI/CD',
  'AI for Backend Developers': 'AI',
}

const backgroundStars = [
  [40, 70, 1.1, 0.4],
  [150, 30, 1, 0.3],
  [250, 110, 1.3, 0.45],
  [330, 40, 1, 0.3],
  [500, 200, 1.2, 0.35],
  [470, 330, 1, 0.25],
  [140, 220, 1, 0.2],
  [380, 420, 1.1, 0.25],
  [500, 470, 1, 0.2],
  [60, 300, 1, 0.2],
] as const

// A rising diagonal that zigzags gently; labels sit on the outer side of each
// zig so neighbouring names never collide.
function starPosition(index: number, count: number) {
  const t = count > 1 ? index / (count - 1) : 0
  const side = index % 2 === 0 ? 1 : -1
  return {
    x: Math.round(130 + 330 * t + 22 * side),
    y: Math.round(452 - 362 * t),
    side,
  }
}

type HeroConstellationProps = {
  steps: LearningPathStep[]
}

export function HeroConstellation({ steps }: HeroConstellationProps) {
  const stars = steps.map((step, index) => ({
    step,
    ...starPosition(index, steps.length),
    label: shortTitles[step.track.title] ?? step.track.title,
    href: `/notes/${(step.nextNote ?? step.firstNote)?.slug ?? ''}`,
  }))
  const last = stars[stars.length - 1]

  return (
    <svg className="hero-constellation" viewBox="0 0 540 520" role="group" aria-label="Learning path">
      <defs>
        <mask id="hero-moon-mask">
          <rect width="540" height="520" fill="#fff" />
          <circle cx="516" cy="34" r="29" fill="#000" />
        </mask>
      </defs>

      <g aria-hidden="true" className="hero-constellation__sky">
        {backgroundStars.map(([cx, cy, r, opacity]) => (
          <circle cx={cx} cy={cy} key={`${cx}-${cy}`} opacity={opacity} r={r} />
        ))}
      </g>

      <circle aria-hidden="true" className="hero-constellation__moon" cx="500" cy="48" mask="url(#hero-moon-mask)" r="32" />

      <g aria-hidden="true">
        {stars.slice(1).map((star, index) => {
          const from = stars[index]
          const done = from.step.status === 'completed'
          return (
            <line
              className="hero-constellation__edge"
              data-done={done}
              key={star.step.track.title}
              x1={from.x}
              x2={star.x}
              y1={from.y}
              y2={star.y}
            />
          )
        })}
        {last && (
          <line
            className="hero-constellation__reach"
            x1={last.x}
            x2={474}
            y1={last.y}
            y2={68}
          />
        )}
      </g>

      {stars.map((star) => {
        const { status, completedCount, noteCount, track } = star.step
        const labelRight = star.side === 1
        return (
          <a
            aria-label={`${track.title}: ${completedCount} of ${noteCount} understood`}
            className="hero-constellation__star"
            data-status={status}
            href={star.href}
            key={track.title}
          >
            <circle className="hero-constellation__hit" cx={star.x} cy={star.y} r="16" />
            {status === 'next-recommended' && (
              <circle className="hero-constellation__ring" cx={star.x} cy={star.y} r="11" />
            )}
            <circle className="hero-constellation__dot" cx={star.x} cy={star.y} r={status === 'next-recommended' ? 4.5 : 3.2} />
            <text
              className="hero-constellation__label"
              textAnchor={labelRight ? 'start' : 'end'}
              x={labelRight ? star.x + 14 : star.x - 14}
              y={star.y + 4}
            >
              {star.label}
            </text>
          </a>
        )
      })}

      <g aria-hidden="true" className="hero-constellation__figure" transform="translate(44 506) scale(0.82)">
        <circle cx="0" cy="-88" r="7" />
        <line x1="0" x2="0" y1="-79" y2="-46" strokeWidth="9" />
        <line x1="0" x2="-6" y1="-46" y2="-3" strokeWidth="6" />
        <line x1="0" x2="7" y1="-46" y2="-3" strokeWidth="6" />
        <line x1="2" x2="20" y1="-74" y2="-114" strokeWidth="5" />
        <line x1="-2" x2="-12" y1="-74" y2="-50" strokeWidth="5" />
      </g>
      <line aria-hidden="true" className="hero-constellation__ground" x1="0" x2="200" y1="506" y2="506" />
    </svg>
  )
}
