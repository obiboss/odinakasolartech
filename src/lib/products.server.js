// src/lib/products.server.js
import { createClient } from "@/lib/supabase/server";

export async function getProductBySlug(slug) {
  const supabase = await createClient();

  const query = supabase
    .from("products")
    .select(
      `
      id, name, slug, price, description, featured, active, created_at, category_id,
      categories:category_id ( id, name ),
      images:product_images ( id, image_url )
    `,
    )
    .eq("slug", slug)
    .maybeSingle();

  const { data, error } = await query;

  if (error) {
    console.log("SUPABASE ERROR:", error);
    throw error;
  }

  return data;
}
