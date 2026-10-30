import { useState } from 'react'
import { api } from '../auth/api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
const labels = {
  expired: 'Expired',
  pending: 'Awaiting response',
  approved: 'Approved',
  accepted: 'Accepted',
  changes_requested: 'Changes requested',
  withdrawn: 'Withdrawn',
}
const titles = {
  request: 'Request approval',
  approve: 'Approve version',
  changes: 'Request changes',
  withdraw: 'Withdraw approval request',
  deliver: 'Submit final delivery',
  accept: 'Accept final delivery',
  deliveryChanges: 'Request delivery changes',
  withdrawDelivery: 'Withdraw final delivery',
  complete: 'Complete project',
}
const tones = {
  pending: 'warning',
  approved: 'success',
  accepted: 'success',
  changes_requested: 'warning',
  withdrawn: 'neutral',
}
export default function SignoffPanel({
  review,
  design,
  busy,
  disabled,
  error,
  onAction,
  onDraftChange,
  onSelectDesign,
}) {
  const [action, setAction] = useState(null),
    [note, setNote] = useState(''),
    [discard, setDiscard] = useState(false),
    [attempted, setAttempted] = useState(false)
  const approval = design.approval,
    delivery = review.deliveries.filter((item) => item.current).at(-1),
    closed = review.projectStatus === 'completed'
  const matching = delivery?.designId === design.id,
    needsChanges = ['changes', 'deliveryChanges'].includes(action)
  const prefix = `/reviews/${review.id}`,
    designPath = `${prefix}/designs/${design.id}`
  function open(value) {
    setAction(value)
    setNote('')
    setAttempted(false)
    setDiscard(false)
    onDraftChange(false)
  }
  function close() {
    if (busy) return
    if (note.trim()) {
      setDiscard(true)
      return
    }
    setAction(null)
    onDraftChange(false)
  }
  async function submit(event) {
    event.preventDefault()
    setAttempted(true)
    let url,
      method = 'PATCH',
      body = { version: review.version, message: note }
    if (action === 'request') {
      url = `${designPath}/approvals`
      method = 'POST'
      body = { version: review.version, note }
    } else if (['approve', 'changes', 'withdraw'].includes(action)) {
      url = `${designPath}/approvals/${approval.id}`
      body.decision =
        action === 'approve' ? 'approved' : action === 'changes' ? 'changes_requested' : 'withdrawn'
    } else if (action === 'deliver') {
      url = `${prefix}/deliveries`
      method = 'POST'
      body = { version: review.version, designId: design.id, note }
    } else if (action === 'complete') {
      url = `${prefix}/deliveries/${delivery.id}/complete`
      method = 'POST'
      body = { version: review.version }
    } else {
      url = `${prefix}/deliveries/${delivery.id}`
      body.decision =
        action === 'accept'
          ? 'accepted'
          : action === 'deliveryChanges'
            ? 'changes_requested'
            : 'withdrawn'
    }
    if (
      await onAction(
        () => api(url, { method, body }),
        {
          request: 'Approval requested.',
          approve: 'Version approved.',
          changes: 'Changes requested.',
          withdraw: 'Approval request withdrawn.',
          deliver: 'Final delivery submitted.',
          accept: 'Final delivery accepted.',
          deliveryChanges: 'Delivery changes requested.',
          withdrawDelivery: 'Final delivery withdrawn.',
          complete: 'Project completed.',
        }[action],
      )
    ) {
      setAction(null)
      setNote('')
      onDraftChange(false)
    }
  }
  return (
    <Card className="min-w-0 space-y-6 wrap-break-word">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Version approval</h2>
          <Badge tone={tones[approval?.status] ?? 'neutral'}>
            {labels[approval?.status] ?? 'Not submitted'}
          </Badge>
        </div>
        <p className="wrap-break-word text-sm text-muted">{design.title}</p>
        {approval?.note && (
          <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7">{approval.note}</p>
        )}
        {approval?.message && (
          <p className="whitespace-pre-wrap wrap-break-word rounded-xl bg-surface-2 p-3 text-sm">
            {approval.message}
          </p>
        )}
        {approval?.respondedAt && (
          <p className="text-xs text-muted">
            {approval.respondedByName} · {new Date(approval.respondedAt).toLocaleString()}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {review.isOwner
            ? !closed && (
                <>
                  {approval?.status === 'pending' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy || disabled}
                      onClick={() => open('withdraw')}
                    >
                      Withdraw request
                    </Button>
                  ) : (
                    approval?.status !== 'approved' && (
                      <Button
                        size="sm"
                        disabled={busy || disabled || !design.shared}
                        onClick={() => open('request')}
                      >
                        Request approval
                      </Button>
                    )
                  )}
                  {!design.shared && (
                    <p className="text-xs text-muted">
                      Share this version before requesting approval.
                    </p>
                  )}
                </>
              )
            : approval?.status === 'pending' && (
                <>
                  <Button size="sm" disabled={busy || disabled} onClick={() => open('approve')}>
                    Approve version
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || disabled}
                    onClick={() => open('changes')}
                  >
                    Request changes
                  </Button>
                </>
              )}
        </div>
      </section>
      <section className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Final delivery</h2>
          <Badge tone={closed ? 'success' : (tones[delivery?.status] ?? 'neutral')}>
            {closed ? 'Project completed' : (labels[delivery?.status] ?? 'Not submitted')}
          </Badge>
        </div>
        {delivery && (
          <>
            <p className="wrap-break-word text-sm text-muted">{delivery.designTitle}</p>
            {delivery.note && (
              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7">
                {delivery.note}
              </p>
            )}
            {delivery.message && (
              <p className="whitespace-pre-wrap wrap-break-word rounded-xl bg-surface-2 p-3 text-sm">
                {delivery.message}
              </p>
            )}
          </>
        )}
        <div className="flex flex-wrap gap-3">
          {delivery && !matching && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy || disabled}
              onClick={() => onSelectDesign(delivery.designId)}
            >
              View delivery version
            </Button>
          )}
          {review.isOwner
            ? !closed && (
                <>
                  {delivery?.status === 'pending' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy || disabled}
                      onClick={() => open('withdrawDelivery')}
                    >
                      Withdraw delivery
                    </Button>
                  ) : (
                    <>
                      {!(delivery?.status === 'accepted' && matching) && (
                        <Button
                          size="sm"
                          disabled={
                            busy || disabled || approval?.status !== 'approved' || !design.shared
                          }
                          onClick={() => open('deliver')}
                        >
                          Submit final delivery
                        </Button>
                      )}
                      {delivery?.status === 'accepted' && (
                        <Button
                          size="sm"
                          disabled={busy || disabled || !review.canComplete}
                          onClick={() => open('complete')}
                        >
                          Complete project
                        </Button>
                      )}
                    </>
                  )}
                  {approval?.status !== 'approved' && (
                    <p className="text-xs text-muted">
                      Client approval required for final delivery.
                    </p>
                  )}
                  {delivery?.status === 'accepted' && !review.canComplete && (
                    <p className="text-xs text-muted">
                      Complete all project tasks before closing the project.
                    </p>
                  )}
                </>
              )
            : delivery?.status === 'pending' &&
              matching && (
                <>
                  <Button size="sm" disabled={busy || disabled} onClick={() => open('accept')}>
                    Accept final delivery
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy || disabled}
                    onClick={() => open('deliveryChanges')}
                  >
                    Request changes
                  </Button>
                </>
              )}
        </div>
      </section>
      <SignoffHistory review={review} />
      <Modal
        open={Boolean(action)}
        title={discard ? 'Discard response?' : titles[action]}
        description={
          ['accept', 'deliveryChanges', 'withdrawDelivery', 'complete'].includes(action)
            ? delivery?.designTitle
            : design.title
        }
        onClose={() => (discard ? setDiscard(false) : close())}
        footer={
          discard ? (
            <>
              <Button variant="secondary" onClick={() => setDiscard(false)}>
                Keep editing
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setAction(null)
                  setNote('')
                  onDraftChange(false)
                }}
              >
                Discard changes
              </Button>
            </>
          ) : null
        }
      >
        {!discard && (
          <form onSubmit={submit} className="space-y-5">
            {action === 'complete' ? (
              <p className="text-sm">Mark this project as completed?</p>
            ) : (
              <label className="block text-sm font-medium">
                {needsChanges ? 'Required changes' : 'Note (optional)'}
                <textarea
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value)
                    onDraftChange(Boolean(event.target.value.trim()))
                  }}
                  rows={4}
                  maxLength={2000}
                  required={needsChanges}
                  disabled={busy}
                  className="mt-2 w-full rounded-xl border border-border bg-surface p-3 text-sm"
                />
              </label>
            )}
            {attempted && error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary" disabled={busy} onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={needsChanges && !note.trim()}>
                {titles[action]}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </Card>
  )
}

export function SignoffHistory({ review }) {
  const history = [
    ...review.approvalHistory.map((item) => ({ ...item, type: 'Version approval' })),
    ...review.deliveries.map((item) => ({ ...item, type: 'Final delivery' })),
  ].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  return (
    <>
      {history.length > 0 && (
        <details className="border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium">
            Approval & delivery history
          </summary>
          <ol className="mt-4 max-h-72 space-y-4 overflow-y-auto">
            {history.map((item) => (
              <li key={item.id} className="rounded-xl border border-border p-4 text-xs leading-6">
                <p className="font-semibold">
                  {item.type} · {item.designTitle}
                </p>
                <p>
                  {labels[item.status]} · {item.clientName}
                </p>
                <p>
                  Submitted by {item.submittedByName} ·{' '}
                  {new Date(item.submittedAt).toLocaleString()}
                </p>
                {item.note && <p className="whitespace-pre-wrap wrap-break-word">{item.note}</p>}
                {item.respondedAt && (
                  <p>
                    {item.respondedByName} · {new Date(item.respondedAt).toLocaleString()}
                  </p>
                )}
                {item.message && (
                  <p className="whitespace-pre-wrap wrap-break-word">{item.message}</p>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  )
}
