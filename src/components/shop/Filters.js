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
              ? "bg-white/10 border-white/15"
              : "bg-black/20 border-white/10 hover:bg-black/30"
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
                ? "bg-white/10 border-white/15"
                : "bg-black/20 border-white/10 hover:bg-black/30"
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
