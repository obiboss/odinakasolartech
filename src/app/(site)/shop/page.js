// src/app/(site)/shop/page.js

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import Container from "@/components/ui/Container";
import ShopClient from "@/components/shop/ShopClient.client";

export const metadata = {
  title: "Shop Solar Products in Nigeria — Odinaka Solar Tech",
  description:
    "Shop solar panels, inverters, lithium batteries, charge controllers, cables, breakers and solar accessories in Nigeria.",
  alternates: {
    canonical: "https://www.odinakachukwusolartech.com/shop",
  },
  openGraph: {
    title: "Shop Solar Products in Nigeria — Odinaka Solar Tech",
    description:
      "Shop solar panels, inverters, lithium batteries, charge controllers, cables, breakers and solar accessories in Nigeria.",
    url: "https://www.odinakachukwusolartech.com/shop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Solar Products in Nigeria — Odinaka Solar Tech",
    description:
      "Shop solar panels, inverters, lithium batteries, charge controllers, cables, breakers and solar accessories in Nigeria.",
  },
};

export const revalidate = 300;

const PAGE_SIZE = 24;

/*
CACHE CATEGORY QUERY
Categories rarely change, so we cache them
*/
const getCategories = cache(async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("name", { ascending: true });

  if (error) {
    console.log("SUPABASE ERROR (categories):", error);
    return [];
  }

  return data || [];
});

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;

  const cat = sp?.cat || "all";
  const q = (sp?.q || "").trim();
  const page = Number(sp?.page || 1);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  /*
  SINGLE CATEGORY FETCH
  */
  const allCategories = await getCategories();

  /*
  TOP-LEVEL CATEGORIES ONLY
  These are the ones we want to expose as SEO landing-page entry points.
  */
  const categories = allCategories.filter((c) => !c.parent_id);

  /*
  DETERMINE CATEGORY FILTER
  If a top-level category is selected by ?cat=,
  include its direct children as well.
  */
  let categoryIds = [];

  if (cat !== "all") {
    const children = allCategories
      .filter((c) => c.parent_id === cat)
      .map((c) => c.id);

    categoryIds = [cat, ...children];
  }

  /*
  PRODUCT QUERY
  */
  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      currency,
      category_id,
      short_description,
      featured,
      created_at,
      images:product_images (
        image_url,
        sort_order
      )
    `,
      { count: "exact" },
    )
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "product_images", ascending: true })
    .range(from, to);

  if (categoryIds.length) {
    query = query.in("category_id", categoryIds);
  }

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data: products, count, error } = await query;

  if (error) {
    console.log("SUPABASE ERROR (products):", error);
  }

  return (
    <Container className="py-8 sm:py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <ShopClient
          initialProducts={products || []}
          categories={categories || []}
          totalProducts={count || 0}
          page={page}
          pageSize={PAGE_SIZE}
          initialCat={cat}
          initialQ={q}
        />
      </div>
    </Container>
  );
}
