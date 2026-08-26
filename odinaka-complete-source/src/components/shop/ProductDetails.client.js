// src/components/shop/ProductDetails.client.js
"use client";

import Button from "@/components/ui/Button";
import { whatsappLink } from "@/lib/whatsapp";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

export default function ProductDetails({ product, store }) {
  const wa = whatsappLink({
    phone: store.business.whatsapp,
    message: `Hello ${store.business.name}, I want to order: ${product.name} (${product.slug}).`,
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 backdrop-blur-xl shadow-soft">
      <div className="text-xs text-slate-500">
        {product?.category?.name || "Solar product"}
      </div>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {product.name}
      </h1>

      <div className="mt-3 text-2xl font-extrabold text-amber-600">
        {money(product.price)}
      </div>

      {product.description ? (
        <p className="mt-4 text-sm text-slate-700 leading-relaxed">
          {product.description}
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          Description will be added by admin.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          as="a"
          href={wa}
          target="_blank"
          rel="noreferrer"
          variant="primary"
          className="w-full sm:w-auto"
        >
          WhatsApp Order
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("chat:open"));
          }}
        >
          Use in-app chat
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        Pay on delivery / bank transfer. Use chat or WhatsApp to confirm
        availability and delivery.
      </div>
    </div>
  );
}
