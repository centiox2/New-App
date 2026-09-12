import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { pdfjsLib } from '../../lib/pdfjs'
import { Button } from '../ui/Button'

interface SearchMatch {
  page: number
  snippet: string
}

export function PdfViewerModal({
  documentId,
  label,
  onClose
}: {
  documentId: string
  label: string
  onClose: () => void
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [matches, setMatches] = useState<SearchMatch[] | null>(null)

  useEffect(() => {
    let cancelled = false
    // Data fetch on mount / doc change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    window.api.documents
      .readFile(documentId)
      .then((bytes) => pdfjsLib.getDocument({ data: bytes }).promise)
      .then((doc) => {
        if (cancelled) return
        setPdf(doc)
        setNumPages(doc.numPages)
        setPageNum(1)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to open PDF.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [documentId])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    let cancelled = false
    pdf.getPage(pageNum).then(async (page) => {
      if (cancelled) return
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current!
      const context = canvas.getContext('2d')!
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvas, canvasContext: context, viewport }).promise
    })
    return () => {
      cancelled = true
    }
  }, [pdf, pageNum, scale])

  const runSearch = useCallback(async () => {
    if (!pdf || !searchQuery.trim()) {
      setMatches(null)
      return
    }
    setSearching(true)
    const query = searchQuery.trim().toLowerCase()
    const found: SearchMatch[] = []
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
        const idx = text.toLowerCase().indexOf(query)
        if (idx !== -1) {
          const start = Math.max(0, idx - 40)
          const snippet = `${start > 0 ? '…' : ''}${text.slice(start, idx + query.length + 40)}…`
          found.push({ page: i, snippet })
        }
      }
    } finally {
      setMatches(found)
      setSearching(false)
    }
  }, [pdf, searchQuery])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div
        className="flex items-center gap-3 border-b border-[var(--md-outline-variant)] px-4 py-2.5"
        style={{ backgroundColor: 'var(--md-surface-container-high)' }}
      >
        <span className="truncate text-sm font-medium">{label}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="text"
            className="!px-2 !py-1 text-xs"
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
          >
            ← Prev
          </Button>
          <span className="tabular-nums text-xs text-[var(--md-on-surface-variant)]">
            Page {pageNum} / {numPages || '—'}
          </span>
          <Button
            variant="text"
            className="!px-2 !py-1 text-xs"
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            disabled={pageNum >= numPages}
          >
            Next →
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="text"
            className="!px-2 !py-1 text-xs"
            onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}
          >
            −
          </Button>
          <span className="w-10 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
          <Button
            variant="text"
            className="!px-2 !py-1 text-xs"
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          >
            +
          </Button>
        </div>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            runSearch()
          }}
        >
          <input
            className="app-no-drag w-48 rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-1.5 text-xs"
            placeholder="Search in document…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" variant="text" className="!px-2 !py-1 text-xs" disabled={searching}>
            {searching ? '…' : 'Find'}
          </Button>
        </form>
        <Button variant="text" className="!px-2.5 !py-1 text-xs" onClick={onClose}>
          ✕ Close
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 items-start justify-center overflow-auto p-6">
          {loading && <p className="text-sm text-white/80">Loading…</p>}
          {error && <p className="text-sm text-[var(--status-red)]">{error}</p>}
          {!loading && !error && (
            <canvas
              ref={canvasRef}
              className="rounded shadow-2xl"
              style={{ backgroundColor: 'white' }}
            />
          )}
        </div>

        {matches !== null && (
          <div
            className="w-72 flex-shrink-0 overflow-y-auto border-l border-[var(--md-outline-variant)] p-3"
            style={{ backgroundColor: 'var(--md-surface-container-high)' }}
          >
            <p className="mb-2 text-xs font-semibold text-[var(--md-on-surface-variant)]">
              {matches.length} match{matches.length === 1 ? '' : 'es'}
            </p>
            {matches.length === 0 ? (
              <p className="text-xs text-[var(--md-on-surface-variant)]">No matches found.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {matches.map((m) => (
                  <button
                    key={m.page}
                    onClick={() => setPageNum(m.page)}
                    className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] px-2.5 py-2 text-left text-xs hover:border-[var(--md-primary)]"
                  >
                    <span className="font-medium">Page {m.page}</span>
                    <p className="mt-0.5 text-[var(--md-on-surface-variant)]">{m.snippet}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
