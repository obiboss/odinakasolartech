"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function formatNGN(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n;
}

function extractStoragePathFromPublicUrl(url) {
  // https://xxxx.supabase.co/storage/v1/object/public/product-images/<PATH>
  const marker = "/storage/v1/object/public/product-images/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export default function ProductForm({
  initialProduct,
  initialImages,
  categories,
}) {
  const router = useRouter();
  const supabase = createClient();

  const isEdit = Boolean(initialProduct?.id);

  const [name, setName] = useState(initialProduct?.name || "");
  const [slug, setSlug] = useState(initialProduct?.slug || "");
  const [price, setPrice] = useState(initialProduct?.price ?? "");
  const [description, setDescription] = useState(
    initialProduct?.description || "",
  );
  const [categoryId, setCategoryId] = useState(
    initialProduct?.category_id || "",
  );
  const [featured, setFeatured] = useState(Boolean(initialProduct?.featured));

  const [images, setImages] = useState(initialImages || []);
  const [uploading, setUploading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Auto slug on create / when empty
  useEffect(() => {
    if (!isEdit) {
      setSlug((prev) => (prev ? prev : slugify(name)));
    }
  }, [name, isEdit]);

  const primaryImage = useMemo(() => images?.[0]?.image_url || null, [images]);

  async function saveProduct(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const payload = {
      name,
      slug: slugify(slug || name),
      price: price === "" ? null : formatNGN(price),
      description,
      category_id: categoryId || null,
      featured,
    };

    const res = isEdit
      ? await supabase
          .from("products")
          .update(payload)
          .eq("id", initialProduct.id)
          .select("id")
          .single()
      : await supabase.from("products").insert(payload).select("id").single();

    setBusy(false);

    if (res.error) return setError(res.error.message);

    router.push("/admin/products");
    router.refresh();
  }

  async function deleteProduct() {
    if (!isEdit) return;
    const ok = confirm("Delete this product? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setError("");

    // Delete storage objects (best-effort)
    try {
      const paths = (images || [])
        .map((x) => extractStoragePathFromPublicUrl(x.image_url))
        .filter(Boolean);

      if (paths.length) {
        await supabase.storage.from("product-images").remove(paths);
      }
    } catch {}

    // DB: deleting product cascades product_images via FK
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", initialProduct.id);

    setBusy(false);
    if (error) return setError(error.message);

    router.push("/admin/products");
    router.refresh();
  }

  async function onUploadFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!isEdit) {
      setError("Save the product first, then upload images.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    for (const file of files) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext)
        ? ext
        : "jpg";
      const path = `${initialProduct.id}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

      const up = await supabase.storage
        .from("product-images")
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
        });

      if (up.error) {
        setError(up.error.message);
        continue;
      }

      const pub = supabase.storage.from("product-images").getPublicUrl(path);
      const image_url = pub?.data?.publicUrl;

      if (!image_url) {
        setError("Upload succeeded, but public URL could not be created.");
        continue;
      }

      const ins = await supabase
        .from("product_images")
        .insert({ product_id: initialProduct.id, image_url })
        .select("id, product_id, image_url, created_at")
        .single();

      if (ins.error) {
        setError(ins.error.message);
        continue;
      }

      setImages((prev) => [...prev, ins.data]);
    }

    setUploading(false);
    e.target.value = "";
    router.refresh();
  }

  async function removeImage(imageRow) {
    const ok = confirm("Remove this image?");
    if (!ok) return;

    setBusy(true);
    setError("");

    // Best-effort: remove from storage too
    try {
      const path = extractStoragePathFromPublicUrl(imageRow.image_url);
      if (path) await supabase.storage.from("product-images").remove([path]);
    } catch {}

    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageRow.id);

    setBusy(false);
    if (error) return setError(error.message);

    setImages((prev) => prev.filter((x) => x.id !== imageRow.id));
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <form
        onSubmit={saveProduct}
        className="lg:col-span-7 rounded-2xl border border-black/10 bg-white/70 p-6 shadow-soft backdrop-blur
                   dark:border-white/10 dark:bg-black/35"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isEdit ? "Edit Product" : "New Product"}
            </h1>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Professional catalog entry with SEO-ready slug.
            </p>
          </div>

          {isEdit && (
            <button
              type="button"
              onClick={deleteProduct}
              disabled={busy}
              className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-500/15
                         dark:text-red-200"
            >
              Delete
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="text-sm font-semibold">Name</label>
            <input
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none
                         focus:ring-2 focus:ring-yellow-500/25 dark:border-white/10 dark:bg-black/30 dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monocrystalline Solar Panel 550W"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Slug</label>
            <input
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none
                         focus:ring-2 focus:ring-yellow-500/25 dark:border-white/10 dark:bg-black/30 dark:text-white"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="mono-panel-550w"
              required
            />
            <div className="mt-2 text-xs text-black/55 dark:text-white/55">
              Used in URLs + SEO. Keep it short and keyword-relevant.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Price (NGN)</label>
              <input
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none
                           focus:ring-2 focus:ring-yellow-500/25 dark:border-white/10 dark:bg-black/30 dark:text-white"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                placeholder="0"
              />
              <div className="mt-2 text-xs text-black/55 dark:text-white/55">
                Leave empty if “Request price”.
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Category (categoriez)
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none
                           focus:ring-2 focus:ring-yellow-500/25 dark:border-white/10 dark:bg-black/30 dark:text-white"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— None —</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Description</label>
            <textarea
              className="mt-2 w-full min-h-[120px] rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none
                         focus:ring-2 focus:ring-yellow-500/25 dark:border-white/10 dark:bg-black/30 dark:text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="High-efficiency mono panel for residential and commercial systems..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured product
          </label>

          {error && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            disabled={busy}
            className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60
                       dark:bg-white dark:text-black"
          >
            {busy ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>

      <div className="lg:col-span-5 space-y-4">
        <div
          className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-soft backdrop-blur
                        dark:border-white/10 dark:bg-black/35"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Images</div>
              <div className="mt-1 text-xs text-black/55 dark:text-white/55">
                Upload after saving the product.
              </div>
            </div>

            <label
              className="cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5
                               dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/10"
            >
              {uploading ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={onUploadFiles}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="mt-5">
            {primaryImage ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                <Image
                  src={primaryImage}
                  alt="Primary product image"
                  fill
                  className="object-cover"
                  sizes="520px"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-black/5 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                No images yet.
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {(images || []).map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
              >
                <Image
                  src={img.image_url}
                  alt="Product"
                  fill
                  className="object-cover"
                  sizes="160px"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-5 text-sm text-yellow-900 dark:text-yellow-100">
          <div className="font-semibold">Tip</div>
          <div className="mt-1 text-black/70 dark:text-white/70">
            Use consistent product photos: 4:3 ratio, clean lighting, minimal
            background.
          </div>
        </div>
      </div>
    </div>
  );
}
