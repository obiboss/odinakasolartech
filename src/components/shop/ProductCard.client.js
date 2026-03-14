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
      className="group block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] bg-white flex items-center justify-center p-8 overflow-hidden group-hover:bg-gradient-to-b group-hover:from-white group-hover:to-slate-50 transition-colors duration-300">
        <Image
          src={img}
          alt={product.name}
          fill
          sizes="(max-width:768px) 50vw, 25vw"
          className="object-contain max-h-[85%] transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col flex-grow px-6 pb-6 pt-4">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
          Solar Product
        </div>

        <h3 className="text-base font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">
          {product.name}
        </h3>

        <div className="text-xl font-bold text-orange-600 mb-1">
          {money(product.price)}
        </div>

        <div className="text-sm text-slate-500 mb-5">
          Pay on delivery / bank transfer
        </div>

        <button className="relative w-full py-3 rounded-xl font-semibold text-white bg-orange-500 transition-all duration-200 hover:bg-orange-600 hover:shadow-md active:scale-[0.98] before:absolute before:inset-0 before:rounded-xl before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity">
          View product
        </button>
      </div>
    </Link>
  );
}
