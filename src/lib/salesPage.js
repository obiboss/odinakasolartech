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
      cta_label: "",
    },
    video: { enabled: false, heading: "", caption: "", videos: [] },
    bonuses: {
      enabled: false,
      eyebrow: "",
      heading: "",
      intro: "",
      image_url: "",
      note: "",
      progress_text: "",
      progress_percent: "",
      items: [item("bonus-1")],
    },
    problem: {
      enabled: false,
      eyebrow: "",
      heading: "",
      body: "",
      image_url: "",
      content: "",
      button_text: "",
      points: [item("problem-1")],
    },
    capabilities: { enabled: false, eyebrow: "", heading: "", intro: "", image_url: "", summary: "", items: [], video_url: "", video_platform: "" },
    benefits: {
      enabled: false,
      heading: "",
      content: "",
      intro: "",
      items: [item("benefit-1")],
    },
    education: {
      enabled: false,
      heading: "",
      image_url: "",
      content: "",
      button_text: "",
      intro: "",
      blocks: [item("education-1")],
    },
    testimonials: {
      enabled: false,
      heading: "",
      intro: "",
      items: [],
    },
    how_it_works: {
      enabled: false,
      heading: "",
      steps: [item("step-1"), item("step-2"), item("step-3")],
    },
    packages: {
      enabled: false,
      eyebrow: "",
      heading: "",
      intro: "",
    },
    delivery: {
      enabled: false,
      heading: "",
      content: "",
      button_text: "",
      text_below: "",
      body: "",
      points: [item("delivery-1")],
    },
    faq: { enabled: false, heading: "", items: [item("faq-1")] },
    final_cta: { enabled: false, heading: "", body: "", label: "" },
    guarantee: { enabled: false, heading: "", body: "" },
    shipping: { enabled: false, heading: "", body: "" },
    contact: { enabled: false, number_heading: "", heading: "", body: "", phone: "", whatsapp: "" },
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
