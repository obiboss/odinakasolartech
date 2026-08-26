// src/components/admin/AdminShell.js
"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

export default function AdminShell({ children, mode = "admin" }) {
  const [open, setOpen] = useState(false);
  const canShowNav = mode === "admin";

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  };

  const topRight = useMemo(() => {
    if (mode === "admin" || mode === "blocked") {
      return (
        <button
          onClick={signOut}
          className="rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
        >
          Sign out
        </button>
      );
    }
    return null;
  }, [mode]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* premium light background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="absolute -bottom-48 -right-48 h-[620px] w-[620px] rounded-full bg-slate-900/5 blur-3xl" />
      </div>

      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {canShowNav && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white lg:hidden"
                aria-label="Toggle menu"
              >
                Menu
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-200 border border-slate-900/10 shadow-soft" />
              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight">
                  Admin Panel
                </div>
                <div className="text-[11px] text-slate-700">
                  Products • Chat • Promos • Analytics
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">{topRight}</div>
        </div>
      </header>

      {/* body */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[260px_1fr]">
        {/* sidebar (desktop) */}
        {canShowNav && (
          <aside className="hidden lg:block">
            <div className="card p-3">
              <div className="text-xs font-semibold text-slate-700 px-2 py-2">
                Navigation is inside the dashboard tabs
              </div>
              <div className="rounded-xl border border-slate-900/10 bg-white/70 px-3 py-3 text-sm text-slate-700">
                Tip: Use the tabs at the top of the dashboard to switch panels.
              </div>
            </div>
          </aside>
        )}

        {/* mobile drawer */}
        {canShowNav && open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/30"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[82%] max-w-sm border-r border-slate-900/10 bg-[var(--bg)] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">Admin</div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 card p-3 text-sm text-slate-700">
                Use dashboard tabs to switch panels.
              </div>
            </div>
          </div>
        )}

        {/* main */}
        <main className={cx("min-h-[70vh]")}>{children}</main>
      </div>

      <footer className="relative border-t border-slate-900/10 bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-700">
          Admin area is not indexed. Keep your admin credentials safe.
        </div>
      </footer>
    </div>
  );
}
