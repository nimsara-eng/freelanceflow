import { useParams } from 'react-router-dom'
import { useProjects } from '../features/projects/useProjects'
import InvoiceDocument from '../features/billing/InvoiceDocument'
import Button from '../components/ui/Button'
export default function PrintInvoice() {
  const { invoiceId } = useParams(),
    { data, error, loading, refresh } = useProjects(
      '',
      `/invoices/${encodeURIComponent(invoiceId)}`,
    )
  return (
    <main className="mx-auto max-w-4xl p-4">
      <style>{`@media print{@page{size:A4;margin:15mm}body{background:white!important}.print-controls{display:none!important}.invoice-document{padding:0!important;border:0!important}tr{break-inside:avoid}thead{display:table-header-group}main{padding:0!important;max-width:none!important}}`}</style>
      <div className="print-controls mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm">Use the print dialog to print or Save as PDF.</p>
        <Button disabled={!data?.invoice} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>
      {loading ? (
        <p role="status">Loading invoice…</p>
      ) : error ? (
        <div>
          <p role="alert">{error}</p>
          <Button onClick={refresh}>Try again</Button>
        </div>
      ) : (
        <InvoiceDocument invoice={data.invoice} />
      )}
    </main>
  )
}
