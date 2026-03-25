// src/app/(site)/shop/[slug]/page.js

import { cache } from "react";
import { notFound } from "next/navigation";
import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/server";
import ProductGallery from "@/components/shop/ProductGallery.client";
import BuyBar from "@/components/shop/BuyBar.client";
import { whatsappLink } from "@/lib/whatsapp";
import { getStore } from "@/lib/content.server";
import ProductReviews from "@/components/shop/ProductReviews.server";
import RelatedProducts from "@/components/shop/RelatedProducts.server";
import FeaturedCarousel from "@/components/shop/FeaturedCarousel.client";
import JsonLd from "@/components/seo/JsonLd";

export const revalidate = 300;

const getProductBySlug = cache(async (slug) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      currency,
      description,
      short_description,
      in_stock,
      featured,
      active,
      specs,
      category_id,
      created_at,
      category:categories (
        id,
        name
      ),
      images:product_images (
        id,
        image_url,
        sort_order
      ),
      reviews:reviews!left (
        id,
        rating,
        content,
        created_at,
        status
      )
    `,
    )
    .eq("slug", slug)
    .eq("active", true)
    .eq("reviews.status", "approved")
    .order("sort_order", { foreignTable: "product_images", ascending: true })
    .order("created_at", { foreignTable: "reviews", ascending: false })
    .maybeSingle();

  if (error) {
    console.log("SUPABASE ERROR (product):", error);
    return null;
  }

  return data;
});

async function getRelatedProducts(categoryId, productId) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      currency,
      short_description,
      in_stock,
      images:product_images (
        id,
        image_url,
        sort_order
      )
    `,
    )
    .eq("active", true)
    .eq("category_id", categoryId)
    .neq("id", productId)
    .limit(8);

  return data || [];
}

async function getFeaturedProducts(productId) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      price,
      currency,
      short_description,
      in_stock,
      images:product_images (
        id,
        image_url,
        sort_order
      )
    `,
    )
    .eq("active", true)
    .eq("featured", true)
    .neq("id", productId)
    .limit(10);

  return data || [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product not found — Odinaka Solar Tech" };
  }

  const metaDescription =
    product.short_description ||
    product.description ||
    "Buy solar products in Nigeria. Prices available.";

  const image = product.images?.[0]?.image_url;

  return {
    title: `${product.name} Price in Nigeria | Odinaka Solar Tech`,
    description: metaDescription,
    alternates: {
      canonical: `/shop/${product.slug}`,
    },
    openGraph: {
      title: product.name,
      description: metaDescription,
      url: `/shop/${product.slug}`,
      type: "website",
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 900,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: metaDescription,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  if (!product) return notFound();

  const [relatedProducts, featured] = await Promise.all([
    getRelatedProducts(product.category_id, product.id),
    getFeaturedProducts(product.id),
  ]);

  const store = getStore();

  const wa = whatsappLink({
    phone: store.business.whatsapp,
    message: `Hello ${store.business.name}, I want to buy: ${product.name}. Please confirm availability and delivery.`,
  });

  return (
    <Container className="py-8 sm:py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: product.images?.map((i) => i.image_url),
          description: product.description,
          url: `https://www.odinakachukwusolartech.com/shop/${product.slug}`,
          brand: {
            "@type": "Brand",
            name: "Odinaka Solar Tech",
          },
          offers: {
            "@type": "Offer",
            priceCurrency: "NGN",
            price: product.price,
            availability: product.in_stock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <ProductGallery images={product.images || []} name={product.name} />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs text-slate-500">
              {product?.category?.name || "Solar product"}
            </div>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              {product.name}
            </h1>

            <div className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-700">
              {product.description || "No description yet."}
            </div>

            <div className="mt-5">
              <BuyBar product={product} waLink={wa} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Reviews</div>
            <div className="mt-3">
              <ProductReviews
                productId={product.id}
                reviews={product.reviews || []}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <RelatedProducts products={relatedProducts} />
      </div>

      <FeaturedCarousel title="Special Offers" products={featured} />
    </Container>
  );
}
