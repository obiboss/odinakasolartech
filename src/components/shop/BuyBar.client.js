// src/components/shop/BuyBar.client.js
"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartContext.client";
import { formatCurrency } from "@/lib/formatCurrency";

export default function BuyBar({ product, waLink }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function onAddToCart() {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price ?? 0,
      image: product.images?.[0]?.image_url,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-slate-600">Price</div>
          <div className="text-xl font-extrabold text-amber-600">
            {formatCurrency(product.price)}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onAddToCart}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            {added ? "Added" : "Add to cart"}
          </button>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90"
          >
            WhatsApp to confirm
          </a>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        You can also confirm inside the in-app chat widget.
      </div>
    </div>
  );
}
