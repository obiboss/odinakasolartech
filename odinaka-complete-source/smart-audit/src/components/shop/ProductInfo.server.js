import { createClient } from "@/lib/supabase/server";
import Container from "@/components/ui/Container";
import ProductGrid from "@/components/shop/ProductGrid.client";

export const revalidate = 300;

export default async function ProductInfo() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      short_description,
      images:product_images(
        image_url,
        sort_order
      )
    `,
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.log("SUPABASE ERROR (ProductInfo):", error);
  }

  if (!products?.length) return null;

  return (
    <section className="border-t border-slate-200">
      <Container className="py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-600">
              Latest products
            </div>

            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              New arrivals
            </h2>
          </div>
        </div>

        <div className="mt-6">
          <ProductGrid items={products || []} />
        </div>
      </Container>
    </section>
  );
}
