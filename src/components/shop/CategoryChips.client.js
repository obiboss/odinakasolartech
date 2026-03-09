"use client";

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

  // Prefetch category pages so navigation feels instant
  useEffect(() => {
    categories.forEach((c) => {
      router.prefetch(`/shop?cat=${c.id}`);
    });
  }, [categories, router]);

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      <button
        onClick={() => changeCategory("all")}
        className={cx(
          "shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-200 transition",
          currentCat === "all"
            ? "bg-amber-500 text-slate-900"
            : "bg-white text-slate-700 hover:bg-slate-50",
        )}
      >
        All
      </button>

      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => changeCategory(c.id)}
          className={cx(
            "shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-200 transition",
            currentCat === c.id
              ? "bg-amber-500 text-slate-900"
              : "bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
