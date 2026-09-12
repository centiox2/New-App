import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { QuickSearchResult } from '@shared/ipc-types'
import { STAGE_LABELS } from '../../lib/format'

const KIND_LABELS: Record<QuickSearchResult['kind'], string> = {
  education_entries: 'Education',
  english_test_scores: 'English test',
  australian_study_entries: 'Australian study',
  employment_entries: 'Employment',
  immigration_history_entries: 'Immigration history',
  sponsors: 'Sponsor',
  income_sources: 'Income / asset',
  documents: 'Document',
  evidence_items: 'Evidence',
  verification_records: 'Verification',
  gsr_sections: 'GSR section',
  gsr_statements: 'GSR statement'
}

/**
 * Obsidian-inspired quick switcher: Cmd/Ctrl+K opens a fuzzy-ish search
 * (substring match, done server-side) across everything in the current
 * client's case — information entries, documents, evidence, verification,
 * and GSR sections/statements — and jumps straight to the right stage.
 */
export function QuickSwitcher({ clientId }: { clientId: string }): React.JSX.Element | null {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QuickSearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      // Reset on each open — intentional on-open sync, not derived state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')
      setResults([])
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([])
        return
      }
      setSearching(true)
      try {
        const rows = await window.api.search.quickSearch(clientId, q)
        setResults(rows)
        setActiveIndex(0)
      } finally {
        setSearching(false)
      }
    },
    [clientId]
  )

  useEffect(() => {
    if (!open) return
    const handle = setTimeout(() => runSearch(query), 150)
    return () => clearTimeout(handle)
  }, [open, query, runSearch])

  function select(result: QuickSearchResult): void {
    setOpen(false)
    navigate(`/clients/${clientId}/${result.stage}`)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const result = results[activeIndex]
      if (result) select(result)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'var(--md-surface-container-high)',
          color: 'var(--md-on-surface)',
          boxShadow: 'var(--md-elevation-2)'
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search this case — information, documents, evidence, GSR…"
          className="app-no-drag w-full border-b border-[var(--md-outline-variant)] bg-transparent px-4 py-3.5 text-sm outline-none"
        />
        <div className="max-h-96 overflow-y-auto p-1.5">
          {searching && results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-[var(--md-on-surface-variant)]">
              Searching…
            </p>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-[var(--md-on-surface-variant)]">
              No matches.
            </p>
          )}
          {query.trim().length < 2 && results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-[var(--md-on-surface-variant)]">
              Type at least 2 characters to search.
            </p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.kind}:${r.id}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => select(r)}
              className="app-no-drag flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm"
              style={{
                backgroundColor: i === activeIndex ? 'var(--md-primary-container)' : 'transparent',
                color: i === activeIndex ? 'var(--md-on-primary-container)' : 'inherit'
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="mr-2 text-[10px] uppercase tracking-wide opacity-60">
                  {KIND_LABELS[r.kind]}
                </span>
                <span className="truncate">{r.label}</span>
                {r.subtitle && <span className="ml-1.5 truncate opacity-60">— {r.subtitle}</span>}
              </span>
              <span className="flex-shrink-0 text-[10px] opacity-60">{STAGE_LABELS[r.stage]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--md-outline-variant)] px-4 py-2 text-[10px] text-[var(--md-on-surface-variant)]">
          <span>↑↓ navigate · Enter open · Esc close</span>
          <span>Ctrl/Cmd+K</span>
        </div>
      </div>
    </div>
  )
}
