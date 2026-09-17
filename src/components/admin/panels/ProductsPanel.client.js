// src/components/admin/panels/ProductsPanel.client.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { getStoragePublicUrl } from "@/lib/supabase/storage";
import { getVideoEmbedUrl } from "@/lib/videoEmbed";
import ProductSalesContentEditor from "@/components/admin/ProductSalesContentEditor.client";
import ProductPackageEditor from "@/components/admin/ProductPackageEditor.client";
import AdminAccordionSection from "@/components/admin/AdminAccordionSection.client";
import {
  createDefaultSalesPageContent,
  getSalesPageRecord,
  normalizeSalesPageContent,
} from "@/lib/salesPage";

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

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function cleanPackageList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractStoragePathFromPublicUrl(url) {
  const marker = "/storage/v1/object/public/product-images/";
  const idx = String(url || "").indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

function generateImageUploadPath(productId, ext) {
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  return `${productId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;
}

export default function ProductsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    video_testimonial_url: "",
    video_testimonial_platform: "",
  });

  const [images, setImages] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [packages, setPackages] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [salesPageContent, setSalesPageContent] = useState(
    createDefaultSalesPageContent(),
  );

  const editingProduct = useMemo(
    () => products.find((p) => p.id === editingId) || null,
    [editingId, products],
  );

  const primaryImage = useMemo(() => {
    if (images?.[0]?.image_url) return images[0].image_url;
    if (pendingFiles?.[0]?.previewUrl) return pendingFiles[0].previewUrl;
    return null;
  }, [images, pendingFiles]);

  const allPreviewThumbs = useMemo(
    () => [
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
    ],
    [images, pendingFiles],
  );

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    return () => {
      pendingFiles.forEach((item) => {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {}
      });
    };
  }, [pendingFiles]);

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
            "id,name,slug,price,description,featured,category_id,video_testimonial_url,video_testimonial_platform,created_at,product_images(id,image_url),product_packages(id,name,price,normal_price,description,image_url,included_items,bonuses,warranty,delivery,payment,cta_text,sort_order,featured,active),product_capabilities(id,name,sort_order),product_sales_page:product_sales_pages(id,enabled,content)",
          )
          .order("created_at", { ascending: false }),
      ]);

    if (cErr) setErr(cErr.message);
    if (pErr) setErr(pErr.message);

    setCategories(cats || []);
    setProducts(prods || []);
    setLoading(false);
  }

  function resetPendingFiles() {
    pendingFiles.forEach((item) => {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {}
    });
    setPendingFiles([]);
  }

  function startNew() {
    resetPendingFiles();
    releasePackagePreviews();
    setMode("new");
    setEditingId(null);
    setImages([]);
    setPackages([]);
    setCapabilities([]);
    setSalesPageContent(createDefaultSalesPageContent());
    setForm({
      name: "",
      urlName: "",
      price: "",
      featured: false,
      category_id: "",
      description: "",
      video_testimonial_url: "",
      video_testimonial_platform: "",
    });
    setErr("");
  }

  function startEdit(p) {
    resetPendingFiles();
    releasePackagePreviews();
    setMode("edit");
    setEditingId(p.id);
    setImages(Array.isArray(p.product_images) ? p.product_images : []);
    setPackages(Array.isArray(p.product_packages) ? p.product_packages : []);
    setCapabilities(
      Array.isArray(p.product_capabilities) ? p.product_capabilities : [],
    );
    const salesPage = getSalesPageRecord(p.product_sales_page);
    setSalesPageContent(
      normalizeSalesPageContent(salesPage?.content),
    );
    setForm({
      name: p.name || "",
      urlName: p.slug || "",
      price: p.price ?? "",
      featured: !!p.featured,
      category_id: p.category_id || "",
      description: p.description || "",
      video_testimonial_url: p.video_testimonial_url || "",
      video_testimonial_platform: p.video_testimonial_platform || "",
    });
    setErr("");
  }

  function backToList() {
    resetPendingFiles();
    releasePackagePreviews();
    setMode("list");
    setEditingId(null);
    setImages([]);
    setPackages([]);
    setCapabilities([]);
    setSalesPageContent(createDefaultSalesPageContent());
    setErr("");
  }

  async function uploadFilesForProduct(productId, files) {
    if (!productId || !files.length) return [];

    const insertedRows = [];

    for (const file of files) {
      const image_url = await uploadFileToProductStorage(productId, file);

      const ins = await supabase
        .from("product_images")
        .insert({ product_id: productId, image_url })
        .select("id, product_id, image_url")
        .single();

      if (ins.error) {
        throw new Error(ins.error.message);
      }

      insertedRows.push(ins.data);
    }

    return insertedRows;
  }

  async function uploadFileToProductStorage(productId, file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = generateImageUploadPath(productId, ext);
    const up = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (up.error) throw new Error(up.error.message);

    const imageUrl = getStoragePublicUrl(supabase, "product-images", path);
    if (!imageUrl) {
      throw new Error("The image uploaded, but could not be prepared for display.");
    }
    return imageUrl;
  }

  async function saveProduct() {
    setSaving(true);
    setErr("");

    const name = form.name.trim();
    const slug = slugify(form.urlName || form.name);

    if (!name) {
      setSaving(false);
      setErr("Product name is required.");
      return;
    }

    if (!slug) {
      setSaving(false);
      setErr("Page address is required.");
      return;
    }

    if (
      form.video_testimonial_url.trim() &&
      !getVideoEmbedUrl(
        form.video_testimonial_url.trim(),
        form.video_testimonial_platform,
      )
    ) {
      setSaving(false);
      setErr("Enter a valid YouTube or Facebook video link.");
      return;
    }

    const enteredPackages = packages.filter(
      (item) =>
        item.name?.trim() ||
        item.price !== "" ||
        item.normal_price !== "" ||
        item.description?.trim(),
    );
    const invalidPackage = enteredPackages.find((item) => {
      const salePrice = formatPrice(item.price);
      const normalPrice =
        item.normal_price === "" || item.normal_price === null || item.normal_price === undefined
          ? null
          : formatPrice(item.normal_price);
      return (
        !item.name?.trim() ||
        item.name.trim().length > 160 ||
        salePrice === null ||
        (item.normal_price !== "" && item.normal_price !== null && item.normal_price !== undefined && normalPrice === null) ||
        (normalPrice !== null && normalPrice < salePrice)
      );
    });
    if (invalidPackage) {
      setSaving(false);
      setErr("Each package needs a valid sale price, and normal price must be valid and no lower than the sale price.");
      return;
    }

    const invalidCapability = capabilities.find(
      (item) => item.name.trim().length > 120,
    );
    if (invalidCapability) {
      setSaving(false);
      setErr("Capability names must be 120 characters or fewer.");
      return;
    }

    const payload = {
      name,
      slug,
      price: formatPrice(form.price),
      description: form.description || null,
      featured: !!form.featured,
      category_id: form.category_id || null,
      video_testimonial_url: form.video_testimonial_url.trim() || null,
      video_testimonial_platform: form.video_testimonial_platform || null,
    };

    let res;

    if (mode === "edit" && editingId) {
      res = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingId)
        .select("id")
        .single();
    } else {
      res = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
    }

    if (res.error) {
      setSaving(false);
      setErr(res.error.message);
      return;
    }

    const productId = res.data.id;

    try {
      if (pendingFiles.length > 0) {
        setUploading(true);

        const uploadedRows = await uploadFilesForProduct(
          productId,
          pendingFiles.map((x) => x.file),
        );

        if (!uploadedRows.length) {
          throw new Error("Image upload failed.");
        }

        setImages((prev) => [...prev, ...uploadedRows]);
        resetPendingFiles();
      }

      // Keep package IDs stable so existing order_items retain their package
      // relationship. Removed packages are deactivated instead of deleted.
      const { data: existingPackageRows, error: existingPackageError } =
        await supabase
          .from("product_packages")
          .select("id,image_url")
          .eq("product_id", productId);
      if (existingPackageError) throw existingPackageError;

      const existingPackageById = new Map(
        (existingPackageRows || []).map((item) => [item.id, item]),
      );
      const savedPackageIds = new Set();
      for (const [index, item] of enteredPackages.entries()) {
        const salePrice = formatPrice(item.price);
        const normalPrice =
          item.normal_price === "" || item.normal_price === null || item.normal_price === undefined
            ? null
            : formatPrice(item.normal_price);
        let imageUrl = item.image_url || null;
        if (item.imageFile) {
          imageUrl = await uploadFileToProductStorage(productId, item.imageFile);
        } else if (item.remove_image) {
          imageUrl = null;
        }

        const row = {
          product_id: productId,
          name: item.name.trim(),
          price: salePrice,
          normal_price: normalPrice,
          description: item.description?.trim() || null,
          image_url: imageUrl,
          included_items: cleanPackageList(item.included_items),
          bonuses: cleanPackageList(item.bonuses),
          warranty: item.warranty?.trim() || null,
          delivery: item.delivery?.trim() || null,
          payment: item.payment?.trim() || null,
          cta_text: item.cta_text?.trim() || "I WANT THIS PACKAGE",
          sort_order: index,
          featured: item.featured === true,
          active: item.active !== false,
        };
        // New packages receive a client UUID, so the ID format cannot tell us
        // whether the row exists in Supabase. Use the database snapshot from
        // above instead; this ensures new UUIDs take the INSERT path.
        const isExisting = existingPackageById.has(item.id);

        console.groupCollapsed(
          `[Admin package save] ${isExisting ? "UPDATE" : "INSERT"} ${item.name || "unnamed package"}`,
        );
        console.log("Package object submitted:", item);
        console.log("item.id:", item.id);
        console.log("isExisting:", isExisting);
        console.log("product_id:", productId);
        console.log("Payload:", row);

        if (isExisting) {
          const response = await supabase
            .from("product_packages")
            .update(row)
            .eq("id", item.id)
            .eq("product_id", productId)
            .select("id")
            .single();
          console.log("Supabase UPDATE response:", response);
          if (response.error) {
            console.error("Supabase UPDATE error:", response.error);
            throw response.error;
          }
          if (!response.data?.id) {
            throw new Error(`Package update returned no row for ${item.id}.`);
          }
          console.log("Returned updated row:", response.data);
          savedPackageIds.add(response.data.id);
        } else {
          const response = await supabase
            .from("product_packages")
            .insert(row)
            .select("id,product_id,name,price,normal_price,image_url,included_items,bonuses,active,sort_order")
            .single();
          console.log("Supabase INSERT response:", response);
          if (response.error) {
            console.error("Supabase INSERT error:", response.error);
            throw response.error;
          }
          if (!response.data?.id) {
            throw new Error("Package INSERT returned no inserted row.");
          }
          console.log("Returned inserted row:", response.data);
          savedPackageIds.add(response.data.id);
        }

        console.groupEnd();

        const oldImageUrl = existingPackageById.get(item.id)?.image_url;
        if (oldImageUrl && oldImageUrl !== imageUrl) {
          const oldPath = extractStoragePathFromPublicUrl(oldImageUrl);
          if (oldPath) {
            await supabase.storage.from("product-images").remove([oldPath]);
          }
        }
      }

      const packagesToDeactivate = (existingPackageRows || [])
        .map((item) => item.id)
        .filter((id) => !savedPackageIds.has(id));
      if (packagesToDeactivate.length) {
        const { error } = await supabase
          .from("product_packages")
          .update({ active: false })
          .in("id", packagesToDeactivate)
          .eq("product_id", productId);
        if (error) throw error;
      }

      const { error: capabilityDeleteError } = await supabase
        .from("product_capabilities")
        .delete()
        .eq("product_id", productId);
      if (capabilityDeleteError) throw capabilityDeleteError;

      const capabilityRows = capabilities
        .filter((item) => item.name.trim())
        .map((item, index) => ({
          product_id: productId,
          name: item.name.trim(),
          sort_order: index,
        }));
      if (capabilityRows.length) {
        const { error } = await supabase
          .from("product_capabilities")
          .insert(capabilityRows);
        if (error) throw error;
      }

      const testimonialItems = [];
      for (const testimonial of salesPageContent.testimonials?.items || []) {
        let imageUrl = testimonial.remove_image ? "" : testimonial.image_url || "";
        if (testimonial.imageFile) imageUrl = await uploadFileToProductStorage(productId, testimonial.imageFile);
        testimonialItems.push({
          id: testimonial.id || safeId(),
          name: testimonial.name?.trim() || "",
          text: testimonial.text?.trim() || "",
          image_url: imageUrl || "",
          active: testimonial.active !== false,
        });
      }
      const savedSalesPageContent = {
        ...salesPageContent,
        testimonials: { ...salesPageContent.testimonials, items: testimonialItems },
      };

      const { error: salesPageError } = await supabase
        .from("product_sales_pages")
        .upsert(
          {
            product_id: productId,
            enabled: true,
            content: savedSalesPageContent,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id" },
        );
      if (salesPageError) throw salesPageError;

      // The product route is ISR-backed. Refresh both the current slug and a
      // previous slug when an admin renames the product, without changing the
      // existing cart/order flow or making the whole app uncached.
      await fetch("/api/revalidate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slugs: [slug, editingProduct?.slug],
        }),
      }).catch(() => {});

      await loadAll();
      setSaving(false);
      setUploading(false);
      backToList();
    } catch (error) {
      setSaving(false);
      setUploading(false);
      setErr(error?.message || "Product saved, but image upload failed.");
    }
  }

  async function uploadFilesNow() {
    if (!editingId || pendingFiles.length === 0) return;

    setUploading(true);
    setErr("");

    try {
      const uploadedRows = await uploadFilesForProduct(
        editingId,
        pendingFiles.map((x) => x.file),
      );

      setImages((prev) => [...prev, ...uploadedRows]);
      resetPendingFiles();
      await loadAll();
    } catch (error) {
      setErr(error?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteProduct(id) {
    const ok = confirm("Delete this product?");
    if (!ok) return;

    setSaving(true);
    setErr("");

    const target = products.find((p) => p.id === id);
    const productImages = target?.product_images || [];

    try {
      const paths = productImages
        .map((img) => extractStoragePathFromPublicUrl(img.image_url))
        .filter(Boolean);

      if (paths.length > 0) {
        await supabase.storage.from("product-images").remove(paths);
      }
    } catch {}

    const { error } = await supabase.from("products").delete().eq("id", id);

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (editingId === id) {
      backToList();
    }

    await loadAll();
  }

  async function removeImage(imageRow) {
    const ok = confirm("Remove this image?");
    if (!ok) return;

    setSaving(true);
    setErr("");

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

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setImages((prev) => prev.filter((img) => img.id !== imageRow.id));
    await loadAll();
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

  function onSelectFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setErr("");

    const validFiles = files.filter((file) =>
      ["image/png", "image/jpeg", "image/webp"].includes(file.type),
    );

    if (validFiles.length === 0) {
      setErr("Only PNG, JPG, JPEG, and WEBP images are allowed.");
      e.target.value = "";
      return;
    }

    const prepared = validFiles.map((file) => ({
      id: safeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    setPendingFiles((prev) => [...prev, ...prepared]);
    e.target.value = "";
  }

  function addPackage() {
    setPackages((items) => [
      ...items,
      {
        id: safeId(),
        name: "",
        price: "",
        normal_price: "",
        description: "",
        image_url: "",
        imagePreviewUrl: "",
        imageFile: null,
        remove_image: false,
        included_items: [],
        bonuses: [],
        warranty: "",
        delivery: "",
        payment: "",
        cta_text: "I WANT THIS PACKAGE",
        featured: false,
        active: true,
      },
    ]);
  }

  function releasePackagePreviews(items = packages) {
    items.forEach((item) => {
      if (item.imagePreviewUrl) URL.revokeObjectURL(item.imagePreviewUrl);
    });
  }

  function updatePackage(id, changes) {
    setPackages((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        if (
          changes.imagePreviewUrl &&
          item.imagePreviewUrl &&
          changes.imagePreviewUrl !== item.imagePreviewUrl
        ) {
          URL.revokeObjectURL(item.imagePreviewUrl);
        }
        return { ...item, ...changes };
      }),
    );
  }

  function movePackage(id, direction) {
    setPackages((items) => {
      const index = items.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;

      const next = [...items];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function addCapability() {
    setCapabilities((items) => [...items, { id: safeId(), name: "" }]);
  }

  function updateCapability(id, name) {
    setCapabilities((items) =>
      items.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  }

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-lg font-bold">Products</h3>
        <p className="mt-1 text-sm text-slate-600">
          Add, edit, price and feature products.
        </p>
      </div>

      {mode === "list" ? (
        <button
          onClick={startNew}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
        >
          + New product
        </button>
      ) : (
        <button
          onClick={backToList}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
        >
          Back
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
        {header}
        <div className="mt-5 text-sm text-slate-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
      {header}

      {err && (
        <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {mode === "list" && (
        <div className="mt-5">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              No products yet. Click <b>New product</b>.
            </div>
          ) : (
            <div className="grid gap-3">
              {products.map((p) => {
                const img = p.product_images?.[0]?.image_url || "";
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
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
                            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                              Featured
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          Page address:{" "}
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
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-500/15 cursor-pointer"
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
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <div className="text-sm font-semibold">
                {mode === "new" ? "New product" : "Edit product"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {mode === "new"
                  ? "Create the product and upload images in one save."
                  : "Update the product and upload more images when needed."}
              </div>

              <div className="mt-4 grid gap-3" key={`${mode}-${editingId || "new"}`}>
                <AdminAccordionSection title="Main product information">
                  <div className="grid gap-3">
                <div>
                  <label className="text-xs text-slate-600">Product name</label>
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
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="e.g. Monocrystalline Solar Panel 550W"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600">Page address</label>
                  <input
                    value={form.urlName}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        urlName: slugify(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="e.g. mono-panel-550w"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-600">
                      Price (NGN) — leave empty for “Request price”
                    </label>
                    <input
                      value={form.price}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, price: e.target.value }))
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                      placeholder="e.g. 250000"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600">Category</label>
                    <select
                      value={form.category_id}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, category_id: e.target.value }))
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
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
                  <label className="text-xs text-slate-600">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, description: e.target.value }))
                    }
                    className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="Write a clean, buyer-friendly description."
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, featured: e.target.checked }))
                    }
                    className="h-4 w-4 cursor-pointer"
                  />
                  Feature this product on homepage
                </label>
                  </div>
                </AdminAccordionSection>

                <AdminAccordionSection title="Packages" summary={`${packages.length} packages`}>
                  <ProductPackageEditor
                    packages={packages}
                    onAdd={addPackage}
                    onUpdate={updatePackage}
                    onRemove={(id) =>
                      setPackages((items) =>
                        items.filter((entry) => entry.id !== id),
                      )
                    }
                    onMove={movePackage}
                    onError={setErr}
                  />
                </AdminAccordionSection>

                <AdminAccordionSection title="Basic power list" summary={`${capabilities.length} items`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-700">Appliances</div>
                    <button
                      type="button"
                      onClick={addCapability}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                    >
                      Add item
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {capabilities.map((item) => (
                      <div key={item.id} className="flex gap-2">
                        <input
                          value={item.name}
                          onChange={(e) =>
                            updateCapability(item.id, e.target.value)
                          }
                          placeholder="e.g. Freezer"
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setCapabilities((items) =>
                              items.filter((entry) => entry.id !== item.id),
                            )
                          }
                          className="cursor-pointer rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </AdminAccordionSection>

                <AdminAccordionSection title="Main customer video" summary={form.video_testimonial_url ? "1 video" : "No video"}>
                  <div className="grid gap-2 sm:grid-cols-[10rem,1fr]">
                    <select
                      value={form.video_testimonial_platform}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          video_testimonial_platform: e.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Platform</option>
                      <option value="youtube">YouTube</option>
                      <option value="facebook">Facebook</option>
                    </select>
                    <input
                      value={form.video_testimonial_url}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          video_testimonial_url: e.target.value,
                        }))
                      }
                      placeholder="Paste video link"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </AdminAccordionSection>

                <ProductSalesContentEditor
                  value={salesPageContent}
                  onChange={setSalesPageContent}
                  productImages={images}
                />

                <button
                  disabled={saving || uploading}
                  onClick={saveProduct}
                  className={cx(
                    "rounded-2xl px-4 py-3 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed",
                    "bg-white text-black hover:opacity-95 disabled:opacity-60",
                  )}
                >
                  {saving || uploading
                    ? mode === "new"
                      ? "Creating product & uploading images…"
                      : "Saving…"
                    : mode === "new"
                      ? "Create product"
                      : "Save product"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <AdminAccordionSection title="Product images" summary={`${allPreviewThumbs.length} images`} className="bg-white/90">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">Add clear photos of this product.</div>

                {mode === "edit" && pendingFiles.length > 0 ? (
                  <button
                    type="button"
                    onClick={uploadFilesNow}
                    disabled={uploading || saving}
                    className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-500/15 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? "Uploading..." : "Upload selected"}
                  </button>
                ) : null}
              </div>

              <div className="mt-4">
                <input
                  id="product-image-picker"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={onSelectFiles}
                  disabled={saving || uploading}
                  className="hidden"
                />

                <label
                  htmlFor="product-image-picker"
                  className={cx(
                    "inline-flex cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50",
                    saving || uploading ? "pointer-events-none opacity-60" : "",
                  )}
                >
                  Select images
                </label>
              </div>

              <div className="mt-4">
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
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    No images selected yet.
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {allPreviewThumbs.map((img) => (
                  <div
                    key={img.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <div className="relative h-28 w-full">
                      <Image
                        src={img.image_url}
                        alt="Product"
                        fill
                        className="object-cover"
                        sizes="220px"
                        unoptimized={img.image_url.startsWith("blob:")}
                      />
                    </div>

                    {img.persisted ? (
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="absolute right-2 top-2 cursor-pointer rounded-xl border border-red-500/25 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removePendingFile(img.id)}
                        className="absolute right-2 top-2 cursor-pointer rounded-xl border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Use clean lighting and 4:3 product photos for best results.</div>
            </AdminAccordionSection>
          </div>
        </div>
      )}
    </div>
  );
}
