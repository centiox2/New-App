/**
 * Simple window-level custom events used to trigger app-wide actions from
 * anywhere (keyboard shortcuts, command palette actions). These are
 * purposely decoupled from React context so any component — a page, a modal,
 * a palette — can fire them without needing to know who listens.
 */

export const APP_LOCK_EVENT = 'app:lock-request'
export const SHORTCUT_HELP_EVENT = 'app:shortcut-help-request'

/** Ask the AppLockGate to re-lock the app immediately (§19). */
export function requestAppLock(): void {
  window.dispatchEvent(new CustomEvent(APP_LOCK_EVENT))
}

/** Ask the ShortcutHelpModal to open its shortcuts reference. */
export function requestShortcutHelp(): void {
  window.dispatchEvent(new CustomEvent(SHORTCUT_HELP_EVENT))
}
