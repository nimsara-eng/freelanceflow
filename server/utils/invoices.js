import { record } from './authValidation.js'
import { cleanText, currency, integer, id } from './workspace.js'
import { parseDate } from './projectValidation.js'
import { httpError } from './httpError.js'
export function invoiceFields(body, create = false) {
  record(body, [
    'version',
    ...(create ? ['projectId'] : []),
    'currency',
    'senderName',
    'senderDetails',
    'billToName',
    'billToDetails',
    'issueDate',
    'dueDate',
    'items',
    'discountCents',
    'taxBasisPoints',
    'notes',
  ])
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30)
    throw httpError(400, 'Add between 1 and 30 invoice items.')
  const items = body.items.map((item) => {
    record(item, ['description', 'quantityUnits', 'unitPriceCents'])
    const quantityUnits = integer(item.quantityUnits, 'Quantity', 1, 1000000),
      unitPriceCents = integer(item.unitPriceCents, 'Unit price', 0, 100000000)
    return {
      description: cleanText(item.description, 'Item description', 240, 1),
      quantityUnits,
      unitPriceCents,
      amountCents: Math.round((quantityUnits * unitPriceCents) / 100),
    }
  })
  const subtotalCents = items.reduce((sum, item) => sum + item.amountCents, 0)
  integer(subtotalCents, 'Subtotal', 1, 10000000000)
  const discountCents = integer(body.discountCents ?? 0, 'Discount', 0, subtotalCents),
    taxBasisPoints = integer(body.taxBasisPoints ?? 0, 'Tax percentage', 0, 10000),
    taxCents = Math.round(((subtotalCents - discountCents) * taxBasisPoints) / 10000),
    totalCents = subtotalCents - discountCents + taxCents
  integer(totalCents, 'Total', 1, 10000000000)
  const issueDate = parseDate(body.issueDate),
    dueDate = parseDate(body.dueDate)
  if (dueDate < issueDate) throw httpError(400, 'Invoice due date cannot precede its issue date.')
  return {
    ...(create ? { project: id(body.projectId, 'Project') } : {}),
    currency: currency(body.currency),
    senderName: cleanText(body.senderName, 'Sender name', 120, 2),
    senderDetails: cleanText(body.senderDetails ?? '', 'Sender details', 1000),
    billToName: cleanText(body.billToName, 'Bill-to name', 120, 2),
    billToDetails: cleanText(body.billToDetails ?? '', 'Bill-to details', 1000),
    issueDate,
    dueDate,
    items,
    subtotalCents,
    discountCents,
    taxBasisPoints,
    taxCents,
    totalCents,
    notes: cleanText(body.notes ?? '', 'Notes', 2000),
  }
}
export function invoiceDto(item, viewer) {
  return {
    id: String(item._id),
    projectId: String(item.project),
    projectName: item.projectName,
    recipientName: item.recipientName ?? item.billToName,
    number: item.number,
    status: item.status,
    currency: item.currency,
    senderName: item.senderName,
    senderDetails: item.senderDetails,
    billToName: item.billToName,
    billToDetails: item.billToDetails,
    issueDate: item.issueDate,
    dueDate: item.dueDate,
    items: item.items,
    subtotalCents: item.subtotalCents,
    discountCents: item.discountCents,
    taxBasisPoints: item.taxBasisPoints,
    taxCents: item.taxCents,
    totalCents: item.totalCents,
    notes: item.notes,
    sentAt: item.sentAt,
    paidAt: item.paidAt,
    voidedAt: item.voidedAt,
    version: item.__v,
    isOwner: String(item.owner) === String(viewer),
  }
}
