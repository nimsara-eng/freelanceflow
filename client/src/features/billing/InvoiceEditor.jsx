import { useCallback, useId, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import ProjectPicker from '../projects/ProjectPicker'
import { useAuth } from '../auth/useAuth'
import { api } from '../auth/api'
import { decimalUnits, money, unitsInput } from './money'
import { dayIn } from '../time/calendar'
import { readPreferences } from '../settings/preferences'
const blank = () => ({ description: '', quantity: '1', price: '' })
export default function InvoiceEditor({ invoice, onClose, onSaved }) {
  const { user } = useAuth(),
    formId = useId(),
    locked = useRef(false)
  const [draft, setDraft] = useState(() => ({
    projectId: invoice?.projectId ?? '',
    currency: invoice?.currency ?? 'USD',
    senderName: invoice?.senderName ?? user.displayName,
    senderDetails: invoice?.senderDetails ?? '',
    billToName: invoice?.billToName ?? '',
    billToDetails: invoice?.billToDetails ?? '',
    issueDate: invoice?.issueDate ?? dayIn(Date.now(), readPreferences().timeZone),
    dueDate: invoice?.dueDate ?? '',
    notes: invoice?.notes ?? '',
    discount: invoice ? unitsInput(invoice.discountCents) : '0',
    tax: invoice ? unitsInput(invoice.taxBasisPoints) : '0',
  }))
  const [items, setItems] = useState(() =>
    invoice
      ? invoice.items.map((item) => ({
          description: item.description,
          quantity: unitsInput(item.quantityUnits),
          price: unitsInput(item.unitPriceCents),
        }))
      : [blank()],
  )
  const [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
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
    setDirty(true)
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }))
  }
  function changeItem(index, field, value) {
    setDirty(true)
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }
  function close() {
    if (busy) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  let estimate = null
  try {
    const subtotal = items.reduce(
      (total, item) =>
        total + Math.round((decimalUnits(item.quantity) * decimalUnits(item.price)) / 100),
      0,
    )
    const discounted = subtotal - decimalUnits(draft.discount)
    estimate = discounted + Math.round((discounted * decimalUnits(draft.tax)) / 10000)
  } catch {
    /* Incomplete inputs are validated before saving. */
  }
  async function save(event) {
    event.preventDefault()
    if (locked.current) return
    let body
    try {
      const { projectId, discount, tax, ...fields } = draft
      body = {
        ...fields,
        ...(invoice ? { version: invoice.version } : { projectId }),
        discountCents: decimalUnits(discount),
        taxBasisPoints: decimalUnits(tax),
        items: items.map((item) => ({
          description: item.description,
          quantityUnits: decimalUnits(item.quantity),
          unitPriceCents: decimalUnits(item.price),
        })),
      }
    } catch (failure) {
      setError(failure.message)
      return
    }
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api(`/invoices${invoice ? `/${invoice.id}` : ''}`, {
        method: invoice ? 'PATCH' : 'POST',
        body,
      })
      blocker.reset?.()
      onSaved(result.invoice)
    } catch (failure) {
      setError(
        failure.message +
          (failure.status === 0
            ? ' Check your drafts before saving again; the outcome is uncertain.'
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
      size="xl"
      title={
        leaving ? 'Discard invoice changes?' : invoice ? 'Edit invoice draft' : 'New invoice draft'
      }
      description="Review your details before sending to the connected client."
      onClose={() => {
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
        ) : (
          <>
            <Button variant="secondary" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={busy}>
              Save draft
            </Button>
          </>
        )
      }
    >
      {leaving ? (
        <p className="text-sm leading-7 text-muted">Only unsaved changes will be lost.</p>
      ) : (
        <form id={formId} onSubmit={save}>
          <fieldset disabled={busy} className="space-y-6">
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            {!invoice && (
              <>
                <ProjectPicker
                  value={draft.projectId}
                  onChange={(value) => {
                    setDirty(true)
                    setDraft((current) => ({ ...current, projectId: value }))
                  }}
                />
                <p className="text-xs leading-6 text-muted">
                  Select a project with a connected client.
                </p>
              </>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Your billing name"
                name="senderName"
                value={draft.senderName}
                onChange={change}
                required
                minLength={2}
                maxLength={120}
              />
              <Input
                label="Bill-to name"
                name="billToName"
                value={draft.billToName}
                onChange={change}
                required
                minLength={2}
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['senderDetails', 'Your billing details'],
                ['billToDetails', 'Client billing details'],
              ].map(([name, label]) => (
                <label key={name} className="text-sm font-medium">
                  {label}
                  <textarea
                    name={name}
                    value={draft[name]}
                    onChange={change}
                    maxLength={1000}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-border bg-surface p-3"
                  />
                </label>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Issue date"
                name="issueDate"
                type="date"
                value={draft.issueDate}
                onChange={change}
                onInput={change}
                required
              />
              <Input
                label="Payment due"
                name="dueDate"
                type="date"
                value={draft.dueDate}
                onChange={change}
                onInput={change}
                required
                min={draft.issueDate}
              />
              <label className="text-sm font-medium">
                Currency
                <select
                  name="currency"
                  value={draft.currency}
                  onChange={change}
                  className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3"
                >
                  <option>USD</option>
                  <option>LKR</option>
                </select>
              </label>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold">Invoice items</h3>
              {items.map((item, index) => (
                <div key={index} className="rounded-2xl border border-border p-4">
                  <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                    <Input
                      label={`Item ${index + 1} description`}
                      value={item.description}
                      onChange={(event) => changeItem(index, 'description', event.target.value)}
                      maxLength={240}
                      required
                    />
                    <Input
                      label={`Item ${index + 1} quantity`}
                      value={item.quantity}
                      onChange={(event) => changeItem(index, 'quantity', event.target.value)}
                      inputMode="decimal"
                      required
                    />
                    <Input
                      label={`Item ${index + 1} unit price`}
                      value={item.price}
                      onChange={(event) => changeItem(index, 'price', event.target.value)}
                      inputMode="decimal"
                      required
                    />
                  </div>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setDirty(true)
                        setItems((current) => current.filter((_, i) => i !== index))
                      }}
                    >
                      Remove item {index + 1}
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="secondary"
                disabled={items.length >= 30}
                onClick={() => {
                  setDirty(true)
                  setItems((current) => [...current, blank()])
                }}
              >
                Add item
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={`Discount (${draft.currency})`}
                name="discount"
                value={draft.discount}
                onChange={change}
                inputMode="decimal"
                required
              />
              <Input
                label="Tax (%)"
                name="tax"
                value={draft.tax}
                onChange={change}
                inputMode="decimal"
                required
              />
            </div>
            <p className="rounded-xl bg-brand/5 p-4 text-right text-lg font-semibold">
              Estimated total:{' '}
              {estimate !== null && estimate >= 0 ? money(estimate, draft.currency) : '—'}
            </p>
            <label className="block text-sm font-medium">
              Notes & payment instructions
              <textarea
                name="notes"
                value={draft.notes}
                onChange={change}
                maxLength={2000}
                rows={4}
                className="mt-2 w-full rounded-xl border border-border bg-surface p-3"
              />
            </label>
            <p className="text-xs leading-6 text-muted">
              Save a draft to review before sending.
            </p>
          </fieldset>
        </form>
      )}
    </Modal>
  )
}
