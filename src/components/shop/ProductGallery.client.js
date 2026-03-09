// src/components/shop/ProductGallery.client.js
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export default function ProductGallery({ images = [], name = "" }) {
  const urls = useMemo(
    () => images.map((i) => i.image_url).filter(Boolean),
    [images],
  );
  const [active, setActive] = useState(urls[0] || "");

  return (
    <div className="space-y-3">
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-slate-100">
        {active ? (
          <Image
            src={active}
            alt={name}
            fill
            className="h-full w-full object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
            No image
          </div>
        )}
      </div>

      {urls.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {urls.map((u) => (
            <button
              key={u}
              onClick={() => setActive(u)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-1 hover:bg-slate-50 transition"
              aria-label="Select image"
            >
              <Image
                src={u}
                alt=""
                fill
                className="h-16 w-20 rounded-lg object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
