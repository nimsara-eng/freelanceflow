import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, SearchX } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { sampleProjects } from '../features/dashboard/sampleProjects'
import { sampleInvoices } from '../features/invoices/sampleInvoices'

const statusDetails = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'brand' },
  overdue: { label: 'Overdue', tone: 'danger' },
  paid: { label: 'Paid', tone: 'success' },
}

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  currencyDisplay: 'code',
})

function formatMoney(cents) {
  return currencyFormatter.format(cents / 100)
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function getInvoiceTotal(invoice) {
  return invoice.items.reduce(
    (total, item) => total + item.quantity * item.unitPriceCents,
    0,
  )
}

function getInvoiceStatus(invoice) {
  if (invoice.status === 'paid' || invoice.status === 'draft') {
    return invoice.status
  }

  // Due dates end at midnight in Sri Lanka time.
  const dueAt = new Date(
    `${invoice.dueDate}T23:59:59.999+05:30`,
  ).getTime()

  return Date.now() > dueAt ? 'overdue' : 'sent'
}

export default function Invoices() {
  const navigate = useNavigate()
  const filterId = useId()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

  const invoices = sampleInvoices.map((invoice) => {
    const project = sampleProjects.find(
      (item) => item.id === invoice.projectId,
    )

    return {
      ...invoice,
      projectName: project?.name ?? 'Unlinked project',
      client: project?.client ?? 'Unlinked client',
      totalCents: getInvoiceTotal(invoice),
      status: getInvoiceStatus(invoice),
    }
  })

  const searchTerm = search.trim().toLowerCase()

  const visibleInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      `${invoice.number} ${invoice.client} ${invoice.projectName}`
        .toLowerCase()
        .includes(searchTerm)

    const matchesStatus =
      status === 'all' || invoice.status === status

    return matchesSearch && matchesStatus
  })

  const selectedInvoice = invoices.find(
    (invoice) => invoice.id === selectedInvoiceId,
  )

  const outstandingCents = invoices
    .filter(
      (invoice) =>
        invoice.status === 'sent' || invoice.status === 'overdue',
    )
    .reduce((total, invoice) => total + invoice.totalCents, 0)

  const paidCents = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((total, invoice) => total + invoice.totalCents, 0)

  const draftCount = invoices.filter(
    (invoice) => invoice.status === 'draft',
  ).length

  function clearFilters() {
    setSearch('')
    setStatus('all')
  }

  function viewClientProjects() {
    if (!selectedInvoice) {
      return
    }

    const params = new URLSearchParams({
      client: selectedInvoice.client,
    })

    navigate(`/projects?${params.toString()}`)
  }

  return (
    <section className="space-y-7">
      <header>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Your business
        </p>

        <h1 className="text-4xl font-semibold tracking-tight">
          Invoices
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Keep project billing, due dates, and invoice details
          clearly organized.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="warning" dot>
          Sample workspace
        </Badge>

        <p className="text-xs text-muted">
          Illustrative invoices, amounts, and payment statuses.
        </p>
      </div>

      <dl className="grid gap-4 md:grid-cols-3">
        <Card>
          <dt className="text-sm text-muted">
            Outstanding
          </dt>
          <dd className="mt-4 wrap-break-words text-2xl font-semibold tracking-tight tabular-nums">
            {formatMoney(outstandingCents)}
          </dd>
          <p className="mt-2 text-xs text-muted">
            Sent and overdue invoices
          </p>
        </Card>

        <Card>
          <dt className="text-sm text-muted">
            Paid
          </dt>
          <dd className="mt-4 wrap-break-word text-2xl font-semibold tracking-tight tabular-nums">
            {formatMoney(paidCents)}
          </dd>
          <p className="mt-2 text-xs text-muted">
            Sample invoices marked paid
          </p>
        </Card>

        <Card>
          <dt className="text-sm text-muted">
            Draft invoices
          </dt>
          <dd className="mt-4 text-3xl font-semibold tabular-nums">
            {draftCount}
          </dd>
          <p className="mt-2 text-xs text-muted">
            Excluded from outstanding totals
          </p>
        </Card>
      </dl>

      <Card>
        <form
          role="search"
          aria-label="Filter invoices"
          onSubmit={(event) => event.preventDefault()}
          className="grid items-end gap-4 md:grid-cols-[1fr_13rem]"
        >
          <Input
            type="search"
            label="Search invoices"
            placeholder="Invoice number, client, or project"
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
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          Showing {visibleInvoices.length} of {invoices.length} invoices
        </p>

        {(search || status !== 'all') && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset filters
          </Button>
        )}
      </div>

      <Card>
        {visibleInvoices.length === 0 ? (
          <EmptyState
            icon={<SearchX size={24} />}
            title="No matching invoices"
            description="Try another search or change the status filter."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {visibleInvoices.map((invoice) => {
              const details = statusDetails[invoice.status]

              return (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-5 py-5"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">
                      {invoice.number}
                    </h2>

                    <p className="mt-1 text-sm text-text">
                      {invoice.client}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {invoice.projectName}
                    </p>
                  </div>

                  <div>
                    <Badge tone={details.tone} dot>
                      {details.label}
                    </Badge>

                    <p className="mt-2 text-xs text-muted">
                      Due {formatDate(invoice.dueDate)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(invoice.totalCents)}
                    </span>

                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`View invoice ${invoice.number}`}
                      onClick={() => setSelectedInvoiceId(invoice.id)}
                    >
                      View
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoiceId(null)}
        title={selectedInvoice?.number ?? 'Invoice details'}
        description="Sample invoice details"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSelectedInvoiceId(null)}
            >
              Close
            </Button>

            {selectedInvoice && (
              <Button onClick={viewClientProjects}>
                View client projects
                <ArrowUpRight size={16} aria-hidden="true" />
              </Button>
            )}
          </>
        }
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <Badge
              tone={statusDetails[selectedInvoice.status].tone}
              dot
            >
              {statusDetails[selectedInvoice.status].label}
            </Badge>

            <div>
              <p className="text-xs text-muted">Client</p>
              <p className="mt-1 text-lg font-semibold">
                {selectedInvoice.client}
              </p>
              <p className="mt-1 text-sm text-muted">
                {selectedInvoice.projectName}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-5">
              <div>
                <dt className="text-xs text-muted">Issued</dt>
                <dd className="mt-1 text-sm font-medium">
                  {formatDate(selectedInvoice.issuedDate)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted">Due date</dt>
                <dd className="mt-1 text-sm font-medium">
                  {formatDate(selectedInvoice.dueDate)}
                </dd>
              </div>
            </dl>

            <div className="overflow-x-auto">
              <table className="w-full min-w-md text-left text-sm">
                <caption className="sr-only">
                  Line items for {selectedInvoice.number}
                </caption>

                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Qty
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">
                      Unit price
                    </th>
                    <th scope="col" className="py-3 pl-3 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="py-4 pr-4">
                        {item.description}
                      </td>
                      <td className="px-3 py-4">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">
                        {formatMoney(item.unitPriceCents)}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 text-right tabular-nums">
                        {formatMoney(item.quantity * item.unitPriceCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium">
                Total
              </span>

              <strong className="text-xl font-semibold tabular-nums">
                {formatMoney(selectedInvoice.totalCents)}
              </strong>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}