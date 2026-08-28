export async function createOrder({ cartItems, customer, total, customerId }) {
  if (!cartItems?.length) {
    throw new Error("Cart is empty");
  }

  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartItems, customer }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to create order.");
  }

  return payload.order;
}
