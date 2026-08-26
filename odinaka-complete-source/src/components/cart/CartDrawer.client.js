"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartContext.client";

export default function CartDrawer() {
  const { items, total, isCartOpen, closeCart, updateQuantity, removeItem } =
    useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        aria-label="Close cart drawer"
        className="absolute inset-0 bg-black/40"
        onClick={closeCart}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-4">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button
            onClick={closeCart}
            className="text-sm font-medium cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Your cart is empty.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 border-b pb-4">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-slate-100" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      ₦{Number(item.price).toLocaleString()}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="h-8 w-8 rounded border cursor-pointer"
                      >
                        -
                      </button>
                      <span className="min-w-6 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="h-8 w-8 rounded border cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-2 text-xs text-red-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total</span>
            <span className="text-base font-semibold">
              ₦{Number(total).toLocaleString()}
            </span>
          </div>

          <div className="space-y-2">
            <Link
              href="/cart"
              onClick={closeCart}
              className="block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              View Cart &amp; Place Order
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
