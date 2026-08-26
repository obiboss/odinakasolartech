import Image from "next/image";
import Link from "next/link";
// import { HoverCard } from "@/components/ui/Motion";
import { HoverCard } from "@/components/ui/Motion.client";

export default function ProductCard({ product }) {
  const img = product.images?.[0];

  return (
    <HoverCard className="h-full">
      <Link
        href={`/shop/${product.id}`}
        className="group block h-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors overflow-hidden"
      >
        <div className="relative aspect-[4/3] w-full">
          {img ? (
            <Image
              src={img}
              alt={product.name}
              fill
              className="object-cover opacity-95 group-hover:opacity-100 transition-opacity"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={!!product.featured}
            />
          ) : (
            <div className="absolute inset-0 bg-slate-100" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-slate-100/50 to-transparent" />
        </div>

        <div className="p-4">
          <div className="text-xs text-slate-500">{product.brand}</div>
          <div className="mt-1 font-semibold leading-snug">{product.name}</div>
          <div className="mt-2 text-sm text-slate-700 line-clamp-2">
            {product.short}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-solar-500 font-semibold">
              {product.priceNote || "Request price"}
            </div>
            <div className="text-xs text-slate-600">
              {product.inStock ? "In stock" : "Out of stock"}
            </div>
          </div>
        </div>
      </Link>
    </HoverCard>
  );
}
