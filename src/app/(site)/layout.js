// src/app/(site)/layout.js
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatWidget from "@/components/chat/ChatWidget.client";

export default function SiteLayout({ children }) {
  return (
    <>
      <Header />
      {/* Extra top padding because header can be 2 rows on mobile (promo + search) */}
      <main className="pt-24 md:pt-16">{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}
