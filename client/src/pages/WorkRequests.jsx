import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { api } from '../features/auth/api'
import { useProjects } from '../features/projects/useProjects'
import { money } from '../features/billing/money'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

const tones = { pending: 'warning', accepted: 'success', declined: 'neutral', withdrawn: 'neutral' }
export default function WorkRequests() {
  const { workspace, user } = useAuth(),
    [box, setBox] = useState(workspace === 'freelancer' ? 'incoming' : 'outgoing'),
    [status, setStatus] = useState('all'),
    [pageState, setPage] = useState({ key: '', page: 1 })
  const [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const key = `${box}:${status}`,
    page = pageState.key === key ? pageState.page : 1
  const {
    data,
    loading,
    error: loadError,
    refresh,
  } = useProjects(
    new URLSearchParams({ box, status, page: String(page) }).toString(),
    '/work-requests',
  )
  async function respond() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api(`/work-requests/${selected.request.id}`, {
        method: 'PATCH',
        body: { version: selected.request.version, decision: selected.decision },
      })
      setSelected(null)
      refresh()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          Project enquiries
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Work requests</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          Manage project requests and client responses.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        {user.roles.includes('freelancer') && (
          <>
            <Button
              variant={box === 'incoming' ? 'primary' : 'secondary'}
              onClick={() => setBox('incoming')}
            >
              Incoming requests
            </Button>
            <Button
              variant={box === 'outgoing' ? 'primary' : 'secondary'}
              onClick={() => setBox('outgoing')}
            >
              My requests
            </Button>
          </>
        )}
        <label className="sr-only" htmlFor="request-status">
          Request status
        </label>
        <select
          id="request-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="min-h-11 rounded-xl border border-border bg-surface px-3"
        >
          <option value="all">All statuses</option>
          {Object.keys(tones).map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
        <Button variant="ghost" onClick={refresh}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <p role="status">Loading requests…</p>
      ) : loadError ? (
        <p role="alert">{loadError}</p>
      ) : data.requests.length === 0 ? (
        <Card>
          <h2 className="text-lg font-semibold">No requests found</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            {box === 'incoming'
              ? 'Publish your profile to receive work requests.'
              : 'Find a published freelancer and choose Send work request.'}
          </p>
          {box === 'outgoing' && (
            <Link
              to="/find-freelancer"
              className="mt-4 inline-flex text-sm font-semibold text-brand"
            >
              Find a freelancer →
            </Link>
          )}
        </Card>
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {data.requests.map((request) => (
            <li key={request.id}>
              <Card className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 wrap-break-word text-xl font-semibold">
                    {request.name}
                  </h2>
                  <Badge tone={tones[request.status]}>{request.status}</Badge>
                </div>
                <p className="text-xs text-brand">
                  {box === 'incoming'
                    ? `From ${request.clientName}`
                    : `To ${request.freelancerName}`}
                </p>
                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-muted">
                  {request.description}
                </p>
                <p className="text-xs text-muted">
                  Requested deadline: {request.dueDate} ·{' '}
                  {request.budgetCents
                    ? `Budget estimate: ${money(request.budgetCents, request.currency)}`
                    : 'Budget to discuss'}
                </p>
                <div className="flex flex-wrap gap-3">
                  {request.status === 'pending' &&
                    (box === 'incoming' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setError('')
                            setSelected({ request, decision: 'accepted' })
                          }}
                        >
                          Accept request
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setError('')
                            setSelected({ request, decision: 'declined' })
                          }}
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setError('')
                          setSelected({ request, decision: 'withdrawn' })
                        }}
                      >
                        Withdraw request
                      </Button>
                    ))}
                  {request.projectId && (
                    <Link
                      to={`${box === 'incoming' ? '/projects' : '/collaborations'}?project=${request.projectId}`}
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
                    >
                      Open project →
                    </Link>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {data && data.pagination.pages > 1 && (
        <nav aria-label="Request pages" className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage({ key, page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm">
            {page} / {data.pagination.pages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage({ key, page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
      <Modal
        open={Boolean(selected)}
        title={
          selected?.decision === 'accepted'
            ? 'Accept this request?'
            : selected?.decision === 'declined'
              ? 'Decline this request?'
              : 'Withdraw this request?'
        }
        onClose={() => {
          if (!busy) setSelected(null)
        }}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={respond}>
              {selected?.decision === 'accepted' ? 'Accept and create project' : 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-7 text-muted">
          {selected?.decision === 'accepted'
            ? 'Accept this request and create a shared project with the client.'
            : 'The request will remain in the history with its updated status.'}
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
      </Modal>
    </section>
  )
}
