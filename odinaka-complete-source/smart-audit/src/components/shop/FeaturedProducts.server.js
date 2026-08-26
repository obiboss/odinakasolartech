// src/components/shop/FeaturedProducts.server.js
import Link from "next/link";
import Container from "@/components/ui/Container";
import ProductGrid from "@/components/shop/ProductGrid.client";
import { createClient } from "@/lib/supabase/server";

export default async function FeaturedProducts() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      description,
      featured,
      active,
      created_at,
      images:product_images(id,image_url)
    `,
    )
    .eq("active", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) console.log("SUPABASE ERROR:", error);

  return (
    <section className="border-t border-slate-200">
      <Container className="py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-600">
              Featured products
            </div>

            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              Best Sellers & Hot Picks
            </h2>
          </div>

          <Link
            href="/shop"
            className="text-sm font-semibold text-slate-900 hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="mt-6">
          <ProductGrid items={products || []} />
        </div>
      </Container>
    </section>
  );
}
