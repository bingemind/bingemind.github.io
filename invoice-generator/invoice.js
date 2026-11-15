// Invoice totals. Pure, tested in tests/calcs.test.mjs.
export function totals(items, taxRate, discountPct, shipping = 0) {
  const lines = items.map((it) => ({ ...it, amount: Math.round((Number(it.qty) || 0) * (Number(it.price) || 0) * 100) / 100 }));
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const discount = Math.round(subtotal * (discountPct || 0)) / 100;
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * (taxRate || 0)) / 100;
  const total = Math.round((taxable + tax + (Number(shipping) || 0)) * 100) / 100;
  return { lines, subtotal, discount, tax, total };
}
