import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/whatsapp";
import { getStore } from "@/lib/content.server";
import RelatedProducts from "@/components/shop/RelatedProducts.server";
import FeaturedCarousel from "@/components/shop/FeaturedCarousel.client";
import JsonLd from "@/components/seo/JsonLd";
import ProductViewTracker from "@/components/analytics/ProductViewTracker.client";
import { normalizeProductRecord } from "@/lib/supabase/storage";
import { getVideoEmbedUrl } from "@/lib/videoEmbed";
import ProductSalesPage from "@/components/shop/ProductSalesPage";
import {
  getSalesPageRecord,
  hasActiveSalesPageContent,
  normalizeSalesPageContent,
} from "@/lib/salesPage";

export const revalidate = 300;

const SITE_URL = "https://www.odinakachukwusolartech.com";
const BRAND_NAME = "Odinaka Solar Tech";
const LOCATION = "Nigeria";

function buildProductUrl(slug) {
  return `${SITE_URL}/shop/${slug}`;
}

function cleanMetaDescription(product) {
  const fallback = `Buy ${product.name} in ${LOCATION} from ${BRAND_NAME}. Check price, availability, product details and order online.`;
  return String(product.short_description || product.description || fallback).replace(/\s+/g, " ").trim().slice(0, 160);
}

function getPrimaryImage(product) {
  return product?.images?.[0]?.image_url || null;
}

function getApprovedReviews(product) {
  return (product?.reviews || []).filter((review) => review.status === "approved");
}

function getAverageRating(reviews) {
  if (!reviews.length) return null;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Number((total / reviews.length).toFixed(1));
}

const getProductBySlug = cache(async (slug) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(`
    id, name, slug, price, currency, description, short_description,
    in_stock, featured, active, specs, video_testimonial_url,
    video_testimonial_platform, category_id, created_at, updated_at,
    category:categories (id, name, slug),
    images:product_images (id, image_url, sort_order),
    reviews:reviews!left (id, display_name, rating, content, image_url, created_at, status),
    packages:product_packages (id, name, price, normal_price, description, image_url, included_items, bonuses, warranty, delivery, payment, cta_text, sort_order, featured, active),
    capabilities:product_capabilities (id, name, sort_order),
    sales_page:product_sales_pages (id, enabled, content, updated_at)
  `).eq("slug", slug).eq("active", true).eq("reviews.status", "approved").order("sort_order", { foreignTable: "product_images", ascending: true }).order("created_at", { foreignTable: "reviews", ascending: false }).maybeSingle();

  if (error) {
    console.log("SUPABASE ERROR (product):", error);
    return null;
  }
  return data;
});

async function getRelatedProducts(categoryId, productId) {
  if (!categoryId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(`id, name, slug, price, currency, short_description, in_stock, images:product_images (id, image_url, sort_order)`).eq("active", true).eq("category_id", categoryId).neq("id", productId).order("created_at", { ascending: false }).order("sort_order", { foreignTable: "product_images", ascending: true }).limit(8);
  if (error) console.log("SUPABASE ERROR (related products):", error);
  return data || [];
}

async function getFeaturedProducts(productId) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(`id, name, slug, price, currency, short_description, in_stock, images:product_images (id, image_url, sort_order)`).eq("active", true).eq("featured", true).neq("id", productId).order("created_at", { ascending: false }).order("sort_order", { foreignTable: "product_images", ascending: true }).limit(10);
  if (error) console.log("SUPABASE ERROR (featured products):", error);
  return data || [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = normalizeProductRecord(await getProductBySlug(slug));
  if (!product) return { title: "Product not found — Odinaka Solar Tech", robots: { index: false, follow: false } };
  const title = `${product.name} Price in Nigeria | ${BRAND_NAME}`;
  const description = cleanMetaDescription(product);
  const image = getPrimaryImage(product);
  return {
    title,
    description,
    alternates: { canonical: buildProductUrl(product.slug) },
    openGraph: { title, description, url: buildProductUrl(product.slug), siteName: BRAND_NAME, type: "website", images: image ? [{ url: image, width: 1200, height: 900, alt: `${product.name} in ${LOCATION}` }] : [] },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : [] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = normalizeProductRecord(await getProductBySlug(slug));
  if (!product) return notFound();

  const [relatedProducts, featured] = await Promise.all([getRelatedProducts(product.category_id, product.id), getFeaturedProducts(product.id)]);
  const store = getStore();
  const productUrl = buildProductUrl(product.slug);
  const approvedReviews = getApprovedReviews(product);
  const averageRating = getAverageRating(approvedReviews);
  const videoEmbed = getVideoEmbedUrl(product.video_testimonial_url, product.video_testimonial_platform);
  const packages = (product.packages || []).filter((item) => item.active !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const capabilities = (product.capabilities || []).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const salesPage = getSalesPageRecord(product.sales_page);
  const salesPageIsActive = salesPage?.enabled !== false && hasActiveSalesPageContent(salesPage?.content);
  const salesPageContent = normalizeSalesPageContent(salesPageIsActive ? salesPage?.content : {});
  const wa = whatsappLink({ phone: store.business.whatsapp, message: `Hello ${store.business.name}, I want to buy: ${product.name}. Please confirm availability and delivery.` });

  const productJsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    image: product.images?.map((image) => image.image_url) || [],
    description: product.description || product.short_description || `Buy ${product.name} in ${LOCATION} from ${BRAND_NAME}.`,
    sku: product.id, url: productUrl, category: product.category?.name || "Solar product",
    brand: { "@type": "Brand", name: BRAND_NAME },
    offers: packages.length ? { "@type": "AggregateOffer", url: productUrl, priceCurrency: product.currency || "NGN", lowPrice: String(Math.min(...packages.map((item) => Number(item.price)))), highPrice: String(Math.max(...packages.map((item) => Number(item.price)))), offerCount: String(packages.length), availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } : { "@type": "Offer", url: productUrl, priceCurrency: product.currency || "NGN", price: product.price != null ? String(product.price) : "0", availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: BRAND_NAME } },
    ...(averageRating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: String(averageRating), reviewCount: String(approvedReviews.length) } } : {}),
    ...(approvedReviews.length ? { review: approvedReviews.slice(0, 5).map((review) => ({ "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: String(review.rating), bestRating: "5", worstRating: "1" }, author: { "@type": "Person", name: "Verified customer" }, reviewBody: review.content || `${product.name} customer review`, datePublished: review.created_at })) } : {}),
  };

  const customFaqs = salesPageContent.faq.enabled ? (salesPageContent.faq.items || []).filter((item) => item.question?.trim() && item.answer?.trim()).map((item) => ({ "@type": "Question", name: item.question.trim(), acceptedAnswer: { "@type": "Answer", text: item.answer.trim() } })) : [];
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [...customFaqs, { "@type": "Question", name: `Is ${product.name} available in Nigeria?`, acceptedAnswer: { "@type": "Answer", text: product.in_stock ? `Yes, ${product.name} is currently available from ${BRAND_NAME} in Nigeria.` : `${product.name} is currently out of stock. Please contact ${BRAND_NAME} to confirm restock timing.` } }, { "@type": "Question", name: `How much is ${product.name}?`, acceptedAnswer: { "@type": "Answer", text: packages.length ? `${product.name} has ${packages.length} package options. Choose a package to see its current price.` : product.price != null ? `${product.name} is listed at ${product.currency || "NGN"} ${Number(product.price).toLocaleString("en-NG")}.` : `Please contact ${BRAND_NAME} to confirm the current price.` } }, { "@type": "Question", name: `How can I order ${product.name}?`, acceptedAnswer: { "@type": "Answer", text: `You can order ${product.name} using the order options on this page or through WhatsApp.` } }] };
  const breadcrumbJsonLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/shop` }, { "@type": "ListItem", position: 3, name: product.name, item: productUrl }] };

  return (
    <Container className="py-8 sm:py-10">
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <ProductViewTracker product={{ id: product.id, name: product.name, price: product.price, currency: product.currency || "NGN" }} />
      <nav className="mb-5 text-sm text-slate-500" aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-2"><li><Link href="/" className="hover:text-slate-900">Home</Link></li><li>/</li><li><Link href="/shop" className="hover:text-slate-900">Shop</Link></li><li>/</li><li className="font-medium text-slate-900">{product.name}</li></ol></nav>
      <ProductSalesPage product={product} waLink={wa} videoEmbed={videoEmbed} approvedReviews={approvedReviews} packages={packages} capabilities={capabilities} salesPageContent={salesPageContent} salesPageIsActive={salesPageIsActive} />
      <div className="mt-10"><RelatedProducts products={(relatedProducts || []).map(normalizeProductRecord)} /></div>
      <FeaturedCarousel title="Special Offers" products={(featured || []).map(normalizeProductRecord)} />
    </Container>
  );
}
