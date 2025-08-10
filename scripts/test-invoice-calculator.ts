import { applyDiscountAndTax } from '../server/services/invoice';

function test(label: string, fn: () => void) {
  try { fn(); console.log(`PASS: ${label}`); } catch (e) { console.error(`FAIL: ${label}`, e); }
}

// Base cases
test('no options -> round to nearest', () => {
  const out = applyDiscountAndTax(1234.56);
  if (out !== Math.round(1234.56)) throw new Error(`expected ${Math.round(1234.56)}, got ${out}`);
});

// Discounts
test('10% discount', () => {
  const out = applyDiscountAndTax(1000, { discountPercent: 10 });
  if (out !== 900) throw new Error(`expected 900, got ${out}`);
});

// Tax
test('9% tax', () => {
  const out = applyDiscountAndTax(1000, { taxPercent: 9 });
  if (out !== 1090) throw new Error(`expected 1090, got ${out}`);
});

// Discount then tax
test('10% discount then 9% tax', () => {
  const out = applyDiscountAndTax(1000, { discountPercent: 10, taxPercent: 9 });
  if (out !== Math.round(1000 * 0.9 * 1.09)) throw new Error(`expected ${Math.round(1000 * 0.9 * 1.09)}, got ${out}`);
});

// Rounding modes
test('floor rounding', () => {
  const out = applyDiscountAndTax(1000.9, { rounding: 'floor' });
  if (out !== 1000) throw new Error(`expected 1000, got ${out}`);
});

test('ceil rounding', () => {
  const out = applyDiscountAndTax(1000.1, { rounding: 'ceil' });
  if (out !== 1001) throw new Error(`expected 1001, got ${out}`);
});

console.log('All calculator tests executed');
