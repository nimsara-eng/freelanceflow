import { useRef, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { useAuth } from '../features/auth/useAuth'
import { api } from '../features/auth/api'
import { useProjects } from '../features/projects/useProjects'
import { money } from '../features/billing/money'
import InvoiceEditor from '../features/billing/InvoiceEditor'
import InvoiceDocument from '../features/billing/InvoiceDocument'
const tones = { draft: 'neutral', sent: 'brand', paid: 'success', void: 'neutral' }
export default function Invoices() {
  const { workspace } = useAuth(),
    box = workspace === 'freelancer' ? 'issued' : 'received'
  const [status, setStatus] = useState('all'),
    [pageState, setPage] = useState({ key: '', page: 1 }),
    [selected, setSelected] = useState(null),
    [editor, setEditor] = useState(null),
    [action, setAction] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const locked = useRef(false),
    key = `${box}:${status}`,
    page = pageState.key === key ? pageState.page : 1
  const {
    data,
    loading,
    error: loadError,
    refresh,
  } = useProjects(new URLSearchParams({ box, status, page: String(page) }).toString(), '/invoices')
  async function apply() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api(`/invoices/${selected.id}${action === 'delete' ? '' : '/action'}`, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        body: { version: selected.version, ...(action === 'delete' ? {} : { action }) },
      })
      setSelected(result.invoice ?? null)
      setAction(null)
      refresh()
    } catch (failure) {
      setError(failure.message)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Billing
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            {box === 'issued' ? 'Invoices' : 'Your invoices'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            {box === 'issued'
              ? 'Create, review and send client invoices.'
              : 'View invoices from your freelancers.'}
          </p>
        </div>
        {box === 'issued' && (
          <Button onClick={() => setEditor({ invoice: null })}>
            <Plus size={18} />
            New invoice
          </Button>
        )}
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="ml-3 min-h-11 rounded-xl border border-border bg-surface px-3"
          >
            <option value="all">All statuses</option>
            {Object.keys(tones)
              .filter((value) => box === 'issued' || value !== 'draft')
              .map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
          </select>
        </label>
        <Button variant="ghost" onClick={refresh}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <p role="status">Loading invoices…</p>
      ) : loadError ? (
        <p role="alert">{loadError}</p>
      ) : data.invoices.length ? (
        <ul className="grid gap-5 lg:grid-cols-2">
          {data.invoices.map((item) => (
            <li key={item.id}>
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <FileText size={23} className="text-brand" />
                  <Badge tone={tones[item.status]}>{item.status}</Badge>
                </div>
                <h2 className="mt-5 wrap-break-word text-xl font-semibold">{item.projectName}</h2>
                <p className="mt-2 text-xs text-muted">{item.number}</p>
                <p className="mt-4 text-3xl font-semibold">
                  {money(item.totalCents, item.currency)}
                </p>
                <p className="mt-3 text-sm text-muted">
                  {box === 'issued' ? `To ${item.billToName}` : `From ${item.senderName}`}
                </p>
                <p className="mt-2 text-xs text-muted">Payment due {item.dueDate}</p>
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={() => {
                    setError('')
                    setSelected(item)
                  }}
                >
                  View invoice
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold">
            No {status === 'all' ? '' : `${status} `}invoices yet
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            {box === 'issued'
              ? 'Connect a client to a project, then create your first invoice draft.'
              : 'Your freelancer’s sent invoices will appear here.'}
          </p>
        </Card>
      )}
      {data && data.pagination.pages > 1 && (
        <nav aria-label="Invoice pages" className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage({ key, page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm">
            {page} / {data.pagination.pages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage({ key, page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
      <Modal
        open={Boolean(selected)}
        title={
          action
            ? `${action === 'send' ? 'Send to client' : action === 'paid' ? 'Record payment' : action === 'void' ? 'Void invoice' : 'Delete draft'}?`
            : 'Invoice details'
        }
        size="xl"
        onClose={() => {
          if (!busy) {
            if (action) setAction(null)
            else setSelected(null)
          }
        }}
        footer={
          selected &&
          (action ? (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button
                loading={busy}
                variant={action === 'delete' || action === 'void' ? 'danger' : 'primary'}
                onClick={apply}
              >
                {action === 'send'
                  ? 'Send to client'
                  : action === 'paid'
                    ? 'Mark as paid'
                    : action === 'void'
                      ? 'Void invoice'
                      : 'Delete draft'}
              </Button>
            </>
          ) : (
            <>
              <a
                href={`/invoices/${selected.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold text-brand"
              >
                Print / Save as PDF
              </a>
              {selected.isOwner && selected.status === 'draft' && (
                <>
                  <Button variant="ghost" onClick={() => setAction('delete')}>
                    Delete draft
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditor({ invoice: selected })
                      setSelected(null)
                    }}
                  >
                    Edit draft
                  </Button>
                  <Button onClick={() => setAction('send')}>Send to client</Button>
                </>
              )}
              {selected.isOwner && selected.status === 'sent' && (
                <>
                  <Button variant="ghost" onClick={() => setAction('void')}>
                    Void invoice
                  </Button>
                  <Button onClick={() => setAction('paid')}>Mark as paid</Button>
                </>
              )}
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </>
          ))
        }
      >
        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error}
          </p>
        )}
        {selected &&
          (action ? (
            <div>
              <p className="mb-4 rounded-xl bg-brand/5 p-4 text-sm leading-7">
                <strong>{selected.number}</strong>
                <br />
                {selected.projectName}
                <br />
                Delivery account: {selected.recipientName ?? selected.billToName}
                <br />
                Total: {money(selected.totalCents, selected.currency)}
              </p>
              <p className="text-sm leading-7 text-muted">
                {action === 'send'
                  ? 'Send this invoice to the connected client? Sent invoices cannot be edited.'
                  : action === 'paid'
                    ? 'Record payment received for this invoice.'
                    : action === 'void'
                      ? 'The client will see this invoice as void. Its history will be preserved.'
                      : 'This private draft will be permanently deleted.'}
              </p>
            </div>
          ) : (
            <InvoiceDocument invoice={selected} />
          ))}
      </Modal>
      {editor && (
        <InvoiceEditor
          {...editor}
          onClose={() => setEditor(null)}
          onSaved={(invoice) => {
            setEditor(null)
            setSelected(invoice)
            refresh()
          }}
        />
      )}
    </section>
  )
}
