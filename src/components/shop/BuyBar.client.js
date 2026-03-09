// src/components/shop/BuyBar.client.js
"use client";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}

export default function BuyBar({ product, waLink }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">Price</div>
          <div className="text-xl font-extrabold text-amber-600">
            {money(product.price)}
          </div>
        </div>

        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90"
        >
          WhatsApp to confirm
        </a>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        You can also confirm inside the in-app chat widget.
      </div>
    </div>
  );
}
