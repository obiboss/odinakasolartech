import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HOMEPAGE_CACHE_TAGS } from "@/lib/homepage-data.server";

function validSlug(value) {
  const slug = String(value || "").trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Admin session required." },
        { status: 401 },
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) throw adminError;
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const requestedSlugs = Array.isArray(body?.slugs)
      ? body.slugs
      : [body?.slug];
    const slugs = [...new Set(requestedSlugs.map(validSlug).filter(Boolean))];

    if (!slugs.length) {
      return NextResponse.json(
        { error: "A valid product slug is required." },
        { status: 400 },
      );
    }

    const { data: changedProducts, error: productsError } = await supabase
      .from("products")
      .select("slug, category_id")
      .in("slug", slugs);
    if (productsError) throw productsError;

    const categoryIds = [
      ...new Set((changedProducts || []).map((product) => product.category_id).filter(Boolean)),
    ];
    let categories = [];
    if (categoryIds.length) {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, parent_id")
        .in("id", categoryIds);
      if (error) throw error;
      categories = data || [];
    }

    const parentIds = [...new Set(categories.map((category) => category.parent_id).filter(Boolean))];
    let parentCategories = [];
    if (parentIds.length) {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug")
        .in("id", parentIds);
      if (error) throw error;
      parentCategories = data || [];
    }

    const categorySlugs = [
      ...new Set([...categories, ...parentCategories].map((category) => category.slug).filter(Boolean)),
    ];

    for (const slug of slugs) {
      revalidatePath(`/shop/${slug}`);
      revalidateTag(`catalog-product:${slug}`, "max");
    }
    for (const categorySlug of categorySlugs) {
      revalidatePath(`/shop/category/${categorySlug}`);
      revalidateTag(`catalog-category:${categorySlug}`, "max");
    }
    revalidateTag("catalog-products", "max");
    revalidateTag("catalog-categories", "max");
    revalidateTag("catalog-shop-listings", "max");
    revalidateTag(HOMEPAGE_CACHE_TAGS.specialOffers, "max");
    revalidateTag(HOMEPAGE_CACHE_TAGS.featuredProducts, "max");
    revalidateTag(HOMEPAGE_CACHE_TAGS.latestProducts, "max");
    revalidatePath("/shop");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");

    return NextResponse.json({ revalidated: true, slugs });
  } catch (error) {
    console.error("PRODUCT REVALIDATION ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Product cache revalidation failed." },
      { status: 500 },
    );
  }
}
