export function whatsappLink({ phone, message }) {
  const clean = (phone || "").replace(/[^\d+]/g, "");
  const text = encodeURIComponent(message || "");
  // wa.me is the most reliable format on mobile + desktop
  return `https://wa.me/${clean.replace("+", "")}?text=${text}`;
}

export function buildOrderMessage({ businessName, product, quantity = 1 }) {
  const lines = [
    `Hello ${businessName}, I want to order:`,
    `• Product: ${product.name}`,
    `• Quantity: ${quantity}`,
    `• Product ID: ${product.id}`,
    `Please send price + availability + delivery options.`,
  ];
  return lines.join("\n");
}
