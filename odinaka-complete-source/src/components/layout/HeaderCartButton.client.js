"use client";

import { useCart } from "@/components/cart/CartContext.client";

export default function HeaderCartButton({
  className = "",
  badgeClassName = "",
}) {
  const { itemCount, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={openCart}
      className={`cursor-pointer ${className}`}
    >
      Cart
      {itemCount > 0 && <span className={badgeClassName}>{itemCount}</span>}
    </button>
  );
}
