"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { FadeUp } from "@/components/ui/Motion.client";

export default function HomeHero({ store, wa }) {
  const hero = store?.business?.heroImage || null;

  return (
    <section className="relative overflow-hidden">
      {/* Background hero image */}
      {hero && (
        <div className="absolute inset-0">
          <Image
            src={hero}
            alt="Solar installation hero background"
            fill
            priority
            className="object-cover opacity-70"
            sizes="100vw"
          />
          {/* Premium overlays for legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/55 to-white/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/55 via-transparent to-white/35" />
        </div>
      )}

      {/* Content */}
      <Container className="relative py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7">
            <FadeUp>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05] text-balance">
                Build a reliable solar setup — fast quotes, verified products,
                premium support.
              </h1>
            </FadeUp>

            <FadeUp delay={0.08} className="mt-4">
              <p className="text-slate-700 text-base sm:text-lg max-w-2xl">
                Panels, inverters, batteries, controllers, cables, breakers,
                lights & accessories — delivered with clarity and speed via
                WhatsApp.
              </p>
            </FadeUp>

            <FadeUp
              delay={0.12}
              className="mt-6 flex flex-col sm:flex-row gap-3"
            >
              <Button
                as="a"
                href="/shop"
                variant="primary"
                className="w-full sm:w-auto"
              >
                Shop Products
              </Button>
              <Button
                as="a"
                href={wa}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                className="w-full sm:w-auto"
              >
                Request Quote on WhatsApp
              </Button>
            </FadeUp>

            <FadeUp
              delay={0.16}
              className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-soft">
                <div className="text-sm font-semibold text-slate-900">
                  Verified Products
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Panels • Inverters • Batteries
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-soft">
                <div className="text-sm font-semibold text-slate-900">
                  Fast Ordering
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Price • Stock • Delivery
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-soft">
                <div className="text-sm font-semibold text-slate-900">
                  Homes & SMEs
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Right sizing guidance
                </div>
              </div>
            </FadeUp>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="text-sm font-semibold text-slate-900">
                Shop by category
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {store.categories.map((c) => (
                  <a
                    key={c.id}
                    href={`/shop?cat=${c.id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
                  >
                    {c.name}
                  </a>
                ))}
              </div>

              <div className="mt-6 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">
                  {store.business.name}
                </div>
                <div className="text-slate-600 mt-1">
                  {store.business.location}
                </div>
                <div className="text-slate-600">{store.business.hours}</div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Extra glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-yellow-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
    </section>
  );
}
