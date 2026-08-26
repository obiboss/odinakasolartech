"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";

export default function Filters({ categories }) {
  const router = useRouter();
  const sp = useSearchParams();

  const cat = sp.get("cat") || "";
  const q = sp.get("q") || "";

  function setParam(key, value) {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`/shop?${next.toString()}`);
  }

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setParam("cat", "")}
          className={`rounded-2xl px-3 py-2 text-sm border transition ${
            !cat
              ? "bg-amber-500/20 border-amber-500/30 text-amber-900"
              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setParam("cat", c.id)}
            className={`rounded-2xl px-3 py-2 text-sm border transition ${
              cat === c.id
                ? "bg-amber-500/20 border-amber-500/30 text-amber-900"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="w-full md:w-[320px]">
        <Input
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Search panels, inverters, batteries..."
        />
      </div>
    </div>
  );
}
