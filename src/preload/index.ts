import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ClientWithProgress,
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
  AppLockState,
  SetupPasswordInput,
  UnlockInput
} from '../shared/ipc-types'

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
