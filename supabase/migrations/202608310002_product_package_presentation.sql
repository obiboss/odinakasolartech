-- Odinaka Solar Tech: richer package presentation fields.
-- Additive only. Existing package price remains the sale price used by orders.

ALTER TABLE public.product_packages
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS normal_price numeric,
  ADD COLUMN IF NOT EXISTS included_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bonuses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS warranty text,
  ADD COLUMN IF NOT EXISTS delivery text,
  ADD COLUMN IF NOT EXISTS payment text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
