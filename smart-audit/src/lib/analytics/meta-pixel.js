export function hasMetaPixel() {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

export function trackPageView() {
  if (!hasMetaPixel()) return;

  window.fbq("track", "PageView");
}

export function trackViewContent({
  contentId,
  contentName,
  value,
  currency = "NGN",
}) {
  if (!hasMetaPixel()) return;

  window.fbq("track", "ViewContent", {
    content_type: "product",
    content_ids: [String(contentId)],
    content_name: contentName,
    value: Number(value || 0),
    currency,
  });
}

export function trackAddToCart({
  contentId,
  contentName,
  value,
  quantity = 1,
  currency = "NGN",
}) {
  if (!hasMetaPixel()) return;

  window.fbq("track", "AddToCart", {
    content_type: "product",
    content_ids: [String(contentId)],
    content_name: contentName,
    value: Number(value || 0),
    currency,
    num_items: Number(quantity || 1),
  });
}

export function trackInitiateCheckout({
  contentIds,
  value,
  numItems,
  currency = "NGN",
}) {
  if (!hasMetaPixel()) return;

  window.fbq("track", "InitiateCheckout", {
    content_type: "product",
    content_ids: contentIds.map(String),
    value: Number(value || 0),
    currency,
    num_items: Number(numItems || contentIds.length),
  });
}

export function trackPurchase({
  orderId,
  contentIds,
  value,
  numItems,
  currency = "NGN",
}) {
  if (!hasMetaPixel()) return;

  window.fbq("track", "Purchase", {
    content_type: "product",
    content_ids: contentIds.map(String),
    value: Number(value || 0),
    currency,
    num_items: Number(numItems || contentIds.length),
    order_id: String(orderId),
  });
}

export function trackBankTransferSubmitted({
  orderId,
  value,
  currency = "NGN",
}) {
  if (!hasMetaPixel()) return;

  window.fbq("trackCustom", "BankTransferSubmitted", {
    order_id: String(orderId),
    value: Number(value || 0),
    currency,
  });
}
