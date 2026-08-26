"use client";

import { useEffect } from "react";
import { trackViewContent } from "@/lib/analytics/meta-pixel";

export default function ProductViewTracker({ product }) {
  useEffect(() => {
    if (!product?.id) return;

    trackViewContent({
      contentId: product.id,
      contentName: product.name,
      value: product.price,
      currency: product.currency || "NGN",
    });
  }, [product]);

  return null;
}
