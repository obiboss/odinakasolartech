"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductGrid from "@/components/shop/ProductGrid.client";
import CategoryChips from "@/components/shop/CategoryChips.client";
import ShopSearch from "@/components/shop/ShopSearch.client";

export default function ShopClient({
  initialProducts = [],
  categories = [],
  initialCat = "all",
  initialQ = "",
  totalProducts = 0,
  page = 1,
  pageSize = 24,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(initialQ);

  function handleSearchSubmit(e) {
    e.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    const trimmed = q.trim();

    if (trimmed) {
      params.set("q", trimmed);
      params.set("page", "1");
    } else {
      params.delete("q");
      params.delete("page");
    }

    router.push(`/shop?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-600">Shop</div>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              Solar Products
            </h1>

            <div className="mt-1 text-sm text-slate-600">
              Browse solar panels, inverters, batteries, accessories, and more.
              Prices are visible. Confirm availability via WhatsApp or in-app
              chat.
            </div>
          </div>

          <ShopSearch value={q} onChange={setQ} onSubmit={handleSearchSubmit} />
        </div>

        <div className="mt-4">
          <CategoryChips categories={categories} />
        </div>
      </div>

      <ProductGrid items={initialProducts} />

      {!initialProducts.length ? (
        <div className="text-sm text-slate-600">No products found.</div>
      ) : null}
    </div>
  );
}
