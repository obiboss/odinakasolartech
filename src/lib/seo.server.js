// import { getSeo, getStore } from "./content.server";

// /**
//  * Base site metadata for Next.js App Router (export const metadata).
//  * Uses public/content/seo.json + public/content/store.json.
//  */
// export function buildBaseMetadata() {
//   const seo = getSeo();
//   const store = getStore();

//   const base = store?.business?.domain || "https://YOURDOMAIN.com";
//   const title = seo?.defaultTitle || store?.business?.name || "Solar Store";
//   const description =
//     seo?.defaultDescription || store?.business?.tagline || "Solar products";
//   const keywords = seo?.keywords || [];

//   const socialImage = seo?.socialImage || "/images/og.jpg";

//   return {
//     metadataBase: new URL(base),
//     title,
//     description,
//     keywords,
//     alternates: { canonical: "/" },
//     openGraph: {
//       type: "website",
//       title,
//       description,
//       url: base,
//       images: [socialImage],
//     },
//     twitter: {
//       card: "summary_large_image",
//       title,
//       description,
//       images: [socialImage],
//     },
//   };
// }

// /**
//  * Product-level metadata.
//  */
// export function productMetadata(product) {
//   const seo = getSeo();
//   const store = getStore();

//   const base = store?.business?.domain || "https://YOURDOMAIN.com";
//   const title = `${product.name} — ${store.business.name}`;
//   const description = product.short || seo.defaultDescription;
//   const images = product.images?.length ? product.images : [seo.socialImage];

//   return {
//     metadataBase: new URL(base),
//     title,
//     description,
//     keywords: product.keywords?.length ? product.keywords : seo.keywords,
//     openGraph: {
//       type: "product",
//       title,
//       description,
//       url: `${base}/shop/${product.id}`,
//       images,
//     },
//     twitter: {
//       card: "summary_large_image",
//       title,
//       description,
//       images,
//     },
//   };
// }

import { getSeo, getStore } from "./content.server";

function buildBaseMetadataImpl() {
  const seo = getSeo();
  const store = getStore();

  const base = store?.business?.domain || "https://YOURDOMAIN.com";
  const title = seo?.defaultTitle || store?.business?.name || "Solar Store";
  const description =
    seo?.defaultDescription || store?.business?.tagline || "Solar products";
  const keywords = seo?.keywords || [];
  const socialImage = seo?.socialImage || "/images/og.jpg";

  return {
    metadataBase: new URL(base),
    title,
    description,
    keywords,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      title,
      description,
      url: base,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

function productMetadataImpl(product) {
  const seo = getSeo();
  const store = getStore();

  const base = store?.business?.domain || "https://YOURDOMAIN.com";
  const title = `${product.name} — ${store.business.name}`;
  const description = product.short || seo.defaultDescription;
  const images = product.images?.length ? product.images : [seo.socialImage];

  return {
    metadataBase: new URL(base),
    title,
    description,
    keywords: product.keywords?.length ? product.keywords : seo.keywords,
    openGraph: {
      type: "product",
      title,
      description,
      url: `${base}/shop/${product.id}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export const buildBaseMetadata = buildBaseMetadataImpl;
export const productMetadata = productMetadataImpl;
export default buildBaseMetadataImpl;
