import { money, unitsInput } from './money'
export default function InvoiceDocument({ invoice }) {
  const item = invoice
  return (
    <article className="invoice-document space-y-7 rounded-2xl bg-white p-5 text-[#1b1235] sm:p-9">
      <header className="flex flex-wrap justify-between gap-5 border-b border-[#e4dcff] pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7c3aed]">
            FreelanceFlow
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Invoice</h2>
          <p className="mt-2 text-xs">{item.number}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold uppercase">{item.status}</p>
          <p className="mt-2">Issued: {item.issueDate}</p>
          <p className="mt-1">Due: {item.dueDate}</p>
          <p className="mt-1">Currency: {item.currency}</p>
        </div>
      </header>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-xs uppercase text-[#6b6490]">From</h3>
          <p className="mt-2 wrap-break-word font-semibold">{item.senderName}</p>
          <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6">
            {item.senderDetails}
          </p>
        </div>
        <div>
          <h3 className="text-xs uppercase text-[#6b6490]">Bill to</h3>
          <p className="mt-2 wrap-break-word font-semibold">{item.billToName}</p>
          <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6">
            {item.billToDetails}
          </p>
        </div>
      </div>
      <p className="text-xs text-[#6b6490]">
        Delivered to account: {item.recipientName ?? item.billToName}
      </p>
      <p className="wrap-break-word text-sm">
        <strong>Project:</strong> {item.projectName}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#e4dcff]">
              <th className="py-3 pr-3">Description</th>
              <th className="py-3 pr-3 text-right">Qty</th>
              <th className="py-3 pr-3 text-right">Rate</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {item.items.map((line, index) => (
              <tr key={index} className="border-b border-[#e4dcff]">
                <td className="min-w-28 whitespace-pre-wrap wrap-break-word py-4 pr-3">
                  {line.description}
                </td>
                <td className="py-4 pr-3 text-right">{unitsInput(line.quantityUnits)}</td>
                <td className="whitespace-nowrap py-4 pr-3 text-right">
                  {money(line.unitPriceCents, item.currency)}
                </td>
                <td className="whitespace-nowrap py-4 text-right">
                  {money(line.amountCents, item.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto max-w-sm space-y-3 text-sm">
        {[
          ['Subtotal', item.subtotalCents],
          ['Discount', item.discountCents ? -item.discountCents : 0],
          [`Tax (${unitsInput(item.taxBasisPoints)}%)`, item.taxCents],
          ['Total', item.totalCents],
        ].map(([label, value]) => (
          <div
            key={label}
            className={`flex justify-between gap-4 ${label === 'Total' ? 'border-t border-[#e4dcff] pt-4 text-lg font-semibold' : ''}`}
          >
            <dt>{label}</dt>
            <dd>{money(value, item.currency)}</dd>
          </div>
        ))}
      </dl>
      {item.notes && (
        <div>
          <h3 className="text-xs uppercase text-[#6b6490]">Notes & payment instructions</h3>
          <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-7">{item.notes}</p>
        </div>
      )}
      {item.status === 'paid' && (
        <p className="text-sm">
          Marked paid by the freelancer on {new Date(item.paidAt).toLocaleDateString()}. Payment was
          recorded manually.
        </p>
      )}
      {item.status === 'void' && (
        <p className="text-sm">This invoice is void. No payment is requested.</p>
      )}
      {item.status === 'draft' && (
        <p className="text-sm">Draft — not yet delivered to the client.</p>
      )}
    </article>
  )
}
