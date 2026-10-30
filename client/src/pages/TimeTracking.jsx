import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock3, Play, Plus, Square } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ProjectPicker from '../features/projects/ProjectPicker'
import { api } from '../features/auth/api'
import { useProjects } from '../features/projects/useProjects'
import { readPreferences } from '../features/settings/preferences'
import {
  addDays,
  dayIn,
  elapsed,
  localInput,
  monthDays,
  moveMonth,
  toUtc,
} from '../features/time/calendar'

function WorkEditor({ kind, item, day, zone, onClose, onSaved }) {
  const locked = useRef(false)
  const [draft, setDraft] = useState({
    projectId: item?.projectId ?? '',
    note: item?.note ?? '',
    start: item ? localInput(item.start, zone) : `${day}T09:00`,
    end: item ? localInput(item.end, zone) : `${day}T10:00`,
  })
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [discard, setDiscard] = useState(false),
    [dirty, setDirty] = useState(false)
  const blocker = useBlocker(() => dirty || busy),
    leaving = discard || blocker.state === 'blocked'
  function change(event) {
    setDirty(true)
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }))
  }
  function close() {
    if (busy) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function save(event) {
    event.preventDefault()
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await api(`/time/${kind}${item ? `/${item.id}` : ''}`, {
        method: item ? 'PATCH' : 'POST',
        body: {
          ...draft,
          start: toUtc(draft.start, zone),
          end: toUtc(draft.end, zone),
          ...(item ? { version: item.version } : {}),
        },
      })
      onSaved()
    } catch (failure) {
      setError(failure.message)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  useEffect(() => {
    const unload = (event) => {
      if (dirty || busy) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', unload)
    return () => window.removeEventListener('beforeunload', unload)
  }, [dirty, busy])
  return (
    <Modal
      open
      title={
        leaving
          ? 'Discard changes?'
          : `${item ? 'Edit' : 'Add'} ${kind === 'schedule' ? 'planned work' : 'time entry'}`
      }
      description={`Times in ${zone}. ${kind === 'schedule' ? '15-minute steps, up to 12 hours.' : 'Completed work only, up to 24 hours.'}`}
      onClose={() => {
        if (busy) return
        if (leaving) {
          setDiscard(false)
          blocker.reset?.()
        } else close()
      }}
      footer={
        leaving ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDiscard(false)
                blocker.reset?.()
              }}
            >
              Keep editing
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                onClose()
                if (blocker.state === 'blocked') blocker.proceed()
              }}
            >
              Discard changes
            </Button>
          </>
        ) : null
      }
    >
      {!leaving && (
        <form onSubmit={save}>
          <fieldset disabled={busy} className="space-y-5">
            <ProjectPicker
              value={draft.projectId}
              name={item?.projectName}
              onChange={(value) => {
                setDirty(true)
                setDraft((current) => ({ ...current, projectId: value }))
              }}
            />
            <Input
              label="Work note"
              name="note"
              maxLength={500}
              value={draft.note}
              onChange={change}
            />
            <Input
              label="Start"
              type="datetime-local"
              name="start"
              value={draft.start}
              onChange={change}
              onInput={change}
              step={kind === 'schedule' ? 900 : 60}
              required
            />
            <Input
              label="End"
              type="datetime-local"
              name="end"
              value={draft.end}
              onChange={change}
              onInput={change}
              step={kind === 'schedule' ? 900 : 60}
              required
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Save {kind === 'schedule' ? 'plan' : 'time'}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  )
}
export default function TimeTracking() {
  const [preferences] = useState(readPreferences),
    [now, setNow] = useState(Date.now),
    zone = preferences.timeZone,
    today = dayIn(now, zone)
  const [month, setMonth] = useState(today.slice(0, 7)),
    [day, setDay] = useState(today),
    [editor, setEditor] = useState(null),
    [removing, setRemoving] = useState(null)
  const [timerProject, setTimerProject] = useState(''),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const locked = useRef(false),
    days = monthDays(month),
    from = toUtc(`${days[0]}T00:00`, zone),
    to = toUtc(`${addDays(days[41], 1)}T00:00`, zone)
  const {
    data,
    loading,
    error: loadError,
    refresh,
  } = useProjects(new URLSearchParams({ from, to, today }).toString(), '/time')
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    const reload = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const timer = setInterval(reload, 60000)
    window.addEventListener('focus', reload)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', reload)
    }
  }, [refresh])
  async function mutate(path, method, body) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await api(path, { method, body })
      setRemoving(null)
      refresh()
    } catch (failure) {
      setError(failure.message)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  const time = (value) =>
    new Intl.DateTimeFormat('en', {
      timeZone: zone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
    }).format(new Date(value))
  const occurs = (item, date) =>
    dayIn(item.start, zone) <= date && dayIn(Date.parse(item.end) - 1, zone) >= date
  const blocks = data?.blocks.filter((item) => occurs(item, day)) ?? [],
    entries = data?.entries.filter((item) => occurs(item, day)) ?? []
  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Work planning
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Time & calendar</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            Schedule work, record time and track deadlines.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setEditor({ kind: 'entries' })}>
            <Clock3 size={17} />
            Add time
          </Button>
          <Button onClick={() => setEditor({ kind: 'schedule' })}>
            <Plus size={17} />
            Plan work
          </Button>
        </div>
      </header>
      {(error || loadError) && (
        <p role="alert" className="rounded-2xl border border-danger/30 p-4 text-sm text-danger">
          {error || loadError}
        </p>
      )}
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock3 size={19} className="text-brand" />
            Focus timer
          </h2>
          <Badge>{zone}</Badge>
        </div>
        {data?.running ? (
          <>
            <p className="text-sm text-muted">
              {data.running.projectName} · {data.running.note}
            </p>
            <p className="text-4xl font-semibold tabular-nums">
              {elapsed(data.running.start, now)}
            </p>
            {now - Date.parse(data.running.start) > 12 * 3600000 && (
              <p className="text-sm text-warning">
                Running for over 12 hours. Stop and correct this entry if needed.
              </p>
            )}
            <Button
              loading={busy}
              onClick={() =>
                mutate(`/time/timer/${data.running.id}/stop`, 'POST', {
                  version: data.running.version,
                })
              }
            >
              <Square size={16} />
              Stop timer
            </Button>
          </>
        ) : (
          <div className="grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
            <ProjectPicker value={timerProject} onChange={setTimerProject} />
            <Input
              label="Work description"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button
              disabled={!timerProject || loading || Boolean(loadError)}
              loading={busy}
              onClick={() => mutate('/time/timer/start', 'POST', { projectId: timerProject, note })}
            >
              <Play size={16} />
              Start timer
            </Button>
          </div>
        )}

      </Card>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-xl font-semibold">
                {new Intl.DateTimeFormat('en', {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(`${month}-15T12:00:00Z`))}
              </h2>
              <p className="mt-1 text-xs text-muted">Planned work · Project deadlines</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Previous month"
                onClick={() => setMonth(moveMonth(month, -1))}
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMonth(today.slice(0, 7))
                  setDay(today)
                }}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Next month"
                onClick={() => setMonth(moveMonth(month, 1))}
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <span
                key={label}
                className="py-3 text-center text-[10px] font-semibold text-muted sm:text-xs"
              >
                {label}
              </span>
            ))}
            {days.map((date) => {
              const plans = data?.blocks.filter((item) => occurs(item, date)) ?? [],
                due = data?.deadlines.filter((item) => item.dueDate === date) ?? []
              return (
                <button
                  type="button"
                  key={date}
                  aria-label={`${date}, ${plans.length} planned sessions, ${due.length} deadlines`}
                  aria-pressed={day === date}
                  onClick={() => setDay(date)}
                  className={`min-h-20 min-w-0 border-t border-border p-1 text-left sm:min-h-24 sm:p-2 ${day === date ? 'bg-brand/10 ring-1 ring-inset ring-brand' : date === today ? 'bg-surface-2' : ''} ${date.slice(0, 7) !== month ? 'text-muted' : 'text-text'}`}
                >
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${date === today ? 'bg-brand text-white' : ''}`}
                  >
                    {Number(date.slice(-2))}
                  </span>
                  <div className="mt-2 space-y-1">
                    {plans.length > 0 && (
                      <span className="block truncate rounded bg-brand/10 px-1 text-[10px] text-brand">
                        {plans.length} <span className="hidden sm:inline">planned</span>
                      </span>
                    )}
                    {due.length > 0 && (
                      <span className="block truncate rounded bg-warning/15 px-1 text-[10px] text-text">
                        {due.length} <span className="hidden sm:inline">due</span>
                        <span className="sm:hidden">!</span>
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          {loading && (
            <p role="status" className="p-4 text-xs text-muted">
              Refreshing calendar…
            </p>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">{day}</h2>
          <p className="mt-1 text-xs text-muted">Planned work · {zone}</p>
          <ul className="mt-5 space-y-4">
            {blocks.map((item) => (
              <li key={item.id} className="rounded-xl border border-border p-4">
                <h3 className="wrap-break-word text-sm font-semibold">{item.projectName}</h3>
                <p className="mt-2 text-xs text-brand">
                  {time(item.start)} – {time(item.end)}
                </p>
                <p className="mt-2 wrap-break-word text-xs leading-6 text-muted">{item.note}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditor({ kind: 'schedule', item })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRemoving({ kind: 'schedule', item })}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {!blocks.length && (
            <p className="mt-5 text-sm leading-7 text-muted">
              No scheduled work.
            </p>
          )}
          {data?.deadlines
            .filter((item) => item.dueDate === day)
            .map((project) => (
              <Link
                key={project.id}
                to={`/projects?project=${project.id}`}
                className="mt-4 block rounded-xl bg-warning/10 p-3 text-sm"
              >
                Deadline: {project.name} →
              </Link>
            ))}
        </Card>
      </div>
      <Card className="border-warning/30">
        <h2 className="text-lg font-semibold">Deadline reminders</h2>
        <p className="mt-2 text-xs leading-6 text-muted">
          Overdue projects and deadlines within 7 days.
        </p>
        {data?.warnings.length ? (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {data.warnings.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects?project=${project.id}`}
                  className="block rounded-xl bg-warning/10 p-4"
                >
                  <span className="block wrap-break-word text-sm font-semibold">
                    {project.name}
                  </span>
                  <span className="mt-2 block text-xs">
                    {project.dueDate < today
                      ? 'Overdue'
                      : project.dueDate === today
                        ? 'Due today'
                        : 'Due soon'}{' '}
                    · {project.dueDate}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">
            {loading
              ? 'Checking deadlines…'
              : loadError
                ? 'Deadline information unavailable.'
                : 'No upcoming or overdue deadlines.'}
          </p>
        )}
        {data?.truncated && (
          <p className="mt-4 text-sm text-warning">
            Display limit reached. Review all deadlines from Projects or select another month.
          </p>
        )}
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Recorded work · {day}</h2>
          <Button variant="ghost" size="sm" onClick={refresh}>
            Refresh
          </Button>
        </div>
        <ul className="mt-5 divide-y divide-border">
          {entries.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <h3 className="wrap-break-word text-sm font-semibold">{item.projectName}</h3>
                <p className="mt-2 text-xs text-muted">
                  {time(item.start)} – {time(item.end)} · {elapsed(item.start, item.end)}
                </p>
                <p className="mt-2 wrap-break-word text-xs text-muted">{item.note}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditor({ kind: 'entries', item })}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoving({ kind: 'entries', item })}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {!entries.length && (
          <p className="mt-5 text-sm text-muted">No recorded work for this day yet.</p>
        )}
      </Card>
      {editor && (
        <WorkEditor
          {...editor}
          day={day}
          zone={zone}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            refresh()
          }}
        />
      )}
      <Modal
        open={Boolean(removing)}
        onClose={() => {
          if (!busy) setRemoving(null)
        }}
        title="Remove this record?"
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setRemoving(null)}>
              Keep record
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                mutate(`/time/${removing.kind}/${removing.item.id}`, 'DELETE', {
                  version: removing.item.version,
                })
              }
            >
              Remove record
            </Button>
          </>
        }
      >
        <p className="text-sm leading-7">
          Remove the selected time entry or scheduled session?
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
