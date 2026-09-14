import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { APP_LOCK_EVENT } from '../lib/appEvents'

type Phase = 'loading' | 'setup' | 'locked' | 'unlocked'

/**
 * App-level password lock (§18/§19 — confirmed: password gate, no disk
 * encryption). First launch prompts to set a password; every subsequent
 * launch requires it before any client data is reachable.
 */
export function AppLockGate({ children }: { children: ReactNode }): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('loading')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.api.settings.lockState().then((state) => {
      setPhase(state.isConfigured ? 'locked' : 'setup')
    })
  }, [])

  // Ctrl/Cmd+L (or the palette's "Lock app" action) re-locks immediately
  // without losing anything — client data stays where it is, we just gate it.
  useEffect(() => {
    const onLockRequest = (): void => {
      setPhase('locked')
      setPassword('')
      setError(null)
    }
    window.addEventListener(APP_LOCK_EVENT, onLockRequest)
    return () => window.removeEventListener(APP_LOCK_EVENT, onLockRequest)
  }, [])

  async function handleSetup(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await window.api.settings.setupPassword({ password })
      setPhase('unlocked')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up password.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUnlock(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await window.api.settings.unlock({ password })
      if (result.ok) {
        setPhase('unlocked')
      } else {
        setError('Incorrect password.')
        setPassword('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center text-sm opacity-60">Loading…</div>
    )
  }

  if (phase === 'unlocked') {
    return <>{children}</>
  }

  const isSetup = phase === 'setup'

  return (
    <div
      className="app-drag-region flex h-screen items-center justify-center"
      style={{ backgroundColor: 'var(--md-surface)' }}
    >
      <form
        onSubmit={isSetup ? handleSetup : handleUnlock}
        className="app-no-drag w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: 'var(--md-surface-container-high)',
          boxShadow: 'var(--md-elevation-2)'
        }}
      >
        <h1 className="mb-1 text-xl font-semibold">GSR Case Manager</h1>
        <p className="mb-6 text-sm text-[var(--md-on-surface-variant)]">
          {isSetup
            ? 'Set a password to protect client data on this device.'
            : 'Enter your password to continue.'}
        </p>
        <div className="flex flex-col gap-4">
          <TextField
            label="Password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isSetup && (
            <TextField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}
          {error && <p className="text-sm text-[var(--md-error)]">{error}</p>}
          <Button type="submit" disabled={submitting || !password}>
            {isSetup ? 'Set password' : 'Unlock'}
          </Button>
        </div>
      </form>
    </div>
  )
}
