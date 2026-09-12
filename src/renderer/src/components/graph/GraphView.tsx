import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CaseGraph, GraphNode, GraphNodeKind } from '@shared/ipc-types'
import { Button } from '../ui/Button'

const KIND_LABELS: Record<GraphNodeKind, string> = {
  client: 'Client',
  personal_profiles: 'Personal',
  education_entries: 'Education',
  english_test_scores: 'English test',
  australian_study_entries: 'Australian study',
  employment_entries: 'Employment',
  immigration_history_entries: 'Immigration',
  sponsors: 'Sponsor',
  income_sources: 'Income/asset',
  documents: 'Document',
  verification_records: 'Verification',
  evidence_items: 'Evidence',
  gsr_document: 'GSR',
  gsr_sections: 'GSR section',
  gsr_statements: 'GSR statement'
}

const KIND_COLORS: Record<GraphNodeKind, string> = {
  client: '#4f5b92',
  personal_profiles: '#8e7cc3',
  education_entries: '#3f9142',
  english_test_scores: '#56ab8a',
  australian_study_entries: '#2f9e8f',
  employment_entries: '#c97a2b',
  immigration_history_entries: '#b0632f',
  sponsors: '#c2185b',
  income_sources: '#e05c8a',
  documents: '#3f7dc9',
  verification_records: '#d4a017',
  evidence_items: '#7b4fc9',
  gsr_document: '#455a64',
  gsr_sections: '#607d8b',
  gsr_statements: '#8fa8b3'
}

interface Point {
  x: number
  y: number
}

/** Minimal force-directed layout (repulsion + spring edges + centering) — no d3 dependency needed at case-sized graphs (tens of nodes). */
function layoutGraph(
  nodes: GraphNode[],
  edges: { source: string; target: string }[]
): Map<string, Point> {
  const n = nodes.length
  if (n === 0) return new Map()

  interface P extends Point {
    vx: number
    vy: number
  }
  const positions = new Map<string, P>()
  nodes.forEach((node, i) => {
    const angle = (i / n) * Math.PI * 2
    const r = 180 + (i % 3) * 40
    positions.set(node.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r, vx: 0, vy: 0 })
  })

  const REPULSION = 5500
  const SPRING_LENGTH = 85
  const SPRING_STRENGTH = 0.02
  const CENTER_STRENGTH = 0.008
  const DAMPING = 0.82
  const ITERATIONS = n > 150 ? 120 : 300

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < n; i++) {
      const a = positions.get(nodes[i].id)!
      for (let j = i + 1; j < n; j++) {
        const b = positions.get(nodes[j].id)!
        const dx = a.x - b.x
        const dy = a.y - b.y
        const distSq = Math.max(dx * dx + dy * dy, 1)
        const dist = Math.sqrt(distSq)
        const force = REPULSION / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }
      a.vx -= a.x * CENTER_STRENGTH
      a.vy -= a.y * CENTER_STRENGTH
    }

    for (const edge of edges) {
      const a = positions.get(edge.source)
      const b = positions.get(edge.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const diff = dist - SPRING_LENGTH
      const fx = (dx / dist) * diff * SPRING_STRENGTH
      const fy = (dy / dist) * diff * SPRING_STRENGTH
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }

    for (const node of nodes) {
      const p = positions.get(node.id)!
      p.vx *= DAMPING
      p.vy *= DAMPING
      p.x += p.vx
      p.y += p.vy
    }
  }

  const result = new Map<string, Point>()
  for (const node of nodes) {
    const p = positions.get(node.id)!
    result.set(node.id, { x: p.x, y: p.y })
  }
  return result
}

/**
 * Obsidian-inspired graph view: every node in the client's case (information
 * entries, documents, verification records, evidence, GSR sections and
 * statements) laid out with a lightweight force simulation, edges drawn from
 * every link/relationship table. Click a node to jump to its stage.
 */
export function GraphView({
  clientId,
  onClose
}: {
  clientId: string
  onClose: () => void
}): React.JSX.Element {
  const navigate = useNavigate()
  const [graph, setGraph] = useState<CaseGraph | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.graph.forClient(clientId).then((g) => {
      if (!cancelled) setGraph(g)
    })
    return () => {
      cancelled = true
    }
  }, [clientId])

  const positions = useMemo(() => {
    if (!graph) return new Map<string, Point>()
    return layoutGraph(graph.nodes, graph.edges)
  }, [graph])

  const connectedIds = useMemo(() => {
    if (!graph || !hoveredId) return null
    const set = new Set<string>([hoveredId])
    for (const e of graph.edges) {
      if (e.source === hoveredId) set.add(e.target)
      if (e.target === hoveredId) set.add(e.source)
    }
    return set
  }, [graph, hoveredId])

  function selectNode(node: GraphNode): void {
    onClose()
    navigate(`/clients/${clientId}/${node.stage}`)
  }

  let viewBox = '-250 -250 500 500'
  if (positions.size > 0) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of positions.values()) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    const pad = 70
    viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
  }

  const usedKinds = graph ? Array.from(new Set(graph.nodes.map((n) => n.kind))) : []

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ backgroundColor: 'var(--md-surface-container-high)' }}
      >
        <span className="text-sm font-medium">
          Case graph
          {graph && (
            <span className="ml-2 text-xs font-normal text-[var(--md-on-surface-variant)]">
              {graph.nodes.length} nodes · {graph.edges.length} links
            </span>
          )}
        </span>
        <Button variant="text" className="ml-auto !px-2.5 !py-1 text-xs" onClick={onClose}>
          ✕ Close
        </Button>
      </div>

      <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--md-surface)' }}>
        {!graph ? (
          <p className="flex h-full items-center justify-center text-sm text-[var(--md-on-surface-variant)]">
            Loading graph…
          </p>
        ) : graph.nodes.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-[var(--md-on-surface-variant)]">
            Nothing to show yet.
          </p>
        ) : (
          <svg viewBox={viewBox} className="h-full w-full">
            <g>
              {graph.edges.map((e, i) => {
                const a = positions.get(e.source)
                const b = positions.get(e.target)
                if (!a || !b) return null
                const dimmed = connectedIds
                  ? !(connectedIds.has(e.source) && connectedIds.has(e.target))
                  : false
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="var(--md-outline)"
                    strokeWidth={1}
                    opacity={dimmed ? 0.08 : 0.5}
                  />
                )
              })}
            </g>
            <g>
              {graph.nodes.map((node) => {
                const p = positions.get(node.id)
                if (!p) return null
                const dimmed = connectedIds ? !connectedIds.has(node.id) : false
                return (
                  <g
                    key={node.id}
                    transform={`translate(${p.x},${p.y})`}
                    className="app-no-drag cursor-pointer"
                    opacity={dimmed ? 0.2 : 1}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => selectNode(node)}
                  >
                    <circle
                      r={node.kind === 'client' ? 11 : 6}
                      fill={KIND_COLORS[node.kind]}
                      stroke="var(--md-surface)"
                      strokeWidth={1.5}
                    />
                    <text x={10} y={4} fontSize={9} fill="var(--md-on-surface)">
                      {node.label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 text-[10px] text-[var(--md-on-surface-variant)]"
        style={{ backgroundColor: 'var(--md-surface-container-high)' }}
      >
        {usedKinds.map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: KIND_COLORS[kind] }}
            />
            {KIND_LABELS[kind]}
          </span>
        ))}
        {graph && graph.nodes.length > 0 && (
          <span className="ml-auto">
            Hover to highlight connections · click a node to open its stage
          </span>
        )}
      </div>
    </div>
  )
}
