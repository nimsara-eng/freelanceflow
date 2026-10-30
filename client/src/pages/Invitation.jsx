import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Link2, UserRoundCheck } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { api } from '../features/auth/api'
import { useAuth } from '../features/auth/useAuth'

export default function Invitation() {
  const { hash } = useLocation()
  const { user, switchWorkspace } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress] = useState({ hash, token: hash.slice(1) })
  // The layout's Skip to content link changes only the anchor, not the invitation.
  if (address.hash !== hash) setAddress({ hash, token: hash === '#main-content' ? address.token : hash.slice(1) })
  const token = address.token
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState(null)
  const locked = useRef(false)
  const key = `${user.id}:${token}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    api('/collaboration/invitations/preview', { method: 'POST', body: { token }, signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ key, invitation: data.invitation })
    }).catch((failure) => { if (!controller.signal.aborted) setResult({ key, error: failure.message }) })
    return () => controller.abort()
  }, [token, key])
  const current = result?.key === key ? result : null
  const responseForToken = response?.token === token ? response : null
  async function respond(decision) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError('')
    try {
      const data = await api('/collaboration/invitations/respond', { method: 'POST', body: { token, decision } })
      setResponse({ ...data, token })
      // Remove the one-use secret from this tab after a successful response.
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    } catch (failure) { setError(failure.message) }
    finally { locked.current = false; setBusy(false) }
  }
  function openProjects() {
    switchWorkspace('client')
    navigate(responseForToken?.projectId ? `/collaborations?project=${responseForToken.projectId}` : '/collaborations', { replace: true })
  }
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">A new connection</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Project invitation</h1></header>
      <Card className="space-y-6">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">{responseForToken?.accepted ? <UserRoundCheck size={27} aria-hidden="true" /> : <Link2 size={27} aria-hidden="true" />}</span>
        {responseForToken ? <><h2 className="text-2xl font-semibold">{responseForToken.accepted ? 'Invitation accepted.' : 'Invitation declined.'}</h2><p role="status" className="text-sm leading-7 text-muted">{responseForToken.accepted ? 'You can now open this project from your Client workspace.' : 'This link is now closed. The freelancer can create a new invitation if needed.'}</p><Button onClick={openProjects}>{responseForToken.accepted ? 'Open project' : 'Go to my projects'}</Button></> : !current ? <p role="status" className="text-sm text-muted">Checking the invitation…</p> : current.error ? <><p role="alert" className="text-sm leading-7">{current.error}</p><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Check again</Button><Button onClick={() => navigate('/')}>Back to workspace</Button></div></> : <>
          <div><p className="text-sm leading-7 text-muted">{current.invitation.freelancerName} has invited you to</p><h2 className="mt-2 wrap-break-word text-2xl font-semibold">{current.invitation.projectName}</h2></div>
          <p className="inline-flex items-center gap-2 text-sm text-muted"><CalendarDays size={17} aria-hidden="true" />Deadline: {new Date(`${current.invitation.dueDate}T00:00:00`).toLocaleDateString()}</p>
          <p className="rounded-2xl bg-surface-2 p-4 text-sm leading-7 text-muted">Accept as <strong className="text-text">{user.displayName}</strong> to view the project’s brief, deadline and status. Accept only if you are the intended client. Declining closes this invitation.</p>
          <p className="text-xs leading-6 text-muted">Expires {new Date(current.invitation.expiresAt).toLocaleString()}. An invitation does not grant access to other projects.</p>
          {error && <p role="alert" className="text-sm leading-7 text-danger">{error}</p>}
          <div className="flex flex-wrap gap-3"><Button loading={busy} loadingText="Saving response…" onClick={() => respond('accept')}>Accept invitation</Button><Button variant="secondary" disabled={busy} onClick={() => respond('decline')}>Decline invitation</Button></div>
        </>}
      </Card>
    </section>
  )
}
