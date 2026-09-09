export const SALES_PAGE_SECTIONS = [
  "urgency",
  "hero",
  "video",
  "bonuses",
  "problem",
  "capabilities",
  "benefits",
  "education",
  "testimonials",
  "how_it_works",
  "packages",
  "delivery",
  "purchase",
  "faq",
  "final_cta",
  "guarantee",
  "shipping",
  "contact",
];

function item(id, values = {}) {
  return { id, ...values };
}

export function createDefaultSalesPageContent() {
  return {
    urgency: {
      enabled: false,
      units_left: "",
      message: "",
      promo_message: "",
      deadline: "",
    },
    hero: {
      enabled: false,
      eyebrow: "",
      headline: "",
      subheadline: "",
      promise: "",
      cta_label: "Get this offer",
    },
    video: { enabled: false, heading: "Customer video testimonials", caption: "", videos: [] },
    bonuses: {
      enabled: false,
      heading: "Everything included with your order",
      intro: "",
      items: [item("bonus-1")],
    },
    problem: {
      enabled: false,
      eyebrow: "",
      heading: "",
      body: "",
      points: [item("problem-1")],
    },
    capabilities: { enabled: false, heading: "What can it power?", intro: "", video_url: "", video_platform: "" },
    benefits: {
      enabled: false,
      heading: "",
      intro: "",
      items: [item("benefit-1")],
    },
    education: {
      enabled: false,
      heading: "",
      intro: "",
      blocks: [item("education-1")],
    },
    testimonials: {
      enabled: false,
      heading: "What our customers say",
      intro: "",
      items: [],
    },
    how_it_works: {
      enabled: false,
      heading: "How it works",
      steps: [item("step-1"), item("step-2"), item("step-3")],
    },
    packages: {
      enabled: false,
      eyebrow: "",
      heading: "",
      intro: "",
    },
    delivery: { enabled: false, heading: "Delivery and purchase information", body: "", points: [item("delivery-1")] },
    faq: { enabled: false, heading: "Frequently asked questions", items: [item("faq-1")] },
    final_cta: { enabled: false, heading: "Ready to get reliable power?", body: "", label: "Order now" },
    guarantee: { enabled: false, heading: "Our guarantee", body: "" },
    shipping: { enabled: false, heading: "Shipping", body: "" },
    contact: { enabled: false, heading: "Need help choosing?", body: "", phone: "", whatsapp: "" },
  };
}

function mergeSection(defaultSection, value) {
  if (!value || typeof value !== "object") return defaultSection;
  const merged = { ...defaultSection, ...value };

  for (const key of ["items", "points", "blocks", "steps", "videos"]) {
    if (Array.isArray(value[key])) merged[key] = value[key];
  }

  return merged;
}

export function normalizeSalesPageContent(value) {
  const defaults = createDefaultSalesPageContent();
  const source = value && typeof value === "object" ? value : {};

  return Object.fromEntries(
    Object.entries(defaults).map(([key, section]) => [
      key,
      mergeSection(section, source[key]),
    ]),
  );
}

// A saved record is not enough to switch presentation sources: the admin may
// have created an empty record while editing a product. Only an explicitly
// enabled section counts as published sales-page content, so the legacy
// product description remains the visual fallback until the new page is used.
export function hasActiveSalesPageContent(value) {
  const content = normalizeSalesPageContent(value);
  return Object.values(content).some((section) => section?.enabled === true);
}

export function getSalesPageRecord(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === "object" ? value : null;
}

export function hasText(value) {
  return String(value || "").trim().length > 0;
}

export function hasRepeatableContent(items, fields = ["title", "name", "question", "body", "description"]) {
  return Array.isArray(items) && items.some((entry) =>
    fields.some((field) => hasText(entry?.[field])),
  );
}
