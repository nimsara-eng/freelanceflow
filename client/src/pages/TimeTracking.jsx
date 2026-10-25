import { useEffect, useId, useRef, useState } from 'react'
import { Clock3, Play, Square, Trash2 } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { sampleProjects } from '../features/dashboard/sampleProjects'
import useTimeTracking from '../features/time/useTimeTracking'

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

function formatStartedAt(timestamp) {
  return new Intl.DateTimeFormat('en-LK', {
    timeZone: 'Asia/Colombo',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function getProjectName(projectId) {
  return sampleProjects.find(
    (project) => project.id === projectId,
  )?.name ?? 'Unknown project'
}

export default function TimeTracking() {
  const projectSelectId = useId()
  const activityRef = useRef(null)

  const {
    active,
    entries,
    error: storageError,
    startTimer,
    stopTimer,
    deleteEntry,
  } = useTimeTracking()

  const [projectId, setProjectId] = useState(
    () => active?.projectId ?? sampleProjects[0]?.id ?? '',
  )
  const [description, setDescription] = useState(
    () => active?.description ?? '',
  )
  const [formError, setFormError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [pendingDeletion, setPendingDeletion] = useState(null)

  const startedAt = active?.startedAt

  useEffect(() => {
    if (startedAt === undefined) {
      return
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [startedAt])

  const elapsedMs = active
    ? Math.max(0, now - active.startedAt)
    : 0

  const loggedMs = entries.reduce(
    (total, entry) => total + entry.durationMs,
    0,
  )

  function handleStart(event) {
    event.preventDefault()
    setFormError('')

    if (!sampleProjects.some((project) => project.id === projectId)) {
      setFormError('Choose a project.')
      return
    }

    const activity = description.trim()

    if (!activity) {
      setFormError('Describe the activity you are working on.')
      return
    }

    setNow(Date.now())
    startTimer(projectId, activity)
  }

  function confirmDeletion() {
    if (!pendingDeletion) {
      return
    }

    if (deleteEntry(pendingDeletion.id)) {
      setPendingDeletion(null)
    }
  }

  return (
    <section className="space-y-7">
      <header>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Make your time count
        </p>

        <h1 className="text-4xl font-semibold tracking-tight">
          Time tracking
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Focus on your work while keeping a clear record of
          the time you spend on it.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="warning" dot>
          Tab-only preview
        </Badge>

        <p className="text-xs text-muted">
          Uses sample projects. Entries stay in this tab and
          are not saved to your account.
        </p>
      </div>

      {storageError && (
        <p role="alert" className="text-sm text-danger">
          {storageError}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">
              Focus timer
            </h2>

            <Badge tone={active ? 'success' : 'neutral'} dot>
              {active ? 'Running' : 'Ready'}
            </Badge>
          </div>

          <p
            role="timer"
            aria-label="Elapsed time"
            aria-live="off"
            className="my-8 text-center text-4xl font-semibold tracking-tight tabular-nums sm:text-6xl"
          >
            {formatDuration(elapsedMs)}
          </p>

          <form onSubmit={handleStart} noValidate className="space-y-5">
            <div>
              <label
                htmlFor={projectSelectId}
                className="mb-2 block text-sm font-medium"
              >
                Project
              </label>

              <select
                id={projectSelectId}
                value={projectId}
                disabled={Boolean(active)}
                onChange={(event) => setProjectId(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text disabled:cursor-not-allowed disabled:bg-surface-2 sm:text-sm"
              >
                {sampleProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              ref={activityRef}
              label="What are you working on?"
              placeholder="For example, refining the homepage layout"
              value={description}
              maxLength={200}
              disabled={Boolean(active)}
              onChange={(event) => {
                setDescription(event.target.value)
                setFormError('')
              }}
              required
            />

            {formError && (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={Boolean(active)}>
                <Play size={16} aria-hidden="true" />
                Start timer
              </Button>

              <Button
                variant="secondary"
                disabled={!active}
                onClick={stopTimer}
              >
                <Square size={16} aria-hidden="true" />
                Stop and record
              </Button>
            </div>
          </form>

          <p role="status" className="mt-5 text-xs text-muted">
            {active
              ? `Tracking: ${active.description}`
              : 'Start the timer when you begin an activity.'}
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold tracking-tight">
            This tab’s activity
          </h2>

          <dl className="mt-6 space-y-6">
            <div>
              <dt className="text-sm text-muted">
                Recorded time
              </dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                {formatDuration(loggedMs)}
              </dd>
            </div>

            <div className="border-t border-border pt-5">
              <dt className="text-sm text-muted">
                Recorded entries
              </dt>
              <dd className="mt-2 text-3xl font-semibold tabular-nums">
                {entries.length}
              </dd>
            </div>
          </dl>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            Recorded time includes stopped entries. The running
            timer is added when you select Stop and record.
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Time entries
          </h2>

          <span className="text-xs text-muted">
            Dates shown in Colombo time
          </span>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={<Clock3 size={24} />}
            title="No time recorded yet"
            description="Choose a project, describe your activity, and start the timer."
            action={
              <Button
                variant="secondary"
                onClick={() => activityRef.current?.focus()}
              >
                Choose an activity
              </Button>
            }
          />
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-4 py-5"
              >
                <div className="min-w-0">
                  <h3 className="wrap-break-words text-sm font-semibold">
                    {entry.description}
                  </h3>

                  <p className="mt-1 text-xs text-brand">
                    {getProjectName(entry.projectId)}
                  </p>

                  <p className="mt-2 text-xs text-muted">
                    Started {formatStartedAt(entry.startedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold tabular-nums">
                    {formatDuration(entry.durationMs)}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete entry: ${entry.description}`}
                    onClick={() => setPendingDeletion(entry)}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(pendingDeletion)}
        onClose={() => setPendingDeletion(null)}
        title="Delete time entry?"
        description="This removes the entry from this tab’s records."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPendingDeletion(null)}
            >
              Cancel
            </Button>

            <Button variant="danger" onClick={confirmDeletion}>
              Delete entry
            </Button>
          </>
        }
      >
        <p className="wrap-break-words text-sm text-muted">
          {pendingDeletion?.description}
        </p>

        {storageError && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {storageError}
          </p>
        )}
      </Modal>
    </section>
  )
}