// src/app/sitemap.js
import { getProducts, getStore } from "@/lib/content.server";

export default function sitemap() {
  const store = getStore();
  const base = (store.business.domain || "https://YOURDOMAIN.com").replace(
    /\/$/,
    "",
  );

  const now = new Date();

  const staticRoutes = ["", "/shop", "/about", "/contact"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.8,
  }));

  // IMPORTANT: use slug, not id
  const productRoutes = (getProducts() || [])
    .filter((p) => p?.slug) // skip broken products
    .map((p) => ({
      url: `${base}/shop/${p.slug}`,
      lastModified: p?.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...productRoutes];
}
