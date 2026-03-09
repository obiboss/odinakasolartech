// src/app/admin/AdminDashboard.client.js
"use client";

import { useMemo, useState } from "react";
import ProductsPanel from "@/components/admin/panels/ProductsPanel.client";
import ChatPanel from "@/components/admin/panels/ChatPanel.client";
import PromosPanel from "@/components/admin/panels/PromosPanel.client";
import SettingsPanel from "@/components/admin/panels/SettingsPanel.client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

const TABS = [
  { id: "products", label: "Products" },
  { id: "chat", label: "Chat" },
  { id: "promos", label: "Promos" },
  { id: "settings", label: "Settings" },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("products");

  const Panel = useMemo(() => {
    if (tab === "products") return <ProductsPanel />;
    if (tab === "chat") return <ChatPanel />;
    if (tab === "promos") return <PromosPanel />;
    return <SettingsPanel />;
  }, [tab]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Dashboard</h2>
              <p className="mt-1 text-sm text-white/70">
                Switch panels without changing pages.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cx(
                    "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                    "border border-white/10",
                    tab === t.id
                      ? "bg-yellow-500/20 text-yellow-100 border-yellow-500/30"
                      : "bg-white/[0.06] text-white/80 hover:bg-white/[0.09]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {Panel}
      </div>
    </div>
  );
}
