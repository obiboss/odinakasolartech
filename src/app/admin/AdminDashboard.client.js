// src/app/admin/AdminDashboard.client.js
"use client";

import { useMemo, useState } from "react";
import OverviewPanel from "@/components/admin/panels/OverviewPanel.client";
import OrdersPanel from "@/components/admin/panels/OrdersPanel.client";
import ProductsPanel from "@/components/admin/panels/ProductsPanel.client";
import ChatPanel from "@/components/admin/panels/ChatPanel.client";
import PromosPanel from "@/components/admin/panels/PromosPanel.client";
import SettingsPanel from "@/components/admin/panels/SettingsPanel.client";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "chat", label: "Chat" },
  { key: "promos", label: "Promos" },
  { key: "settings", label: "Settings" },
];

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

export default function AdminDashboardClient() {
  const [tab, setTab] = useState("overview");

  const Panel = useMemo(() => {
    switch (tab) {
      case "orders":
        return <OrdersPanel />;
      case "products":
        return <ProductsPanel />;
      case "chat":
        return <ChatPanel />;
      case "promos":
        return <PromosPanel />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <OverviewPanel onGo={(k) => setTab(k)} />;
    }
  }, [tab]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="card p-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                "shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                tab === t.key
                  ? "bg-amber-500 text-black"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="min-h-[65vh]">{Panel}</div>
    </div>
  );
}
