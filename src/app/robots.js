// src/app/robots.js
import { getStore } from "@/lib/content.server";

export default function robots() {
  const store = getStore();
  const base = (store.business.domain || "https://YOURDOMAIN.com").replace(
    /\/$/,
    "",
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
