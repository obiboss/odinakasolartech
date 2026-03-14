"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartContext.client";
import { formatCurrency } from "@/lib/formatCurrency";
import { whatsappLink } from "@/lib/whatsapp";

const HIGH_VALUE_THRESHOLD = 3_000_000;
const DEPOSIT_RATE = 0.6;

function formatLine(item) {
  return `• ${item.name} ×${item.quantity} — ${formatCurrency(
    item.price * item.quantity,
  )}`;
}

export default function CartPage({ store }) {
  const {
    items,
    subtotal,
    total,
    depositRequired,
    remainingBalance,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const [orderSummary, setOrderSummary] = useState("");
  const [copied, setCopied] = useState(false);

  const bankInfo = store?.business?.bank || {
    name: "Your Bank Name",
    accountName: "Your Account Name",
    accountNumber: "0000000000",
  };

  const hasHighValue = total > HIGH_VALUE_THRESHOLD;

  const summaryText = useMemo(() => {
    if (!items?.length) return "";

    const lines = ["Order Summary", ""];
    items.forEach((item) => {
      lines.push(formatLine(item));
    });

    lines.push("", `Total: ${formatCurrency(total)}`);

    if (hasHighValue) {
      lines.push(
        `Deposit Required: ${formatCurrency(depositRequired)}`,
        `Remaining Balance: ${formatCurrency(remainingBalance)}`,
      );
    }

    lines.push("", "Please send this order summary via WhatsApp or in-app chat.");

    return lines.join("\n");
  }, [items, total, depositRequired, remainingBalance, hasHighValue]);

  const onGenerateSummary = () => {
    setOrderSummary(summaryText);
    setCopied(false);
  };

  const onCopy = async () => {
    if (!orderSummary) return;
    try {
      await navigator.clipboard.writeText(orderSummary);
      setCopied(true);
    } catch {
      // ignore
    }
  };

  const waLink = whatsappLink({
    phone: store?.business?.whatsapp,
    message: orderSummary || "",
  });

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-lg font-semibold">Your cart is empty</div>
        <div className="mt-2 text-sm text-slate-600">
          Add items to your cart from the shop and return here to review your
          order.
        </div>
        <div className="mt-6">
          <Button as={Link} href="/shop" variant="primary">
            Browse products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Cart</h1>
            <div className="mt-1 text-sm text-slate-600">
              Review items, update quantities, and prepare an order summary.
            </div>
          </div>
          <Button variant="subtle" onClick={clearCart}>
            Clear cart
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-slate-100" />
                )}
                <div>
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-sm text-slate-600">
                    {formatCurrency(item.price)} each
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Qty</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.id, Math.max(1, item.quantity - 1))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-sm text-slate-600">
                  {formatCurrency(item.price * item.quantity)}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Subtotal</div>
            <div className="text-xl font-semibold text-slate-900">
              {formatCurrency(subtotal)}
            </div>
          </div>

          {hasHighValue ? (
            <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-900">
                Deposit required for large orders
              </div>
              <div className="text-sm text-slate-700">
                Total order value: {formatCurrency(total)}
              </div>
              <div className="text-sm text-slate-700">
                Deposit required (60%): {formatCurrency(depositRequired)}
              </div>
              <div className="text-sm text-slate-700">
                Remaining balance: {formatCurrency(remainingBalance)}
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div className="font-semibold">Send transfer to:</div>
                <div className="mt-1">Bank: {bankInfo.name}</div>
                <div>Account name: {bankInfo.accountName}</div>
                <div>Account number: {bankInfo.accountNumber}</div>
                <div className="mt-2 text-xs text-slate-500">
                  After payment, send the receipt via WhatsApp or in-app chat.
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-600">
              Orders under ₦3,000,000 can be completed with pay-on-delivery.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <Button onClick={onGenerateSummary} variant="primary">
                Submit order
              </Button>
              <div className="text-xs text-slate-500">
                Copy and send this summary via WhatsApp or in-app chat.
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                as="a"
                href={waLink}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                className="w-full sm:w-auto"
              >
                Send via WhatsApp
              </Button>
              <Button
                onClick={onCopy}
                variant="subtle"
                className="w-full sm:w-auto"
              >
                {copied ? "Copied!" : "Copy summary"}
              </Button>
            </div>
          </div>

          {orderSummary ? (
            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-900">
                Order summary
              </div>
              <textarea
                value={orderSummary}
                readOnly
                rows={8}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold text-slate-900">Order details</div>
        <div className="mt-2 text-sm text-slate-600">
          View your cart totals and generate a shareable summary.
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Items</div>
            <div className="text-sm font-semibold text-slate-900">
              {items.length}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-sm font-semibold text-slate-900">
              {formatCurrency(total)}
            </div>
          </div>
          {hasHighValue ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">Deposit (60%)</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatCurrency(depositRequired)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">Remaining</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatCurrency(remainingBalance)}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
