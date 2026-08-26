"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/₦/g, "naira")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function formatNGN(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractStoragePathFromPublicUrl(url) {
  const marker = "/storage/v1/object/public/product-images/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

function generateImageUploadPath(productId, ext) {
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  return `${productId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;
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
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) {
      setSlug((prev) => (prev ? prev : slugify(name)));
    }
  }, [name, isEdit]);

  useEffect(() => {
    return () => {
      pendingFiles.forEach((item) => {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {}
      });
    };
  }, [pendingFiles]);

  const primaryImage = useMemo(() => {
    if (images?.[0]?.image_url) return images[0].image_url;
    if (pendingFiles?.[0]?.previewUrl) return pendingFiles[0].previewUrl;
    return null;
  }, [images, pendingFiles]);

  async function uploadFilesForProduct(productId, files) {
    if (!files.length) return [];

    const insertedRows = [];

    for (const file of files) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = generateImageUploadPath(productId, ext);

      const up = await supabase.storage
        .from("product-images")
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

      if (up.error) {
        console.error("UPLOAD ERROR:", up.error);
        throw new Error(up.error.message);
      }

      const pub = supabase.storage.from("product-images").getPublicUrl(path);
      const image_url = pub?.data?.publicUrl;

      if (!image_url) {
        throw new Error(
          "Upload succeeded, but public URL could not be created.",
        );
      }

      const ins = await supabase
        .from("product_images")
        .insert({ product_id: productId, image_url })
        .select("id, product_id, image_url")
        .single();

      if (ins.error) {
        console.error("PRODUCT_IMAGES INSERT ERROR:", ins.error);
        throw new Error(ins.error.message);
      }

      insertedRows.push(ins.data);
    }

    return insertedRows;
  }

  async function ensureUniqueSlug(baseSlug, currentProductId = null) {
    let finalSlug = baseSlug;
    let counter = 2;

    while (true) {
      let query = supabase
        .from("products")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (currentProductId) {
        query = query.neq("id", currentProductId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return finalSlug;
      }

      finalSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    setBusy(true);
    setUploading(true);
    setError("");

    try {
      const baseSlug = slugify(slug || name);

      if (!baseSlug) {
        throw new Error("Product slug is required.");
      }

      const uniqueSlug = await ensureUniqueSlug(
        baseSlug,
        isEdit ? initialProduct.id : null,
      );

      const payload = {
        name,
        slug: uniqueSlug,
        price: formatNGN(price),
        description,
        category_id: categoryId || null,
        featured,
        active: true,
      };

      const res = isEdit
        ? await supabase
            .from("products")
            .update(payload)
            .eq("id", initialProduct.id)
            .select("id")
            .single()
        : await supabase.from("products").insert(payload).select("id").single();

      if (res.error) {
        throw new Error(res.error.message);
      }

      const productId = res.data.id;

      if (pendingFiles.length > 0) {
        const uploadedRows = await uploadFilesForProduct(
          productId,
          pendingFiles.map((x) => x.file),
        );

        if (!uploadedRows.length) {
          throw new Error("Image upload failed.");
        }

        setImages((prev) => [...prev, ...uploadedRows]);

        pendingFiles.forEach((item) => {
          try {
            URL.revokeObjectURL(item.previewUrl);
          } catch {}
        });

        setPendingFiles([]);
      }

      setBusy(false);
      setUploading(false);
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      console.error("SAVE PRODUCT FLOW ERROR:", err);
      setBusy(false);
      setUploading(false);
      setError(err?.message || "Product could not be saved.");
    }
  }

  async function deleteProduct() {
    if (!isEdit) return;
    const ok = confirm("Delete this product? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setError("");

    try {
      const paths = (images || [])
        .map((x) => extractStoragePathFromPublicUrl(x.image_url))
        .filter(Boolean);

      if (paths.length) {
        await supabase.storage.from("product-images").remove(paths);
      }
    } catch {}

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", initialProduct.id);

    setBusy(false);
    if (error) return setError(error.message);

    router.push("/admin/products");
    router.refresh();
  }

  function onSelectFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError("");

    const validFiles = files.filter((file) =>
      ["image/png", "image/jpeg", "image/webp"].includes(file.type),
    );

    if (validFiles.length === 0) {
      setError("Only PNG, JPG, JPEG, and WEBP images are allowed.");
      e.target.value = "";
      return;
    }

    const prepared = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    setPendingFiles((prev) => [...prev, ...prepared]);
    e.target.value = "";
  }

  async function uploadFilesNow() {
    if (!isEdit || !initialProduct?.id || pendingFiles.length === 0) return;

    setUploading(true);
    setError("");

    try {
      const uploadedRows = await uploadFilesForProduct(
        initialProduct.id,
        pendingFiles.map((x) => x.file),
      );

      setImages((prev) => [...prev, ...uploadedRows]);

      pendingFiles.forEach((item) => {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {}
      });
      setPendingFiles([]);
    } catch (err) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
      router.refresh();
    }
  }

  function removePendingFile(id) {
    setPendingFiles((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      return prev.filter((x) => x.id !== id);
    });
  }

  async function removeImage(imageRow) {
    const ok = confirm("Remove this image?");
    if (!ok) return;

    setBusy(true);
    setError("");

    try {
      const path = extractStoragePathFromPublicUrl(imageRow.image_url);
      if (path) {
        await supabase.storage.from("product-images").remove([path]);
      }
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

  const allPreviewThumbs = [
    ...(images || []).map((img) => ({
      id: img.id,
      image_url: img.image_url,
      persisted: true,
    })),
    ...(pendingFiles || []).map((item) => ({
      id: item.id,
      image_url: item.previewUrl,
      persisted: false,
      name: item.name,
    })),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <form
        onSubmit={saveProduct}
        className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-soft backdrop-blur"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isEdit ? "Edit Product" : "New Product"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create the product and upload images in one submit.
            </p>
          </div>

          {isEdit && (
            <button
              type="button"
              onClick={deleteProduct}
              disabled={busy}
              className="cursor-pointer rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-500/15 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="text-sm font-semibold">Name</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monocrystalline Solar Panel 550W"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Slug</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="mono-panel-550w"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Price (NGN)</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Category</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
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
              className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
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
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={busy || uploading}
            className="cursor-pointer rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy || uploading
              ? isEdit
                ? "Saving..."
                : "Creating Product & Uploading Images..."
              : isEdit
                ? "Save Product"
                : "Create Product & Upload Images"}
          </button>
        </div>
      </form>

      <div className="space-y-4 lg:col-span-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Images</div>
              <div className="mt-1 text-xs text-slate-600">
                {isEdit
                  ? "Select images and upload now, or save more changes first."
                  : "Select images now. They will upload when you create the product."}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEdit && pendingFiles.length > 0 ? (
                <button
                  type="button"
                  onClick={uploadFilesNow}
                  disabled={uploading}
                  className="cursor-pointer rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Upload Selected"}
                </button>
              ) : null}

              <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100">
                Select Images
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={onSelectFiles}
                  disabled={uploading || busy}
                />
              </label>
            </div>
          </div>

          <div className="mt-5">
            {primaryImage ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src={primaryImage}
                  alt="Primary product image"
                  fill
                  className="object-cover"
                  sizes="520px"
                  unoptimized={primaryImage.startsWith("blob:")}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                No images selected yet.
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {allPreviewThumbs.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                <Image
                  src={img.image_url}
                  alt="Product"
                  fill
                  className="object-cover"
                  sizes="160px"
                  unoptimized={img.image_url.startsWith("blob:")}
                />

                {img.persisted ? (
                  <button
                    type="button"
                    onClick={() => removeImage(img)}
                    className="absolute right-2 top-2 rounded-lg bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-900 opacity-0 transition group-hover:opacity-100"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removePendingFile(img.id)}
                    className="absolute right-2 top-2 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 opacity-100"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
