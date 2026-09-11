import { useState } from 'react'
import type { GsrSection } from '@shared/ipc-types'
import { Button } from '../ui/Button'

export function GsrSectionNav({
  sections,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onReorder,
  onDelete
}: {
  sections: GsrSection[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: (title: string) => void
  onRename: (id: string, title: string) => void
  onReorder: (orderedIds: string[]) => void
  onDelete: (id: string) => void
}): React.JSX.Element {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function move(index: number, dir: -1 | 1): void {
    const target = index + dir
    if (target < 0 || target >= sections.length) return
    const ids = sections.map((s) => s.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    onReorder(ids)
  }

  function submitAdd(): void {
    if (!newTitle.trim()) return
    onAdd(newTitle.trim())
    setNewTitle('')
    setAdding(false)
  }

  function submitRename(id: string): void {
    if (renameValue.trim()) onRename(id, renameValue.trim())
    setRenamingId(null)
  }

  return (
    <div className="flex flex-col gap-1">
      {sections.map((section, i) => (
        <div key={section.id} className="group flex items-center gap-1">
          {renamingId === section.id ? (
            <input
              autoFocus
              className="app-no-drag flex-1 rounded-lg border border-[var(--md-primary)] bg-[var(--md-surface)] px-2 py-1.5 text-sm"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => submitRename(section.id)}
              onKeyDown={(e) => e.key === 'Enter' && submitRename(section.id)}
            />
          ) : (
            <button
              onClick={() => onSelect(section.id)}
              onDoubleClick={() => {
                setRenamingId(section.id)
                setRenameValue(section.title)
              }}
              className={`app-no-drag flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeId === section.id
                  ? 'bg-[var(--md-primary-container)] font-medium text-[var(--md-on-primary-container)]'
                  : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
              }`}
              title="Double-click to rename"
            >
              {i + 1}. {section.title}
            </button>
          )}
          <div className="hidden flex-shrink-0 items-center gap-0.5 group-hover:flex">
            <button
              className="app-no-drag rounded px-1 text-xs text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] disabled:opacity-30"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              className="app-no-drag rounded px-1 text-xs text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] disabled:opacity-30"
              onClick={() => move(i, 1)}
              disabled={i === sections.length - 1}
              aria-label="Move down"
            >
              ↓
            </button>
          </div>
        </div>
      ))}

      {confirmDeleteId && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--status-red-bg)] px-2 py-1.5 text-xs text-[var(--status-red)]">
          Delete this section?
          <button
            className="app-no-drag font-semibold underline"
            onClick={() => onDelete(confirmDeleteId)}
          >
            Yes
          </button>
          <button className="app-no-drag underline" onClick={() => setConfirmDeleteId(null)}>
            No
          </button>
        </div>
      )}

      {activeId && !confirmDeleteId && (
        <button
          className="app-no-drag self-start px-3 pt-1 text-xs text-[var(--md-error)] hover:underline"
          onClick={() => setConfirmDeleteId(activeId)}
        >
          Delete current section
        </button>
      )}

      {adding ? (
        <div className="flex gap-1 px-1 pt-1">
          <input
            autoFocus
            className="app-no-drag flex-1 rounded-lg border border-[var(--md-primary)] bg-[var(--md-surface)] px-2 py-1.5 text-xs"
            placeholder="Section title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
          />
          <Button className="!px-2 !py-1 text-xs" onClick={submitAdd}>
            Add
          </Button>
        </div>
      ) : (
        <button
          className="app-no-drag mt-1 self-start px-3 py-1.5 text-xs text-[var(--md-primary)] hover:underline"
          onClick={() => setAdding(true)}
        >
          + Add section
        </button>
      )}
    </div>
  )
}
