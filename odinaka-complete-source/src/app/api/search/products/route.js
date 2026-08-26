import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_products_live", {
    search_query: q,
    result_limit: 8,
  });

  if (error) {
    console.log("SEARCH RPC ERROR:", error);
    return NextResponse.json(
      { error: error.message, items: [] },
      { status: 500 },
    );
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    currency: row.currency,
    images: row.image_url ? [{ image_url: row.image_url }] : [],
  }));

  return NextResponse.json({ items }, { status: 200 });
}
