// src/app/(site)/shop/category/[slug]/page.js

import { notFound } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import ProductCard from "@/components/shop/ProductCard.client";
import JsonLd from "@/components/seo/JsonLd";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

async function getCategoryBySlug(slug) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.log("SUPABASE ERROR (category by slug):", error);
    return null;
  }

  return data;
}

async function getTopLevelCategories() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .is("parent_id", null)
    .not("slug", "is", null)
    .order("name", { ascending: true });

  if (error) {
    console.log("SUPABASE ERROR (top categories):", error);
    return [];
  }

  return data || [];
}

async function getChildCategories(parentId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .eq("parent_id", parentId)
    .not("slug", "is", null)
    .order("name", { ascending: true });

  if (error) {
    console.log("SUPABASE ERROR (child categories):", error);
    return [];
  }

  return data || [];
}

async function getCategoryProducts(categoryId, childIds = []) {
  const supabase = await createClient();

  const categoryIds = [categoryId, ...childIds];

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
      description,
      in_stock,
      active,
      featured,
      category_id,
      images:product_images (
        id,
        image_url,
        sort_order
      )
    `,
    )
    .eq("active", true)
    .in("category_id", categoryIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("SUPABASE ERROR (category products):", error);
    return [];
  }

  const normalized = (data || []).map((product) => ({
    ...product,
    images: [...(product.images || [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    ),
  }));

  return normalized;
}

function buildMeta(categoryName, productCount) {
  return {
    title: `${categoryName} in Nigeria | Odinaka Solar Tech`,
    description: `Shop ${categoryName.toLowerCase()} in Nigeria from Odinaka Solar Tech. Browse ${productCount} available products, compare options, check specifications, and order online.`,
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);

  if (!category || category.parent_id) {
    return {
      title: "Category not found | Odinaka Solar Tech",
    };
  }

  const childCategories = await getChildCategories(category.id);

  const products = await getCategoryProducts(
    category.id,
    childCategories.map((c) => c.id),
  );

  const meta = buildMeta(category.name, products.length);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/shop/category/${category.slug}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/shop/category/${category.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function CategoryLandingPage({ params }) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);
  if (!category || category.parent_id) return notFound();

  const [topCategories, childCategories] = await Promise.all([
    getTopLevelCategories(),
    getChildCategories(category.id),
  ]);

  const products = await getCategoryProducts(
    category.id,
    childCategories.map((c) => c.id),
  );

  const meta = buildMeta(category.name, products.length);

  return (
    <Container className="py-8 sm:py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: meta.title,
          description: meta.description,
          url: `https://www.odinakachukwusolartech.com/shop/category/${category.slug}`,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListElement: products.map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `https://www.odinakachukwusolartech.com/shop/${product.slug}`,
              name: product.name,
            })),
          },
        }}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-emerald-700">
          Solar Category
        </div>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          {category.name} in Nigeria
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Shop {category.name.toLowerCase()} from Odinaka Solar Tech. Browse
          available products, compare options, check specifications, and order
          directly online or through chat support.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {topCategories.map((item) => {
            const active = item.slug === category.slug;

            return (
              <Link
                key={item.id}
                href={`/shop/category/${item.slug}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {childCategories.length > 0 ? (
        <section className="mt-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Explore {category.name}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {childCategories.map((item) => (
                <Link
                  key={item.id}
                  href={`/shop?cat=${item.id}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No active products found in this category yet.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Available {category.name}
              </h2>
              <div className="text-sm text-slate-500">
                {products.length} product{products.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </section>
    </Container>
  );
}
