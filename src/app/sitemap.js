import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://www.odinakachukwusolartech.com";

export default async function sitemap() {
  const supabase = await createClient();

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("slug, updated_at, created_at")
    .eq("active", true)
    .not("slug", "is", null)
    .order("created_at", { ascending: false });

  if (productsError) {
    console.log("SUPABASE ERROR (sitemap products):", productsError);
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("slug")
    .not("slug", "is", null)
    .order("name", { ascending: true });

  if (categoriesError) {
    console.log("SUPABASE ERROR (sitemap categories):", categoriesError);
  }

  const now = new Date();

  const staticRoutes = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const categoryRoutes = (categories || []).map((category) => ({
    url: `${SITE_URL}/shop/category/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes = (products || []).map((product) => ({
    url: `${SITE_URL}/shop/${product.slug}`,
    lastModified: product.updated_at
      ? new Date(product.updated_at)
      : product.created_at
        ? new Date(product.created_at)
        : now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
