"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

export default function CategoryChips({ categories = [] }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAllActive = pathname === "/shop";

  useEffect(() => {
    router.prefetch("/shop");

    categories.forEach((category) => {
      if (category?.slug) {
        router.prefetch(`/shop/category/${category.slug}`);
      }
    });
  }, [categories, router]);

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      <Link
        href="/shop"
        className={cx(
          "cursor-pointer shrink-0 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold transition",
          isAllActive
            ? "bg-amber-500 text-slate-900"
            : "bg-white text-slate-700 hover:bg-slate-50",
        )}
      >
        All
      </Link>

      {categories.map((category) => {
        if (!category?.slug) return null;

        const href = `/shop/category/${category.slug}`;
        const isActive = pathname === href;

        return (
          <Link
            key={category.id}
            href={href}
            className={cx(
              "cursor-pointer shrink-0 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold transition",
              isActive
                ? "bg-amber-500 text-slate-900"
                : "bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
