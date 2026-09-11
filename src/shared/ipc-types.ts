/** Types shared between main and renderer for the IPC contract (window.api.*). */

export type ClientStatus = 'red' | 'yellow' | 'green'

export type WorkflowStage =
  'information' | 'documents' | 'verification' | 'evidence' | 'writing' | 'review' | 'finalization'

export interface ClientRecord {
  id: string
  fullName: string
  status: ClientStatus
  statusNote: string | null
  currentStage: WorkflowStage
  targetIntakeDate: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientWithProgress extends ClientRecord {
  /** Computed hint only — never overwrites the user's manual `status` (§3). */
  suggestedStatus: ClientStatus
  pendingActionCount: number
}

export interface CreateClientInput {
  fullName: string
  targetIntakeDate?: string | null
}

export interface UpdateClientInput {
  id: string
  fullName?: string
  status?: ClientStatus
  statusNote?: string | null
  currentStage?: WorkflowStage
  targetIntakeDate?: string | null
}

export type ClientSortField = 'fullName' | 'updatedAt' | 'targetIntakeDate' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface ListClientsQuery {
  search?: string
  statusFilter?: ClientStatus[]
  stageFilter?: WorkflowStage[]
  sortField?: ClientSortField
  sortDirection?: SortDirection
}

// --- App lock / settings -----------------------------------------------

export interface AppLockState {
  /** Whether a password has ever been set up. */
  isConfigured: boolean
}

export interface SetupPasswordInput {
  password: string
}

export interface UnlockInput {
  password: string
}
