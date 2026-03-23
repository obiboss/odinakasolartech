"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartContext.client";
import { formatCurrency } from "@/lib/formatCurrency";
import { whatsappLink } from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase/client";
import { createOrder } from "@/lib/orders/createOrder";
import { createOrderConversation } from "@/lib/chat/createOrderConversation";

const HIGH_VALUE_THRESHOLD = 3_000_000;

async function ensureSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data?.session) return data.session;

  const { data: anon, error: anonError } =
    await supabase.auth.signInAnonymously();

  if (anonError) throw anonError;
  return anon.session;
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

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");

  const [placingOrder, setPlacingOrder] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentSubmitBusy, setPaymentSubmitBusy] = useState(false);

  const hasHighValue = total > HIGH_VALUE_THRESHOLD;

  const supportWaLink = whatsappLink({
    phone: store?.business?.whatsapp,
    message: "Hello, I need help with my order.",
  });

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  async function handlePlaceOrder() {
    setPlaceOrderError("");

    if (!items.length) {
      setPlaceOrderError("Your cart is empty.");
      return;
    }

    if (!customerName.trim()) {
      setPlaceOrderError("Please enter your full name.");
      return;
    }

    if (!customerPhone.trim()) {
      setPlaceOrderError("Please enter your phone number.");
      return;
    }

    if (!customerAddress.trim()) {
      setPlaceOrderError("Please enter your delivery address.");
      return;
    }

    if (!customerCity.trim()) {
      setPlaceOrderError("Please enter your city.");
      return;
    }

    if (!customerState.trim()) {
      setPlaceOrderError("Please enter your state.");
      return;
    }

    try {
      setPlacingOrder(true);
      setPaymentSubmitted(false);

      const session = await ensureSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("Unable to start customer session.");
      }

      const order = await createOrder({
        cartItems: items,
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
          city: customerCity.trim(),
          state: customerState.trim(),
        },
        total,
        customerId: userId,
      });

      const convo = await createOrderConversation({
        userId,
        order,
      });

      setPlacedOrder({
        id: order.id,
        orderCode: order.order_code || order.id,
        requiresDeposit: order.requires_deposit,
        depositAmount: order.deposit_amount,
        totalAmount: order.total_amount,
        conversationId: convo.id,
      });

      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setPlaceOrderError(err?.message || "Failed to place order.");
    } finally {
      setPlacingOrder(false);
    }
  }

  async function handleIHavePaid() {
    if (!placedOrder?.conversationId) return;

    try {
      setPaymentSubmitBusy(true);

      const { error } = await supabase.from("messages").insert({
        conversation_id: placedOrder.conversationId,
        sender: "customer",
        content:
          "✅ I have made the payment. Please confirm. I will upload proof shortly.",
      });

      if (error) throw error;

      setPaymentSubmitted(true);
    } catch (err) {
      alert(err?.message || "Failed to notify support.");
    } finally {
      setPaymentSubmitBusy(false);
    }
  }

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-2xl font-extrabold text-slate-900">
          Order submitted
        </div>

        <div className="mt-2 text-sm text-slate-600">
          Your order request has been created and linked to support.
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-600">Order reference</div>
            <div className="text-sm font-semibold text-slate-900">
              {placedOrder.orderCode}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-sm font-semibold text-slate-900">
              {formatCurrency(placedOrder.totalAmount)}
            </div>
          </div>

          {placedOrder.requiresDeposit ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-900">
                Deposit required to confirm booking
              </div>

              <div className="mt-1 text-sm text-slate-700">
                Deposit amount: {formatCurrency(placedOrder.depositAmount)}
              </div>

              {!paymentSubmitted ? (
                <>
                  <div className="mt-2 text-xs text-slate-600">
                    Open the chat widget to view bank details, make payment,
                    then click{" "}
                    <span className="font-semibold">I have paid</span>.
                  </div>

                  <button
                    type="button"
                    onClick={handleIHavePaid}
                    disabled={paymentSubmitBusy}
                    className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {paymentSubmitBusy ? "Submitting..." : "I have paid"}
                  </button>
                </>
              ) : (
                <div className="mt-3 rounded-xl bg-green-100 px-4 py-3 text-sm text-green-800">
                  Payment submitted for review. Please upload your receipt in
                  chat.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Pay on delivery is available for this order.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} href="/shop" variant="primary">
              Continue shopping
            </Button>

            <Button
              as="a"
              href={supportWaLink}
              target="_blank"
              rel="noreferrer"
              variant="ghost"
            >
              Contact via WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Cart</h1>
            <div className="mt-1 text-sm text-slate-600">
              Review items, enter your delivery details, and place your order.
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
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
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
                  <div className="font-semibold text-slate-900">
                    {item.name}
                  </div>
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
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    −
                  </button>

                  <span className="w-8 text-center font-semibold">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
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
                  className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
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

              <div className="mt-2 text-xs text-slate-500">
                Bank details will appear automatically in your in-app chat after
                the order is submitted.
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-600">
              Orders under ₦3,000,000 can be completed with pay-on-delivery.
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-base font-bold text-slate-900">
            Customer details
          </div>
          <div className="mt-1 text-sm text-slate-600">
            These details will be attached to your order.
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="Enter your full name"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone number
              </label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="Enter your phone number"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Delivery address
              </label>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="Enter your delivery address"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                City
              </label>
              <input
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="City"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                State
              </label>
              <input
                value={customerState}
                onChange={(e) => setCustomerState(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="State"
              />
            </div>
          </div>

          {placeOrderError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {placeOrderError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Submitting your order will create a linked support conversation
              for confirmation and payment follow-up.
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                onClick={handlePlaceOrder}
                variant="primary"
                className="w-full sm:w-auto"
              >
                {placingOrder ? "Submitting order..." : "Submit order"}
              </Button>

              <Button
                as="a"
                href={supportWaLink}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                className="w-full sm:w-auto"
              >
                WhatsApp support
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold text-slate-900">Order details</div>
        <div className="mt-2 text-sm text-slate-600">
          View your totals before submitting the order.
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Items</div>
            <div className="text-sm font-semibold text-slate-900">
              {itemCount}
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
