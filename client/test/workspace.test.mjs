import test from 'node:test'
import assert from 'node:assert/strict'
import { decimalUnits, unitsInput } from '../src/features/billing/money.js'
import {
  addDays,
  dayIn,
  elapsed,
  monthDays,
  moveMonth,
  toUtc,
} from '../src/features/time/calendar.js'
test('amount inputs preserve cents and reject floating-point/exponent ambiguities', () => {
  assert.equal(decimalUnits('19.99'), 1999)
  assert.equal(decimalUnits('0.10'), 10)
  assert.equal(unitsInput(1999), '19.99')
  for (const input of ['1.999', '1e3', '-10', 'NaN', '']) assert.throws(() => decimalUnits(input))
})
test('calendar has six full Monday-first weeks across leap days and year boundaries', () => {
  const days = monthDays('2027-01')
  assert.equal(days.length, 42)
  assert.equal(days[0], '2026-12-28')
  assert.equal(days.at(-1), '2027-02-07')
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
  assert.equal(moveMonth('2026-12', 1), '2027-01')
})
test('Colombo and UTC inputs round-trip across midnight without using the host timezone', () => {
  assert.equal(toUtc('2026-11-02T00:15', 'Asia/Colombo'), '2026-11-01T18:45:00.000Z')
  assert.equal(dayIn('2026-11-01T20:00:00Z', 'Asia/Colombo'), '2026-11-02')
  assert.equal(dayIn('2026-11-01T20:00:00Z', 'UTC'), '2026-11-01')
  assert.equal(elapsed('2026-11-01T10:00:00Z', '2026-11-01T11:01:01Z'), '1h 1m 1s')
})
