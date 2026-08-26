import { createClient } from "@/lib/supabase/server";
import HomeHero from "@/components/shop/HomeHero.server";
import PromoStrip from "@/components/shop/PromoStrip";
import FeaturedProducts from "@/components/shop/FeaturedProducts.server";
import FeaturedCarousel from "@/components/shop/FeaturedCarousel.client";
import ProductInfo from "@/components/shop/ProductInfo.server";
import Testimonials from "@/components/home/Testimonials.client";
import TrustSection from "@/components/home/TrustSection.server";

export const metadata = {
  title: "Buy Solar Products in Nigeria — Odinaka Solar Tech",
  description:
    "Shop solar panels, inverters, lithium batteries, charge controllers and solar generators in Nigeria. Prices visible. Fast WhatsApp confirmation.",
};

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: specialOffers, error } = await supabase
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
      show_in_special_offers,
      images:product_images(
        image_url,
        sort_order
      )
    `,
    )
    .eq("active", true)
    .eq("show_on_homepage", true)
    .eq("show_in_special_offers", true)
    .order("sort_order", { ascending: true })
    .order("sort_order", { foreignTable: "product_images", ascending: true })
    .limit(10);

  if (error) {
    console.log("SUPABASE ERROR (special offers):", error);
  }

  return (
    <>
      <PromoStrip />

      <HomeHero />

      <ProductInfo />

      <FeaturedProducts />

      <FeaturedCarousel title="Special Offers" products={specialOffers || []} />

      <Testimonials />

      <TrustSection />
    </>
  );
}
