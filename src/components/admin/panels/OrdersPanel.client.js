"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

function getOrderItemTotal(item) {
  return Number(item?.price_at_purchase || 0) * Number(item?.quantity || 0);
}

const STATUS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "expired", label: "Expired" },
];

export default function OrdersPanel() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    if (!s) return rows;

    return rows.filter((o) => {
      const id = String(o.id || "").toLowerCase();
      const phone = String(o.customer_phone || "").toLowerCase();
      const name = String(o.customer_name || "").toLowerCase();
      const city = String(o.customer_city || "").toLowerCase();
      const stateName = String(o.customer_state || "").toLowerCase();

      const productMatch = (o.order_items || []).some((item) => {
        return String(item?.product?.name || "")
          .toLowerCase()
          .includes(s);
      });

      return (
        id.includes(s) ||
        phone.includes(s) ||
        name.includes(s) ||
        city.includes(s) ||
        stateName.includes(s) ||
        productMatch
      );
    });
  }, [rows, q]);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      let query = supabase
        .from("orders")
        .select(
          `
          id,
          total_amount,
          status,
          created_at,
          customer_name,
          customer_phone,
          customer_address,
          customer_city,
          customer_state,
          payment_method,
          payment_status,
          requires_deposit,
          deposit_amount,
          currency,
          order_items (
            id,
            quantity,
            price_at_purchase,
            package_name,
            product:products (
              id,
              name,
              slug
            )
          ),
          conversations:conversations!conversations_order_id_fkey (
            id,
            status,
            created_at
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(80);

      if (status !== "all") query = query.eq("status", status);

      const { data, error } = await query;

      if (error) throw error;

      setRows(data || []);
    } catch (e) {
      setErr(e?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  async function setOrderStatus(id, next) {
    const { error } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", id);

    if (error) return alert(error.message);

    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-bold">Orders</div>
            <div className="text-sm text-slate-600">
              Track customer details, ordered products, payment, and status.
            </div>
          </div>

          <button
            onClick={load}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {STATUS.map((s) => (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={cx(
                  "shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-200 cursor-pointer",
                  status === s.key
                    ? "bg-amber-500 text-black"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 lg:w-[420px]"
            placeholder="Search by order ID, customer, phone, city, or product"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="text-sm text-slate-600">Loading orders...</div>
        ) : filtered.length ? (
          filtered.map((o) => {
            const orderItems = o.order_items || [];
            const conversation = o.conversations?.[0] || null;

            return (
              <div
                key={o.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-bold">
                      Order <span className="text-slate-600">#{o.id}</span>
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(
                        "rounded-full px-3 py-1 text-xs font-semibold border",
                        o.status === "confirmed"
                          ? "border-green-500/30 bg-green-500/10 text-green-700"
                          : o.status === "expired"
                            ? "border-red-500/30 bg-red-500/10 text-red-700"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-900",
                      )}
                    >
                      {o.status || "pending"}
                    </span>

                    <div className="text-sm font-bold">
                      {money(o.total_amount)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Customer details
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-900">
                          Name:
                        </span>{" "}
                        {o.customer_name || "—"}
                      </div>

                      <div>
                        <span className="font-semibold text-slate-900">
                          Phone:
                        </span>{" "}
                        {o.customer_phone || "—"}
                      </div>

                      <div>
                        <span className="font-semibold text-slate-900">
                          Address:
                        </span>{" "}
                        {o.customer_address || "—"}
                      </div>

                      <div>
                        <span className="font-semibold text-slate-900">
                          City/State:
                        </span>{" "}
                        {[o.customer_city, o.customer_state]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Payment and support
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        Payment:{" "}
                        {o.payment_method || "Pay on delivery / Transfer"}
                      </span>

                      <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        Payment status: {o.payment_status || "pending"}
                      </span>

                      <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        Chat: {conversation ? "Linked" : "Not linked"}
                      </span>

                      {o.requires_deposit ? (
                        <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          Deposit: {money(o.deposit_amount)}
                        </span>
                      ) : null}
                    </div>
                  </section>
                </div>

                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Ordered items
                    </div>

                    <div className="text-xs text-slate-500">
                      {orderItems.length} item
                      {orderItems.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  {orderItems.length ? (
                    <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
                      {orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-2 bg-white p-3 text-sm sm:grid-cols-[1fr,auto,auto,auto] sm:items-center"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              {item?.product?.name || "Product unavailable"}
                            </div>
                            {item.package_name ? (
                              <div className="text-xs text-slate-600">
                                Package: {item.package_name}
                              </div>
                            ) : null}

                            {item?.product?.slug ? (
                              <div className="mt-1 text-xs text-slate-500">
                                /shop/{item.product.slug}
                              </div>
                            ) : null}
                          </div>

                          <div className="text-slate-600">
                            Qty:{" "}
                            <span className="font-semibold text-slate-900">
                              {item.quantity}
                            </span>
                          </div>

                          <div className="text-slate-600">
                            Unit:{" "}
                            <span className="font-semibold text-slate-900">
                              {money(item.price_at_purchase)}
                            </span>
                          </div>

                          <div className="font-semibold text-slate-900">
                            {money(getOrderItemTotal(item))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No order items were found for this order.
                    </div>
                  )}
                </section>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setOrderStatus(o.id, "confirmed")}
                    className="rounded-2xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:opacity-90 cursor-pointer"
                  >
                    Mark confirmed
                  </button>

                  <button
                    onClick={() => setOrderStatus(o.id, "pending")}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Set pending
                  </button>

                  <button
                    onClick={() => setOrderStatus(o.id, "expired")}
                    className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-500/15 cursor-pointer"
                  >
                    Expire
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-slate-600">No orders found.</div>
        )}
      </div>
    </div>
  );
}
