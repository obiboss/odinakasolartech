// src/components/shop/HomeHero.server.js
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { getStore } from "@/lib/content.server";
import { whatsappLink } from "@/lib/whatsapp";

export default async function HomeHero() {
  const store = getStore();

  const wa = whatsappLink({
    phone: store.business.whatsapp,
    message: `Hello ${store.business.name}, I want to buy solar products. Please guide me.`,
  });

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white min-h-[40vh] flex items-center">
      <Container className="py-6 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Reliable Solar Products for Homes and Businesses in Nigeria
            </h1>

            <p className="mt-4 max-w-xl text-sm sm:text-base text-slate-700 leading-relaxed">
              Buy solar panels, inverters, batteries and accessories with
              visible prices. Order online and confirm instantly via WhatsApp or
              in-app chat.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button as={Link} href="/shop" variant="primary" className="px-6">
                Shop Products
              </Button>

              <Button
                as="a"
                href={wa}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                className="border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              >
                WhatsApp Order
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-xs sm:text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1">
                ✔ Verified solar products
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1">
                ⚡ Fast delivery
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1">
                🛠 Installation support
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="relative aspect-16/10 w-full">
                <Image
                  src="/images/hero/solar-hero-products.png"
                  alt="Solar panels, inverter and batteries"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>

              <div className="mt-4 text-sm text-slate-600 text-center">
                Panels • Inverters • Batteries • Controllers • Accessories
              </div>
            </div>
          </div>
        </div>
      </Container>

      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-slate-200/50 blur-3xl" />
    </section>
  );
}
