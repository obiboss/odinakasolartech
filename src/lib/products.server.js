import { createClient } from "@/lib/supabase/server";
import { normalizeProductRecord } from "@/lib/supabase/storage";

export async function getProductBySlug(slug) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      currency,
      description,
      short_description,
      featured,
      active,
      in_stock,
      specs,
      created_at,
      updated_at,
      category_id,
      category:categories (
        id,
        name,
        slug
      ),
      images:product_images (
        id,
        image_url,
        sort_order
      )
    `,
    )
    .eq("slug", slug)
    .eq("active", true)
    .order("sort_order", { foreignTable: "product_images", ascending: true })
    .maybeSingle();

  if (error) {
    console.log("SUPABASE ERROR (getProductBySlug):", error);
    throw error;
  }

  return normalizeProductRecord(data);
}
