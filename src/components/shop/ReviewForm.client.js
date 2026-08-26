// src/components/shop/ReviewForm.client.js
"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getStoragePublicUrl } from "@/lib/supabase/storage";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ReviewForm({ productId }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const imageInputRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    try {
      let imageUrl = null;

      if (imageFile) {
        if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
          throw new Error("Only JPG, JPEG, PNG, and WEBP images are allowed.");
        }

        const ext = (imageFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${productId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

        const startUpload = performance.now();
        const upload = await supabase.storage
          .from("review-images")
          .upload(path, imageFile, {
            cacheControl: "31536000",
            upsert: false,
            contentType: imageFile.type,
          });
        console.log(
          `[SUPABASE ${Math.round(performance.now() - startUpload)}ms] storage.upload(review-images)`,
        );

        if (upload.error) throw new Error(upload.error.message);

        imageUrl = getStoragePublicUrl(supabase, "review-images", path);

        if (!imageUrl) {
          throw new Error(
            "Upload succeeded, but public URL could not be created.",
          );
        }
      }

      const start = performance.now();
      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        display_name: name.trim() || null,
        rating,
        content,
        image_url: imageUrl,
        status: "pending",
      });
      console.log(
        `[SUPABASE ${Math.round(performance.now() - start)}ms] reviews.insert`,
      );

      if (error) throw error;

      setName("");
      setRating(5);
      setContent("");
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      setMsg("Submitted. It will appear after admin approval.");
    } catch (error) {
      setMsg(error?.message || "Failed to submit review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm focus:ring-2 focus:ring-amber-300/60 focus:border-amber-300"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
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
        disabled={busy}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Review photo (optional)
        </label>
        <input
          ref={imageInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          disabled={busy}
          className="mt-1 block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
      </div>

      {msg ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {msg}
        </div>
      ) : null}

      <button
        disabled={busy}
        className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 hover:opacity-90 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        {busy ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
