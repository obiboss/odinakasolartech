// src/components/layout/Footer.js
import Link from "next/link";
import Container from "@/components/ui/Container";
import { getStore } from "@/lib/content.server";
import { whatsappLink } from "@/lib/whatsapp";

export default function Footer() {
  const store = getStore();

  const wa = whatsappLink({
    phone: store.business.whatsapp,
    message: `Hello ${store.business.name}, I want to buy a solar product. Please share current prices.`,
  });

  return (
    <footer className="mt-20 border-t border-slate-200 bg-white/85 backdrop-blur-xl">
      <Container className="py-10 text-sm text-slate-700">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="font-semibold text-slate-900">
              {store.business.name}
            </div>
            <div className="mt-2 text-slate-600">{store.business.location}</div>
            <div className="text-slate-600">{store.business.hours}</div>
          </div>

          <div>
            <div className="font-semibold text-slate-900">Quick Links</div>
            <div className="mt-2 space-y-2">
              <Link href="/shop" className="block hover:text-slate-900">
                Shop
              </Link>
              <Link
                href="/shop?featured=true"
                className="block hover:text-slate-900"
              >
                Featured
              </Link>
              <Link
                href="/shop?deals=true"
                className="block hover:text-slate-900"
              >
                Deals
              </Link>
              <Link href="/contact" className="block hover:text-slate-900">
                Support
              </Link>
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-900">Contact</div>
            <div className="mt-2 text-slate-600">
              WhatsApp:
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="ml-2 font-semibold text-slate-900 hover:underline"
              >
                {store.business.whatsapp}
              </a>
            </div>
            <div className="mt-2 text-slate-600">
              Orders can be confirmed via WhatsApp or the site chat widget.
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-slate-500 text-xs">
          © {new Date().getFullYear()} {store.business.name}. All rights
          reserved.
        </div>
      </Container>
    </footer>
  );
}
