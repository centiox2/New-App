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
  ReplaceDocumentInput
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
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('clients:delete', id)
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
    open: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('documents:open', id)
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
