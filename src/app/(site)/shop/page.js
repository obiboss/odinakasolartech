// src/app/(site)/shop/page.js

import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { publicSupabase } from "@/lib/supabase/public.server";
import Container from "@/components/ui/Container";
import ShopClient from "@/components/shop/ShopClient.client";
import { normalizeProductRecord } from "@/lib/supabase/storage";

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
const MAX_PAGE = Math.floor((Number.MAX_SAFE_INTEGER + 1) / PAGE_SIZE);
const LISTING_SORT = "featured-desc-created-desc";

function getSearchParam(value) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === "string" ? firstValue.trim() : "";
}

function normalizePage(value) {
  const pageValue = getSearchParam(value);
  if (!/^\d+$/.test(pageValue)) return 1;

  const page = Number(pageValue);
  return Number.isSafeInteger(page) && page > 0 && page <= MAX_PAGE ? page : 1;
}

/*
CACHE CATEGORY QUERY
Categories rarely change, so we cache them
*/
async function loadCategories() {
  const supabase = publicSupabase;

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("name", { ascending: true });

  if (error) {
    console.log("SUPABASE ERROR (categories):", error);
    return [];
  }

  return data || [];
}

const getCategories = unstable_cache(loadCategories, ["catalog-categories"], {
  revalidate: 300,
  tags: ["catalog-categories"],
});

async function loadShopListing({ cat, q, page, featured, deals }) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const allCategories = await getCategories();
  const categories = allCategories.filter((category) => !category.parent_id);

  let categoryIds = [];
  if (cat !== "all") {
    const children = allCategories
      .filter((category) => category.parent_id === cat)
      .map((category) => category.id);
    categoryIds = [cat, ...children];
  }

  let query = publicSupabase
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

  if (categoryIds.length) query = query.in("category_id", categoryIds);
  if (q) query = query.ilike("name", `%${q}%`);
  if (featured) query = query.eq("featured", true);
  if (deals) {
    query = query
      .eq("show_on_homepage", true)
      .eq("show_in_special_offers", true);
  }

  const { data: products, count, error } = await query;
  if (error) console.log("SUPABASE ERROR (products):", error);

  return {
    categories,
    products: (products || []).map(normalizeProductRecord),
    totalProducts: count || 0,
  };
}

function getShopListing({ cat, q, page, featured, deals }) {
  const cacheKey = [
    "catalog-shop-listing",
    cat,
    q,
    String(page),
    String(featured),
    String(deals),
    String(PAGE_SIZE),
    LISTING_SORT,
  ];
  const listingTag = `catalog-shop-listing:${createHash("sha256")
    .update(JSON.stringify(cacheKey))
    .digest("hex")}`;

  return unstable_cache(
    () => loadShopListing({ cat, q, page, featured, deals }),
    cacheKey,
    {
      revalidate: 300,
      tags: ["catalog-shop-listings", "catalog-categories", listingTag],
    },
  )();
}

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;

  const requestedCategory = getSearchParam(sp?.cat);
  const cat =
    requestedCategory && requestedCategory.length <= 128
      ? requestedCategory
      : "all";
  const q = getSearchParam(sp?.q);
  const page = normalizePage(sp?.page);
  const featured = getSearchParam(sp?.featured).toLowerCase() === "true";
  const deals = getSearchParam(sp?.deals).toLowerCase() === "true";

  const listing = await getShopListing({ cat, q, page, featured, deals });

  return (
    <Container className="py-8 sm:py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <ShopClient
          initialProducts={listing.products}
          categories={listing.categories}
          totalProducts={listing.totalProducts}
          page={page}
          pageSize={PAGE_SIZE}
          initialCat={cat}
          initialQ={q}
        />
      </div>
    </Container>
  );
}
