"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Container from "@/components/ui/Container";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

export default function FeaturedCarousel({
  title = "Special Offers",
  products = [],
}) {
  const innerRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const items = useMemo(() => (products || []).filter(Boolean), [products]);

  // duplicate items so 2 products can still loop smoothly
  const loopItems = useMemo(() => {
    if (!items.length) return [];
    return [...items, ...items, ...items];
  }, [items]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || items.length === 0) return;

    let frame;
    let lastTime = 0;
    const speed = 0.045; // px per ms

    const singleSetWidth = el.scrollWidth / 3;

    const step = (time) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (!paused) {
        el.style.transform = `translateX(-${(
          Number(el.dataset.offset || 0) +
          delta * speed
        ).toFixed(2)}px)`;

        let nextOffset = Number(el.dataset.offset || 0) + delta * speed;

        if (nextOffset >= singleSetWidth) {
          nextOffset = 0;
        }

        el.dataset.offset = String(nextOffset);
        el.style.transform = `translateX(-${nextOffset}px)`;
      }

      frame = requestAnimationFrame(step);
    };

    el.dataset.offset = "0";
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [items, paused]);

  if (!items.length) return null;

  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <Container className="py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-600">{title}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              Limited deals and promo picks
            </h2>
          </div>
        </div>

        <div
          className="mt-6 overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            ref={innerRef}
            className="flex gap-4 will-change-transform"
            style={{ width: "max-content" }}
          >
            {loopItems.map((p, idx) => {
              const img = p?.images?.[0]?.image_url || null;

              return (
                <Link
                  key={`${p.id}-${idx}`}
                  href={`/shop/${p.slug}`}
                  className="group shrink-0 w-[260px] rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-slate-50">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.name}
                        fill
                        sizes="260px"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-100" />
                    )}

                    <div className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-semibold text-slate-900">
                      Offer
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="text-sm font-bold leading-snug line-clamp-2 text-slate-900">
                      {p.name}
                    </div>

                    <div className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {p.short_description || "Premium solar product"}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-base font-extrabold text-amber-600">
                        {money(p.price)}
                      </div>

                      <div className="text-xs font-semibold text-slate-500 group-hover:text-slate-900">
                        View →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
