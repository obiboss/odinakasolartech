// src/components/admin/panels/ProductsPanel.client.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ProductsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [mode, setMode] = useState("list"); // list | edit | new
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    urlName: "",
    price: "",
    featured: false,
    category_id: "",
    description: "",
  });

  const editingProduct = useMemo(
    () => products.find((p) => p.id === editingId) || null,
    [editingId, products],
  );

  async function loadAll() {
    setLoading(true);
    setErr("");

    const [{ data: cats, error: cErr }, { data: prods, error: pErr }] =
      await Promise.all([
        supabase
          .from("categories")
          .select("id,name")
          .order("name", { ascending: true }),
        supabase
          .from("products")
          .select(
            "id,name,slug,price,description,featured,category_id,created_at,product_images(image_url)",
          )
          .order("created_at", { ascending: false }),
      ]);

    if (cErr) setErr(cErr.message);
    if (pErr) setErr(pErr.message);

    setCategories(cats || []);
    setProducts(prods || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function startNew() {
    setMode("new");
    setEditingId(null);
    setForm({
      name: "",
      urlName: "",
      price: "",
      featured: false,
      category_id: "",
      description: "",
    });
    setErr("");
  }

  function startEdit(p) {
    setMode("edit");
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      urlName: p.slug || "",
      price: p.price ?? "",
      featured: !!p.featured,
      category_id: p.category_id || "",
      description: p.description || "",
    });
    setErr("");
  }

  function backToList() {
    setMode("list");
    setEditingId(null);
    setErr("");
  }

  async function upsertProduct() {
    setSaving(true);
    setErr("");

    const name = form.name.trim();
    const slug = slugify(form.urlName || form.name);

    if (!name) {
      setSaving(false);
      return setErr("Product name is required.");
    }
    if (!slug) {
      setSaving(false);
      return setErr("URL name is required.");
    }

    const payload = {
      name,
      slug,
      price: form.price === "" ? null : Number(form.price),
      description: form.description || null,
      featured: !!form.featured,
      category_id: form.category_id || null,
    };

    let res;
    if (mode === "edit" && editingId) {
      res = await supabase.from("products").update(payload).eq("id", editingId);
    } else {
      res = await supabase.from("products").insert(payload);
    }

    if (res.error) {
      setSaving(false);
      return setErr(res.error.message);
    }

    await loadAll();
    setSaving(false);
    backToList();
  }

  async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return setErr(error.message);
    await loadAll();
  }

  async function uploadImage(file) {
    if (!editingId)
      return setErr("Save the product first, then upload images.");

    setSaving(true);
    setErr("");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `products/${editingId}/${crypto.randomUUID()}.${ext}`;

    const up = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (up.error) {
      setSaving(false);
      return setErr(up.error.message);
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    const publicUrl = data?.publicUrl;

    const ins = await supabase
      .from("product_images")
      .insert({ product_id: editingId, image_url: publicUrl });

    if (ins.error) {
      setSaving(false);
      return setErr(ins.error.message);
    }

    await loadAll();
    setSaving(false);
  }

  async function removeImage(productId, url) {
    // DB delete first (storage cleanup optional)
    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId)
      .eq("image_url", url);

    if (error) return setErr(error.message);
    await loadAll();
  }

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-lg font-bold">Products</h3>
        <p className="mt-1 text-sm text-white/70">
          Add, edit, price and feature products.
        </p>
      </div>

      {mode === "list" ? (
        <button
          onClick={startNew}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold hover:bg-white/[0.09]"
        >
          + New product
        </button>
      ) : (
        <button
          onClick={backToList}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold hover:bg-white/[0.09]"
        >
          Back
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
        {header}
        <div className="mt-5 text-sm text-white/70">Loading…</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      {header}

      {err && (
        <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {mode === "list" && (
        <div className="mt-5">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm text-white/70">
              No products yet. Click <b>New product</b>.
            </div>
          ) : (
            <div className="grid gap-3">
              {products.map((p) => {
                const img = p.product_images?.[0]?.image_url || "";
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{p.name}</div>
                          {p.featured && (
                            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-100">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-white/60">
                          URL name:{" "}
                          <span className="font-semibold">{p.slug}</span>
                          {" • "}
                          Price:{" "}
                          <span className="font-semibold">
                            {p.price == null ? "Request price" : `₦${p.price}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold hover:bg-white/[0.09]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/15"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(mode === "new" || mode === "edit") && (
        <div className="mt-5 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-semibold">
                {mode === "new" ? "New product" : "Edit product"}
              </div>
              <div className="mt-1 text-xs text-white/60">
                “URL name” is used in the link (good for SEO). Keep it short.
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <label className="text-xs text-white/70">Product name</label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        name: e.target.value,
                        urlName: s.urlName
                          ? s.urlName
                          : slugify(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                    placeholder="e.g. Monocrystalline Solar Panel 550W"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/70">URL name</label>
                  <input
                    value={form.urlName}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        urlName: slugify(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                    placeholder="e.g. mono-panel-550w"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-white/70">
                      Price (NGN) — leave empty for “Request price”
                    </label>
                    <input
                      value={form.price}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, price: e.target.value }))
                      }
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                      placeholder="e.g. 250000"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/70">Category</label>
                    <select
                      value={form.category_id}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, category_id: e.target.value }))
                      }
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/70">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, description: e.target.value }))
                    }
                    className="mt-1 min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500/30"
                    placeholder="Write a clean, buyer-friendly description."
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, featured: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  Feature this product on homepage
                </label>

                <button
                  disabled={saving}
                  onClick={upsertProduct}
                  className={cx(
                    "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    "bg-white text-black hover:opacity-95 disabled:opacity-60",
                  )}
                >
                  {saving ? "Saving…" : "Save product"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-semibold">Images</div>
              <div className="mt-1 text-xs text-white/60">
                Save the product first, then upload images.
              </div>

              <div className="mt-4">
                <input
                  type="file"
                  accept="image/*"
                  disabled={saving || !editingId}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                    e.target.value = "";
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {(editingProduct?.product_images || []).map((img) => (
                  <div
                    key={img.image_url}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt=""
                      className="h-28 w-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(editingId, img.image_url)}
                      className="absolute right-2 top-2 rounded-xl border border-red-500/25 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/15"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {editingId &&
              (editingProduct?.product_images || []).length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/70">
                  No images yet.
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100/90">
              <div className="font-semibold">Photo tip</div>
              <div className="mt-1 text-xs text-yellow-100/70">
                Use clean lighting and 4:3 product photos for best results.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
