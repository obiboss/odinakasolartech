const { createClient } = require("@supabase/supabase-js");

module.exports = {
  siteUrl: "https://www.odinakachukwusolartech.com",
  generateRobotsTxt: true,

  additionalPaths: async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at");

    return products.map((p) => ({
      loc: `/shop/${p.slug}`,
      lastmod: p.updated_at,
    }));
  },
};
