import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

    for (const slug of slugs) {
      revalidatePath(`/shop/${slug}`);
    }
    revalidatePath("/shop");
    revalidatePath("/");

    return NextResponse.json({ revalidated: true, slugs });
  } catch (error) {
    console.error("PRODUCT REVALIDATION ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Product cache revalidation failed." },
      { status: 500 },
    );
  }
}
