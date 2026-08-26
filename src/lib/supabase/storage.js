function normalizeSupabaseStorageUrl(url) {
  if (!url) return "";

  const value = String(url).trim();
  if (!value) return "";

  const corrected = value
    .replace(/\/storagbject\/public\//i, "/storage/v1/object/public/")
    .replace(/\/storage\/v1\/object\/public\/?/i, "/storage/v1/object/public/");

  if (/^https?:\/\//i.test(corrected)) {
    return corrected;
  }

  if (/^\/storage\/v1\/object\/public\//i.test(corrected)) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    return baseUrl ? `${baseUrl}${corrected}` : corrected;
  }

  return corrected;
}

function normalizeProductImage(image) {
  if (!image || typeof image !== "object") {
    return image;
  }

  return {
    ...image,
    image_url: normalizeSupabaseStorageUrl(image.image_url),
  };
}

function normalizeProductRecord(product) {
  if (!product || typeof product !== "object") {
    return product;
  }

  const normalized = { ...product };

  if (Array.isArray(product.images)) {
    normalized.images = product.images.map(normalizeProductImage);
  }

  if (Array.isArray(product.reviews)) {
    normalized.reviews = product.reviews.map((review) => {
      if (!review || typeof review !== "object") return review;
      return {
        ...review,
        image_url: normalizeSupabaseStorageUrl(review.image_url),
      };
    });
  }

  return normalized;
}

function getStoragePublicUrl(supabaseClient, bucket, path) {
  const result = supabaseClient?.storage?.from?.(bucket)?.getPublicUrl?.(path);
  return normalizeSupabaseStorageUrl(result?.data?.publicUrl || "");
}

export {
  normalizeSupabaseStorageUrl,
  normalizeProductImage,
  normalizeProductRecord,
  getStoragePublicUrl,
};
