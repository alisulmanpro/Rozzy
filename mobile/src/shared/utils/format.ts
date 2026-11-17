function groupThousands(value: number, fractionDigits = 0): string {
  const fixed = value.toFixed(fractionDigits);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatRupeesWhole(amount: number): string {
  return `Rs. ${groupThousands(Math.round(amount))}`;
}

export function formatMoney(amount: number): string {
  return `Rs ${groupThousands(Math.round(amount))}`;
}

export function formatRupees(amount: number): string {
  return `Rs. ${groupThousands(amount, 2)}`;
}
