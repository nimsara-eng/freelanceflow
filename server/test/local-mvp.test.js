import test from 'node:test'
import assert from 'node:assert/strict'
import { invoiceFields } from '../utils/invoices.js'
import { interval, withTimeLock } from '../utils/workTime.js'
const draft = () => ({
  projectId: '507f1f77bcf86cd799439011',
  senderName: 'Alex River',
  billToName: 'QA client',
  currency: 'USD',
  issueDate: '2026-10-30',
  dueDate: '2026-11-05',
  items: [{ description: 'Design work', quantityUnits: 150, unitPriceCents: 1999 }],
  discountCents: 100,
  taxBasisPoints: 1250,
})
test('invoice money is server-derived with integer cents, fractional quantities and discount-before-tax', () => {
  const result = invoiceFields(draft(), true)
  assert.equal(result.subtotalCents, 2999)
  assert.equal(result.taxCents, 362)
  assert.equal(result.totalCents, 3261)
  assert.equal(invoiceFields({ ...draft(), currency: 'LKR' }, true).currency, 'LKR')
  for (const body of [
    { ...draft(), totalCents: 1 },
    { ...draft(), discountCents: 999999 },
    { ...draft(), taxBasisPoints: 10001 },
    { ...draft(), currency: 'BTC' },
    { ...draft(), items: [{ description: 'item', quantityUnits: 1.5, unitPriceCents: 100 }] },
    { ...draft(), dueDate: '2026-10-29' },
  ])
    assert.throws(() => invoiceFields(body, true))
})
test('planning uses half-open quarter-hour intervals and rejects invalid spans', () => {
  const first = interval('2026-11-01T09:00:00Z', '2026-11-01T10:00:00Z', true),
    next = interval('2026-11-01T10:00:00Z', '2026-11-01T10:15:00Z', true)
  assert.equal(first.slots.length, 4)
  assert.ok(!first.slots.includes(next.slots[0]))
  for (const pair of [
    ['2026-11-01T09:01:00Z', '2026-11-01T10:00:00Z'],
    ['2026-11-01T09:00:00Z', '2026-11-01T09:00:00Z'],
    ['2026-11-01T09:00:00Z', '2026-11-02T09:00:00Z'],
  ])
    assert.throws(() => interval(...pair, true))
})
test('time mutations serialize per owner and release after errors', async () => {
  const order = []
  await Promise.allSettled([
    withTimeLock('qa', async () => {
      order.push(1)
      await new Promise((resolve) => setTimeout(resolve, 15))
      order.push(2)
      throw Error('intentional')
    }),
    withTimeLock('qa', async () => order.push(3)),
  ])
  assert.deepEqual(order, [1, 2, 3])
  await withTimeLock('qa', async () => order.push(4))
  assert.equal(order.at(-1), 4)
})
