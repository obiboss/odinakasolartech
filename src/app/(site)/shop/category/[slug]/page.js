import { notFound } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import ProductCard from "@/components/shop/ProductCard.client";
import JsonLd from "@/components/seo/JsonLd";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

const SITE_URL = "https://www.odinakachukwusolartech.com";
const BRAND_NAME = "Odinaka Solar Tech";

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

async function getCategoryById(id) {
  if (!id) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.log("SUPABASE ERROR (category by id):", error);
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
  if (!parentId) return [];

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

async function getSiblingCategories(parentId) {
  if (!parentId) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .eq("parent_id", parentId)
    .not("slug", "is", null)
    .order("name", { ascending: true });

  if (error) {
    console.log("SUPABASE ERROR (sibling categories):", error);
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
      created_at,
      images:product_images (
        id,
        image_url,
        sort_order
      )
    `,
    )
    .eq("active", true)
    .in("category_id", categoryIds)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.log("SUPABASE ERROR (category products):", error);
    return [];
  }

  return (data || []).map((product) => ({
    ...product,
    images: [...(product.images || [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    ),
  }));
}

function buildMeta(categoryName, productCount) {
  return {
    title: `${categoryName} in Nigeria | ${BRAND_NAME}`,
    description: `Shop ${categoryName.toLowerCase()} in Nigeria from ${BRAND_NAME}. Browse ${productCount} available product${productCount === 1 ? "" : "s"}, compare options, check specifications, and order online.`,
  };
}

function buildCategoryUrl(slug) {
  return `${SITE_URL}/shop/category/${slug}`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category not found | Odinaka Solar Tech",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const childCategories = await getChildCategories(category.id);

  const products = await getCategoryProducts(
    category.id,
    childCategories.map((child) => child.id),
  );

  const meta = buildMeta(category.name, products.length);
  const categoryUrl = buildCategoryUrl(category.slug);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: categoryUrl,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: categoryUrl,
      siteName: BRAND_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
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

export default async function CategoryLandingPage({ params }) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);
  if (!category) return notFound();

  const [topCategories, parentCategory, childCategories] = await Promise.all([
    getTopLevelCategories(),
    getCategoryById(category.parent_id),
    getChildCategories(category.id),
  ]);

  const siblingCategories = category.parent_id
    ? await getSiblingCategories(category.parent_id)
    : [];

  const categoryNavItems =
    childCategories.length > 0 ? childCategories : siblingCategories;

  const products = await getCategoryProducts(
    category.id,
    childCategories.map((child) => child.id),
  );

  const meta = buildMeta(category.name, products.length);
  const categoryUrl = buildCategoryUrl(category.slug);

  const breadcrumbItems = [
    {
      name: "Home",
      url: SITE_URL,
    },
    {
      name: "Shop",
      url: `${SITE_URL}/shop`,
    },
  ];

  if (parentCategory) {
    breadcrumbItems.push({
      name: parentCategory.name,
      url: buildCategoryUrl(parentCategory.slug),
    });
  }

  breadcrumbItems.push({
    name: category.name,
    url: categoryUrl,
  });

  return (
    <Container className="py-8 sm:py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: meta.title,
          description: meta.description,
          url: categoryUrl,
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbItems.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              item: item.url,
            })),
          },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListElement: products.map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${SITE_URL}/shop/${product.slug}`,
              name: product.name,
            })),
          },
        }}
      />

      <nav className="mb-5 text-sm text-slate-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
          </li>

          <li>/</li>

          <li>
            <Link href="/shop" className="hover:text-slate-900">
              Shop
            </Link>
          </li>

          {parentCategory ? (
            <>
              <li>/</li>
              <li>
                <Link
                  href={`/shop/category/${parentCategory.slug}`}
                  className="hover:text-slate-900"
                >
                  {parentCategory.name}
                </Link>
              </li>
            </>
          ) : null}

          <li>/</li>

          <li className="font-medium text-slate-900">{category.name}</li>
        </ol>
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-emerald-700">
          Solar Category
        </div>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          {category.name} in Nigeria
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Shop {category.name.toLowerCase()} from {BRAND_NAME}. Browse available
          products, compare options, check specifications, and order directly
          online or through chat support.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {topCategories.map((item) => {
            const active =
              item.slug === category.slug || item.id === category.parent_id;

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

      {categoryNavItems.length > 0 ? (
        <section className="mt-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {childCategories.length > 0
                ? `Explore ${category.name}`
                : parentCategory
                  ? `More in ${parentCategory.name}`
                  : `Explore ${category.name}`}
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {categoryNavItems.map((item) => {
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
