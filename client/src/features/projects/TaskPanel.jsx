import { lazy, Suspense, useId, useRef, useState } from 'react'
import { CalendarDays, CheckCheck, Plus } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import TaskProgress from './TaskProgress'
import { api } from '../auth/api'

const TaskEditor = lazy(() => import('./TaskEditor'))
const statuses = { todo: { label: 'To do', tone: 'neutral' }, in_progress: { label: 'In progress', tone: 'brand' }, done: { label: 'Done', tone: 'success' } }
const date = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })

export default function TaskPanel({ project, readOnly = false, disabled = false, onBusy, onChanged, onUnavailable }) {
  const id = useId()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const locked = useRef(false)
  const tasks = project.tasks ?? []
  const visible = tasks.filter((task) => filter === 'all' || task.status === filter)
  const unavailable = busy || disabled
  function reportBusy(value) { setBusy(value); onBusy?.(value) }

  async function reload() {
    if (locked.current || unavailable) return
    locked.current = true; reportBusy(true); setError(''); setNotice('')
    try {
      const result = await api(`${readOnly ? '/collaboration' : ''}/projects/${project.id}`)
      onChanged(result.project)
      setDeleting(null)
      setNotice('Tasks reloaded.')
    } catch (failure) {
      setError(failure.message)
      if (readOnly && failure.status === 404) onUnavailable?.(failure.message)
    } finally { locked.current = false; reportBusy(false) }
  }
  async function mutate(task, status, remove = false) {
    if (readOnly || locked.current || unavailable) return
    locked.current = true; reportBusy(true); setError(''); setNotice('')
    try {
      const body = remove ? { version: deleting.version } : { title: task.title, description: task.description, dueDate: task.dueDate, status, version: project.version }
      const result = await api(`/projects/${project.id}/tasks/${task.id}`, { method: remove ? 'DELETE' : 'PATCH', body })
      onChanged(result.project)
      setDeleting(null)
      setNotice(remove ? 'Task deleted. Progress updated.' : 'Task status saved. Progress updated.')
    } catch (failure) { setError(failure.message) }
    finally { locked.current = false; reportBusy(false) }
  }
  return (
    <section aria-label="Project tasks" className="space-y-5 rounded-2xl border border-border p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold"><CheckCheck size={20} className="text-brand" aria-hidden="true" />Tasks & progress</h3>{readOnly && <Badge className="mt-2" tone="neutral">View only</Badge>}<p className="mt-2 text-xs leading-6 text-muted">{readOnly ? 'Only your freelancer can change task status and project progress. You can view their updates here.' : 'Break the project into clear, achievable steps.'}</p></div><div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={unavailable} onClick={reload}>Reload tasks</Button>{!readOnly && <Button size="sm" disabled={unavailable || tasks.length >= 200} onClick={() => { setError(''); setEditing({ task: null, version: project.version }) }}><Plus size={15} aria-hidden="true" />New task</Button>}</div></header>
      <TaskProgress progress={project.progress} name={project.name} />
      {project.progress?.total > 0 && <p className="text-xs text-muted">{project.progress.todo} to do · {project.progress.inProgress} in progress · {project.progress.completed} done</p>}
      {!readOnly && tasks.length >= 200 && <p className="text-xs leading-6 text-muted">This project has reached its limit of 200 tasks.</p>}
      {error && <p role="alert" className="rounded-xl border border-danger/25 p-3 text-sm leading-6">{error}</p>}
      {notice && <p role="status" className="text-xs leading-6 text-brand">{notice}</p>}
      {busy && <p role="status" className="text-xs text-muted">Updating tasks…</p>}
      {tasks.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor={`${id}-filter`} className="text-xs font-medium text-muted">Filter displayed tasks</label><select id={`${id}-filter`} aria-describedby={`${id}-filter-hint`} value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm"><option value="all">All tasks ({tasks.length})</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div>}
      {tasks.length > 0 && <p id={`${id}-filter-hint`} className="text-xs leading-6 text-muted">Filters this list only. Overall project progress does not change.</p>}
      {visible.length === 0 ? <p className="rounded-xl bg-surface-2 p-4 text-sm leading-7 text-muted">{tasks.length ? 'No tasks match this status.' : readOnly ? 'Your freelancer has not added any tasks yet.' : 'Add the first task to start tracking progress.'}</p> : <ul className="divide-y divide-border">
        {visible.map((task) => <li key={task.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-3"><h4 className={`min-w-0 flex-1 wrap-break-word text-sm font-semibold ${task.status === 'done' ? 'text-muted line-through' : ''}`}>{task.title}</h4>{readOnly ? <Badge tone={statuses[task.status].tone} dot>{statuses[task.status].label}</Badge> : <select aria-label={`Status for ${task.title}`} disabled={unavailable} value={task.status} onChange={(event) => mutate(task, event.target.value)} className="min-h-11 max-w-full rounded-xl border border-border bg-surface px-3 text-xs"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select>}</div>
          {task.description && <p className="whitespace-pre-wrap wrap-break-word text-xs leading-6 text-muted">{task.description}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs text-muted"><CalendarDays size={14} aria-hidden="true" />{task.dueDate ? date(task.dueDate) : 'No separate deadline'}</span>{!readOnly && <div className="flex gap-2"><Button variant="ghost" size="sm" disabled={unavailable} aria-label={`Edit ${task.title}`} onClick={() => setEditing({ task, version: project.version })}>Edit</Button><Button variant="ghost" size="sm" disabled={unavailable} aria-label={`Delete ${task.title}`} onClick={() => { setDeleting({ id: task.id, title: task.title, version: project.version }); setError('') }}>Delete</Button></div>}</div>
          {!readOnly && deleting?.id === task.id && <div className="space-y-3 rounded-xl bg-surface-2 p-4"><p className="wrap-break-word text-sm leading-6">Delete <strong>{deleting.title}</strong>? The task will be removed and progress recalculated.</p><div className="flex flex-wrap gap-3"><Button variant="secondary" size="sm" disabled={unavailable} onClick={() => setDeleting(null)}>Keep task</Button><Button variant="danger" size="sm" disabled={unavailable} onClick={() => mutate(task, undefined, true)}>Delete task</Button></div></div>}
        </li>)}
      </ul>}
      {editing && !readOnly && <Suspense fallback={<p role="status" className="text-sm text-muted">Opening task form…</p>}><TaskEditor key={editing.task?.id ?? 'new'} projectId={project.id} task={editing.task} version={editing.version} onClose={() => setEditing(null)} onBusy={reportBusy} onSaved={(updated) => { onChanged(updated); setEditing(null); setNotice('Task saved. Progress updated.') }} /></Suspense>}
    </section>
  )
}
