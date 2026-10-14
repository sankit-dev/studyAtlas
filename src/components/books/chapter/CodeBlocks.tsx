import { Fragment, useEffect, useRef, useState } from 'react'
import type { ChapterBlock, TerminalLine } from './types'

function CopyButton({ getText, label = 'Copy' }: { getText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard can be blocked (insecure context, permissions); stay quiet.
    }
  }

  return (
    <button
      aria-label={copied ? 'Copied' : label}
      className="bk-ch-copy"
      data-copied={copied}
      onClick={copy}
      type="button"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Colours quoted strings inside a shell command. */
function renderCommand(text: string) {
  return text.split(/("[^"]*"|'[^']*')/g).map((part, index) =>
    index % 2 === 1 ? (
      <span className="bk-ch-tok-s" key={index}>
        {part}
      </span>
    ) : (
      part
    ),
  )
}

function lineClass(line: TerminalLine) {
  if (line.kind === 'accent') return 'bk-ch-line--accent'
  if (line.kind === 'good') return 'bk-ch-line--good'
  if (line.kind === 'dim') return 'bk-ch-line--dim'
  return undefined
}

export function Terminal({ block }: { block: Extract<ChapterBlock, { type: 'terminal' }> }) {
  const commands = block.lines.filter((line) => line.kind === 'cmd')
  const getText = () =>
    (commands.length > 0 ? commands : block.lines).map((line) => line.text).join('\n')

  return (
    <div className="bk-ch-term">
      <div className="bk-ch-term__bar">
        <span>{block.title}</span>
        <span className="bk-ch-term__right">
          {block.subtitle && <span>{block.subtitle}</span>}
          <CopyButton
            getText={getText}
            label={commands.length > 0 ? 'Copy command' : 'Copy'}
          />
        </span>
      </div>
      <pre>
        <code>
          {block.lines.map((line, index) => (
            <Fragment key={index}>
            <span className={lineClass(line)}>
              {line.kind === 'cmd' ? (
                <>
                  <span aria-hidden="true" className="bk-ch-prompt">
                    ${' '}
                  </span>
                  {renderCommand(line.text)}
                </>
              ) : (
                line.text
              )}
            </span>
            {index < block.lines.length - 1 ? '\n' : ''}
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  )
}

export function Code({ block }: { block: Extract<ChapterBlock, { type: 'code' }> }) {
  const lines = block.code.replace(/\n$/, '').split('\n')
  const highlighted = new Set(block.highlight ?? [])

  return (
    <div className="bk-ch-term">
      <div className="bk-ch-term__bar">
        <span>{block.title ?? block.lang ?? 'code'}</span>
        <span className="bk-ch-term__right">
          {block.title && block.lang && <span>{block.lang}</span>}
          <CopyButton getText={() => block.code} />
        </span>
      </div>
      <pre>
        <code>
          {lines.map((line, index) => (
            <Fragment key={index}>
              <span className={highlighted.has(index + 1) ? 'bk-ch-line--accent' : undefined}>
                {line}
              </span>
              {index < lines.length - 1 ? '\n' : ''}
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  )
}
