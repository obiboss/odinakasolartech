// src/components/shop/RelatedProducts.server.js
import Container from "@/components/ui/Container";
import ProductGrid from "@/components/shop/ProductGrid.client";

export default function RelatedProducts({ products = [] }) {
  if (!products.length) return null;

  return (
    <section>
      <Container className="px-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-600">
              More items
            </div>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
              Related products
            </h3>
          </div>
        </div>

        <div className="mt-5">
          <ProductGrid items={products} />
        </div>
      </Container>
    </section>
  );
}
