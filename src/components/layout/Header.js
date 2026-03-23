// src/components/layout/Header.js

import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { getStore, getPromos } from "@/lib/content.server";
import { whatsappLink } from "@/lib/whatsapp";
import HeaderSearch from "@/components/search/HeaderSearch.client";
import HeaderCartButton from "@/components/layout/HeaderCartButton.client";

function getActivePromoText() {
  const promos = getPromos();
  if (!promos?.active) return null;

  const now = new Date();
  const active = (promos.items || []).find((p) => {
    const s = p.starts ? new Date(p.starts) : null;
    const e = p.ends ? new Date(p.ends) : null;
    if (s && now < s) return false;
    if (e && now > e) return false;
    return true;
  });

  if (!active) return null;

  return `${active.badge ? `${active.badge}: ` : ""}${active.title} — ${active.subtitle}`;
}

export default function Header() {
  const store = getStore();
  const promoText = getActivePromoText();

  const wa = whatsappLink({
    phone: store.business.whatsapp,
    message: `Hello ${store.business.name}, I want to buy a solar product. Please confirm availability and delivery.`,
  });

  return (
    <header className="fixed top-0 z-50 w-full">
      {promoText && (
        <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <Container className="flex items-center justify-between gap-3 py-2 text-[12px] text-slate-600">
            <div className="min-w-0">
              <span className="font-semibold text-slate-900">
                Limited Offer
              </span>{" "}
              <span className="text-slate-400">•</span>{" "}
              <span className="line-clamp-1">{promoText}</span>
            </div>

            <Link
              href="/shop"
              className="shrink-0 font-semibold text-slate-900 hover:underline"
            >
              Shop now
            </Link>
          </Container>
        </div>
      )}

      <div className="border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <Container className="h-16">
          <div className="hidden h-full items-center gap-4 md:flex">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
                <Image
                  src="/images/logos-1.png"
                  alt={store.business.name}
                  width={100}
                  height={100}
                  priority
                  className="h-12 w-auto object-contain"
                />
              </div>

              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight text-slate-900">
                  {store.business.name}
                </div>
                <div className="line-clamp-1 text-[11px] text-slate-600">
                  {store.business.tagline}
                </div>
              </div>
            </Link>

            <div className="min-w-[260px] flex-1">
              <HeaderSearch />
            </div>

            <nav className="hidden shrink-0 items-center gap-7 text-sm text-slate-700 lg:flex">
              <Link href="/shop" className="transition hover:text-slate-900">
                Shop
              </Link>

              <Link
                href="/shop?featured=true"
                className="transition hover:text-slate-900"
              >
                Featured
              </Link>

              <Link
                href="/shop?deals=true"
                className="transition hover:text-slate-900"
              >
                Deals
              </Link>

              <HeaderCartButton
                className="relative transition hover:text-slate-900"
                badgeClassName="absolute -right-3 -top-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white"
              />

              <Link href="/contact" className="transition hover:text-slate-900">
                Support
              </Link>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                as="a"
                href={wa}
                target="_blank"
                rel="noreferrer"
                variant="primary"
                className="px-4"
              >
                WhatsApp
              </Button>
            </div>
          </div>

          <div className="flex h-full items-center justify-between gap-3 md:hidden">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/images/logo-mark.png"
                alt={store.business.name}
                width={44}
                height={44}
                priority
                className="rounded-xl border border-slate-200 bg-white object-contain shadow-soft"
              />

              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight text-slate-900">
                  {store.business.name}
                </div>
                <div className="line-clamp-1 text-[11px] text-slate-600">
                  {store.business.tagline}
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <Button as={Link} href="/shop" variant="ghost" className="px-3">
                Shop
              </Button>

              <HeaderCartButton
                className="relative rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                badgeClassName="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white"
              />

              <Button
                as="a"
                href={wa}
                target="_blank"
                rel="noreferrer"
                variant="primary"
                className="px-3"
              >
                WhatsApp
              </Button>
            </div>
          </div>
        </Container>

        <div className="border-t border-slate-200 bg-white/90 md:hidden">
          <Container className="py-2">
            <HeaderSearch />
          </Container>
        </div>
      </div>
    </header>
  );
}
