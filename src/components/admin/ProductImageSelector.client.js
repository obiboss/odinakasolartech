"use client";

/* eslint-disable @next/next/no-img-element -- Admin previews may include unsaved object/storage URLs. */

import { useState } from "react";
import { Check, ImagePlus } from "lucide-react";

function validImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function imageUrlFrom(item) {
  if (typeof item === "string") return item.trim();
  return String(item?.image_url || "").trim();
}

export default function ProductImageSelector({ label = "Section image", value = "", images = [], onChange }) {
  const [choosing, setChoosing] = useState(false);
  const urls = [...new Set(images.map(imageUrlFrom).filter(Boolean))];
  const selectedUrl = imageUrlFrom(value);
  const isValid = validImageUrl(selectedUrl);

  function commitImageUrl(nextValue) {
    onChange(imageUrlFrom(nextValue));
  }

  function selectImage(item) {
    const imageUrl = imageUrlFrom(item);
    if (!imageUrl || !validImageUrl(imageUrl)) return;
    commitImageUrl(imageUrl);
    setChoosing(false);
  }

  function removeImage() {
    commitImageUrl("");
    setChoosing(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      {selectedUrl && isValid ? <div className="mt-3"><div className="flex h-32 w-44 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><img src={selectedUrl} alt="Selected section image" className="h-full w-full object-contain" /></div><div className="mt-2 flex flex-wrap gap-3"><button type="button" onClick={() => setChoosing((current) => !current)} className="cursor-pointer text-xs font-semibold text-amber-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">Change image</button><button type="button" onClick={removeImage} className="cursor-pointer text-xs font-semibold text-red-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">Remove image</button></div></div> : <button type="button" onClick={() => setChoosing(true)} className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><ImagePlus className="h-4 w-4" aria-hidden="true" /> Choose image</button>}
      {choosing ? <div className="mt-3 rounded-xl bg-slate-50 p-3"><div className="text-xs font-semibold text-slate-700">Choose image</div>{urls.length ? <div className="mt-2 flex flex-wrap gap-2">{urls.map((url, index) => <button key={url} type="button" onClick={() => selectImage(url)} aria-label={`Choose product image ${index + 1}`} aria-pressed={selectedUrl === url} className={`relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border-2 bg-white p-1 transition hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${selectedUrl === url ? "border-amber-500 ring-2 ring-amber-200" : "border-slate-200"}`}><img src={url} alt="" className="h-full w-full object-contain" />{selectedUrl === url ? <span className="absolute right-1 top-1 rounded-full bg-amber-500 p-0.5 text-white"><Check className="h-3 w-3" aria-hidden="true" /></span> : null}</button>)}</div> : <p className="mt-2 text-xs text-slate-500">Add product images first, then choose one here.</p>}</div> : null}
      {selectedUrl && !isValid ? <p className="mt-2 text-xs text-red-700">The selected image is unavailable. Choose another image.</p> : null}
    </div>
  );
}
