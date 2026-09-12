import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ClientWithProgress } from '@shared/ipc-types'
import { Button } from './ui/Button'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** yyyy-mm-dd in local time, matching how `targetIntakeDate` (an ISO date string) compares. */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Month-grid calendar of every client's target intake date, so upcoming
 * deadlines are visible at a glance rather than buried in a sorted list.
 */
export function IntakeCalendarModal({
  clients,
  onClose
}: {
  clients: ClientWithProgress[]
  onClose: () => void
}): React.JSX.Element {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const clientsByDateKey = useMemo(() => {
    const map = new Map<string, ClientWithProgress[]>()
    for (const c of clients) {
      if (!c.targetIntakeDate) continue
      const parsed = new Date(c.targetIntakeDate)
      if (Number.isNaN(parsed.getTime())) continue
      const key = toDateKey(parsed)
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return map
  }, [clients])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toDateKey(new Date())

  const cells: { date: Date | null }[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) })

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ backgroundColor: 'var(--md-surface-container-high)' }}
      >
        <span className="text-sm font-medium">Target intake calendar</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="text"
            className="!px-2.5 !py-1 text-xs"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            ← Prev
          </Button>
          <span className="min-w-[9rem] text-center text-xs font-medium">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button
            variant="text"
            className="!px-2.5 !py-1 text-xs"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            Next →
          </Button>
          <Button
            variant="text"
            className="!px-2.5 !py-1 text-xs"
            onClick={() => {
              const now = new Date()
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
            }}
          >
            Today
          </Button>
        </div>
        <Button variant="text" className="!px-2.5 !py-1 text-xs" onClick={onClose}>
          ✕ Close
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--md-surface)' }}>
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_NAMES.map((w) => (
              <div
                key={w}
                className="px-1 pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--md-on-surface-variant)]"
              >
                {w}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell.date) return <div key={i} />
              const key = toDateKey(cell.date)
              const dayClients = clientsByDateKey.get(key) ?? []
              const isToday = key === todayKey
              return (
                <div
                  key={i}
                  className="flex min-h-[84px] flex-col gap-1 rounded-lg border p-1.5"
                  style={{
                    borderColor: isToday ? 'var(--md-primary)' : 'var(--md-outline-variant)',
                    backgroundColor: 'var(--md-surface-container)'
                  }}
                >
                  <span
                    className="text-[10px]"
                    style={{
                      color: isToday ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                      fontWeight: isToday ? 700 : 400
                    }}
                  >
                    {cell.date.getDate()}
                  </span>
                  {dayClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onClose()
                        navigate(`/clients/${c.id}`)
                      }}
                      className="app-no-drag truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium"
                      style={{
                        backgroundColor: 'var(--md-primary-container)',
                        color: 'var(--md-on-primary-container)'
                      }}
                      title={c.fullName}
                    >
                      {c.fullName}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
