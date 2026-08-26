// src/lib/formatCurrency.js

export function formatCurrency(value) {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}
