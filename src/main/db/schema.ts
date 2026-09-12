/**
 * SQLite schema (Drizzle ORM), mirroring SPECIFICATION.md §5-§9, §12, §15, §17.
 *
 * Conventions:
 * - Every client-owned table carries `clientId` directly (not just via a
 *   chain of joins) so isolation can be enforced with a single WHERE clause
 *   at the query layer — see src/main/db/scope.ts.
 * - `customFields` columns hold a JSON object for the "custom field per
 *   entry" extensibility described in §5.
 * - Dates are stored as ISO 8601 strings (TEXT) for readability in a local
 *   file the user may want to inspect/back up directly.
 * - IDs are UUID strings (crypto.randomUUID), not autoincrement integers,
 *   so entities can be referenced safely across the file-storage layer too.
 */
import { randomUUID } from 'crypto'
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- drizzle column builder generic is impractical to spell out
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID())

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
}

// ---------------------------------------------------------------------------
// App-level (not client-scoped)
// ---------------------------------------------------------------------------

/** Single-row table holding the app password lock and local preferences (§18/§19). */
export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  backupFolderPath: text('backup_folder_path'),
  theme: text('theme', { enum: ['light', 'dark', 'system'] })
    .notNull()
    .default('system'),
  aiApiKeyEncrypted: text('ai_api_key_encrypted'),
  ...timestamps
})

// ---------------------------------------------------------------------------
// §3/§4 Clients
// ---------------------------------------------------------------------------

export const clients = sqliteTable('clients', {
  id: id(),
  fullName: text('full_name').notNull(),
  /** Manual, user-controlled — never overwritten automatically (§3). */
  status: text('status', { enum: ['red', 'yellow', 'green'] })
    .notNull()
    .default('red'),
  statusNote: text('status_note'),
  currentStage: text('current_stage', {
    enum: [
      'information',
      'documents',
      'verification',
      'evidence',
      'writing',
      'review',
      'finalization'
    ]
  })
    .notNull()
    .default('information'),
  targetIntakeDate: text('target_intake_date'),
  /** Hidden from the default dashboard view but not deleted — for finished cases. */
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  ...timestamps
})

/** One row per client, upserted on open — powers the "recently viewed" dashboard list. */
export const clientVisits = sqliteTable('client_visits', {
  clientId: text('client_id')
    .primaryKey()
    .references(() => clients.id, { onDelete: 'cascade' }),
  lastViewedAt: text('last_viewed_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
})

// ---------------------------------------------------------------------------
// §5 Information architecture
// ---------------------------------------------------------------------------

export const personalProfiles = sqliteTable('personal_profiles', {
  id: id(),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  contactInfo: text('contact_info'),
  residenceInfo: text('residence_info'),
  nextOfKin: text('next_of_kin'),
  familyInfo: text('family_info'),
  customFields: text('custom_fields'), // JSON
  ...timestamps
})

export const educationEntries = sqliteTable(
  'education_entries',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    level: text('level', {
      enum: ['primary', 'secondary', 'post_secondary']
    }),
    institution: text('institution'),
    course: text('course'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    qualification: text('qualification'),
    finalGrade: text('final_grade'),
    gradeBreakdown: text('grade_breakdown'), // JSON
    institutionContact: text('institution_contact'),
    clubsCertifications: text('clubs_certifications'),
    requiresVerification: integer('requires_verification', { mode: 'boolean' })
      .notNull()
      .default(false),
    customFields: text('custom_fields'), // JSON
    ...timestamps
  },
  (t) => [index('education_entries_client_idx').on(t.clientId)]
)

export const englishTestScores = sqliteTable(
  'english_test_scores',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    testDate: text('test_date'),
    overallScore: text('overall_score'),
    componentScores: text('component_scores'), // JSON: listening/reading/writing/speaking
    trfReference: text('trf_reference'),
    requiresVerification: integer('requires_verification', { mode: 'boolean' })
      .notNull()
      .default(false),
    customFields: text('custom_fields'),
    ...timestamps
  },
  (t) => [index('english_test_scores_client_idx').on(t.clientId)]
)

export const australianStudyEntries = sqliteTable(
  'australian_study_entries',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    institutionProvider: text('institution_provider'),
    course: text('course'),
    courseLevel: text('course_level'),
    coeReference: text('coe_reference'),
    offerLetterReference: text('offer_letter_reference'),
    intendedStartDate: text('intended_start_date'),
    customFields: text('custom_fields'),
    ...timestamps
  },
  (t) => [index('australian_study_entries_client_idx').on(t.clientId)]
)

export const employmentEntries = sqliteTable(
  'employment_entries',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    employer: text('employer'),
    jobTitle: text('job_title'),
    employmentType: text('employment_type'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    monthlySalary: text('monthly_salary'),
    duties: text('duties'),
    employerContact: text('employer_contact'),
    requiresVerification: integer('requires_verification', { mode: 'boolean' })
      .notNull()
      .default(false),
    customFields: text('custom_fields'),
    ...timestamps
  },
  (t) => [index('employment_entries_client_idx').on(t.clientId)]
)

export const immigrationHistoryEntries = sqliteTable(
  'immigration_history_entries',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    description: text('description'),
    dateFrom: text('date_from'),
    dateTo: text('date_to'),
    customFields: text('custom_fields'),
    ...timestamps
  },
  (t) => [index('immigration_history_entries_client_idx').on(t.clientId)]
)

/** §5 Financial/Sponsor — multiple sponsors per client (confirmed). */
export const sponsors = sqliteTable(
  'sponsors',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    relationshipToClient: text('relationship_to_client'),
    contactInfo: text('contact_info'),
    customFields: text('custom_fields'),
    ...timestamps
  },
  (t) => [index('sponsors_client_idx').on(t.clientId)]
)

/** Each sponsor can have multiple income/asset sources (confirmed). */
export const incomeSources = sqliteTable(
  'income_sources',
  {
    id: id(),
    sponsorId: text('sponsor_id')
      .notNull()
      .references(() => sponsors.id, { onDelete: 'cascade' }),
    type: text('type', {
      enum: ['salary', 'business', 'property', 'other']
    }).notNull(),
    description: text('description'),
    amount: text('amount'),
    requiresVerification: integer('requires_verification', { mode: 'boolean' })
      .notNull()
      .default(false),
    customFields: text('custom_fields'),
    ...timestamps
  },
  (t) => [index('income_sources_sponsor_idx').on(t.sponsorId)]
)

/** Field-level edit history for any information entry (§5 versioning — confirmed). */
export const informationFieldHistory = sqliteTable(
  'information_field_history',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(), // e.g. 'employment_entries'
    entityId: text('entity_id').notNull(),
    fieldName: text('field_name').notNull(),
    previousValue: text('previous_value'),
    newValue: text('new_value'),
    changedAt: text('changed_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString())
  },
  (t) => [index('information_field_history_entity_idx').on(t.entityType, t.entityId)]
)

// ---------------------------------------------------------------------------
// §6 Documents
// ---------------------------------------------------------------------------

export const documents = sqliteTable(
  'documents',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    category: text('category', {
      enum: [
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
    }).notNull(),
    customCategory: text('custom_category'),
    label: text('label').notNull(),
    /** Path relative to the client's document folder — see src/main/storage/paths.ts. */
    filePath: text('file_path').notNull(),
    notes: text('notes'),
    /** Self-referential: when a document is replaced, the new row points back at the old one. */
    replacesDocumentId: text('replaces_document_id'),
    isCurrentVersion: integer('is_current_version', { mode: 'boolean' }).notNull().default(true),
    ...timestamps
  },
  (t) => [
    index('documents_client_idx').on(t.clientId),
    index('documents_category_idx').on(t.clientId, t.category)
  ]
)

/** Links a document to a specific information entry (any entity table above). */
export const documentInformationLinks = sqliteTable(
  'document_information_links',
  {
    id: id(),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    ...timestamps
  },
  (t) => [index('document_information_links_document_idx').on(t.documentId)]
)

/** Links a document to another document (e.g. voucher <-> confirmation email). */
export const documentDocumentLinks = sqliteTable('document_document_links', {
  id: id(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  relatedDocumentId: text('related_document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  relationshipNote: text('relationship_note'),
  ...timestamps
})

/** Records a merge operation so a merged PDF stays traceable to its sources (§6/§13). */
export const documentMerges = sqliteTable('document_merges', {
  id: id(),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  resultDocumentId: text('result_document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  sourceDocumentIdsJson: text('source_document_ids_json').notNull(), // JSON array, ordered
  ...timestamps
})

// ---------------------------------------------------------------------------
// §7 Verification
// ---------------------------------------------------------------------------

export const verificationRecords = sqliteTable(
  'verification_records',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    /** What information entry this verifies. */
    subjectEntityType: text('subject_entity_type').notNull(),
    subjectEntityId: text('subject_entity_id').notNull(),
    whatIsBeingVerified: text('what_is_being_verified').notNull(),
    reason: text('reason'),
    contactName: text('contact_name'),
    contactDetails: text('contact_details'),
    method: text('method'),
    dateContacted: text('date_contacted'),
    status: text('status', {
      enum: ['not_required', 'pending', 'verified', 'could_not_verify']
    })
      .notNull()
      .default('pending'),
    response: text('response'),
    dateVerified: text('date_verified'),
    notes: text('notes'),
    ...timestamps
  },
  (t) => [
    index('verification_records_client_idx').on(t.clientId),
    index('verification_records_subject_idx').on(t.subjectEntityType, t.subjectEntityId)
  ]
)

/** Correspondence/documents attached as evidence to a verification record. */
export const verificationDocuments = sqliteTable('verification_documents', {
  id: id(),
  verificationRecordId: text('verification_record_id')
    .notNull()
    .references(() => verificationRecords.id, { onDelete: 'cascade' }),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  ...timestamps
})

// ---------------------------------------------------------------------------
// §8 Evidence
// ---------------------------------------------------------------------------

export const evidenceItems = sqliteTable(
  'evidence_items',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    source: text('source'),
    title: text('title').notNull(),
    url: text('url'),
    publicationInfo: text('publication_info'),
    excerpt: text('excerpt'),
    notes: text('notes'),
    provesWhat: text('proves_what'),
    /** Attached screenshot/PDF, uploaded by the user (no auto-fetch — confirmed). */
    documentId: text('document_id').references(() => documents.id, {
      onDelete: 'set null'
    }),
    ...timestamps
  },
  (t) => [index('evidence_items_client_idx').on(t.clientId)]
)

// ---------------------------------------------------------------------------
// §9 GSR writing environment
// ---------------------------------------------------------------------------

export const gsrDocuments = sqliteTable('gsr_documents', {
  id: id(),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('GSR'),
  status: text('status', {
    enum: ['drafting', 'in_review', 'finalized']
  })
    .notNull()
    .default('drafting'),
  ...timestamps
})

export const gsrSections = sqliteTable(
  'gsr_sections',
  {
    id: id(),
    gsrDocumentId: text('gsr_document_id')
      .notNull()
      .references(() => gsrDocuments.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    contentHtml: text('content_html'),
    ...timestamps
  },
  (t) => [index('gsr_sections_document_idx').on(t.gsrDocumentId)]
)

/** Individual claims within a section, addressable for evidence linking (§8/§9). */
export const gsrStatements = sqliteTable(
  'gsr_statements',
  {
    id: id(),
    gsrSectionId: text('gsr_section_id')
      .notNull()
      .references(() => gsrSections.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    ...timestamps
  },
  (t) => [index('gsr_statements_section_idx').on(t.gsrSectionId)]
)

/** Bidirectional statement <-> evidence relationship (confirmed critical, §8). */
export const gsrStatementEvidenceLinks = sqliteTable('gsr_statement_evidence_links', {
  id: id(),
  gsrStatementId: text('gsr_statement_id')
    .notNull()
    .references(() => gsrStatements.id, { onDelete: 'cascade' }),
  evidenceItemId: text('evidence_item_id')
    .notNull()
    .references(() => evidenceItems.id, { onDelete: 'cascade' }),
  ...timestamps
})

/** Automatic draft version snapshots (confirmed, §9). */
export const gsrDraftVersions = sqliteTable(
  'gsr_draft_versions',
  {
    id: id(),
    gsrDocumentId: text('gsr_document_id')
      .notNull()
      .references(() => gsrDocuments.id, { onDelete: 'cascade' }),
    snapshotJson: text('snapshot_json').notNull(), // full section/statement tree at save time
    label: text('label'), // optional manual milestone label
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString())
  },
  (t) => [index('gsr_draft_versions_document_idx').on(t.gsrDocumentId)]
)

// ---------------------------------------------------------------------------
// §12 Checklist / compliance
// ---------------------------------------------------------------------------

export const checklistDocuments = sqliteTable('checklist_documents', {
  id: id(),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  sourceDocumentId: text('source_document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  ...timestamps
})

export const checklistItems = sqliteTable(
  'checklist_items',
  {
    id: id(),
    checklistDocumentId: text('checklist_document_id')
      .notNull()
      .references(() => checklistDocuments.id, { onDelete: 'cascade' }),
    requirementText: text('requirement_text').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    ...timestamps
  },
  (t) => [index('checklist_items_document_idx').on(t.checklistDocumentId)]
)

export const checklistEvaluations = sqliteTable('checklist_evaluations', {
  id: id(),
  checklistItemId: text('checklist_item_id')
    .notNull()
    .references(() => checklistItems.id, { onDelete: 'cascade' }),
  gsrDocumentId: text('gsr_document_id')
    .notNull()
    .references(() => gsrDocuments.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['met', 'gap', 'unclear'] }).notNull(),
  aiNotes: text('ai_notes'),
  evaluatedAt: text('evaluated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
})

// ---------------------------------------------------------------------------
// Tagging (spans documents / evidence / GSR statements)
// ---------------------------------------------------------------------------

/** Free-text labels on any taggable entity — generic entityType/entityId, same pattern as document_information_links. */
export const entityTags = sqliteTable(
  'entity_tags',
  {
    id: id(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    entityType: text('entity_type', {
      enum: ['documents', 'evidence_items', 'gsr_statements']
    }).notNull(),
    entityId: text('entity_id').notNull(),
    label: text('label').notNull(),
    ...timestamps
  },
  (t) => [
    index('entity_tags_client_idx').on(t.clientId),
    index('entity_tags_entity_idx').on(t.entityType, t.entityId)
  ]
)

// ---------------------------------------------------------------------------
// Audit log (§18)
// ---------------------------------------------------------------------------

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: id(),
    clientId: text('client_id'),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
    detail: text('detail'), // JSON
    changedAt: text('changed_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString())
  },
  (t) => [index('audit_log_client_idx').on(t.clientId)]
)
