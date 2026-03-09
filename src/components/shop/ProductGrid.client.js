// src/components/shop/ProductGrid.client.js
"use client";

import ProductCard from "@/components/shop/ProductCard.client";

export default function ProductGrid({ items = [] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
