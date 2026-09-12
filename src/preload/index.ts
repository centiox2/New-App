import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ClientWithProgress,
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
  AppLockState,
  SetupPasswordInput,
  UnlockInput,
  PersonalProfile,
  EducationEntry,
  EnglishTestScore,
  AustralianStudyEntry,
  EmploymentEntry,
  ImmigrationHistoryEntry,
  Sponsor,
  IncomeSource,
  DocumentRecord,
  PickedFile,
  CreateDocumentInput,
  UpdateDocumentInput,
  ReplaceDocumentInput,
  VerificationRecord,
  VerifiableItem,
  CreateVerificationRecordInput,
  UpdateVerificationRecordInput,
  EvidenceItem,
  CreateEvidenceInput,
  UpdateEvidenceInput,
  GsrDocument,
  GsrSection,
  GsrStatementWithEvidence,
  ReviewSummary,
  ChecklistDocument,
  ExportResult,
  MergeResult,
  GsrDocumentStatus,
  InformationEntityType,
  InformationEntityOption,
  DocumentInformationLink,
  BacklinkItem,
  QuickSearchResult,
  GlobalSearchResult,
  CaseGraph,
  RecentClient,
  EntityTag,
  TaggableEntityType
} from '../shared/ipc-types'

/** Typed list/create/update/delete client for one information-section channel. */
function makeCrudApi<T extends { id: string }>(
  channel: string
): {
  list: (parentId: string) => Promise<T[]>
  create: (parentId: string, data: Partial<T>) => Promise<T>
  update: (id: string, data: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<{ ok: true }>
} {
  return {
    list: (parentId) => ipcRenderer.invoke(`${channel}:list`, parentId),
    create: (parentId, data) => ipcRenderer.invoke(`${channel}:create`, { parentId, data }),
    update: (id, data) => ipcRenderer.invoke(`${channel}:update`, { id, data }),
    delete: (id) => ipcRenderer.invoke(`${channel}:delete`, id)
  }
}

const api = {
  clients: {
    list: (query?: ListClientsQuery): Promise<ClientWithProgress[]> =>
      ipcRenderer.invoke('clients:list', query),
    get: (id: string): Promise<ClientWithProgress | null> => ipcRenderer.invoke('clients:get', id),
    create: (input: CreateClientInput): Promise<ClientWithProgress> =>
      ipcRenderer.invoke('clients:create', input),
    update: (input: UpdateClientInput): Promise<ClientWithProgress> =>
      ipcRenderer.invoke('clients:update', input),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('clients:delete', id),
    recordVisit: (clientId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke('clients:recordVisit', clientId),
    recentlyViewed: (limit?: number): Promise<RecentClient[]> =>
      ipcRenderer.invoke('clients:recentlyViewed', limit)
  },
  settings: {
    lockState: (): Promise<AppLockState> => ipcRenderer.invoke('settings:lockState'),
    setupPassword: (input: SetupPasswordInput): Promise<{ ok: true }> =>
      ipcRenderer.invoke('settings:setupPassword', input),
    unlock: (
      input: UnlockInput
    ): Promise<{ ok: boolean; reason?: 'not_configured' | 'wrong_password' }> =>
      ipcRenderer.invoke('settings:unlock', input)
  },
  information: {
    personal: {
      get: (clientId: string): Promise<PersonalProfile> =>
        ipcRenderer.invoke('information:personal:get', clientId),
      update: (clientId: string, data: Partial<PersonalProfile>): Promise<PersonalProfile> =>
        ipcRenderer.invoke('information:personal:update', { clientId, data })
    },
    education: makeCrudApi<EducationEntry>('information:education'),
    englishTest: makeCrudApi<EnglishTestScore>('information:englishTest'),
    australianStudy: makeCrudApi<AustralianStudyEntry>('information:australianStudy'),
    employment: makeCrudApi<EmploymentEntry>('information:employment'),
    immigration: makeCrudApi<ImmigrationHistoryEntry>('information:immigration'),
    sponsor: makeCrudApi<Sponsor>('information:sponsor'),
    incomeSource: makeCrudApi<IncomeSource>('information:incomeSource')
  },
  documents: {
    list: (clientId: string): Promise<DocumentRecord[]> =>
      ipcRenderer.invoke('documents:list', clientId),
    pickFile: (): Promise<PickedFile | null> => ipcRenderer.invoke('documents:pickFile'),
    create: (input: CreateDocumentInput): Promise<DocumentRecord> =>
      ipcRenderer.invoke('documents:create', input),
    update: (input: UpdateDocumentInput): Promise<DocumentRecord> =>
      ipcRenderer.invoke('documents:update', input),
    replace: (input: ReplaceDocumentInput): Promise<DocumentRecord> =>
      ipcRenderer.invoke('documents:replace', input),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('documents:delete', id),
    open: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('documents:open', id),
    readFile: (id: string): Promise<Uint8Array> => ipcRenderer.invoke('documents:readFile', id)
  },
  verification: {
    itemsNeedingVerification: (clientId: string): Promise<VerifiableItem[]> =>
      ipcRenderer.invoke('verification:itemsNeedingVerification', clientId),
    list: (clientId: string): Promise<VerificationRecord[]> =>
      ipcRenderer.invoke('verification:list', clientId),
    create: (input: CreateVerificationRecordInput): Promise<VerificationRecord> =>
      ipcRenderer.invoke('verification:create', input),
    update: (input: UpdateVerificationRecordInput): Promise<VerificationRecord> =>
      ipcRenderer.invoke('verification:update', input),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('verification:delete', id),
    listDocuments: (
      verificationRecordId: string
    ): Promise<{ document: DocumentRecord; linkId: string }[]> =>
      ipcRenderer.invoke('verification:listDocuments', verificationRecordId),
    linkDocument: (args: {
      verificationRecordId: string
      documentId: string
    }): Promise<{ id: string }> => ipcRenderer.invoke('verification:linkDocument', args),
    unlinkDocument: (linkId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke('verification:unlinkDocument', linkId)
  },
  evidence: {
    list: (clientId: string): Promise<EvidenceItem[]> =>
      ipcRenderer.invoke('evidence:list', clientId),
    create: (input: CreateEvidenceInput): Promise<EvidenceItem> =>
      ipcRenderer.invoke('evidence:create', input),
    update: (input: UpdateEvidenceInput): Promise<EvidenceItem> =>
      ipcRenderer.invoke('evidence:update', input),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('evidence:delete', id),
    attachFile: (evidenceId: string): Promise<EvidenceItem> =>
      ipcRenderer.invoke('evidence:attachFile', evidenceId),
    removeFile: (evidenceId: string): Promise<EvidenceItem> =>
      ipcRenderer.invoke('evidence:removeFile', evidenceId)
  },
  gsr: {
    getOrCreateDocument: (clientId: string): Promise<GsrDocument> =>
      ipcRenderer.invoke('gsr:getOrCreateDocument', clientId),
    listSections: (gsrDocumentId: string): Promise<GsrSection[]> =>
      ipcRenderer.invoke('gsr:listSections', gsrDocumentId),
    createSection: (gsrDocumentId: string, title: string): Promise<GsrSection> =>
      ipcRenderer.invoke('gsr:createSection', { gsrDocumentId, title }),
    updateSection: (
      args: { id: string } & Partial<Pick<GsrSection, 'title' | 'contentHtml' | 'orderIndex'>>
    ): Promise<GsrSection> => ipcRenderer.invoke('gsr:updateSection', args),
    deleteSection: (id: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke('gsr:deleteSection', id),
    reorderSections: (orderedIds: string[]): Promise<{ ok: true }> =>
      ipcRenderer.invoke('gsr:reorderSections', orderedIds),
    listStatements: (sectionId: string): Promise<GsrStatementWithEvidence[]> =>
      ipcRenderer.invoke('gsr:listStatements', sectionId),
    createStatement: (sectionId: string, text: string): Promise<GsrStatementWithEvidence> =>
      ipcRenderer.invoke('gsr:createStatement', { sectionId, text }),
    updateStatement: (id: string, text: string): Promise<GsrStatementWithEvidence> =>
      ipcRenderer.invoke('gsr:updateStatement', { id, text }),
    deleteStatement: (id: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke('gsr:deleteStatement', id),
    linkEvidence: (statementId: string, evidenceItemId: string): Promise<{ id: string }> =>
      ipcRenderer.invoke('gsr:linkEvidence', { statementId, evidenceItemId }),
    unlinkEvidence: (linkId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke('gsr:unlinkEvidence', linkId)
  },
  review: {
    getSummary: (clientId: string): Promise<ReviewSummary> =>
      ipcRenderer.invoke('review:getSummary', clientId)
  },
  checklist: {
    get: (clientId: string): Promise<ChecklistDocument | null> =>
      ipcRenderer.invoke('checklist:get', clientId),
    upload: (clientId: string): Promise<ChecklistDocument | null> =>
      ipcRenderer.invoke('checklist:upload', clientId),
    remove: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('checklist:remove', id)
  },
  finalization: {
    getStatus: (clientId: string): Promise<GsrDocumentStatus> =>
      ipcRenderer.invoke('finalization:getStatus', clientId),
    setStatus: (clientId: string, status: GsrDocumentStatus): Promise<GsrDocumentStatus> =>
      ipcRenderer.invoke('finalization:setStatus', { clientId, status }),
    exportWord: (clientId: string): Promise<ExportResult> =>
      ipcRenderer.invoke('finalization:exportWord', clientId),
    exportPdf: (clientId: string): Promise<ExportResult> =>
      ipcRenderer.invoke('finalization:exportPdf', clientId),
    mergeEvidencePack: (clientId: string): Promise<MergeResult> =>
      ipcRenderer.invoke('finalization:mergeEvidencePack', clientId),
    openExportsFolder: (clientId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke('finalization:openExportsFolder', clientId),
    revealFile: (path: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke('finalization:revealFile', path)
  },
  links: {
    listInformationOptions: (
      clientId: string,
      entityType: InformationEntityType
    ): Promise<InformationEntityOption[]> =>
      ipcRenderer.invoke('links:listInformationOptions', { clientId, entityType }),
    listForDocument: (documentId: string): Promise<DocumentInformationLink[]> =>
      ipcRenderer.invoke('links:listForDocument', documentId),
    linkDocumentToInformation: (args: {
      documentId: string
      entityType: InformationEntityType
      entityId: string
    }): Promise<DocumentInformationLink> =>
      ipcRenderer.invoke('links:linkDocumentToInformation', args),
    unlinkDocumentInformation: (linkId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke('links:unlinkDocumentInformation', linkId),
    backlinksForEntity: (args: { entityType: string; entityId: string }): Promise<BacklinkItem[]> =>
      ipcRenderer.invoke('links:backlinksForEntity', args)
  },
  search: {
    quickSearch: (clientId: string, query: string): Promise<QuickSearchResult[]> =>
      ipcRenderer.invoke('search:quickSearch', { clientId, query }),
    globalSearch: (query: string): Promise<GlobalSearchResult[]> =>
      ipcRenderer.invoke('search:globalSearch', query)
  },
  graph: {
    forClient: (clientId: string): Promise<CaseGraph> =>
      ipcRenderer.invoke('graph:forClient', clientId)
  },
  tags: {
    listForClientEntityType: (
      clientId: string,
      entityType: TaggableEntityType
    ): Promise<EntityTag[]> =>
      ipcRenderer.invoke('tags:listForClientEntityType', { clientId, entityType }),
    add: (args: {
      clientId: string
      entityType: TaggableEntityType
      entityId: string
      label: string
    }): Promise<EntityTag> => ipcRenderer.invoke('tags:add', args),
    remove: (tagId: string): Promise<{ ok: true }> => ipcRenderer.invoke('tags:remove', tagId)
  }
}

export type Api = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
