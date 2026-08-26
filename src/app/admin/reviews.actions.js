"use server";

import { revalidatePath, updateTag } from "next/cache";
import { HOMEPAGE_CACHE_TAGS } from "@/lib/homepage-data.server";
import { createClient } from "@/lib/supabase/server";

export async function revalidateReviewRoutes(reviewId) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authorized to refresh review pages.");
  }

  const { data: admin, error: adminError } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    throw new Error("Not authorized to refresh review pages.");
  }

  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .select("product:products(slug)")
    .eq("id", reviewId)
    .maybeSingle();

  if (reviewError) throw reviewError;

  // This action runs after every successful moderation or feature mutation.
  // Expire both review slices because changing either status or featured can
  // affect the homepage's featured-first testimonial selection.
  updateTag(HOMEPAGE_CACHE_TAGS.featuredReviews);
  updateTag(HOMEPAGE_CACHE_TAGS.approvedReviews);
  revalidatePath("/", "page");

  const product = Array.isArray(review?.product)
    ? review.product[0]
    : review?.product;

  if (!product?.slug) {
    return;
  }

  revalidatePath("/shop/" + product.slug, "page");
}
