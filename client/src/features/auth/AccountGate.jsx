import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { useAuth } from './useAuth'

export function SessionStatus() {
  const { status, error, refresh } = useAuth()
  const [title, description] = status === 'error'
    ? ['Unable to open workspace', error]
    : ['Opening your workspace', 'Loading account…']
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">FreelanceFlow</p>
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        <p role={status === 'error' ? 'alert' : 'status'} className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
        {status === 'error' && <Button className="mt-6" onClick={refresh}>Try again</Button>}
      </div>
    </main>
  )
}

export default function AccountGate({ freelancerOnly = false }) {
  const { status, user, workspace } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'error') return <SessionStatus />
  if (status !== 'authenticated') {
    const next = encodeURIComponent(location.pathname + location.search + location.hash)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (freelancerOnly && (!user.roles.includes('freelancer') || workspace !== 'freelancer')) return <Navigate to="/" replace />
  return <Outlet key={user.id} />
}
