import { useCallback, useId, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { api } from '../auth/api'
import { decimalUnits } from '../billing/money'

export default function WorkRequestForm({ profile, onClose, onSent }) {
  const formId = useId(),
    locked = useRef(false)
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    dueDate: '',
    budget: '',
    currency: 'USD',
  })
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [discard, setDiscard] = useState(false)
  const dirty = Boolean(draft.name || draft.description || draft.dueDate || draft.budget)
  const blocker = useBlocker(() => dirty || busy),
    leaving = discard || blocker.state === 'blocked'
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || busy) {
          event.preventDefault()
          event.returnValue = ''
        }
      },
      [dirty, busy],
    ),
  )
  function change(event) {
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }))
  }
  function close() {
    if (busy) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function send(event) {
    event.preventDefault()
    if (locked.current) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    let budgetCents
    try {
      budgetCents = values.budget ? decimalUnits(values.budget) : 0
    } catch (failure) {
      setError(failure.message)
      return
    }
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await api('/work-requests', {
        method: 'POST',
        body: {
          freelancerId: profile.freelancerId,
          name: values.name,
          description: values.description,
          dueDate: values.dueDate,
          currency: values.currency,
          budgetCents,
        },
      })
      blocker.reset?.()
      onSent()
    } catch (failure) {
      setError(
        failure.message +
          (failure.status === 0
            ? ' Check My requests before sending again; the outcome is uncertain.'
            : ''),
      )
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <Modal
      open
      title={leaving ? 'Discard request draft?' : 'New work request'}
      description={`Send a work request to ${profile.displayName}`}
      onClose={() => {
        if (leaving && !busy) {
          setDiscard(false)
          blocker.reset?.()
        } else close()
      }}
      size="lg"
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
              Discard draft
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={busy}>
              Send work request
            </Button>
          </>
        )
      }
    >
      {leaving ? (
        <p className="text-sm leading-7 text-muted">
          Discard this unsent request?
        </p>
      ) : (
        <form id={formId} onSubmit={send}>
          <fieldset disabled={busy} className="space-y-5">
            {error && (
              <p role="alert" className="text-sm leading-7 text-danger">
                {error}
              </p>
            )}
            <Input
              label="Project name"
              name="name"
              value={draft.name}
              onChange={change}
              required
              minLength={2}
              maxLength={120}
            />
            <div>
              <label htmlFor={`${formId}-brief`} className="mb-2 block text-sm font-medium">
                Project brief
              </label>
              <textarea
                id={`${formId}-brief`}
                name="description"
                value={draft.description}
                onChange={change}
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                className="w-full rounded-xl border border-border bg-surface p-3 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Requested deadline"
                type="date"
                name="dueDate"
                value={draft.dueDate}
                onInput={change}
                onChange={change}
                min="1900-01-01"
                max="2199-12-31"
                required
              />
              <Input
                label="Budget estimate"
                name="budget"
                inputMode="decimal"
                placeholder="Optional"
                value={draft.budget}
                onChange={change}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-currency`} className="mb-2 block text-sm font-medium">
                Currency
              </label>
              <select
                id={`${formId}-currency`}
                name="currency"
                value={draft.currency}
                onChange={change}
                className="min-h-11 rounded-xl border border-border bg-surface px-3"
              >
                <option>USD</option>
                <option>LKR</option>
              </select>
            </div>
            <p className="rounded-xl bg-surface-2 p-4 text-xs leading-6 text-muted">
              Accepted requests become shared projects.
            </p>
          </fieldset>
        </form>
      )}
    </Modal>
  )
}
