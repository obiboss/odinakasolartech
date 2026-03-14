// src/app/cart/page.js

import Container from "@/components/ui/Container";
import CartPage from "@/components/cart/CartPage.client";
import { getStore } from "@/lib/content.server";

export const metadata = {
  title: "Cart — Odinaka Solar Tech",
  description: "Review your cart, view order totals, and get a shareable order summary.",
};

export default function CartRoute() {
  const store = getStore();

  return (
    <Container className="py-10">
      <CartPage store={store} />
    </Container>
  );
}
