import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const HOMEPAGE_REVALIDATE_SECONDS = 300;

export const HOMEPAGE_CACHE_TAGS = {
  specialOffers: "homepage-special-offers",
  featuredProducts: "homepage-featured-products",
  latestProducts: "homepage-latest-products",
  featuredReviews: "homepage-featured-reviews",
  approvedReviews: "homepage-approved-reviews",
};

// Homepage queries are public, so this client intentionally has no request
// cookies or authenticated user state associated with it.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

async function loadSpecialOffers() {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, currency, short_description, in_stock, show_in_special_offers, images:product_images(image_url, sort_order)",
    )
    .eq("active", true)
    .eq("show_on_homepage", true)
    .eq("show_in_special_offers", true)
    .order("sort_order", { ascending: true })
    .order("sort_order", { foreignTable: "product_images", ascending: true })
    .limit(10);

  if (error) console.log("SUPABASE ERROR (special offers):", error);
  return data || [];
}

async function loadFeaturedProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, description, featured, active, created_at, images:product_images(id, image_url)",
    )
    .eq("active", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) console.log("SUPABASE ERROR (featured products):", error);
  return data || [];
}

async function loadLatestProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, short_description, images:product_images(image_url, sort_order)",
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) console.log("SUPABASE ERROR (latest products):", error);
  return data || [];
}

async function loadFeaturedReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, display_name, rating, content, status, featured, created_at")
    .eq("status", "approved")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) console.log("SUPABASE ERROR (featured reviews):", error);
  return data || [];
}

async function loadApprovedReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, display_name, rating, content, status, featured, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) console.log("SUPABASE ERROR (approved reviews):", error);
  return data || [];
}

const getSpecialOffers = unstable_cache(
  loadSpecialOffers,
  ["homepage-special-offers"],
  {
    revalidate: HOMEPAGE_REVALIDATE_SECONDS,
    tags: [HOMEPAGE_CACHE_TAGS.specialOffers],
  },
);

const getFeaturedProducts = unstable_cache(
  loadFeaturedProducts,
  ["homepage-featured-products"],
  {
    revalidate: HOMEPAGE_REVALIDATE_SECONDS,
    tags: [HOMEPAGE_CACHE_TAGS.featuredProducts],
  },
);

const getLatestProducts = unstable_cache(
  loadLatestProducts,
  ["homepage-latest-products"],
  {
    revalidate: HOMEPAGE_REVALIDATE_SECONDS,
    tags: [HOMEPAGE_CACHE_TAGS.latestProducts],
  },
);

const getFeaturedReviews = unstable_cache(
  loadFeaturedReviews,
  ["homepage-featured-reviews"],
  {
    revalidate: HOMEPAGE_REVALIDATE_SECONDS,
    tags: [HOMEPAGE_CACHE_TAGS.featuredReviews],
  },
);

const getApprovedReviews = unstable_cache(
  loadApprovedReviews,
  ["homepage-approved-reviews"],
  {
    revalidate: HOMEPAGE_REVALIDATE_SECONDS,
    tags: [HOMEPAGE_CACHE_TAGS.approvedReviews],
  },
);

export async function getHomepageData() {
  const [
    specialOffers,
    featuredProducts,
    latestProducts,
    featuredReviews,
    approvedReviews,
  ] = await Promise.all([
    getSpecialOffers(),
    getFeaturedProducts(),
    getLatestProducts(),
    getFeaturedReviews(),
    getApprovedReviews(),
  ]);

  return {
    specialOffers,
    featuredProducts,
    latestProducts,
    featuredReviews,
    approvedReviews,
  };
}
