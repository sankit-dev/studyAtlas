import type { ReactNode } from 'react'
import { chapterPath, type Book } from '../../data/books'
import { CloseIcon, LockIcon } from './icons'
import {
  maxTextSize,
  minTextSize,
  type Highlight,
  type ReaderFont,
  type ReaderPrefs,
  type ReaderTheme,
  type ReaderWidth,
} from './storage'

const themeOptions: { id: ReaderTheme; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'night', label: 'Night' },
  { id: 'paper', label: 'Paper' },
]

const fontOptions: { id: ReaderFont; label: string }[] = [
  { id: 'serif', label: 'Serif' },
  { id: 'sans', label: 'Sans' },
]

const widthOptions: { id: ReaderWidth; label: string }[] = [
  { id: 'narrow', label: 'Narrow' },
  { id: 'medium', label: 'Medium' },
  { id: 'wide', label: 'Wide' },
]

type SettingsPanelProps = {
  prefs: ReaderPrefs
  onChange: (prefs: ReaderPrefs) => void
}

export function SettingsPanel({ prefs, onChange }: SettingsPanelProps) {
  const set = <K extends keyof ReaderPrefs>(key: K, value: ReaderPrefs[K]) =>
    onChange({ ...prefs, [key]: value })

  return (
    <div aria-label="Reading settings" className="bk-panel bk-settings" data-lenis-prevent role="dialog">
      <fieldset className="bk-field">
        <legend>Theme</legend>
        <div className="bk-swatches">
          {themeOptions.map((option) => (
            <button
              aria-pressed={prefs.theme === option.id}
              className="bk-swatch"
              data-swatch={option.id}
              key={option.id}
              onClick={() => set('theme', option.id)}
              type="button"
            >
              <span aria-hidden="true">Aa</span>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="bk-field">
        <legend>Text size</legend>
        <div className="bk-stepper">
          <button
            aria-label="Smaller text"
            disabled={prefs.size <= minTextSize}
            onClick={() => set('size', prefs.size - 1)}
            type="button"
          >
            A−
          </button>
          <output className="bk-num">{prefs.size}px</output>
          <button
            aria-label="Larger text"
            disabled={prefs.size >= maxTextSize}
            onClick={() => set('size', prefs.size + 1)}
            type="button"
          >
            A+
          </button>
        </div>
      </fieldset>

      <fieldset className="bk-field">
        <legend>Font</legend>
        <div className="bk-segment">
          {fontOptions.map((option) => (
            <button
              aria-pressed={prefs.font === option.id}
              data-font={option.id}
              key={option.id}
              onClick={() => set('font', option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="bk-field">
        <legend>Line width</legend>
        <div className="bk-segment">
          {widthOptions.map((option) => (
            <button
              aria-pressed={prefs.width === option.id}
              key={option.id}
              onClick={() => set('width', option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

type DrawerProps = {
  title: string
  side: 'left' | 'right'
  onClose: () => void
  children: ReactNode
}

function Drawer({ title, side, onClose, children }: DrawerProps) {
  return (
    <>
      <div aria-hidden="true" className="bk-scrim" onClick={onClose} />
      <aside aria-label={title} className="bk-drawer" data-side={side} role="dialog">
        <div className="bk-drawer__head">
          <span className="bk-eyebrow">{title}</span>
          <button aria-label="Close" className="bk-icon-btn" onClick={onClose} type="button">
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="bk-drawer__body" data-lenis-prevent>{children}</div>
      </aside>
    </>
  )
}

type ContentsDrawerProps = {
  book: Book
  current: number
  isSubscribed: boolean
  onClose: () => void
}

export function ContentsDrawer({ book, current, isSubscribed, onClose }: ContentsDrawerProps) {
  return (
    <Drawer onClose={onClose} side="left" title="Contents">
      <p className="bk-drawer__book">{book.title}</p>
      {book.parts.map((part) => (
        <section className="bk-drawer__part" key={part.title}>
          <h3>{part.title}</h3>
          <ol>
            {part.chapters.map((chapter) => (
              <li key={chapter.number}>
                <a
                  aria-current={chapter.number === current ? 'page' : undefined}
                  className="bk-drawer__row"
                  href={chapterPath(book, chapter.number)}
                  onClick={onClose}
                >
                  <span className="bk-num">{chapter.number}</span>
                  <span>{chapter.title}</span>
                  {!chapter.free && !isSubscribed && (
                    <LockIcon aria-label="Locked" size={14} />
                  )}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Drawer>
  )
}

type HighlightsDrawerProps = {
  highlights: Highlight[]
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onClose: () => void
}

export function HighlightsDrawer({ highlights, onSelect, onRemove, onClose }: HighlightsDrawerProps) {
  const sorted = [...highlights].sort((a, b) => a.block - b.block || a.start - b.start)
  return (
    <Drawer onClose={onClose} side="right" title="Highlights">
      {sorted.length === 0 ? (
        <p className="bk-drawer__empty">Select text in the chapter to highlight it.</p>
      ) : (
        <ul className="bk-hl-list">
          {sorted.map((highlight) => (
            <li className="bk-hl-item" data-color={highlight.color} key={highlight.id}>
              <button className="bk-hl-item__text" onClick={() => onSelect(highlight.id)} type="button">
                {highlight.text}
              </button>
              {highlight.note && <p className="bk-hl-item__note">{highlight.note}</p>}
              <button className="bk-hl-item__remove" onClick={() => onRemove(highlight.id)} type="button">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}
