// src/components/admin/panels/OverviewPanel.client.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun
  const diff = (day + 6) % 7; // Mon start
  x.setDate(x.getDate() - diff);
  return x;
}
function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

async function fetchOrdersSince(sinceISO) {
  // NOTE: assumes orders has created_at, total_amount, status
  const { data, error } = await supabase
    .from("orders")
    .select("id, total_amount, status, created_at")
    .gte("created_at", sinceISO);

  if (error) throw error;
  return data || [];
}

async function fetchTopSold(sinceISO) {
  // If you have a view, use it. Otherwise this is a safe client-side aggregation.
  const { data: items, error } = await supabase
    .from("order_items")
    .select("product_id, quantity, created_at, orders!inner(created_at)")
    .gte("orders.created_at", sinceISO);

  if (error) throw error;

  const qtyByProduct = new Map();
  for (const it of items || []) {
    const pid = it.product_id || "unknown";
    qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + (it.quantity || 0));
  }

  const top = [...qtyByProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const ids = top.map(([id]) => id).filter((x) => x !== "unknown");
  let products = [];
  if (ids.length) {
    const { data, error: pErr } = await supabase
      .from("products")
      .select("id, name")
      .in("id", ids);
    if (pErr) throw pErr;
    products = data || [];
  }

  const nameById = new Map(products.map((p) => [p.id, p.name]));
  return top.map(([id, qty]) => ({
    product_id: id,
    name: nameById.get(id) || "Unknown product",
    qty,
  }));
}

async function fetchTopViews(sinceISO) {
  const { data: views, error } = await supabase
    .from("product_views")
    .select("product_id, viewed_at")
    .gte("viewed_at", sinceISO);

  if (error) throw error;

  const countBy = new Map();
  for (const v of views || []) {
    const pid = v.product_id || "unknown";
    countBy.set(pid, (countBy.get(pid) || 0) + 1);
  }

  const top = [...countBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const ids = top.map(([id]) => id).filter((x) => x !== "unknown");

  let products = [];
  if (ids.length) {
    const { data, error: pErr } = await supabase
      .from("products")
      .select("id, name")
      .in("id", ids);
    if (pErr) throw pErr;
    products = data || [];
  }

  const nameById = new Map(products.map((p) => [p.id, p.name]));
  return top.map(([id, c]) => ({
    product_id: id,
    name: nameById.get(id) || "Unknown product",
    views: c,
  }));
}

async function fetchTopSearches(sinceISO) {
  const { data, error } = await supabase
    .from("search_logs")
    .select("query, searched_at")
    .gte("searched_at", sinceISO);

  if (error) throw error;

  const countBy = new Map();
  for (const r of data || []) {
    const q = (r.query || "").trim().toLowerCase();
    if (!q) continue;
    countBy.set(q, (countBy.get(q) || 0) + 1);
  }

  return [...countBy.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([query, count]) => ({ query, count }));
}

function StatCard({ title, qty, amount, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "text-left rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold">{qty}</div>
      <div className="mt-1 text-sm text-slate-600">{money(amount)}</div>
    </button>
  );
}

export default function OverviewPanel({ onGo }) {
  const [range, setRange] = useState("week"); // day|week|month
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [stats, setStats] = useState({
    day: { qty: 0, amount: 0 },
    week: { qty: 0, amount: 0 },
    month: { qty: 0, amount: 0 },
  });

  const [topSold, setTopSold] = useState([]);
  const [topViewed, setTopViewed] = useState([]);
  const [topSearched, setTopSearched] = useState([]);

  const sinceISO = useMemo(() => {
    const now = new Date();
    const d =
      range === "day"
        ? startOfDay(now)
        : range === "month"
          ? startOfMonth(now)
          : startOfWeek(now);
    return d.toISOString();
  }, [range]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const now = new Date();
        const dayISO = startOfDay(now).toISOString();
        const weekISO = startOfWeek(now).toISOString();
        const monthISO = startOfMonth(now).toISOString();

        const [dayOrders, weekOrders, monthOrders] = await Promise.all([
          fetchOrdersSince(dayISO),
          fetchOrdersSince(weekISO),
          fetchOrdersSince(monthISO),
        ]);

        const calc = (rows) => {
          const confirmed = rows.filter((o) => o.status !== "expired");
          return {
            qty: confirmed.length,
            amount: confirmed.reduce(
              (s, r) => s + Number(r.total_amount || 0),
              0,
            ),
          };
        };

        const [sold, viewed, searched] = await Promise.all([
          fetchTopSold(sinceISO),
          fetchTopViews(sinceISO),
          fetchTopSearches(sinceISO),
        ]);

        if (!alive) return;

        setStats({
          day: calc(dayOrders),
          week: calc(weekOrders),
          month: calc(monthOrders),
        });
        setTopSold(sold);
        setTopViewed(viewed);
        setTopSearched(searched);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load overview.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [sinceISO, range]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-bold">Overview</div>
            <div className="text-sm text-slate-600">
              Quick snapshot of orders, what people view, and what they search
              for.
            </div>
          </div>

          <div className="flex gap-2">
            {["day", "week", "month"].map((k) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={cx(
                  "rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-200",
                  range === k
                    ? "bg-yellow-500 text-black"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                )}
              >
                {k === "day"
                  ? "Today"
                  : k === "week"
                    ? "This week"
                    : "This month"}
              </button>
            ))}
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            title="Orders today"
            qty={stats.day.qty}
            amount={stats.day.amount}
            onClick={onGo ? () => onGo("orders") : undefined}
          />
          <StatCard
            title="Orders this week"
            qty={stats.week.qty}
            amount={stats.week.amount}
            onClick={onGo ? () => onGo("orders") : undefined}
          />
          <StatCard
            title="Orders this month"
            qty={stats.month.qty}
            amount={stats.month.amount}
            onClick={onGo ? () => onGo("orders") : undefined}
          />
        </div>

        {loading ? (
          <div className="mt-5 text-sm text-slate-600">
            Loading analytics...
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Most sold"
          subtitle="Based on order items"
          rows={topSold.map((x) => ({
            left: x.name,
            right: `${x.qty} sold`,
          }))}
        />
        <Card
          title="Most viewed"
          subtitle="Product views"
          rows={topViewed.map((x) => ({
            left: x.name,
            right: `${x.views} views`,
          }))}
        />
        <Card
          title="Top searches"
          subtitle="What people type"
          rows={topSearched.map((x) => ({
            left: x.query,
            right: `${x.count}`,
          }))}
        />
      </div>
    </div>
  );
}

function Card({ title, subtitle, rows }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {rows?.length ? (
          rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="text-sm text-slate-700 line-clamp-1">
                {r.left}
              </div>
              <div className="text-xs text-slate-500">{r.right}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-600">No data yet.</div>
        )}
      </div>
    </div>
  );
}
