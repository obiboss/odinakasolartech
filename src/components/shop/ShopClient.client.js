"use client";

import { useMemo, useState } from "react";
import ProductGrid from "@/components/shop/ProductGrid.client";
import CategoryChips from "@/components/shop/CategoryChips.client";
import ShopSearch from "@/components/shop/ShopSearch.client";

export default function ShopClient({
  initialProducts = [],
  categories = [],
  initialCat = "all",
  initialQ = "",
}) {
  const [cat, setCat] = useState(initialCat);
  const [q, setQ] = useState(initialQ);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    if (!s) return initialProducts;

    return initialProducts.filter((p) =>
      String(p.name || "")
        .toLowerCase()
        .includes(s),
    );
  }, [initialProducts, q]);

  return (
    <div className="space-y-5">
      {/* HEADER / FILTER AREA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-600">Shop</div>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              Solar Products
            </h1>

            <div className="mt-1 text-sm text-slate-600">
              Prices visible. Confirm availability via WhatsApp or in-app chat.
            </div>
          </div>

          <ShopSearch value={q} onChange={setQ} />
        </div>

        <div className="mt-4">
          <CategoryChips
            categories={categories}
            value={cat}
            onChange={setCat}
          />
        </div>
      </div>

      {/* PRODUCTS GRID */}
      <ProductGrid items={filtered} />

      {/* EMPTY STATE */}
      {!filtered.length ? (
        <div className="text-sm text-slate-600">No products found.</div>
      ) : null}
    </div>
  );
}
