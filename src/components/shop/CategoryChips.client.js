"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

export default function CategoryChips({ categories = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCat = searchParams.get("cat") || "all";

  function changeCategory(id) {
    if (id === "all") {
      router.push("/shop");
      return;
    }

    router.push(`/shop?cat=${id}`);
  }

  /*
  Prefetch BOTH:
  - filter routes (UX)
  - landing pages (SEO navigation speed)
  */
  useEffect(() => {
    categories.forEach((c) => {
      if (c.slug) {
        router.prefetch(`/shop/category/${c.slug}`);
      }
      router.prefetch(`/shop?cat=${c.id}`);
    });
  }, [categories, router]);

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {/* ALL BUTTON */}
      <button
        onClick={() => changeCategory("all")}
        className={cx(
          "cursor-pointer shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-200 transition",
          currentCat === "all"
            ? "bg-amber-500 text-slate-900"
            : "bg-white text-slate-700 hover:bg-slate-50",
        )}
      >
        All
      </button>

      {categories.map((c) => {
        const isActive = currentCat === c.id;

        /*
        IMPORTANT:
        - Use Link for SEO (crawlable)
        - Keep styling identical
        */
        return (
          <Link
            key={c.id}
            href={`/shop/category/${c.slug}`}
            className={cx(
              "cursor-pointer shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-200 transition",
              isActive
                ? "bg-amber-500 text-slate-900"
                : "bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {c.name}
          </Link>
        );
      })}
    </div>
  );
}
