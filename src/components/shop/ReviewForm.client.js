// src/components/shop/ReviewForm.client.js
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ReviewForm({ productId }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      rating,
      content,
      status: "pending",
    });

    setBusy(false);

    if (error) return setMsg(error.message);

    setName("");
    setRating(5);
    setContent("");
    setMsg("Submitted. It will appear after admin approval.");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm focus:ring-2 focus:ring-amber-300/60 focus:border-amber-300"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled
        />
        <select
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm focus:ring-2 focus:ring-amber-300/60 focus:border-amber-300"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} Star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className="w-full min-h-[110px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm focus:ring-2 focus:ring-amber-300/60 focus:border-amber-300"
        placeholder="Write your review..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />

      {msg ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {msg}
        </div>
      ) : null}

      <button
        disabled={busy}
        className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
