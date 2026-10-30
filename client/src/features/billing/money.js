export function decimalUnits(value) {
  if (typeof value !== 'string' || !/^\d{1,8}(?:\.\d{1,2})?$/.test(value))
    throw new Error('Enter a positive amount with up to two decimal places.')
  const [whole, fraction = ''] = value.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
export const unitsInput = (value) => (value / 100).toFixed(2)
export const money = (cents, currency = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100)
