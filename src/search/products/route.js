// src/app/api/search/products/route.js
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const supabase = await createClient();

  // Basic search across name/slug/description
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, slug, price, active,
      images:product_images ( id, image_url )
    `,
    )
    .eq("active", true)
    .or(`name.ilike.%${q}%,slug.ilike.%${q}%,description.ilike.%${q}%`)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    return NextResponse.json(
      { error: error.message, items: [] },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data || [] }, { status: 200 });
}
