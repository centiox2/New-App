import type { DocumentCategory, VerificationStatus, WorkflowStage } from '@shared/ipc-types'

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

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  identity_personal: 'Identity & Personal',
  education: 'Education',
  employment: 'Employment',
  financial: 'Financial',
  australian_study: 'Australian Study',
  verification_correspondence: 'Verification Correspondence',
  evidence_research: 'Evidence / Research',
  gsr_draft: 'GSR Drafts & Finalized',
  other: 'Other'
}

export const DOCUMENT_CATEGORY_ORDER: DocumentCategory[] = [
  'identity_personal',
  'education',
  'employment',
  'financial',
  'australian_study',
  'verification_correspondence',
  'evidence_research',
  'gsr_draft',
  'other'
]

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  not_required: 'Not Required',
  pending: 'Pending',
  verified: 'Verified',
  could_not_verify: 'Could Not Verify'
}

export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, { fg: string; bg: string }> = {
  not_required: { fg: 'var(--md-on-surface-variant)', bg: 'var(--md-surface-container-high)' },
  pending: { fg: 'var(--status-yellow)', bg: 'var(--status-yellow-bg)' },
  verified: { fg: 'var(--status-green)', bg: 'var(--status-green-bg)' },
  could_not_verify: { fg: 'var(--status-red)', bg: 'var(--status-red-bg)' }
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
