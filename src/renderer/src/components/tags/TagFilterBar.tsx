/** A row of distinct-tag toggle chips for filtering a list by tag. */
export function TagFilterBar({
  labels,
  active,
  onToggle
}: {
  labels: string[]
  active: string[]
  onToggle: (label: string) => void
}): React.JSX.Element | null {
  if (labels.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--md-on-surface-variant)]">
        Tags:
      </span>
      {labels.map((label) => (
        <button
          key={label}
          onClick={() => onToggle(label)}
          className={`app-no-drag rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            active.includes(label)
              ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
              : 'border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
