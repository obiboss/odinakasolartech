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
import ProductViewTracker from "@/components/analytics/ProductViewTracker.client";
import { normalizeProductRecord } from "@/lib/supabase/storage";
import { getVideoEmbedUrl } from "@/lib/videoEmbed";

export const revalidate = 300;

const SITE_URL = "https://www.odinakachukwusolartech.com";
const BRAND_NAME = "Odinaka Solar Tech";
const LOCATION = "Nigeria";

function buildProductUrl(slug) {
  return `${SITE_URL}/shop/${slug}`;
}

function cleanMetaDescription(product) {
  const fallback = `Buy ${product.name} in ${LOCATION} from ${BRAND_NAME}. Check price, availability, product details and order online.`;

  const raw = product.short_description || product.description || fallback;

  return String(raw).replace(/\s+/g, " ").trim().slice(0, 160);
}

function getPrimaryImage(product) {
  return product?.images?.[0]?.image_url || null;
}

function getApprovedReviews(product) {
  return (product?.reviews || []).filter(
    (review) => review.status === "approved",
  );
}

function getAverageRating(reviews) {
  if (!reviews.length) return null;

  const total = reviews.reduce((sum, review) => {
    return sum + Number(review.rating || 0);
  }, 0);

  return Number((total / reviews.length).toFixed(1));
}

function splitProductDescription(description) {
  const text = String(description || "").trim();

  if (!text) {
    return {
      packageSummary: "",
      overview: "",
    };
  }

  const overviewMatch = text.match(/Power Solution Overview/i);

  if (!overviewMatch || typeof overviewMatch.index !== "number") {
    return {
      packageSummary: "",
      overview: text,
    };
  }

  return {
    packageSummary: text.slice(0, overviewMatch.index).trim(),
    overview: text.slice(overviewMatch.index).trim(),
  };
}

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
      video_testimonial_url,
      video_testimonial_platform,
      category_id,
      created_at,
      updated_at,
      category:categories (
        id,
        name,
        slug
      ),
      images:product_images (
        id,
        image_url,
        sort_order
      ),
      reviews:reviews!left (
        id,
        display_name,
        rating,
        content,
        image_url,
        created_at,
        status
      ),
      packages:product_packages (
        id,
        name,
        price,
        description,
        sort_order,
        active
      ),
      capabilities:product_capabilities (
        id,
        name,
        sort_order
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
  if (!categoryId) return [];

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
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "product_images", ascending: true })
    .limit(8);

  if (error) {
    console.log("SUPABASE ERROR (related products):", error);
    return [];
  }

  return data || [];
}

async function getFeaturedProducts(productId) {
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
    .order("created_at", { ascending: false })
    .order("sort_order", { foreignTable: "product_images", ascending: true })
    .limit(10);

  if (error) {
    console.log("SUPABASE ERROR (featured products):", error);
    return [];
  }

  return data || [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = normalizeProductRecord(await getProductBySlug(slug));

  if (!product) {
    return {
      title: "Product not found — Odinaka Solar Tech",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const productUrl = buildProductUrl(product.slug);
  const metaDescription = cleanMetaDescription(product);
  const image = getPrimaryImage(product);

  const title = `${product.name} Price in Nigeria | ${BRAND_NAME}`;

  return {
    title,
    description: metaDescription,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title,
      description: metaDescription,
      url: productUrl,
      siteName: BRAND_NAME,
      type: "website",
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 900,
              alt: `${product.name} in ${LOCATION}`,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: image ? [image] : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;

  const product = normalizeProductRecord(await getProductBySlug(slug));
  if (!product) return notFound();

  const [relatedProducts, featured] = await Promise.all([
    getRelatedProducts(product.category_id, product.id),
    getFeaturedProducts(product.id),
  ]);

  const normalizedRelatedProducts = (relatedProducts || []).map(
    normalizeProductRecord,
  );
  const normalizedFeatured = (featured || []).map(normalizeProductRecord);

  const store = getStore();

  const productUrl = buildProductUrl(product.slug);
  const primaryImage = getPrimaryImage(product);
  const approvedReviews = getApprovedReviews(product);
  const averageRating = getAverageRating(approvedReviews);
  const descriptionParts = splitProductDescription(product.description);
  const videoEmbed = getVideoEmbedUrl(
    product.video_testimonial_url,
    product.video_testimonial_platform,
  );
  const packages = (product.packages || [])
    .filter((item) => item.active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const capabilities = (product.capabilities || []).sort(
    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
  );

  const wa = whatsappLink({
    phone: store.business.whatsapp,
    message: `Hello ${store.business.name}, I want to buy: ${product.name}. Please confirm availability and delivery.`,
  });

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.map((image) => image.image_url) || [],
    description:
      product.description ||
      product.short_description ||
      `Buy ${product.name} in ${LOCATION} from ${BRAND_NAME}.`,
    sku: product.id,
    url: productUrl,
    category: product?.category?.name || "Solar product",
    brand: {
      "@type": "Brand",
      name: BRAND_NAME,
    },
    offers: packages.length
      ? {
          "@type": "AggregateOffer",
          url: productUrl,
          priceCurrency: product.currency || "NGN",
          lowPrice: String(
            Math.min(...packages.map((item) => Number(item.price))),
          ),
          highPrice: String(
            Math.max(...packages.map((item) => Number(item.price))),
          ),
          offerCount: String(packages.length),
          availability: product.in_stock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: product.currency || "NGN",
          price: product.price != null ? String(product.price) : "0",
          availability: product.in_stock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: BRAND_NAME,
          },
        },
    ...(averageRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(averageRating),
            reviewCount: String(approvedReviews.length),
          },
        }
      : {}),
    ...(approvedReviews.length
      ? {
          review: approvedReviews.slice(0, 5).map((review) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: String(review.rating),
              bestRating: "5",
              worstRating: "1",
            },
            author: {
              "@type": "Person",
              name: "Verified customer",
            },
            reviewBody: review.content || `${product.name} customer review`,
            datePublished: review.created_at,
          })),
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${SITE_URL}/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${product.name} available in Nigeria?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: product.in_stock
            ? `Yes, ${product.name} is currently available from ${BRAND_NAME} in Nigeria.`
            : `${product.name} is currently out of stock. Please contact ${BRAND_NAME} to confirm restock timing.`,
        },
      },
      {
        "@type": "Question",
        name: `How much is ${product.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: packages.length
            ? `${product.name} has ${packages.length} package options. Please choose a package to see its current price.`
            : product.price != null
              ? `${product.name} is listed at ${product.currency || "NGN"} ${Number(product.price).toLocaleString("en-NG")}.`
              : `Please contact ${BRAND_NAME} to confirm the current price for ${product.name}.`,
        },
      },
      {
        "@type": "Question",
        name: `How can I order ${product.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `You can order ${product.name} by contacting ${BRAND_NAME} through WhatsApp or using the order button on this product page.`,
        },
      },
    ],
  };

  return (
    <Container className="py-8 sm:py-10">
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />

      <ProductViewTracker
        product={{
          id: product.id,
          name: product.name,
          price: product.price,
          currency: product.currency || "NGN",
        }}
      />

      <nav className="mb-5 text-sm text-slate-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <a href="/" className="hover:text-slate-900">
              Home
            </a>
          </li>
          <li>/</li>
          <li>
            <a href="/shop" className="hover:text-slate-900">
              Shop
            </a>
          </li>
          <li>/</li>
          <li className="font-medium text-slate-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <ProductGallery images={product.images || []} name={product.name} />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Product Overview
            </h2>

            {descriptionParts.overview ? (
              <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
                {descriptionParts.overview}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Product overview will be added by admin.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {product?.category?.name || "Solar product"}
            </div>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {product.name}
            </h1>

            {product.short_description ? (
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                {product.short_description}
              </p>
            ) : null}

            {descriptionParts.packageSummary ? (
              <div className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700">
                {descriptionParts.packageSummary}
              </div>
            ) : null}

            {primaryImage ? (
              <link rel="preload" as="image" href={primaryImage} />
            ) : null}

            <div className="mt-5">
              <BuyBar product={product} waLink={wa} />
            </div>
          </div>

          {capabilities.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                What Can It Power?
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {capabilities.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {videoEmbed ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Client Video Testimonial
              </h2>
              <div
                className="relative mt-4 overflow-hidden rounded-xl bg-slate-100"
                style={{ aspectRatio: videoEmbed.aspectRatio }}
              >
                <iframe
                  src={videoEmbed.url}
                  title="Client video testimonial"
                  className="absolute inset-0 h-full w-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          ) : null}

          {packages.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Package Options
              </h2>
              <div className="mt-4 space-y-3">
                {packages.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-semibold text-slate-900">
                        {item.name}
                      </div>
                      <div className="font-bold text-amber-600">
                        {item.price == null
                          ? "Request price"
                          : `${product.currency || "NGN"} ${Number(item.price).toLocaleString("en-NG")}`}
                      </div>
                    </div>
                    {item.description ? (
                      <div className="mt-2 text-sm text-slate-600">
                        {item.description}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Product Highlights
            </h2>

            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-700">
              <li>
                • Suitable for homes, shops, offices and solar installations.
              </li>
              <li>• Available from {BRAND_NAME} in Nigeria.</li>
              <li>• WhatsApp confirmation before delivery or installation.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Reviews</div>
            <div className="mt-3">
              <ProductReviews
                productId={product.id}
                reviews={approvedReviews}
              />
            </div>
          </div>
        </div>
      </div>

      {product.specs ? (
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            {product.name} Specifications
          </h2>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Frequently Asked Questions
        </h2>

        <div className="mt-5 space-y-3">
          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold text-slate-900">
              Is {product.name} available in Nigeria?
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {product.in_stock
                ? `Yes, ${product.name} is currently available from ${BRAND_NAME} in Nigeria.`
                : `${product.name} is currently out of stock. Please contact ${BRAND_NAME} to confirm restock timing.`}
            </p>
          </details>

          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold text-slate-900">
              How much is {product.name}?
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {product.price
                ? `${product.name} is listed at ${product.currency || "NGN"} ${Number(product.price).toLocaleString("en-NG")}.`
                : `Please contact ${BRAND_NAME} to confirm the current price for ${product.name}.`}
            </p>
          </details>

          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold text-slate-900">
              How can I order {product.name}?
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              You can order {product.name} by contacting {BRAND_NAME} through
              WhatsApp or using the order button on this page.
            </p>
          </details>
        </div>
      </section>

      <div className="mt-10">
        <RelatedProducts products={normalizedRelatedProducts} />
      </div>

      <FeaturedCarousel title="Special Offers" products={normalizedFeatured} />
    </Container>
  );
}
