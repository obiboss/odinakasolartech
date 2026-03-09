// src/components/search/HeaderSearch.client.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function HeaderSearch() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapRef = useRef(null);

  const canSearch = useMemo(() => dq.trim().length >= 2, [dq]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr("");
      if (!canSearch) {
        setItems([]);
        setBusy(false);
        return;
      }

      setBusy(true);
      try {
        const res = await fetch(
          `/api/search/products?q=${encodeURIComponent(dq.trim())}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setErr(json?.error || "Search failed");
          setItems([]);
        } else {
          setItems(json?.items || []);
        }
      } catch (e) {
        if (!cancelled) {
          setErr("Search failed");
          setItems([]);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [dq, canSearch]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Keyboard navigation
  function onKeyDown(e) {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
    if (e.key === "Enter") {
      // If a suggestion is highlighted, follow it
      if (activeIndex >= 0 && items[activeIndex]) {
        const it = items[activeIndex];
        window.location.href = `/shop/${it.slug}`;
      } else {
        // Otherwise go to shop listing search
        window.location.href = `/shop?q=${encodeURIComponent(q.trim())}`;
      }
    }
  }

  const showDropdown = open && q.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative w-full max-w-[520px]">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          🔎
        </span>

        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search products (e.g. 550W panel, inverter, battery)"
          className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 outline-none shadow-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
        />

        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setItems([]);
              setErr("");
              setActiveIndex(-1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            aria-label="Clear search"
          >
            Clear
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="px-4 py-2 text-xs text-slate-600 border-b border-slate-100 flex items-center justify-between">
            <span>
              {busy
                ? "Searching…"
                : err
                  ? err
                  : canSearch
                    ? `${items.length} result(s)`
                    : "Type at least 2 characters"}
            </span>
            <Link
              href={`/shop?q=${encodeURIComponent(q.trim())}`}
              className="font-semibold text-slate-900 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>

          {items.length ? (
            <div className="max-h-[340px] overflow-auto">
              {items.map((it, idx) => {
                const img = it?.images?.[0]?.image_url || "";
                const active = idx === activeIndex;

                return (
                  <Link
                    key={it.id}
                    href={`/shop/${it.slug}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 ${
                      active ? "bg-slate-50" : ""
                    }`}
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shrink-0">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={it.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {it.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600 line-clamp-1">
                        {money(it.price)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-slate-600">
              {canSearch ? "No products found." : "Start typing to search."}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
