import { useCallback, useId, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { api } from '../auth/api'

export default function TaskEditor({ projectId, task, version, onClose, onSaved, onBusy }) {
  const formId = useId()
  const initial = { title: task?.title ?? '', description: task?.description ?? '', dueDate: task?.dueDate ?? '', status: task?.status ?? 'todo' }
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [discard, setDiscard] = useState(false)
  const locked = useRef(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || busy) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  const leaving = discard || blocker.state === 'blocked'
  useBeforeUnload(useCallback((event) => {
    if (dirty || busy) { event.preventDefault(); event.returnValue = '' }
  }, [dirty, busy]))

  function close() {
    if (busy) return
    if (leaving) { setDiscard(false); blocker.reset?.(); return }
    if (dirty) setDiscard(true)
    else onClose()
  }
  function change(event) {
    const { name, value } = event.target
    setDraft((current) => ({ ...current, [name]: value }))
  }
  async function save(event) {
    event.preventDefault()
    if (locked.current || conflict) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    if (values.title.trim().length < 2) { setError('Give the task a title of at least two characters.'); return }
    locked.current = true; setBusy(true); onBusy(true); setError('')
    try {
      const data = await api(`/projects/${projectId}/tasks${task ? `/${task.id}` : ''}`, {
        method: task ? 'PATCH' : 'POST', body: { ...values, version },
      })
      blocker.reset?.()
      onSaved(data.project)
    } catch (failure) {
      setError(failure.message + (failure.status === 0 ? ' The result could not be confirmed. Close this draft and reload tasks before retrying.' : ''))
      setConflict([404, 409].includes(failure.status))
    } finally { locked.current = false; setBusy(false); onBusy(false) }
  }
  return (
    <Modal open onClose={close} closeOnBackdrop={!busy} size="lg" title={leaving ? busy ? 'Saving your task' : 'Discard this task draft?' : task ? 'Edit task' : 'Create a task'} description={leaving ? 'Unsaved changes will be discarded.' : 'Enter the task details.'} footer={leaving ? <>
      <Button variant="secondary" onClick={() => { setDiscard(false); blocker.reset?.() }}>Keep editing</Button>
      <Button variant="danger" disabled={busy} onClick={() => { onClose(); if (blocker.state === 'blocked') blocker.proceed() }}>Discard changes</Button>
    </> : <><Button variant="secondary" disabled={busy} onClick={close}>Cancel</Button><Button form={formId} type="submit" loading={busy} loadingText="Saving task…" disabled={conflict || (Boolean(task) && !dirty)}>{task ? 'Save task' : 'Create task'}</Button></>}>
      {leaving ? <p className="text-sm leading-7 text-muted">{busy ? 'Wait for this request to finish before leaving.' : 'Keep editing to save your changes, or discard this draft.'}</p> : <form id={formId} onSubmit={save}>
        <fieldset disabled={busy} className="space-y-5">
          {error && <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/5 p-4 text-sm leading-7">{error}{conflict && ' Close this draft and use Reload tasks to get the current version.'}</p>}
          <Input label="Task title" name="title" required minLength={2} maxLength={120} autoComplete="off" value={draft.title} onChange={change} placeholder="e.g. Design the homepage" />
          <div><label htmlFor={`${formId}-description`} className="mb-2 block text-sm font-medium">Task details</label><textarea id={`${formId}-description`} name="description" rows={4} maxLength={2000} value={draft.description} onChange={change} placeholder="Task requirements and deliverables" className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-3 text-base sm:text-sm" /><p className="mt-1 text-right text-xs text-muted">{draft.description.length}/2000</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Task deadline" type="date" name="dueDate" min="1900-01-01" max="2199-12-31" value={draft.dueDate} onInput={change} onChange={change} hint="Optional task deadline." />
            <div><label htmlFor={`${formId}-status`} className="mb-2 block text-sm font-medium">Task status</label><select id={`${formId}-status`} name="status" value={draft.status} onChange={change} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base sm:text-sm"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div>
          </div>

        </fieldset>
      </form>}
    </Modal>
  )
}
