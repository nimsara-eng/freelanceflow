import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, SearchX } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { sampleProjects } from '../features/dashboard/sampleProjects'

const sampleClients = [...new Set(
  sampleProjects.map((project) => project.client),
)]
  .map((name) => ({
    name,
    projects: sampleProjects.filter(
      (project) => project.client === name,
    ),
  }))
  .sort((first, second) => first.name.localeCompare(second.name))

const projectStatuses = {
  active: { label: 'In progress', tone: 'brand' },
  review: { label: 'Awaiting review', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
}

export default function Clients() {
  const navigate = useNavigate()
  const filterId = useId()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedClient, setSelectedClient] = useState(null)

  const searchTerm = search.trim().toLowerCase()

  const visibleClients = sampleClients.filter((client) => {
    const matchesSearch = client.name
      .toLowerCase()
      .includes(searchTerm)

    const matchesFilter =
      filter === 'all' ||
      client.projects.some((project) =>
        filter === 'ongoing'
          ? project.status !== 'completed'
          : project.status === 'completed',
      )

    return matchesSearch && matchesFilter
  })

  function clearFilters() {
    setSearch('')
    setFilter('all')
  }

  function viewProjects(clientName) {
    const params = new URLSearchParams({ client: clientName })
    navigate(`/projects?${params.toString()}`)
  }

  return (
    <section className="space-y-7">
      <header>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Your network
        </p>

        <h1 className="text-4xl font-semibold tracking-tight">
          Clients
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Keep your client relationships and their project work
          connected in one place.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="warning" dot>
          Sample workspace
        </Badge>

        <p className="text-xs text-muted">
          Clients linked to your example projects.
        </p>
      </div>

      <Card>
        <div className="grid items-end gap-4 md:grid-cols-[1fr_15rem]">
          <Input
            type="search"
            label="Search clients"
            placeholder="Search by client name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div>
            <label
              htmlFor={filterId}
              className="mb-2 block text-sm font-medium"
            >
              Project activity
            </label>

            <select
              id={filterId}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text sm:text-sm"
            >
              <option value="all">All clients</option>
              <option value="ongoing">With ongoing work</option>
              <option value="completed">With completed projects</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          Showing {visibleClients.length} of {sampleClients.length} clients
        </p>

        {(search || filter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset filters
          </Button>
        )}
      </div>

      {visibleClients.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<SearchX size={24} />}
            title="No matching clients"
            description="Try another name or change the activity filter."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {visibleClients.map((client) => {
            const ongoing = client.projects.filter(
              (project) => project.status !== 'completed',
            ).length

            const completed = client.projects.length - ongoing

            return (
              <li key={client.name} className="min-w-0">
                <Card className="flex h-full flex-col">
                  <span
                    aria-hidden="true"
                    className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-lg font-semibold text-brand"
                  >
                    {getInitials(client.name)}
                  </span>

                  <h2 className="mt-5 wrap-break-word text-xl font-semibold tracking-tight">
                    {client.name}
                  </h2>

                  <p className="mt-2 text-sm text-muted">
                    {client.projects.length}{' '}
                    {client.projects.length === 1 ? 'linked project' : 'linked projects'}
                  </p>

                  <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
                    <div>
                      <dt className="text-xs text-muted">
                        Ongoing
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold tabular-nums">
                        {ongoing}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted">
                        Completed
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold tabular-nums">
                        {completed}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`View ${client.name} details`}
                      onClick={() => setSelectedClient(client)}
                    >
                      View client
                    </Button>

                    <Button
                      size="sm"
                      aria-label={`View projects for ${client.name}`}
                      onClick={() => viewProjects(client.name)}
                    >
                      Projects
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.name ?? 'Client details'}
        description="Sample client overview"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSelectedClient(null)}
            >
              Close
            </Button>

            {selectedClient && (
              <Button onClick={() => viewProjects(selectedClient.name)}>
                View projects
                <ArrowUpRight size={16} aria-hidden="true" />
              </Button>
            )}
          </>
        }
      >
        {selectedClient && (
          <div>
            <h3 className="text-sm font-semibold">
              Linked projects
            </h3>

            <ul className="mt-4 divide-y divide-border">
              {selectedClient.projects.map((project) => {
                const details = projectStatuses[project.status]

                return (
                  <li
                    key={project.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <span className="text-sm font-medium">
                      {project.name}
                    </span>

                    <Badge tone={details.tone} dot>
                      {details.label}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </Modal>
    </section>
  )
}