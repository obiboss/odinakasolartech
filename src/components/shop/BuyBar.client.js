"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useCart } from "@/components/cart/CartContext.client";
import { formatCurrency } from "@/lib/formatCurrency";
import { createOrder } from "@/lib/orders/createOrder";
import { createOrderConversation } from "@/lib/chat/createOrderConversation";

const HIGH_VALUE_THRESHOLD = 3_000_000;

async function ensureSession() {
  const startSession = performance.now();
  const { data, error } = await supabase.auth.getSession();
  console.log(
    `[SUPABASE ${Math.round(performance.now() - startSession)}ms] auth.getSession`,
  );

  if (error) throw error;
  if (data?.session) return data.session;

  const startAnon = performance.now();
  const { data: anon, error: anonError } =
    await supabase.auth.signInAnonymously();
  console.log(
    `[SUPABASE ${Math.round(performance.now() - startAnon)}ms] auth.signInAnonymously`,
  );

  if (anonError) throw anonError;

  return anon.session;
}

function getProductImage(product) {
  return product?.images?.[0]?.image_url || "";
}

function buildSingleProductCartItem(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price || 0),
    image: getProductImage(product),
    quantity: 1,
  };
}

export default function BuyBar({ product, waLink }) {
  const { addItem, openCart } = useCart();

  const [added, setAdded] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const productTotal = useMemo(
    () => Number(product.price || 0),
    [product.price],
  );
  const requiresDeposit = productTotal > HIGH_VALUE_THRESHOLD;
  const depositAmount = requiresDeposit ? Math.round(productTotal * 0.6) : 0;

  function onAddToCart() {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price ?? 0,
      image: getProductImage(product),
    });

    openCart();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  function openCustomerDetailsForm() {
    setFormError("");
    setSubmittedOrder(null);
    setShowOrderForm(true);
  }

  function closeCustomerDetailsForm() {
    if (submitting) return;
    setShowOrderForm(false);
    setFormError("");
  }

  async function handleSubmitOrder(e) {
    e.preventDefault();
    setFormError("");

    if (!customerName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }

    if (!customerPhone.trim()) {
      setFormError("Please enter your phone number.");
      return;
    }

    if (!customerAddress.trim()) {
      setFormError("Please enter your delivery address.");
      return;
    }

    if (!customerCity.trim()) {
      setFormError("Please enter your city.");
      return;
    }

    if (!customerState.trim()) {
      setFormError("Please enter your state.");
      return;
    }

    try {
      setSubmitting(true);

      const session = await ensureSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("Unable to start customer session.");
      }

      const order = await createOrder({
        cartItems: [buildSingleProductCartItem(product)],
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
          city: customerCity.trim(),
          state: customerState.trim(),
        },
        total: productTotal,
        customerId: userId,
      });

      const conversation = await createOrderConversation({
        userId,
        order,
      });

      setSubmittedOrder({
        id: order.id,
        orderCode: order.order_code || order.id,
        totalAmount: order.total_amount,
        requiresDeposit: order.requires_deposit,
        depositAmount: order.deposit_amount,
        conversationId: conversation.id,
      });
    } catch (err) {
      console.error(err);
      setFormError(err?.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-slate-600">Price</div>
          <div className="text-xl font-extrabold text-amber-600">
            {formatCurrency(product.price)}
          </div>

          {requiresDeposit ? (
            <div className="mt-1 text-xs text-slate-500">
              60% deposit: {formatCurrency(depositAmount)}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onAddToCart}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 cursor-pointer"
          >
            {added ? "Added" : "Add to cart"}
          </button>

          <button
            type="button"
            onClick={openCustomerDetailsForm}
            className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90 cursor-pointer"
          >
            WhatsApp to confirm
          </button>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        Fill your details here first. You can continue on WhatsApp after the
        order request is created.
      </div>

      {showOrderForm ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {submittedOrder ? (
            <div>
              <div className="text-base font-bold text-slate-900">
                Order request submitted
              </div>

              <div className="mt-2 text-sm leading-6 text-slate-600">
                Your order has been created and linked to support for
                confirmation.
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    Order reference
                  </span>
                  <span className="text-right text-sm font-semibold text-slate-900">
                    {submittedOrder.orderCode}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">Total</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(submittedOrder.totalAmount)}
                  </span>
                </div>

                {submittedOrder.requiresDeposit ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Deposit required:{" "}
                    <span className="font-semibold">
                      {formatCurrency(submittedOrder.depositAmount)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Pay on delivery is available for this order.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90"
                >
                  Continue on WhatsApp
                </a>

                <button
                  type="button"
                  onClick={closeCustomerDetailsForm}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitOrder}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-bold text-slate-900">
                    Customer details
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    These details will be attached to this product order.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeCustomerDetailsForm}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
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
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="State"
                  />
                </div>
              </div>

              {formError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting order..." : "Submit order request"}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
