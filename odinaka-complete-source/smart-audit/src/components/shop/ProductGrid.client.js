// src/components/shop/ProductGrid.client.js
"use client";

import ProductCard from "@/components/shop/ProductCard.client";

export default function ProductGrid({ items = [] }) {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
