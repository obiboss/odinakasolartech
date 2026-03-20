// src/components/layout/Header.js
import Link from "next/link";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { getStore, getPromos } from "@/lib/content.server";
import { whatsappLink } from "@/lib/whatsapp";
import HeaderSearch from "@/components/search/HeaderSearch.client";
import Image from "next/image";

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
      {/* Promo bar */}
      {promoText && (
        <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <Container className="py-2 text-[12px] text-slate-600 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="font-semibold text-slate-900">
                Limited Offer
              </span>{" "}
              <span className="text-slate-400">•</span>{" "}
              <span className="line-clamp-1">{promoText}</span>
            </div>

            <Link
              href="/shop"
              className="font-semibold text-slate-900 hover:underline shrink-0"
            >
              Shop now
            </Link>
          </Container>
        </div>
      )}

      {/* Main header */}
      <div className="border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <Container className="h-16">
          {/* Desktop row */}
          <div className="hidden md:flex h-full items-center gap-4">
            {/* Left: brand */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm px-2 py-1">
                <Image
                  src="/images/logo-mark.png"
                  alt={store.business.name}
                  width={84}
                  height={84}
                  priority
                  className="h-12 w-auto object-contain"
                />
              </div>

              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight text-slate-900">
                  {store.business.name}
                </div>
                <div className="text-[11px] text-slate-600 line-clamp-1">
                  {store.business.tagline}
                </div>
              </div>
            </Link>
            {/* Middle: search */}
            <div className="flex-1 min-w-[260px]">
              <HeaderSearch />
            </div>
            {/* Nav */}
            <nav className="hidden lg:flex items-center gap-7 text-sm text-slate-700 shrink-0">
              <Link href="/shop" className="hover:text-slate-900 transition">
                Shop
              </Link>
              <Link
                href="/shop?featured=true"
                className="hover:text-slate-900 transition"
              >
                Featured
              </Link>
              <Link
                href="/shop?deals=true"
                className="hover:text-slate-900 transition"
              >
                Deals
              </Link>
              <Link href="/cart" className="hover:text-slate-900 transition">
                Cart
              </Link>
              <Link href="/contact" className="hover:text-slate-900 transition">
                Support
              </Link>
            </nav>
            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* <Button
                as={Link}
                href="/shop"
                variant="ghost"
                className="hidden lg:inline-flex"
              >
                Browse Products
              </Button> */}

              {/* External: <a> */}
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

          {/* Mobile/tablet row */}
          <div className="md:hidden h-full flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/images/logo-mark.png" // <-- use the new sun + eagle image
                alt={store.business.name}
                width={44}
                height={44}
                priority
                className="rounded-xl border border-slate-200 bg-white shadow-soft object-contain"
              />

              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight text-slate-900">
                  {store.business.name}
                </div>
                <div className="text-[11px] text-slate-600 line-clamp-1">
                  {store.business.tagline}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Button as={Link} href="/shop" variant="ghost" className="px-3">
                Shop
              </Button>
              <Button as={Link} href="/cart" variant="ghost" className="px-3">
                Cart
              </Button>

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

        {/* Mobile search row */}
        <div className="md:hidden border-t border-slate-200 bg-white/90">
          <Container className="py-2">
            <HeaderSearch />
          </Container>
        </div>
      </div>
    </header>
  );
}
