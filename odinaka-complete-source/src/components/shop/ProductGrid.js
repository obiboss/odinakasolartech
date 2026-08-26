// src/components/shop/ProductGrid.client.js

import ProductCard from "./ProductCard";

export default function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <div key={p.id} className="h-full">
          <ProductCard p={p} />
        </div>
      ))}
    </div>
  );
}
