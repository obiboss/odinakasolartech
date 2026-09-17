"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function buildSingleProductCartItem(product, selectedPackage) {
  const price = Number(selectedPackage?.price ?? product.price ?? 0);
  return {
    id: selectedPackage ? `${product.id}:${selectedPackage.id}` : product.id,
    product_id: product.id,
    package_id: selectedPackage?.id || null,
    package_name: selectedPackage?.name || null,
    name: selectedPackage
      ? `${product.name} — ${selectedPackage.name}`
      : product.name,
    price,
    image: getProductImage(product),
    quantity: 1,
  };
}

function packageList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item));
  return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function packageSavings(item) {
  const sale = Number(item.price);
  const normal = Number(item.normal_price);
  return Number.isFinite(sale) && Number.isFinite(normal) && normal > sale
    ? normal - sale
    : 0;
}

function PackageCard({ item, product, selected, onSelect }) {
  const salePrice = Number(item.price);
  const normalPrice = Number(item.normal_price);
  const hasSalePrice = Number.isFinite(salePrice) && salePrice >= 0;
  const hasNormalPrice = item.normal_price !== null && item.normal_price !== undefined && item.normal_price !== "" && Number.isFinite(normalPrice) && normalPrice >= 0;
  const savings = packageSavings(item);
  const features = [
    ...packageList(item.included_items),
    ...packageList(item.bonuses).map((bonus) => `Bonus: ${bonus}`),
    item.warranty ? `Warranty: ${item.warranty}` : "",
    item.delivery ? `Delivery: ${item.delivery}` : "",
    item.payment ? `Payment: ${item.payment}` : "",
  ].filter(Boolean);
  const image = item.image_url || getProductImage(product);

  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_12px_35px_rgba(15,23,42,0.10)] transition ${selected ? "border-[#374BA5] ring-4 ring-[#374BA5]/15" : "border-slate-200"}`}>
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={item.name || "Package"} className="h-full w-full object-contain" />
        ) : <span className="text-xs font-semibold text-slate-400">Package image</span>}
        {item.featured ? <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase text-white">Recommended</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-xl font-black text-slate-950">{item.name}</h3>
        {savings > 0 ? <div className="mt-2 text-xs font-black uppercase tracking-wide text-red-600">Save — {formatCurrency(savings)}</div> : null}
        <div className="mt-3 text-3xl font-black text-[#374BA5]">{hasSalePrice ? formatCurrency(salePrice) : "Request price"}</div>
        {hasNormalPrice ? <div className={savings > 0 ? "mt-1 text-sm text-slate-500 line-through" : "mt-1 text-sm text-slate-500"}>Normal price — {formatCurrency(normalPrice)}</div> : null}
        {item.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p> : null}
        {features.length ? <ul className="mt-4 flex-1 space-y-2 text-sm leading-5 text-slate-700">{features.map((feature, index) => <li key={`${feature}-${index}`}>✓ {feature}</li>)}</ul> : <div className="flex-1" />}
        <button type="button" onClick={() => onSelect(item.id)} aria-pressed={selected} className="mt-5 w-full rounded-full bg-red-600 px-4 py-3 text-sm font-black uppercase text-white shadow-lg shadow-red-900/20 hover:bg-red-700">{item.cta_text || "I WANT THIS PACKAGE"}</button>
      </div>
    </article>
  );
}

export default function BuyBar({
  product,
  waLink,
  addToCartLabel = "Add to cart",
  confirmLabel = "WhatsApp to confirm",
}) {
  const { addItem, openCart } = useCart();
  const packages = (product.packages || []).filter((item) => item.active !== false);
  const [selectedPackageId, setSelectedPackageId] = useState(
    packages[0]?.id || "",
  );
  const selectedPackage = packages.find((item) => item.id === selectedPackageId);
  const purchasePanelRef = useRef(null);

  useEffect(() => {
    if (!packages.length) {
      if (selectedPackageId) setSelectedPackageId("");
      return;
    }

    if (!packages.some((item) => item.id === selectedPackageId)) {
      setSelectedPackageId(packages[0].id);
    }
  }, [packages, selectedPackageId]);

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
    () => Number(selectedPackage?.price ?? product.price ?? 0),
    [product.price, selectedPackage?.price],
  );
  const requiresDeposit = productTotal > HIGH_VALUE_THRESHOLD;
  const depositAmount = requiresDeposit ? Math.round(productTotal * 0.6) : 0;

  function choosePackage(packageId) {
    setSelectedPackageId(packageId);
    window.requestAnimationFrame(() => {
      purchasePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      purchasePanelRef.current?.focus({ preventScroll: true });
    });
  }

  function onAddToCart() {
    addItem(buildSingleProductCartItem(product, selectedPackage));

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
        cartItems: [buildSingleProductCartItem(product, selectedPackage)],
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
    <div className="space-y-8">
      {packages.length ? (
        <div>
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 19rem), 1fr))" }}>
            {packages.map((item) => (
              <PackageCard
                key={item.id}
                item={item}
                product={product}
                selected={item.id === selectedPackageId}
                onSelect={choosePackage}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div
        ref={purchasePanelRef}
        id="add-to-cart"
        tabIndex={-1}
        className="mx-auto max-w-[745px] scroll-mt-24 rounded-2xl border-2 border-[#374BA5] bg-white p-5 shadow-xl outline-none focus:ring-4 focus:ring-[#374BA5]/20 sm:p-7"
      >
      <div className="mb-5 border-b border-slate-200 pb-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#374BA5]">Complete your order</div>
        <h3 className="mt-1 text-2xl font-black text-slate-950">Add to cart</h3>
        {selectedPackage ? (
          <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status" aria-live="polite">
            <span className="font-black">Your selected package:</span> {selectedPackage.name} — {formatCurrency(selectedPackage.price)}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-slate-600">
            {selectedPackage ? "Selected package price" : "Price"}
          </div>
          <div className="text-xl font-extrabold text-[#374BA5]">
            {formatCurrency(productTotal)}
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
            className="danger-shake rounded-full bg-[#374BA5] px-5 py-3 text-sm font-bold text-white hover:bg-[#2d3e8d] cursor-pointer"
          >
            {added ? "Added" : addToCartLabel}
          </button>

          <button
            type="button"
            onClick={openCustomerDetailsForm}
            className="danger-shake rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      {packages.length ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm font-semibold text-slate-900">
            Choose a package
          </label>
          <select
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
          >
            {packages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {formatCurrency(item.price)}
              </option>
            ))}
          </select>
          {selectedPackage?.description ? (
            <div className="mt-2 text-xs text-slate-600">
              {selectedPackage.description}
            </div>
          ) : null}
        </div>
      ) : null}

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
                  className="danger-shake inline-flex items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90"
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
                className="danger-shake mt-5 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting order..." : "Submit order request"}
              </button>
            </form>
          )}
        </div>
      ) : null}
      </div>
    </div>
  );
}
