import { getHomepageData } from "@/lib/homepage-data.server";
import HomeHero from "@/components/shop/HomeHero.server";
import PromoStrip from "@/components/shop/PromoStrip";
import FeaturedProducts from "@/components/shop/FeaturedProducts.server";
import FeaturedCarousel from "@/components/shop/FeaturedCarousel.client";
import ProductInfo from "@/components/shop/ProductInfo.server";
import Testimonials from "@/components/home/Testimonials.client";
import TrustSection from "@/components/home/TrustSection.server";
import { normalizeProductRecord } from "@/lib/supabase/storage";

export const metadata = {
  title: "Buy Solar Products in Nigeria — Odinaka Solar Tech",
  description:
    "Shop solar panels, inverters, lithium batteries, charge controllers and solar generators in Nigeria. Prices visible. Fast WhatsApp confirmation.",
};

export const revalidate = 300;

export default async function HomePage() {
  const {
    specialOffers,
    featuredProducts,
    latestProducts,
    featuredReviews,
    approvedReviews,
  } = await getHomepageData();

  const normalizedSpecialOffers = (specialOffers || []).map(
    normalizeProductRecord,
  );
  const normalizedFeaturedProducts = (featuredProducts || []).map(
    normalizeProductRecord,
  );
  const normalizedLatestProducts = (latestProducts || []).map(
    normalizeProductRecord,
  );
  const testimonialReviews = Array.from(
    new Map(
      [...(featuredReviews || []), ...(approvedReviews || [])].map((review) => [
        review.id,
        review,
      ]),
    ).values(),
  )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 10);

  return (
    <>
      <PromoStrip />

      <HomeHero />

      <ProductInfo products={normalizedLatestProducts} />

      <FeaturedProducts products={normalizedFeaturedProducts} />

      <FeaturedCarousel
        title="Special Offers"
        products={normalizedSpecialOffers}
      />

      <Testimonials reviews={testimonialReviews} />

      <TrustSection />
    </>
  );
}
