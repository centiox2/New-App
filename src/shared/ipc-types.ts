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

// --- Information architecture (§5) --------------------------------------

/** Ad hoc fields not covered by a section's fixed schema — label -> value. */
export type CustomFields = Record<string, string>

export interface PersonalProfile {
  id: string
  clientId: string
  contactInfo: string | null
  residenceInfo: string | null
  nextOfKin: string | null
  familyInfo: string | null
  customFields: CustomFields | null
  createdAt: string
  updatedAt: string
}

export type EducationLevel = 'primary' | 'secondary' | 'post_secondary'

export interface EducationEntry {
  id: string
  clientId: string
  level: EducationLevel | null
  institution: string | null
  course: string | null
  startDate: string | null
  endDate: string | null
  qualification: string | null
  finalGrade: string | null
  gradeBreakdown: Record<string, string> | null
  institutionContact: string | null
  clubsCertifications: string | null
  requiresVerification: boolean
  customFields: CustomFields | null
  createdAt: string
  updatedAt: string
}

export interface EnglishTestScore {
  id: string
  clientId: string
  testDate: string | null
  overallScore: string | null
  componentScores: Record<string, string> | null
  trfReference: string | null
  requiresVerification: boolean
  customFields: CustomFields | null
  createdAt: string
  updatedAt: string
}

export interface AustralianStudyEntry {
  id: string
  clientId: string
  institutionProvider: string | null
  course: string | null
  courseLevel: string | null
  coeReference: string | null
  offerLetterReference: string | null
  intendedStartDate: string | null
  customFields: CustomFields | null
  createdAt: string
  updatedAt: string
}

export interface EmploymentEntry {
  id: string
  clientId: string
  employer: string | null
  jobTitle: string | null
  employmentType: string | null
  startDate: string | null
  endDate: string | null
  monthlySalary: string | null
  duties: string | null
  employerContact: string | null
  requiresVerification: boolean
  customFields: CustomFields | null
  createdAt: string
  updatedAt: string
}

export interface ImmigrationHistoryEntry {
  id: string
  clientId: string
  description: string | null
  dateFrom: string | null
  dateTo: string | null
  customFields: CustomFields | null
  createdAt: string
  updatedAt: string
}

export interface Sponsor {
  id: string
  clientId: string
  name: string
  relationshipToClient: string | null
  contactInfo: string | null
  customFields: CustomFields | null
  createdAt: string
  updatedAt: string
}

export type IncomeSourceType = 'salary' | 'business' | 'property' | 'other'

export interface IncomeSource {
  id: string
  sponsorId: string
  type: IncomeSourceType
  description: string | null
  amount: string | null
  requiresVerification: boolean
  customFields: CustomFields | null
  createdAt: string
  updatedAt: string
}

// --- Documents (§6) -------------------------------------------------------

export type DocumentCategory =
  | 'identity_personal'
  | 'education'
  | 'employment'
  | 'financial'
  | 'australian_study'
  | 'verification_correspondence'
  | 'evidence_research'
  | 'gsr_draft'
  | 'other'

export interface DocumentRecord {
  id: string
  clientId: string
  category: DocumentCategory
  customCategory: string | null
  label: string
  filePath: string
  notes: string | null
  replacesDocumentId: string | null
  isCurrentVersion: boolean
  createdAt: string
  updatedAt: string
}

export interface PickedFile {
  sourcePath: string
  suggestedLabel: string
  extension: string
}

export interface CreateDocumentInput {
  clientId: string
  category: DocumentCategory
  customCategory?: string | null
  label: string
  notes?: string | null
  sourcePath: string
}

export interface UpdateDocumentInput {
  id: string
  label?: string
  category?: DocumentCategory
  customCategory?: string | null
  notes?: string | null
}

export interface ReplaceDocumentInput {
  id: string
  sourcePath: string
}
