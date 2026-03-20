// src/components/layout/Footer.js
import Link from "next/link";
import Container from "@/components/ui/Container";
import { getStore } from "@/lib/content.server";
import { whatsappLink } from "@/lib/whatsapp";
import { Instagram, Facebook, Youtube, MessageCircle } from "lucide-react";

export default function Footer() {
  const store = getStore();

  const wa = whatsappLink({
    phone: store.business.whatsapp,
    message: `Hello ${store.business.name}, I want to buy a solar product. Please share current prices.`,
  });

  return (
    <footer className="mt-20 border-t border-slate-200 bg-white/85 backdrop-blur-xl">
      <Container className="py-10 text-sm text-slate-700">
        <div className="grid gap-6 md:grid-cols-4">
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
              <Link
                href="/shop"
                className="block text-slate-600 hover:text-slate-900"
              >
                Shop
              </Link>
              <Link
                href="/shop?featured=true"
                className="block text-slate-600 hover:text-slate-900"
              >
                Featured
              </Link>
              <Link
                href="/shop?deals=true"
                className="block text-slate-600 hover:text-slate-900"
              >
                Deals
              </Link>
              <Link
                href="/contact"
                className="block text-slate-600 hover:text-slate-900"
              >
                Support
              </Link>
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-900">Contact</div>
            <div className="mt-2 text-slate-600 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-slate-900 hover:underline"
              >
                {store.business.whatsapp}
              </a>
            </div>
            <div className="mt-2 text-slate-600">
              Orders can be confirmed via WhatsApp or the site chat widget.
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-900">Follow Us</div>

            <div className="mt-3 flex items-center gap-3">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/odinakachukwusolartech?mibextid=wwXIfr&mibextid=wwXIfr"
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] transition hover:scale-105"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 5.02 3.66 9.19 8.44 9.93v-7.02H7.9v-2.91h2.54V9.41c0-2.5 1.49-3.88 3.77-3.88 1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.74 8.44-4.91 8.44-9.93z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/odinaka_solar"
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 transition hover:scale-105"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5zm8.75 1.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://www.youtube.com/@ODINAKACHUKWUSOLAR"
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF0000] transition hover:scale-105"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M23.5 6.2s-.2-1.6-.8-2.3c-.8-.8-1.7-.8-2.1-.9C17.6 2.8 12 2.8 12 2.8h0s-5.6 0-8.6.2c-.4.1-1.3.1-2.1.9C.7 4.6.5 6.2.5 6.2S.3 8 .3 9.8v1.6C.3 13.2.5 15 .5 15s.2 1.6.8 2.3c.8.8 1.9.8 2.4.9 1.7.2 7.3.2 7.3.2s5.6 0 8.6-.2c.4-.1 1.3-.1 2.1-.9.6-.7.8-2.3.8-2.3s.2-1.8.2-3.6V9.8c0-1.8-.2-3.6-.2-3.6zM9.8 14.5V7.5l6.2 3.5-6.2 3.5z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@odinakachukwuenterprise?_r=1&_d=ehmmm1h3d83jad&sec_uid=MS4wLjABAAAAUkWWzSCfBoT4Ctkrwpi5x3S9c_0WlVrjQ5rPzxDBYsSDByY_47srqbUfh4kt66QE&share_author_id=7355837831161988101&sharer_language=en&source=h5_m&u_code=edf3c7h47h0fhc&item_author_type=1&utm_source=copy&tt_from=copy&enable_checksum=1&utm_medium=ios&share_link_id=AF2E9A0A-ED9B-4254-B677-0C7E4FBB33C1&user_id=7355837831161988101&sec_user_id=MS4wLjABAAAAUkWWzSCfBoT4Ctkrwpi5x3S9c_0WlVrjQ5rPzxDBYsSDByY_47srqbUfh4kt66QE&social_share_type=5&ug_btm=b0,b0&utm_campaign=client_share&share_app_id=1233"
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black transition hover:scale-105"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M16.5 3c.3 2.6 2.1 4.7 4.5 5v3c-1.4 0-2.8-.4-4-1v6.5c0 3.6-2.9 6.5-6.5 6.5S4 20.1 4 16.5 6.9 10 10.5 10c.4 0 .8 0 1.2.1v3.1c-.4-.1-.8-.2-1.2-.2-1.8 0-3.3 1.5-3.3 3.3s1.5 3.3 3.3 3.3 3.3-1.5 3.3-3.3V3h2.7z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {store.business.name}. All rights
          reserved.{" "}
          <span className="text-slate-600">Powered by Boldverse Services.</span>
        </div>
      </Container>
    </footer>
  );
}
