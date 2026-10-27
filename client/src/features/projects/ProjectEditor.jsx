import { useCallback, useId, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { api } from '../auth/api'

export default function ProjectEditor({ project, onClose, onSaved }) {
  const formId = useId()
  const initial = { name: project?.name ?? '', client: project?.client ?? '', description: project?.description ?? '', dueDate: project?.dueDate ?? '', status: project?.status ?? 'active' }
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const [discard, setDiscard] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || busy) && currentLocation.pathname !== nextLocation.pathname)
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
    if (values.name.trim().length < 2 || values.client.trim().length < 2) { setError('Enter at least two characters for the project and client names.'); return }
    locked.current = true
    setBusy(true); setError('')
    try {
      const data = await api(project ? `/projects/${project.id}` : '/projects', { method: project ? 'PATCH' : 'POST', body: { ...values, ...(project ? { version: project.version } : {}) } })
      blocker.reset?.()
      onSaved(data.project)
    } catch (failure) {
      setError(failure.message + (failure.status === 0 ? ' The result could not be confirmed. Close this draft and refresh the project list before retrying.' : ''))
      setConflict(failure.status === 409 || failure.status === 404)
    } finally { locked.current = false; setBusy(false) }
  }
  return (
    <Modal open onClose={close} closeOnBackdrop={!busy} title={leaving ? (busy ? 'Saving your project' : 'Discard this draft?') : project ? 'Edit project' : 'Create a project'} description={leaving ? 'Your saved project will stay in your workspace.' : 'Give your next piece of work a home.'} size="lg" footer={leaving ? <><Button variant="secondary" onClick={() => { setDiscard(false); blocker.reset?.() }}>Keep editing</Button><Button variant="danger" disabled={busy} onClick={() => { if (blocker.state === 'blocked') blocker.proceed(); else onClose() }}>Discard changes</Button></> : <><Button variant="secondary" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" form={formId} loading={busy} loadingText="Saving…" disabled={conflict || (Boolean(project) && !dirty)}>{project ? 'Save changes' : 'Create project'}</Button></>}>
      {leaving ? <p className="text-sm leading-7 text-muted">{busy ? 'Wait for the current request to finish before leaving.' : 'You have changes that have not been saved. Stay here to finish them, or discard this draft.'}</p> : <form id={formId} onSubmit={save}>
        <fieldset disabled={busy} className="space-y-5">
          {error && <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/5 p-4 text-sm leading-6">{error}{conflict && ' Close this draft and refresh the list to get the current project.'}</p>}
          <Input label="Project name" name="name" required minLength={2} maxLength={120} autoFocus autoComplete="off" value={draft.name} onChange={change} placeholder="e.g. Studio website refresh" />
          <Input label="Client name" name="client" required minLength={2} maxLength={100} autoComplete="off" value={draft.client} onChange={change} placeholder="e.g. Northstar Studio" hint="A private label for your records. This does not invite a client or give anyone access." />
          <div><label htmlFor={`${formId}-description`} className="mb-2 block text-sm font-medium">Project brief</label><textarea id={`${formId}-description`} name="description" maxLength={4000} rows={4} value={draft.description} onChange={change} placeholder="What are you creating, and what should it achieve?" className="w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-3 text-base sm:text-sm" /><p className="mt-1 text-right text-xs text-muted">{draft.description.length}/4000</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Deadline" type="date" name="dueDate" required min="1900-01-01" max="2199-12-31" value={draft.dueDate} onInput={change} onChange={change} />
            <div><label htmlFor={`${formId}-status`} className="mb-2 block text-sm font-medium">Status</label><select id={`${formId}-status`} name="status" value={draft.status} onChange={change} className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base sm:text-sm"><option value="active">In progress</option><option value="review">Awaiting review</option><option value="completed">Completed</option></select></div>
          </div>
        </fieldset>
      </form>}
    </Modal>
  )
}
