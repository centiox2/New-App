import { useCallback, useEffect, useState } from 'react'
import type {
  EvidenceItem,
  GsrDocument,
  GsrSection,
  GsrStatementWithEvidence
} from '@shared/ipc-types'
import { Button } from '../components/ui/Button'
import { GsrSectionNav } from '../components/gsr/GsrSectionNav'
import { GsrStatementList } from '../components/gsr/GsrStatementList'

export function GsrWritingStage({ clientId }: { clientId: string }): React.JSX.Element {
  const [gsrDoc, setGsrDoc] = useState<GsrDocument | null>(null)
  const [sections, setSections] = useState<GsrSection[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [statements, setStatements] = useState<GsrStatementWithEvidence[]>([])
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const init = useCallback(async () => {
    setLoading(true)
    try {
      const doc = await window.api.gsr.getOrCreateDocument(clientId)
      const [sectionRows, evidenceRows] = await Promise.all([
        window.api.gsr.listSections(doc.id),
        window.api.evidence.list(clientId)
      ])
      setGsrDoc(doc)
      setSections(sectionRows)
      setEvidence(evidenceRows)
      setActiveId(sectionRows[0]?.id ?? null)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    init()
  }, [init])

  const loadStatements = useCallback(async (sectionId: string) => {
    const rows = await window.api.gsr.listStatements(sectionId)
    setStatements(rows)
  }, [])

  useEffect(() => {
    if (!activeId) return
    const section = sections.find((s) => s.id === activeId)
    // Loading the newly-selected section's content and statements —
    // intentional on-select sync, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent(section?.contentHtml ?? '')
    loadStatements(activeId)
  }, [activeId, sections, loadStatements])

  async function saveContent(): Promise<void> {
    if (!activeId) return
    setSaving(true)
    try {
      const updated = await window.api.gsr.updateSection({ id: activeId, contentHtml: content })
      setSections((prev) => prev.map((s) => (s.id === activeId ? updated : s)))
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  async function addSection(title: string): Promise<void> {
    if (!gsrDoc) return
    const created = await window.api.gsr.createSection(gsrDoc.id, title)
    setSections((prev) => [...prev, created])
    setActiveId(created.id)
  }

  async function renameSection(id: string, title: string): Promise<void> {
    const updated = await window.api.gsr.updateSection({ id, title })
    setSections((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  async function reorderSections(orderedIds: string[]): Promise<void> {
    setSections((prev) =>
      orderedIds.map((id, i) => ({ ...prev.find((s) => s.id === id)!, orderIndex: i }))
    )
    await window.api.gsr.reorderSections(orderedIds)
  }

  async function deleteSection(id: string): Promise<void> {
    await window.api.gsr.deleteSection(id)
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
  }

  async function addStatement(text: string): Promise<void> {
    if (!activeId) return
    const created = await window.api.gsr.createStatement(activeId, text)
    setStatements((prev) => [...prev, created])
  }

  async function updateStatement(id: string, text: string): Promise<void> {
    const updated = await window.api.gsr.updateStatement(id, text)
    setStatements((prev) =>
      prev.map((s) => (s.id === id ? { ...updated, evidence: s.evidence } : s))
    )
  }

  async function deleteStatement(id: string): Promise<void> {
    await window.api.gsr.deleteStatement(id)
    setStatements((prev) => prev.filter((s) => s.id !== id))
  }

  async function linkEvidence(statementId: string, evidenceItemId: string): Promise<void> {
    const link = await window.api.gsr.linkEvidence(statementId, evidenceItemId)
    const item = evidence.find((e) => e.id === evidenceItemId)
    if (!item) return
    setStatements((prev) =>
      prev.map((s) =>
        s.id === statementId
          ? { ...s, evidence: [...s.evidence, { linkId: link.id, evidence: item }] }
          : s
      )
    )
  }

  async function unlinkEvidence(statementId: string, linkId: string): Promise<void> {
    await window.api.gsr.unlinkEvidence(linkId)
    setStatements((prev) =>
      prev.map((s) =>
        s.id === statementId ? { ...s, evidence: s.evidence.filter((e) => e.linkId !== linkId) } : s
      )
    )
  }

  if (loading) {
    return <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
  }

  const activeSection = sections.find((s) => s.id === activeId)
  const dirty = activeSection && content !== (activeSection.contentHtml ?? '')

  return (
    <div className="flex h-full gap-6">
      <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-[var(--md-outline-variant)] pr-4">
        <GsrSectionNav
          sections={sections}
          activeId={activeId}
          onSelect={setActiveId}
          onAdd={addSection}
          onRename={renameSection}
          onReorder={reorderSections}
          onDelete={deleteSection}
        />
      </aside>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-8 pr-2">
          {activeSection ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{activeSection.title}</h2>
                <div className="flex items-center gap-3">
                  {savedAt && !dirty && (
                    <span className="text-xs text-[var(--md-on-surface-variant)]">Saved</span>
                  )}
                  <Button onClick={saveContent} disabled={!dirty || saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
              <textarea
                className="app-no-drag min-h-[280px] flex-shrink-0 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4 text-sm leading-relaxed"
                placeholder={`Write the ${activeSection.title.toLowerCase()} section…`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              <GsrStatementList
                statements={statements}
                availableEvidence={evidence}
                onAdd={addStatement}
                onUpdate={updateStatement}
                onDelete={deleteStatement}
                onLinkEvidence={linkEvidence}
                onUnlinkEvidence={unlinkEvidence}
              />
            </>
          ) : (
            <p className="text-sm text-[var(--md-on-surface-variant)]">
              Add a section to start writing.
            </p>
          )}
        </div>

        <aside className="w-72 flex-shrink-0 overflow-y-auto border-l border-[var(--md-outline-variant)] pl-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--md-on-surface-variant)]">
            Evidence library
          </h3>
          {evidence.length === 0 ? (
            <p className="text-xs text-[var(--md-on-surface-variant)]">
              No evidence collected yet — add some on the Evidence &amp; Research tab.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {evidence.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-2.5"
                >
                  <p className="truncate text-xs font-medium">{e.title}</p>
                  {e.provesWhat && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--md-on-surface-variant)]">
                      {e.provesWhat}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
