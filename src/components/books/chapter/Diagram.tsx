import { useEffect, useRef } from 'react'
import rough from 'roughjs'
import type { ChapterBlock, DiagramShape, Tone } from './types'

const svgNs = 'http://www.w3.org/2000/svg'

type Palette = Record<Tone | 'fill', string>

function readPalette(element: Element): Palette {
  const style = getComputedStyle(element)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    ink: read('--r-solid', '#ededed'),
    text: read('--r-text', '#d4d4d4'),
    muted: read('--r-muted', '#a1a1a1'),
    dim: read('--r-dim', '#737373'),
    accent: read('--r-accent', '#e0b354'),
    fill: read('--r-raised', '#1a1a1a'),
  }
}

function draw(svg: SVGSVGElement, shapes: DiagramShape[]) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)
  const rc = rough.svg(svg)
  const palette = readPalette(svg)
  const base = { strokeWidth: 1.6, roughness: 1.3, bowing: 1.2 }

  for (const shape of shapes) {
    const stroke = palette[shape.tone ?? 'ink']

    if (shape.kind === 'text') {
      const text = document.createElementNS(svgNs, 'text')
      text.setAttribute('x', String(shape.x))
      text.setAttribute('y', String(shape.y))
      text.setAttribute('font-family', "Kalam, 'Comic Sans MS', cursive")
      text.setAttribute('font-size', String(shape.size ?? 17))
      text.setAttribute('fill', stroke)
      text.setAttribute('text-anchor', shape.anchor ?? 'middle')
      text.textContent = shape.text
      svg.appendChild(text)
      continue
    }

    if (shape.kind === 'rect') {
      svg.appendChild(
        rc.rectangle(shape.x, shape.y, shape.w, shape.h, {
          ...base,
          stroke,
          seed: shape.seed,
          strokeLineDash: shape.dashed ? [7, 7] : undefined,
          ...(shape.fill ? { fill: palette.fill, fillStyle: 'solid' } : {}),
        }),
      )
      continue
    }

    if (shape.kind === 'ellipse') {
      svg.appendChild(rc.ellipse(shape.x, shape.y, shape.w, shape.h, { ...base, stroke, seed: shape.seed }))
      continue
    }

    const options = {
      ...base,
      stroke,
      seed: shape.seed,
      strokeWidth: shape.width ?? base.strokeWidth,
      strokeLineDash: shape.dashed ? [5, 6] : undefined,
    }
    const [x1, y1] = shape.from
    const [x2, y2] = shape.to
    svg.appendChild(rc.line(x1, y1, x2, y2, options))
    if (shape.kind === 'arrow') {
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const size = 12
      svg.appendChild(rc.line(x2, y2, x2 - size * Math.cos(angle - 0.45), y2 - size * Math.sin(angle - 0.45), options))
      svg.appendChild(rc.line(x2, y2, x2 - size * Math.cos(angle + 0.45), y2 - size * Math.sin(angle + 0.45), options))
    }
  }
}

/** A hand-drawn (Excalidraw-style) diagram, redrawn when the reader theme changes. */
export function Diagram({ block }: { block: Extract<ChapterBlock, { type: 'diagram' }> }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    const redraw = () => draw(svg, block.shapes)
    redraw()

    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (!cancelled) redraw()
    })

    const reader = svg.closest('.bk-reader')
    const observer = new MutationObserver(redraw)
    if (reader) observer.observe(reader, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [block.shapes])

  return (
    <figure className="bk-ch-diagram">
      <div className="bk-ch-diagram__frame">
        <svg aria-label={block.alt} ref={ref} role="img" viewBox={`0 0 ${block.width} ${block.height}`} />
      </div>
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  )
}
