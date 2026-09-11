import type { WorkflowStage } from '@shared/ipc-types'

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  information: 'Client & Information',
  documents: 'Documents',
  verification: 'Verification',
  evidence: 'Evidence & Research',
  writing: 'GSR Writing',
  review: 'Review',
  finalization: 'Finalization'
}

export const STAGE_ORDER: WorkflowStage[] = [
  'information',
  'documents',
  'verification',
  'evidence',
  'writing',
  'review',
  'finalization'
]

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
