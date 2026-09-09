"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/formatCurrency";

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20";
}

function listItems(value) {
  const items = Array.isArray(value)
    ? value
    : String(value || "").split(/\r?\n/);
  return items.map((item) => String(item || ""));
}

function editableList(value) {
  const items = listItems(value);
  return items.length ? items : [""];
}

function numericValue(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function currencyInputValue(value) {
  if (value === "" || value === null || value === undefined) return "";
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("en-NG") : "";
}

function parseCurrencyInput(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits) : "";
}

function savingsFor(item) {
  const sale = numericValue(item.price);
  const normal = numericValue(item.normal_price);
  return sale !== null && normal !== null && normal > sale ? normal - sale : 0;
}

function PackagePreview({ item }) {
  const sale = numericValue(item.price);
  const normal = numericValue(item.normal_price);
  const savings = savingsFor(item);
  const image = item.imagePreviewUrl || item.image_url;
  const features = [
    ...listItems(item.included_items).filter((entry) => entry.trim()),
    ...listItems(item.bonuses)
      .filter((entry) => entry.trim())
      .map((bonus) => `Bonus: ${bonus}`),
    item.warranty ? `Warranty: ${item.warranty}` : "",
    item.delivery ? `Delivery: ${item.delivery}` : "",
    item.payment ? `Payment: ${item.payment}` : "",
  ].filter(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
      <div className="relative flex aspect-[16/9] items-center justify-center bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="Package preview" className="h-full w-full object-contain" />
        ) : <span className="text-xs font-semibold text-slate-400">Package image preview</span>}
        {item.featured ? <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-black uppercase text-slate-950">Recommended</span> : null}
      </div>
      <div className="p-4">
        <div className="text-xs font-black uppercase tracking-widest text-amber-700">Package preview</div>
        <div className="mt-1 text-lg font-black text-slate-950">{item.name || "Package title"}</div>
        {savings > 0 ? <div className="mt-2 text-xs font-black uppercase text-red-600">Save — {formatCurrency(savings)}</div> : null}
        <div className="mt-3 text-2xl font-black text-amber-700">{sale !== null ? formatCurrency(sale) : "Sale price"}</div>
        {normal !== null ? <div className={savings > 0 ? "mt-1 text-sm text-slate-500 line-through" : "mt-1 text-sm text-slate-500"}>Normal price — {formatCurrency(normal)}</div> : null}
        {item.description ? <p className="mt-3 text-xs leading-5 text-slate-600">{item.description}</p> : null}
        {features.length ? <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-700">{features.map((feature, index) => <li key={`${feature}-${index}`}>✓ {feature}</li>)}</ul> : null}
        <div className="mt-4 rounded-xl bg-orange-500 px-3 py-2 text-center text-xs font-black text-white">{item.cta_text || "I WANT THIS PACKAGE"}</div>
      </div>
    </div>
  );
}

export default function ProductPackageEditor({ packages, onAdd, onUpdate, onRemove, onMove, onError }) {
  const listInputRefs = useRef({});
  const previousIdsRef = useRef(packages.map((item) => item.id));
  const [openPackageId, setOpenPackageId] = useState(packages[0]?.id || "");

  useEffect(() => {
    const previousIds = new Set(previousIdsRef.current);
    const addedPackage = packages.find((item) => !previousIds.has(item.id));
    if (addedPackage) setOpenPackageId(addedPackage.id);
    else if (openPackageId && !packages.some((item) => item.id === openPackageId)) setOpenPackageId(packages[0]?.id || "");
    previousIdsRef.current = packages.map((item) => item.id);
  }, [packages, openPackageId]);

  function listInputKey(id, field, index) {
    return `${id}:${field}:${index}`;
  }

  function updateListItem(id, field, index, value) {
    const item = packages.find((entry) => entry.id === id);
    const items = editableList(item?.[field]);
    items[index] = value;
    onUpdate(id, { [field]: items });
  }

  function addListItem(id, field, index) {
    const item = packages.find((entry) => entry.id === id);
    const items = editableList(item?.[field]);
    const nextIndex = Math.min(index + 1, items.length);
    items.splice(nextIndex, 0, "");
    onUpdate(id, { [field]: items });
    requestAnimationFrame(() => {
      listInputRefs.current[listInputKey(id, field, nextIndex)]?.focus();
    });
  }

  function removeListItem(id, field, index) {
    const item = packages.find((entry) => entry.id === id);
    const items = editableList(item?.[field]);
    items.splice(index, 1);
    onUpdate(id, { [field]: items });
  }

  function handleListKeyDown(event, id, field, index) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addListItem(id, field, index);
  }

  function renderRepeatableList(item, field, label, placeholder) {
    const items = editableList(item[field]);

    return (
      <div className="space-y-2">
        {items.map((value, index) => {
          const key = listInputKey(item.id, field, index);
          return (
            <div key={key} className="flex items-center gap-2">
              <input
                ref={(node) => {
                  if (node) listInputRefs.current[key] = node;
                  else delete listInputRefs.current[key];
                }}
                value={value}
                onChange={(event) => updateListItem(item.id, field, index, event.target.value)}
                onKeyDown={(event) => handleListKeyDown(event, item.id, field, index)}
                placeholder={placeholder}
                className={inputClass()}
              />
              <button
                type="button"
                onClick={() => removeListItem(item.id, field, index)}
                className="shrink-0 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
              >
                Remove
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => addListItem(item.id, field, items.length - 1)}
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          + Add {label}
        </button>
      </div>
    );
  }

  function selectImage(id, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      onError("Package images must be PNG, JPG, JPEG, or WEBP files.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Each package image must be 5MB or smaller.");
      return;
    }

    const item = packages.find((entry) => entry.id === id);
    if (item?.imagePreviewUrl) URL.revokeObjectURL(item.imagePreviewUrl);
    onUpdate(id, {
      imageFile: file,
      imagePreviewUrl: URL.createObjectURL(file),
      remove_image: false,
    });
  }

  function removeImage(item) {
    if (item.imagePreviewUrl) URL.revokeObjectURL(item.imagePreviewUrl);
    onUpdate(item.id, { imageFile: null, imagePreviewUrl: "", image_url: "", remove_image: true });
  }

  function removePackage(item) {
    if (item.imagePreviewUrl) URL.revokeObjectURL(item.imagePreviewUrl);
    onRemove(item.id);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <div>
          <div className="text-sm font-semibold">Packages</div>
          <div className="mt-1 text-xs text-slate-500">Each package can have its own image, sale pricing, benefits, terms, and customer CTA.</div>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        {!packages.length ? (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">Add the first way customers can buy this product.</p>
            <button type="button" onClick={onAdd} className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">+ Add Package</button>
          </div>
        ) : null}
        {packages.map((item, index) => {
          const sale = numericValue(item.price);
          const normal = numericValue(item.normal_price);
          const savings = savingsFor(item);
          const image = item.imagePreviewUrl || item.image_url;

          return (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <button type="button" onClick={() => setOpenPackageId(openPackageId === item.id ? "" : item.id)} className="flex w-full items-center justify-between gap-4 text-left">
                <span><span className="block text-xs font-black uppercase tracking-wider text-amber-700">Package {index + 1}</span><span className="mt-1 block font-black text-slate-950">{item.name || "Untitled package"}</span><span className="mt-1 block text-xs text-slate-500">{sale !== null ? formatCurrency(sale) : "Price not set"} · {item.active === false ? "Hidden" : "Active"}</span></span>
                <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">{openPackageId === item.id ? "Collapse" : "Edit"}</span>
              </button>
              {openPackageId === item.id ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),18rem]">
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">Package name<span className="mt-1 block text-[11px] font-normal text-slate-500">The name customers will see for this option.</span><input value={item.name || ""} onChange={(event) => onUpdate(item.id, { name: event.target.value })} placeholder="Buy with panels" className={`${inputClass()} mt-1`} /></label>
                    <label className="block text-xs font-semibold text-slate-700">CTA text<input value={item.cta_text || ""} onChange={(event) => onUpdate(item.id, { cta_text: event.target.value })} placeholder="I WANT THIS PACKAGE" className={`${inputClass()} mt-1`} /></label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">Sale price<span className="mt-1 block text-[11px] font-normal text-slate-500">The total price customers pay for this option.</span><div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₦</span><input value={currencyInputValue(item.price)} onChange={(event) => onUpdate(item.id, { price: parseCurrencyInput(event.target.value) })} placeholder="3,450,000" inputMode="numeric" className={`${inputClass()} pl-8`} /></div></label>
                    <label className="block text-xs font-semibold text-slate-700">Normal price<span className="mt-1 block text-[11px] font-normal text-slate-500">Optional price before any discount.</span><div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₦</span><input value={currencyInputValue(item.normal_price)} onChange={(event) => onUpdate(item.id, { normal_price: parseCurrencyInput(event.target.value) })} placeholder="3,600,000" inputMode="numeric" className={`${inputClass()} pl-8`} /></div></label>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{savings > 0 ? `Automatic savings: ${formatCurrency(savings)}` : normal !== null && sale !== null && normal === sale ? "Automatic savings: none" : "Automatic savings will appear when normal price is higher than sale price."}</div>

                  <label className="block text-xs font-semibold text-slate-700">Description (optional)<span className="mt-1 block text-[11px] font-normal text-slate-500">Explain what is included in this package.</span><textarea value={item.description || ""} onChange={(event) => onUpdate(item.id, { description: event.target.value })} placeholder="Includes 6 solar panels, installation and delivery." className={`${inputClass()} mt-1 min-h-20 resize-y`} /></label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="block text-xs font-semibold text-slate-700">
                      <div>Included items</div>
                      <div className="mt-1">{renderRepeatableList(item, "included_items", "Included Item", "6 Solar Panels")}</div>
                    </div>
                    <div className="block text-xs font-semibold text-slate-700">
                      <div>Bonuses</div>
                      <div className="mt-1">{renderRepeatableList(item, "bonuses", "Bonus", "Free installation")}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-xs font-semibold text-slate-700">Warranty<textarea value={item.warranty || ""} onChange={(event) => onUpdate(item.id, { warranty: event.target.value })} placeholder="2-year warranty" className={`${inputClass()} mt-1 min-h-20 resize-y`} /></label>
                    <label className="block text-xs font-semibold text-slate-700">Delivery<textarea value={item.delivery || ""} onChange={(event) => onUpdate(item.id, { delivery: event.target.value })} placeholder="Free delivery" className={`${inputClass()} mt-1 min-h-20 resize-y`} /></label>
                    <label className="block text-xs font-semibold text-slate-700">Payment<textarea value={item.payment || ""} onChange={(event) => onUpdate(item.id, { payment: event.target.value })} placeholder="Payment on delivery" className={`${inputClass()} mt-1 min-h-20 resize-y`} /></label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={item.featured === true} onChange={(event) => onUpdate(item.id, { featured: event.target.checked })} className="h-4 w-4" /> Featured / recommended</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={item.active !== false} onChange={(event) => onUpdate(item.id, { active: event.target.checked })} className="h-4 w-4" /> Active</label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onMove(item.id, -1)} disabled={index === 0} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Move up</button>
                    <button type="button" onClick={() => onMove(item.id, 1)} disabled={index === packages.length - 1} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Move down</button>
                    <button type="button" onClick={() => removePackage(item)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Remove package</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="Package" className="h-full w-full object-contain" />
                    ) : <span className="px-3 text-center text-xs text-slate-500">No package image yet</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">{image ? "Replace image" : "Upload image"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectImage(item.id, event)} className="sr-only" /></label>
                    {image ? <button type="button" onClick={() => removeImage(item)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Remove image</button> : null}
                  </div>
                  <p className="text-[11px] leading-5 text-slate-500">PNG, JPG, JPEG, or WEBP. Maximum 5MB. Images use the existing product image storage bucket.</p>
                  <PackagePreview item={item} />
                </div>
              </div>
              ) : null}
            </div>
          );
        })}
        {packages.length ? <button type="button" onClick={onAdd} className="w-full rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm font-black text-amber-950 hover:bg-amber-100">+ Add Another Package</button> : null}
      </div>
    </div>
  );
}
