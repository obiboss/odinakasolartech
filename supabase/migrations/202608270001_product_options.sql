-- ============================================================
-- ODINAKA SOLAR TECH
-- Product Packages + Capabilities + Video Testimonials
--
-- SAFE / ADDITIVE MIGRATION
-- Does not drop existing tables, columns, data, or storage.
-- ============================================================


-- ============================================================
-- 1. ADD VIDEO TESTIMONIAL FIELDS TO PRODUCTS
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_testimonial_url text,
  ADD COLUMN IF NOT EXISTS video_testimonial_platform text;


-- ============================================================
-- 2. ADD PACKAGE FIELDS TO EXISTING ORDER ITEMS
-- ============================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS package_id uuid,
  ADD COLUMN IF NOT EXISTS package_name text;


-- ============================================================
-- 3. CREATE PRODUCT PACKAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id uuid NOT NULL,

  name text NOT NULL,

  price numeric NOT NULL,

  description text,

  sort_order integer NOT NULL DEFAULT 0,

  active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_packages_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE
);


-- ============================================================
-- 4. CREATE PRODUCT CAPABILITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id uuid NOT NULL,

  name text NOT NULL,

  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_capabilities_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE
);


-- ============================================================
-- 5. LINK ORDER ITEMS TO PRODUCT PACKAGES
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_package_id_fkey'
      AND conrelid = 'public.order_items'::regclass
  ) THEN

    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_package_id_fkey
      FOREIGN KEY (package_id)
      REFERENCES public.product_packages(id)
      ON DELETE SET NULL;

  END IF;
END $$;


-- ============================================================
-- 6. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
  product_packages_product_id_sort_order_idx
ON public.product_packages (
  product_id,
  sort_order,
  created_at
);


CREATE INDEX IF NOT EXISTS
  product_capabilities_product_id_sort_order_idx
ON public.product_capabilities (
  product_id,
  sort_order,
  created_at
);


-- ============================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.product_packages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_capabilities
  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 8. PRODUCT PACKAGE POLICIES
-- ============================================================

DROP POLICY IF EXISTS
  "Public can read active product packages"
ON public.product_packages;

CREATE POLICY
  "Public can read active product packages"
ON public.product_packages
FOR SELECT
USING (
  active = true
  AND EXISTS (
    SELECT 1
    FROM public.products
    WHERE products.id = product_packages.product_id
      AND products.active = true
  )
);


DROP POLICY IF EXISTS
  "Admins can manage product packages"
ON public.product_packages;

CREATE POLICY
  "Admins can manage product packages"
ON public.product_packages
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


-- ============================================================
-- 9. PRODUCT CAPABILITY POLICIES
-- ============================================================

DROP POLICY IF EXISTS
  "Public can read product capabilities"
ON public.product_capabilities;

CREATE POLICY
  "Public can read product capabilities"
ON public.product_capabilities
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.products
    WHERE products.id = product_capabilities.product_id
      AND products.active = true
  )
);


DROP POLICY IF EXISTS
  "Admins can manage product capabilities"
ON public.product_capabilities;

CREATE POLICY
  "Admins can manage product capabilities"
ON public.product_capabilities
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