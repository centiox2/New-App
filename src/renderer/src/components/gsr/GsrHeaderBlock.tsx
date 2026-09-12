import { useEffect, useState } from 'react'
import type { AustralianStudyEntry, ClientWithProgress, PersonalProfile } from '@shared/ipc-types'
import { formatDate } from '../../lib/format'

/**
 * Auto-populated cover header for the GSR — name, DOB, passport number,
 * intended course and provider — pulled from the client's own Information
 * data instead of retyped, matching the header block every real GSR
 * statement opens with. Read-only here; missing fields link back to where
 * to fill them in rather than blocking the writing view.
 */
export function GsrHeaderBlock({ clientId }: { clientId: string }): React.JSX.Element | null {
  const [client, setClient] = useState<ClientWithProgress | null>(null)
  const [profile, setProfile] = useState<PersonalProfile | null>(null)
  const [studyEntry, setStudyEntry] = useState<AustralianStudyEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    Promise.all([
      window.api.clients.get(clientId),
      window.api.information.personal.get(clientId),
      window.api.information.australianStudy.list(clientId)
    ])
      .then(([c, p, studies]) => {
        if (cancelled) return
        setClient(c)
        setProfile(p)
        setStudyEntry(studies[0] ?? null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (loading || !client) return null

  const missing = !profile?.dateOfBirth || !profile?.passportNumber || !studyEntry

  return (
    <div className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4">
      <p className="text-sm font-semibold">{client.fullName}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--md-on-surface-variant)] sm:grid-cols-4">
        <div>
          <dt className="opacity-70">Date of birth</dt>
          <dd className="text-[var(--md-on-surface)]">
            {profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : '—'}
          </dd>
        </div>
        <div>
          <dt className="opacity-70">Passport number</dt>
          <dd className="text-[var(--md-on-surface)]">{profile?.passportNumber || '—'}</dd>
        </div>
        <div>
          <dt className="opacity-70">Course</dt>
          <dd className="text-[var(--md-on-surface)]">{studyEntry?.course || '—'}</dd>
        </div>
        <div>
          <dt className="opacity-70">Provider</dt>
          <dd className="text-[var(--md-on-surface)]">{studyEntry?.institutionProvider || '—'}</dd>
        </div>
      </dl>
      {missing && (
        <p className="mt-2 text-[11px] text-[var(--status-yellow)]">
          Some header details are missing — fill them in on the Information tab (Personal /
          Australian Study) and they&apos;ll appear here and in exports automatically.
        </p>
      )}
    </div>
  )
}
