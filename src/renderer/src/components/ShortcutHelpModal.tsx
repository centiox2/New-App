import { useEffect, useState } from 'react'
import { Dialog } from './ui/Dialog'
import { requestAppLock, SHORTCUT_HELP_EVENT } from '../lib/appEvents'

const SHORTCUTS: { keys: string; label: string }[] = [
  {
    keys: 'Ctrl/Cmd + K',
    label: 'Open the command palette (dashboard = all cases, client = this case)'
  },
  { keys: 'Ctrl/Cmd + N', label: 'New client (dashboard)' },
  { keys: 'Ctrl/Cmd + L', label: 'Lock the app' },
  { keys: '1 – 7', label: 'Jump to a workflow stage (in a client)' },
  { keys: 'G', label: 'Toggle the case graph view (in a client)' },
  { keys: 'Esc', label: 'Close dialogs, palettes and overlays' }
]

/**
 * Global keyboard reference. Opens on `?` (when not typing) or via the
 * `SHORTCUT_HELP_EVENT` (e.g. from the command palette), and handles the
 * app-wide Ctrl/Cmd+L lock action so it works on every screen.
 */
export function ShortcutHelpModal(): React.JSX.Element | null {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onRequest = (): void => setOpen(true)
    window.addEventListener(SHORTCUT_HELP_EVENT, onRequest)
    return () => window.removeEventListener(SHORTCUT_HELP_EVENT, onRequest)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        setOpen(false)
        requestAppLock()
        return
      }
      const target = e.target as HTMLElement | null
      const typing = target && target.closest('input, textarea, select, [contenteditable="true"]')
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '?') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <ul className="flex flex-col gap-2.5">
        {SHORTCUTS.map((s) => (
          <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-[var(--md-on-surface-variant)]">{s.label}</span>
            <kbd className="flex-shrink-0 rounded-md border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2 py-0.5 font-mono text-xs">
              {s.keys}
            </kbd>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--md-on-surface-variant)]">
        Shortcuts are disabled while typing in a field, so they never clash with data entry.
      </p>
    </Dialog>
  )
}
