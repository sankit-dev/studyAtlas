import { Fragment, type ReactNode } from 'react'
import type { ChapterBlock } from './sampleChapter'
import type { Highlight } from './storage'

type ChapterTextProps = {
  blocks: ChapterBlock[]
  highlights: Highlight[]
  editingNoteId: string | null
  onMarkClick: (id: string, rect: DOMRect) => void
  onEditNote: (id: string) => void
  onSaveNote: (id: string, note: string) => void
  onCancelNote: () => void
}

function renderWithMarks(
  text: string,
  marks: Highlight[],
  onMarkClick: ChapterTextProps['onMarkClick'],
) {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const mark of marks) {
    if (mark.start < cursor || mark.end > text.length) continue
    if (mark.start > cursor) parts.push(text.slice(cursor, mark.start))
    parts.push(
      <mark
        className="bk-mark"
        data-color={mark.color}
        data-hl={mark.id}
        data-note={mark.note ? 'true' : undefined}
        key={mark.id}
        onClick={(event) =>
          onMarkClick(mark.id, event.currentTarget.getBoundingClientRect())
        }
      >
        {text.slice(mark.start, mark.end)}
      </mark>,
    )
    cursor = mark.end
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
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

export function ChapterText({
  blocks,
  highlights,
  editingNoteId,
  onMarkClick,
  onEditNote,
  onSaveNote,
  onCancelNote,
}: ChapterTextProps) {
  return (
    <>
      {blocks.map((block, index) => {
        const marks = highlights
          .filter((highlight) => highlight.block === index)
          .sort((a, b) => a.start - b.start)

        const notes = marks.filter(
          (mark) => mark.note || mark.id === editingNoteId,
        )

        let element: ReactNode
        if (block.type === 'h2') {
          element = <h2 data-block={index}>{renderWithMarks(block.text, marks, onMarkClick)}</h2>
        } else if (block.type === 'code') {
          element = (
            <pre className="bk-code">
              <code>{block.text}</code>
            </pre>
          )
        } else if (block.type === 'callout') {
          element = (
            <p className="bk-callout" data-block={index}>
              {renderWithMarks(block.text, marks, onMarkClick)}
            </p>
          )
        } else {
          element = <p data-block={index}>{renderWithMarks(block.text, marks, onMarkClick)}</p>
        }

        return (
          <Fragment key={index}>
            {element}
            {notes.map((mark) =>
              mark.id === editingNoteId ? (
                <NoteEditor
                  highlight={mark}
                  key={mark.id}
                  onCancel={onCancelNote}
                  onSave={(note) => onSaveNote(mark.id, note)}
                />
              ) : (
                <button
                  className="bk-note"
                  data-color={mark.color}
                  key={mark.id}
                  onClick={() => onEditNote(mark.id)}
                  type="button"
                >
                  <span className="bk-note__label">Your note</span>
                  <span className="bk-note__text">{mark.note}</span>
                </button>
              ),
            )}
          </Fragment>
        )
      })}
    </>
  )
}
