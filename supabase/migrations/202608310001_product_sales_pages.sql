-- Odinaka Solar Tech: optional product sales-page content.
-- Additive only. Existing products and commerce tables are unchanged.

CREATE TABLE IF NOT EXISTS public.product_sales_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_sales_pages_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS product_sales_pages_product_id_idx
  ON public.product_sales_pages(product_id);

ALTER TABLE public.product_sales_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read enabled product sales pages"
  ON public.product_sales_pages;

CREATE POLICY "Public can read enabled product sales pages"
  ON public.product_sales_pages
  FOR SELECT
  USING (
    enabled = true
    AND EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = product_sales_pages.product_id
        AND products.active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage product sales pages"
  ON public.product_sales_pages;

CREATE POLICY "Admins can manage product sales pages"
  ON public.product_sales_pages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );
