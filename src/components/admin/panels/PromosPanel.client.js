// src/components/admin/panels/PromosPanel.client.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

export default function PromosPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [promos, setPromos] = useState([]);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    active: false,
    starts: "",
    ends: "",
  });

  async function load() {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("promos")
      .select("id,title,subtitle,active,starts,ends")
      .order("created_at", { ascending: false });

    if (error) setErr(error.message);
    setPromos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPromo() {
    setSaving(true);
    setErr("");

    const payload = {
      title: form.title || null,
      subtitle: form.subtitle || null,
      active: !!form.active,
      starts: form.starts ? new Date(form.starts).toISOString() : null,
      ends: form.ends ? new Date(form.ends).toISOString() : null,
    };

    const { error } = await supabase.from("promos").insert(payload);
    if (error) {
      setSaving(false);
      return setErr(error.message);
    }

    setForm({ title: "", subtitle: "", active: false, starts: "", ends: "" });
    await load();
    setSaving(false);
  }

  async function setActive(id, active) {
    // if turning on, turn off others
    if (active) {
      await supabase.from("promos").update({ active: false }).neq("id", id);
    }
    const { error } = await supabase
      .from("promos")
      .update({ active })
      .eq("id", id);
    if (error) return setErr(error.message);
    await load();
  }

  async function remove(id) {
    if (!confirm("Delete this promo?")) return;
    const { error } = await supabase.from("promos").delete().eq("id", id);
    if (error) return setErr(error.message);
    await load();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <h3 className="text-lg font-bold">Promos</h3>
      <p className="mt-1 text-sm text-white/70">
        Create a banner promo (you can keep only one active).
      </p>

      {err && (
        <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="text-sm font-semibold">New promo</div>

            <div className="mt-3 grid gap-3">
              <input
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                placeholder="Title (e.g. Launch Promo)"
                value={form.title}
                onChange={(e) =>
                  setForm((s) => ({ ...s, title: e.target.value }))
                }
              />
              <input
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                placeholder="Subtitle (e.g. Bundle panels + inverter...)"
                value={form.subtitle}
                onChange={(e) =>
                  setForm((s) => ({ ...s, subtitle: e.target.value }))
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                  type="datetime-local"
                  value={form.starts}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, starts: e.target.value }))
                  }
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                  type="datetime-local"
                  value={form.ends}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, ends: e.target.value }))
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, active: e.target.checked }))
                  }
                />
                Make this promo active
              </label>

              <button
                disabled={saving}
                onClick={createPromo}
                className={cx(
                  "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  "bg-white text-black hover:opacity-95 disabled:opacity-60",
                )}
              >
                {saving ? "Creating…" : "Create promo"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="text-sm font-semibold">Existing promos</div>

            {loading ? (
              <div className="mt-4 text-sm text-white/70">Loading…</div>
            ) : promos.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/70">
                No promos yet.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {promos.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">
                            {p.title || "Untitled promo"}
                          </div>
                          {p.active && (
                            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-100">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-white/70">
                          {p.subtitle || "—"}
                        </div>
                        <div className="mt-2 text-xs text-white/55">
                          Starts:{" "}
                          {p.starts ? new Date(p.starts).toLocaleString() : "—"}
                          {" • "}
                          Ends:{" "}
                          {p.ends ? new Date(p.ends).toLocaleString() : "—"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setActive(p.id, !p.active)}
                          className={cx(
                            "rounded-xl border px-3 py-2 text-sm font-semibold",
                            p.active
                              ? "border-white/10 bg-white/[0.06] hover:bg-white/[0.09]"
                              : "border-yellow-500/30 bg-yellow-500/15 text-yellow-100 hover:bg-yellow-500/20",
                          )}
                        >
                          {p.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/15"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
