import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCheck,
  FolderKanban,
  MessageSquare,
  SearchX,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { sampleProjects } from '../features/dashboard/sampleProjects'

const statusDetails = {
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

function ProjectProgress({ project }) {
  const percentage = Math.round(
    (project.completedTasks / project.totalTasks) * 100,
  )

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
        aria-label={`${project.name} tasks completed`}
        aria-valuemin={0}
        aria-valuemax={project.totalTasks}
        aria-valuenow={project.completedTasks}
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

export default function Dashboard() {
  const navigate = useNavigate()
  const filterId = useId()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedProject, setSelectedProject] = useState(null)

  const featuredProject = sampleProjects[0]
  const searchTerm = search.trim().toLowerCase()

  const filteredProjects = sampleProjects.filter((project) => {
    const matchesSearch =
      `${project.name} ${project.client}`
        .toLowerCase()
        .includes(searchTerm)

    const matchesStatus =
      status === 'all' || project.status === status

    return matchesSearch && matchesStatus
  })

  const statistics = [
    {
      label: 'Total projects',
      value: sampleProjects.length,
      icon: FolderKanban,
    },
    {
      label: 'Awaiting review',
      value: sampleProjects.filter(
        (project) => project.status === 'review',
      ).length,
      icon: MessageSquare,
    },
    {
      label: 'Completed',
      value: sampleProjects.filter(
        (project) => project.status === 'completed',
      ).length,
      icon: CheckCheck,
    },
  ]

  function clearFilters() {
    setSearch('')
    setStatus('all')
  }

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Freelancer workspace
          </p>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Less admin.
            <br />
            More creating.
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
            A clearer view of your projects, client reviews, and next steps.
          </p>
        </div>

        <Button onClick={() => navigate('/projects')}>
          View projects
          <ArrowUpRight size={17} aria-hidden="true" />
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="warning" dot>
          Sample workspace
        </Badge>

        <p className="text-xs text-muted">
          Example projects for exploring the dashboard design.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {statistics.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <dt className="flex items-center justify-between gap-3 text-sm text-muted">
              {label}

              <Icon
                size={19}
                aria-hidden="true"
                className="text-brand"
              />
            </dt>

            <dd className="mt-5 text-4xl font-semibold tracking-tight tabular-nums">
              {String(value).padStart(2, '0')}
            </dd>
          </Card>
        ))}
      </dl>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl border border-brand/15 bg-brand/10 p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -right-12 size-56 -rotate-25 rounded-[3rem] border-28 border-brand/10"
          />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Project spotlight
            </p>

            <h2 className="mt-5 max-w-sm text-3xl font-semibold tracking-tight">
              {featuredProject.name}
            </h2>

            <p className="mt-2 text-sm text-muted">
              {featuredProject.client}
            </p>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-text/80">
              {featuredProject.description}
            </p>

            <div className="mt-6 max-w-md">
              <ProjectProgress project={featuredProject} />
            </div>

            <Button
              className="mt-7"
              onClick={() => setSelectedProject(featuredProject)}
            >
              View project details
              <ArrowUpRight size={17} aria-hidden="true" />
            </Button>
          </div>
        </section>

        <Card>
          <h2 className="text-lg font-semibold tracking-tight">
            Your workspace
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted">
            Move between the areas where you manage your work.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/clients')}
            >
              Clients
              <ArrowUpRight size={16} aria-hidden="true" />
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/time')}
            >
              Time tracking
              <ArrowUpRight size={16} aria-hidden="true" />
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/invoices')}
            >
              Invoices
              <ArrowUpRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Projects in motion
            </h2>

            <p className="mt-1 text-sm text-muted">
              Find a project and review its details.
            </p>
          </div>

          <Badge>
            {filteredProjects.length} results
          </Badge>
        </div>

        <div className="mt-6 grid items-end gap-4 md:grid-cols-[1fr_12rem]">
          <Input
            type="search"
            label="Search projects"
            placeholder="Project or client name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div>
            <label
              htmlFor={filterId}
              className="mb-2 block text-sm font-medium"
            >
              Status
            </label>

            <select
              id={filterId}
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
        </div>

        <p
          role="status"
          className="mt-4 text-xs text-muted"
        >
          Showing {filteredProjects.length} of {sampleProjects.length} sample projects.
        </p>

        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<SearchX size={24} />}
            title="No matching projects"
            description="Try another project name, client name, or status."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {filteredProjects.map((project) => {
              const details = statusDetails[project.status]

              return (
                <li key={project.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-lg font-semibold text-brand"
                      >
                        {project.client.charAt(0)}
                      </span>

                      <div className="min-w-0">
                        <h3 className="wrap-break-word text-sm font-semibold">
                          {project.name}
                        </h3>

                        <p className="mt-1 text-xs text-muted">
                          {project.client}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={details.tone} dot>
                        {details.label}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`View ${project.name}`}
                        onClick={() => setSelectedProject(project)}
                      >
                        View
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

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
              tone={statusDetails[selectedProject.status].tone}
              dot
            >
              {statusDetails[selectedProject.status].label}
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

            <ProjectProgress project={selectedProject} />
          </div>
        )}
      </Modal>
    </section>
  )
}