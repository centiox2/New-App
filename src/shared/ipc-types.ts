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
  archived: boolean
  pinned: boolean
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
  archived?: boolean
  pinned?: boolean
}

export type ClientSortField = 'fullName' | 'updatedAt' | 'targetIntakeDate' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface ListClientsQuery {
  search?: string
  statusFilter?: ClientStatus[]
  stageFilter?: WorkflowStage[]
  sortField?: ClientSortField
  sortDirection?: SortDirection
  /** Default false — archived clients are hidden from the normal dashboard list. */
  includeArchived?: boolean
}

/** One client in the "recently viewed" dashboard list. */
export interface RecentClient {
  clientId: string
  fullName: string
  lastViewedAt: string
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
  dateOfBirth: string | null
  passportNumber: string | null
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

// --- Verification (§7) -----------------------------------------------------

export type VerificationStatus = 'not_required' | 'pending' | 'verified' | 'could_not_verify'

export interface VerificationRecord {
  id: string
  clientId: string
  subjectEntityType: string
  subjectEntityId: string
  whatIsBeingVerified: string
  reason: string | null
  contactName: string | null
  contactDetails: string | null
  method: string | null
  dateContacted: string | null
  status: VerificationStatus
  response: string | null
  dateVerified: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateVerificationRecordInput {
  clientId: string
  subjectEntityType: string
  subjectEntityId: string
  whatIsBeingVerified: string
  reason?: string | null
  contactName?: string | null
  contactDetails?: string | null
  method?: string | null
  dateContacted?: string | null
  status?: VerificationStatus
  response?: string | null
  dateVerified?: string | null
  notes?: string | null
}

export type UpdateVerificationRecordInput = Partial<CreateVerificationRecordInput> & { id: string }

/** One information entry flagged "requires verification", with its current verification state (if any). */
export interface VerifiableItem {
  entityType: 'education_entries' | 'english_test_scores' | 'employment_entries' | 'income_sources'
  entityId: string
  label: string
  subtitle: string | null
  verificationRecord: VerificationRecord | null
}

// --- Evidence & Research (§8) ----------------------------------------------

export interface EvidenceItem {
  id: string
  clientId: string
  source: string | null
  title: string
  url: string | null
  publicationInfo: string | null
  excerpt: string | null
  notes: string | null
  provesWhat: string | null
  documentId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateEvidenceInput {
  clientId: string
  source?: string | null
  title: string
  url?: string | null
  publicationInfo?: string | null
  excerpt?: string | null
  notes?: string | null
  provesWhat?: string | null
}

export type UpdateEvidenceInput = Partial<CreateEvidenceInput> & { id: string }

// --- GSR writing environment (§9) ------------------------------------------

export type GsrDocumentStatus = 'drafting' | 'in_review' | 'finalized'

export interface GsrDocument {
  id: string
  clientId: string
  title: string
  status: GsrDocumentStatus
  createdAt: string
  updatedAt: string
}

export interface GsrSection {
  id: string
  gsrDocumentId: string
  title: string
  orderIndex: number
  contentHtml: string | null
  createdAt: string
  updatedAt: string
}

export interface GsrStatement {
  id: string
  gsrSectionId: string
  text: string
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export interface GsrStatementWithEvidence extends GsrStatement {
  evidence: { linkId: string; evidence: EvidenceItem }[]
}

// --- Review / checklist (§12) ----------------------------------------------

export interface ChecklistDocument {
  id: string
  clientId: string
  sourceDocumentId: string
  createdAt: string
  updatedAt: string
  document: DocumentRecord
}

export interface UnsupportedStatement {
  id: string
  text: string
  sectionTitle: string
}

export interface ExportResult {
  path: string
  filename: string
}

export interface MergeResult extends ExportResult {
  mergedCount: number
  skippedCount: number
}

export interface ReviewSummary {
  documentsCount: number
  verification: {
    flaggedCount: number
    notStartedCount: number
    pendingCount: number
    verifiedCount: number
    couldNotVerifyCount: number
  }
  evidenceCount: number
  gsr: {
    sectionCount: number
    emptySectionTitles: string[]
    statementCount: number
    unsupportedStatements: UnsupportedStatement[]
  }
}

// --- Generic linking & backlinks (Obsidian-inspired) ------------------------

/** The information-section entity tables a document (or anything else) can link to. */
export type InformationEntityType =
  | 'personal_profiles'
  | 'education_entries'
  | 'english_test_scores'
  | 'australian_study_entries'
  | 'employment_entries'
  | 'immigration_history_entries'
  | 'sponsors'
  | 'income_sources'

/** A document explicitly linked to one information entry (§6 — schema supported this already). */
export interface DocumentInformationLink {
  /** The link row's own id — pass this to unlink. */
  linkId: string
  entityType: InformationEntityType
  entityId: string
  label: string
  subtitle: string | null
}

/** One selectable information entry, for the "link to…" picker. */
export interface InformationEntityOption {
  entityId: string
  label: string
  subtitle: string | null
}

/** One result row from the quick switcher (Cmd/Ctrl+K) search, spanning every searchable table. */
export interface QuickSearchResult {
  kind:
    | 'client'
    | 'education_entries'
    | 'english_test_scores'
    | 'australian_study_entries'
    | 'employment_entries'
    | 'immigration_history_entries'
    | 'sponsors'
    | 'income_sources'
    | 'documents'
    | 'evidence_items'
    | 'verification_records'
    | 'gsr_sections'
    | 'gsr_statements'
  id: string
  label: string
  subtitle: string | null
  stage: WorkflowStage
}

/** A QuickSearchResult plus which client it belongs to — for the dashboard's cross-client search. */
export interface GlobalSearchResult extends QuickSearchResult {
  clientId: string
  clientName: string
}

// --- Tagging -----------------------------------------------------------

export type TaggableEntityType = 'documents' | 'evidence_items' | 'gsr_statements'

export interface EntityTag {
  tagId: string
  entityId: string
  label: string
}

// --- Graph view (Obsidian-inspired) -----------------------------------------

export type GraphNodeKind =
  | 'client'
  | 'personal_profiles'
  | 'education_entries'
  | 'english_test_scores'
  | 'australian_study_entries'
  | 'employment_entries'
  | 'immigration_history_entries'
  | 'sponsors'
  | 'income_sources'
  | 'documents'
  | 'verification_records'
  | 'evidence_items'
  | 'gsr_document'
  | 'gsr_sections'
  | 'gsr_statements'

export interface GraphNode {
  /** Unique across the whole graph: `${kind}:${entityId}`. */
  id: string
  kind: GraphNodeKind
  entityId: string
  label: string
  stage: WorkflowStage
}

export interface GraphEdge {
  source: string
  target: string
}

export interface CaseGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** One node the given entity is referenced by, across every link/relationship in the schema. */
export interface BacklinkItem {
  /** The underlying link/relationship row's id, where one exists (join tables) — otherwise the target's own id. */
  linkId: string
  kind:
    | 'document'
    | 'information'
    | 'verification_record'
    | 'evidence_item'
    | 'gsr_statement'
    | 'checklist'
  targetId: string
  /** Set only when kind === 'information'. */
  entityType?: InformationEntityType
  label: string
  subtitle: string | null
  stage: WorkflowStage
}
