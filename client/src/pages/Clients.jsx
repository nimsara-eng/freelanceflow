import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../features/projects/useProjects'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
export default function Clients() {
  const [search, setSearch] = useState(''),
    [q, setQ] = useState(''),
    [activity, setActivity] = useState('all'),
    [pageState, setPage] = useState({ key: '', page: 1 })
  const key = `${q}:${activity}`,
    page = pageState.key === key ? pageState.page : 1
  const { data, loading, error, refresh } = useProjects(
    new URLSearchParams({ q, activity, page: String(page) }).toString(),
    '/clients',
  )
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Client management</p>
        <h1 className="mt-3 text-4xl font-semibold">Clients</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          Clients connected to your projects.
        </p>
      </header>
      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setQ(search.trim())
          }}
          className="grid items-end gap-4 sm:grid-cols-[1fr_auto_auto]"
        >
          <Input
            label="Search clients"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={100}
          />
          <div>
            <label htmlFor="client-activity" className="mb-2 block text-sm font-medium">
              Project activity
            </label>
            <select
              id="client-activity"
              value={activity}
              onChange={(event) => setActivity(event.target.value)}
              className="min-h-11 rounded-xl border border-border bg-surface px-3"
            >
              <option value="all">All clients</option>
              <option value="ongoing">With ongoing work</option>
              <option value="completed">With completed work</option>
            </select>
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>
      <Button variant="ghost" onClick={refresh}>
        Refresh clients
      </Button>
      {loading ? (
        <p role="status">Loading connected clients…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : data.clients.length === 0 ? (
        <Card>
          <h2 className="text-lg font-semibold">No clients yet</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Accept a work request or invite a client to a project.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.clients.map((client) => (
            <li key={client.id}>
              <Card>
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 font-semibold text-brand"
                >
                  {client.name.slice(0, 1)}
                </span>
                <h2 className="mt-5 wrap-break-word text-xl font-semibold">{client.name}</h2>
                <p className="mt-2 text-xs text-muted">{client.projects} connected projects</p>
                <dl className="my-5 grid grid-cols-2 gap-4 border-y border-border py-4">
                  <div>
                    <dt className="text-xs text-muted">Ongoing</dt>
                    <dd className="mt-2 text-2xl font-semibold">{client.ongoing}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Completed</dt>
                    <dd className="mt-2 text-2xl font-semibold">{client.completed}</dd>
                  </div>
                </dl>
                <Link
                  to={`/projects?clientId=${client.id}`}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
                >
                  View client projects →
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {data && data.pagination.pages > 1 && (
        <nav aria-label="Client pages" className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage({ key, page: page - 1 })}
          >
            Previous
          </Button>
          <span>
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
    </section>
  )
}
