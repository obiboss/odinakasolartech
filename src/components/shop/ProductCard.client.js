"use client";

import Image from "next/image";
import Link from "next/link";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}

export default function ProductCard({ product }) {
  const img = product?.images?.[0]?.image_url || "/placeholder.png";

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square bg-slate-50">
        <Image
          src={img}
          alt={product.name}
          fill
          sizes="(max-width:768px) 50vw, 25vw"
          className="object-contain p-6 transition group-hover:scale-105"
        />
      </div>

      <div className="p-4 space-y-2">
        <div className="text-xs text-slate-500">Solar Product</div>

        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
          {product.name}
        </h3>

        <div className="text-lg font-extrabold text-amber-600">
          {money(product.price)}
        </div>

        <div className="text-xs text-slate-500">
          Pay on delivery / bank transfer
        </div>

        <button className="mt-2 w-full rounded-xl bg-amber-500 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400">
          View product
        </button>
      </div>
    </Link>
  );
}
