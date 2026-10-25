import { useId, useState } from 'react'
import { ArrowUpRight, CalendarDays, SearchX } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { sampleProjects } from '../features/dashboard/sampleProjects'
import { useSearchParams } from 'react-router-dom'

const statuses = {
  active: { label: 'In progress', tone: 'brand' },
  review: { label: 'Awaiting review', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function Progress({ project }) {
  const percentage = project.totalTasks > 0
    ? Math.round(
        (project.completedTasks / project.totalTasks) * 100,
      )
    : 0

  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-xs text-muted">
        <span>
          {project.completedTasks} of {project.totalTasks} tasks
        </span>

        <span>{percentage}%</span>
      </div>

      <div
        role="progressbar"
        aria-label={`${project.name} completion`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-1.5 overflow-hidden rounded-full bg-brand/10"
      >
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function Projects() {
  const generatedId = useId()
  const [searchParams, setSearchParams] = useSearchParams()
  const clientFilter = searchParams.get('client')?.trim() ?? ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('due-date')
  const [selectedProject, setSelectedProject] = useState(null)

  const searchTerm = search.trim().toLowerCase()

  const visibleProjects = sampleProjects
    .filter((project) => {
      const matchesSearch =
        `${project.name} ${project.client}`
          .toLowerCase()
          .includes(searchTerm)

      const matchesStatus =
        status === 'all' || project.status === status

      const matchesClient =
        !clientFilter ||
        project.client.toLowerCase() === clientFilter.toLowerCase()

      return matchesSearch && matchesStatus && matchesClient
    })
    .sort((first, second) => {
      if (sort === 'name') {
        return first.name.localeCompare(second.name)
      }

      return first.dueDate.localeCompare(second.dueDate)
    })

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setSort('due-date')

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete('client')
      return nextParams
    })
  }

  return (
    <section className="space-y-7">
      <header>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Your workspace
        </p>

        <h1 className="text-4xl font-semibold tracking-tight">
          Projects
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          A clear view of what you are working on, what needs
          review, and what is ready to deliver.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="warning" dot>
          Sample workspace
        </Badge>

        {clientFilter && (
          <Badge tone="brand">
            Client: {clientFilter}
          </Badge>
        )}

        <p className="text-xs text-muted">
          The same example projects shown on your dashboard.
        </p>
      </div>

      <Card>
        <form
          role="search"
          aria-label="Filter projects"
          onSubmit={(event) => event.preventDefault()}
          className="grid items-end gap-4 md:grid-cols-[1fr_11rem_11rem]"
        >
          <Input
            type="search"
            label="Search projects"
            placeholder="Search by project or client"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div>
            <label
              htmlFor={`${generatedId}-status`}
              className="mb-2 block text-sm font-medium"
            >
              Status
            </label>

            <select
              id={`${generatedId}-status`}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text sm:text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">In progress</option>
              <option value="review">Awaiting review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={`${generatedId}-sort`}
              className="mb-2 block text-sm font-medium"
            >
              Sort by
            </label>

            <select
              id={`${generatedId}-sort`}
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text sm:text-sm"
            >
              <option value="due-date">Due date</option>
              <option value="name">Project name</option>
            </select>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          Showing {visibleProjects.length} of {sampleProjects.length} projects
        </p>

        {(search || status !== 'all' || sort !== 'due-date' || clientFilter) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset filters
          </Button>
        )}
      </div>

      {visibleProjects.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<SearchX size={24} />}
            title="No matching projects"
            description="Try another search or choose a different status."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {visibleProjects.map((project) => {
            const details = statuses[project.status]

            return (
              <li key={project.id} className="min-w-0">
                <Card className="flex h-full flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-xl font-semibold text-brand"
                    >
                      {project.client.charAt(0)}
                    </span>

                    <Badge tone={details.tone} dot>
                      {details.label}
                    </Badge>
                  </div>

                  <h2 className="mt-5 wrap-break-word text-xl font-semibold tracking-tight">
                    {project.name}
                  </h2>

                  <p className="mt-1 text-xs font-medium text-brand">
                    {project.client}
                  </p>

                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    {project.description}
                  </p>

                  <div className="mt-auto pt-6">
                    <Progress project={project} />

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                      <span className="inline-flex items-center gap-2 text-xs text-muted">
                        <CalendarDays size={15} aria-hidden="true" />
                        {formatDate(project.dueDate)}
                      </span>

                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`View ${project.name}`}
                        onClick={() => setSelectedProject(project)}
                      >
                        View project
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        title={selectedProject?.name ?? 'Project details'}
        description="Sample project details"
        footer={
          <Button
            variant="secondary"
            onClick={() => setSelectedProject(null)}
          >
            Close
          </Button>
        }
      >
        {selectedProject && (
          <div className="space-y-6">
            <Badge
              tone={statuses[selectedProject.status].tone}
              dot
            >
              {statuses[selectedProject.status].label}
            </Badge>

            <p className="text-sm leading-relaxed text-muted">
              {selectedProject.description}
            </p>

            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Client</dt>
                <dd className="mt-1 text-sm font-medium">
                  {selectedProject.client}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted">Due date</dt>
                <dd className="mt-1 text-sm font-medium">
                  {formatDate(selectedProject.dueDate)}
                </dd>
              </div>
            </dl>

            <Progress project={selectedProject} />
          </div>
        )}
      </Modal>
    </section>
  )
}