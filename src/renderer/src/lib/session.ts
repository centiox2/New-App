/**
 * Lightweight, localStorage-persisted UI session state:
 *
 * - "Open tabs": the set of clients you have open, shared between the
 *   dashboard and client workspaces (browser-tab style navigation).
 * - "Last session": where you were when you closed the app, so the
 *   dashboard can offer a one-click "continue where you left off".
 *
 * Renderer-only convenience — no main-process involvement, and it never
 * touches client data (just IDs and display names for navigation).
 */

export interface ClientTab {
  clientId: string
  fullName: string
}

export interface LastSession {
  clientId: string
  stage: string
}

const TABS_KEY = 'gsr.openTabs'
const SESSION_KEY = 'gsr.lastSession'
const MAX_TABS = 12

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Tabs in open order; drops anything malformed and caps the count. */
export function loadTabs(): ClientTab[] {
  const tabs = readJson<ClientTab[]>(TABS_KEY)
  if (!Array.isArray(tabs)) return []
  return tabs
    .filter((t) => t && typeof t.clientId === 'string' && typeof t.fullName === 'string')
    .slice(0, MAX_TABS)
}

export function saveTabs(tabs: ClientTab[]): void {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs.slice(0, MAX_TABS)))
  } catch {
    // Storage full/disabled — the app still works, tabs just don't persist.
  }
}

/** Adds a tab if missing (refreshing its name), keeps existing position. */
export function upsertTab(tabs: ClientTab[], tab: ClientTab): ClientTab[] {
  const index = tabs.findIndex((t) => t.clientId === tab.clientId)
  const next = index >= 0 ? [...tabs] : [...tabs, tab]
  if (index >= 0) next[index] = tab
  return next.slice(-MAX_TABS)
}

export function removeTab(tabs: ClientTab[], clientId: string): ClientTab[] {
  return tabs.filter((t) => t.clientId !== clientId)
}

export function loadLastSession(): LastSession | null {
  const session = readJson<LastSession>(SESSION_KEY)
  if (!session || typeof session.clientId !== 'string' || typeof session.stage !== 'string') {
    return null
  }
  return session
}

export function saveLastSession(session: LastSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Ignore — persistence is best-effort.
  }
}

export function clearLastSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore.
  }
}
