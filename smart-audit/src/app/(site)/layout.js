import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatWidget from "@/components/chat/ChatWidget.client";
import CartDrawer from "@/components/cart/CartDrawer.client";

export default function SiteLayout({ children }) {
  return (
    <>
      <Header />
      <main className="pt-24 md:pt-16">{children}</main>
      <Footer />
      <ChatWidget />
      <CartDrawer />
    </>
  );
}
