import { useState, type ReactNode } from 'react'
import type { Highlight } from '../storage'
import { Code, Terminal } from './CodeBlocks'
import { Diagram } from './Diagram'
import { Inline } from './inline'
import { Flashcards, Gate, Waterfall } from './Interactive'
import type { ChapterBlock, ChapterDoc } from './types'

type MarkClick = (id: string, rect: DOMRect) => void

type ChapterBodyProps = {
  doc: ChapterDoc
  highlights: Highlight[]
  editingNoteId: string | null
  onMarkClick: MarkClick
  onSaveNote: (id: string, note: string) => void
  onCancelNote: () => void
}

const gateKey = (doc: ChapterDoc) => `books:gate:${doc.book}:${doc.number}`

function loadGateAnswer(doc: ChapterDoc) {
  try {
    return window.localStorage.getItem(gateKey(doc))
  } catch {
    return null
  }
}

function saveGateAnswer(doc: ChapterDoc, answer: string) {
  try {
    window.localStorage.setItem(gateKey(doc), answer)
  } catch {
    // The answer still unlocks the chapter for this visit.
  }
}

function NoteEditor({
  highlight,
  onSave,
  onCancel,
}: {
  highlight: Highlight
  onSave: (note: string) => void
  onCancel: () => void
}) {
  return (
    <form
      className="bk-note bk-note--editing"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        onSave(String(data.get('note') ?? '').trim())
      }}
    >
      <label className="bk-note__label" htmlFor={`note-${highlight.id}`}>
        Note
      </label>
      <textarea
        autoFocus
        className="bk-note__input"
        defaultValue={highlight.note}
        id={`note-${highlight.id}`}
        name="note"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.currentTarget.form?.requestSubmit()
          }
        }}
        rows={3}
      />
      <div className="bk-note__actions">
        <button className="bk-rbtn" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="bk-rbtn bk-rbtn--solid" type="submit">
          Save
        </button>
      </div>
    </form>
  )
}

function renderBlock(
  block: ChapterBlock,
  index: number,
  marks: Highlight[],
  onMarkClick: MarkClick,
  gate: { answer: string | null; onAnswer: (key: string) => void },
): ReactNode {
  const text = (value: string) => <Inline marks={marks} onMarkClick={onMarkClick} text={value} />

  switch (block.type) {
    case 'h2':
      return <h2 className="bk-ch-section">{block.text}</h2>
    case 'h3':
      return <h3 data-block={index}>{text(block.text)}</h3>
    case 'p':
      return (
        <p className={block.tone === 'muted' ? 'bk-ch-muted' : undefined} data-block={index}>
          {text(block.text)}
        </p>
      )
    case 'analogy':
      return (
        <p className="bk-ch-analogy" data-block={index}>
          {text(block.text)}
        </p>
      )
    case 'callout':
      return (
        <p className="bk-callout" data-block={index}>
          {text(block.text)}
        </p>
      )
    case 'slack':
      return (
        <div aria-label={`Chat thread in ${block.channel}`} className="bk-ch-slack" role="group">
          <div className="bk-ch-slack__top">
            <span>
              <b>{block.channel}</b> · {block.workspace}
            </span>
            <span>{block.day}</span>
          </div>
          {block.messages.map((message, i) => (
            <div className="bk-ch-msg" key={i}>
              <div aria-hidden="true" className="bk-ch-avatar" data-self={message.self || undefined}>
                {message.author.charAt(0)}
              </div>
              <div>
                <div className="bk-ch-msg__meta">
                  <b>{message.author}</b>
                  <span>{message.time}</span>
                </div>
                <p>
                  <Inline text={message.text} />
                </p>
                {message.error && (
                  <div className="bk-ch-errshot">
                    <span className="bk-ch-errshot__t">{message.error.title}</span>
                    <span className="bk-ch-errshot__c">{message.error.detail}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )
    case 'terminal':
      return <Terminal block={block} />
    case 'code':
      return <Code block={block} />
    case 'notes':
      return (
        <ol className="bk-ch-notes">
          {block.items.map((item, i) => (
            <li key={i}>
              <span>{i + 1}</span>
              <div>
                <Inline text={item} />
              </div>
            </li>
          ))}
        </ol>
      )
    case 'gate':
      return <Gate answer={gate.answer} block={block} onAnswer={gate.onAnswer} />
    case 'diagram':
      return <Diagram block={block} />
    case 'records':
      return (
        <div className="bk-ch-panel">
          <div className="bk-ch-panel__bar">
            <span>{block.title}</span>
            <span>{block.source}</span>
          </div>
          <div className="bk-ch-table-wrap">
            <table className="bk-ch-records">
              <thead>
                <tr>
                  {block.columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c}>
                        {typeof cell === 'string' ? (
                          cell
                        ) : (
                          <>
                            <del>{cell.from}</del> <ins>{cell.to}</ins>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    case 'steps':
      return (
        <ol className="bk-ch-steps">
          {block.items.map((item, i) => (
            <li key={i}>
              <span className="bk-ch-steps__n">{i + 1}</span>
              <div>
                <div className="bk-ch-steps__title">
                  <strong>{item.title}</strong>
                  {item.meta && <span>{item.meta}</span>}
                </div>
                <Inline text={item.text} />
              </div>
            </li>
          ))}
        </ol>
      )
    case 'waterfall':
      return <Waterfall block={block} />
    case 'table':
      return (
        <div className="bk-ch-table-wrap">
          <table className="bk-ch-table">
            <thead>
              <tr>
                {block.columns.map((column, i) => (
                  <th key={i} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'rule':
      return (
        <div className="bk-ch-rule">
          <small>{block.label}</small>
          <p>
            <Inline text={block.text} />
          </p>
        </div>
      )
    case 'question':
      return (
        <p className="bk-ch-question">
          <Inline text={block.text} />
        </p>
      )
    case 'answers':
      return (
        <div className="bk-ch-answers">
          {block.items.map((item, i) => (
            <div className="bk-ch-answer" data-strong={item.strong || undefined} key={i}>
              <small>{item.label}</small>
              {item.text && (
                <p>
                  <Inline text={item.text} />
                </p>
              )}
              {item.list && (
                <ol>
                  {item.list.map((entry, j) => (
                    <li key={j}>
                      <Inline text={entry} />
                    </li>
                  ))}
                </ol>
              )}
              {item.why && (
                <p className="bk-ch-answer__why">
                  <Inline text={item.why} />
                </p>
              )}
            </div>
          ))}
        </div>
      )
    case 'followups':
      return (
        <div className="bk-ch-followups">
          {block.items.map((item, i) => (
            <details className="bk-ch-details" key={i}>
              <summary>{item.summary}</summary>
              <div className="bk-ch-details__body">
                {item.body.map((paragraph, j) => (
                  <p key={j}>
                    <Inline text={paragraph} />
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )
    case 'flashcards':
      return <Flashcards block={block} />
    case 'deeper':
      return (
        <details className="bk-ch-details bk-ch-deeper">
          <summary>{block.summary}</summary>
          <div className="bk-ch-details__body">
            {block.sections.map((section, i) => (
              <section key={i}>
                <h4>{section.title}</h4>
                <p>
                  <Inline text={section.text} />
                </p>
              </section>
            ))}
          </div>
        </details>
      )
    default:
      return null
  }
}

/** Renders a chapter document. Everything after a gate stays blurred until it is answered. */
export function ChapterBody({
  doc,
  highlights,
  editingNoteId,
  onMarkClick,
  onSaveNote,
  onCancelNote,
}: ChapterBodyProps) {
  const [gateAnswer, setGateAnswer] = useState<string | null>(() => loadGateAnswer(doc))
  const gateIndex = doc.blocks.findIndex((block) => block.type === 'gate')
  const unlocked = gateIndex === -1 || gateAnswer !== null

  const answerGate = (key: string) => {
    setGateAnswer(key)
    saveGateAnswer(doc, key)
  }

  const status = doc.status
  const statusState = status && (unlocked && status.after ? status.after : status.before)

  return (
    <>
      <header className="bk-ch-head">
        {doc.eyebrow && <span className="bk-article__eyebrow">{doc.eyebrow}</span>}
        <h1>{doc.title}</h1>
        {doc.lede && <p className="bk-ch-lede">{doc.lede}</p>}
        {doc.cast && (
          <ul aria-label="Who's who" className="bk-ch-cast">
            {doc.cast.map((person) => (
              <li key={person.name}>
                <b>{person.name}</b> {person.role}
              </li>
            ))}
          </ul>
        )}
        {status && statusState && (
          <div className="bk-ch-status" role="status">
            {status.items.map((item) => (
              <span key={item.label}>
                {item.label} <b>{item.value}</b>
              </span>
            ))}
            <span className="bk-ch-status__state" data-good={statusState.good || undefined}>
              {statusState.label}
            </span>
          </div>
        )}
      </header>

      {doc.blocks.map((block, index) => {
        const marks = highlights
          .filter((highlight) => highlight.block === index)
          .sort((a, b) => a.start - b.start)
        const editing = marks.filter((mark) => mark.id === editingNoteId)
        const locked = !unlocked && index > gateIndex

        return (
          <div
            aria-hidden={locked || undefined}
            className="bk-blk"
            data-locked={locked || undefined}
            data-type={block.type}
            inert={locked}
            key={index}
          >
            {renderBlock(block, index, marks, onMarkClick, { answer: gateAnswer, onAnswer: answerGate })}
            {editing.map((mark) => (
              <NoteEditor
                highlight={mark}
                key={mark.id}
                onCancel={onCancelNote}
                onSave={(note) => onSaveNote(mark.id, note)}
              />
            ))}
          </div>
        )
      })}

      {doc.next && (
        <div
          aria-hidden={!unlocked || undefined}
          className="bk-blk bk-ch-next"
          data-locked={!unlocked || undefined}
          inert={!unlocked}
        >
          <small>{doc.next.label}</small>
          <p>{doc.next.text}</p>
        </div>
      )}
    </>
  )
}
