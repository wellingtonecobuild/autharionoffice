-- Add annual pricing fields to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_annual numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_price_id_annual text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_product_id_annual text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.subscription_plans.price_annual IS 'Annual price in NZD (e.g., 1500 for Premium, 5000 for Elite)';
COMMENT ON COLUMN public.subscription_plans.stripe_price_id_annual IS 'Stripe price ID for annual billing';
COMMENT ON COLUMN public.subscription_plans.stripe_product_id_annual IS 'Stripe product ID for annual billing';

-- Update Premium plan with annual pricing
UPDATE public.subscription_plans 
SET 
  price_annual = 1500,
  stripe_price_id_annual = 'price_1SiUkoIAePQl2zAwFFA3dMiz',
  stripe_product_id_annual = 'prod_TfqRdIcfUh5BEr',
  price_monthly = 149
WHERE plan_key = 'premium';

-- Update Elite plan with annual pricing
UPDATE public.subscription_plans 
SET 
  price_annual = 5000,
  stripe_price_id_annual = 'price_1SiUkpIAePQl2zAwBWcUbrXM',
  stripe_product_id_annual = 'prod_TfqRH5tRDZA4vE',
  price_monthly = 499
WHERE plan_key = 'elite';

-- Also add billing_cycle to businesses table to track what cycle they're on
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual'));

COMMENT ON COLUMN public.businesses.billing_cycle IS 'Current billing cycle: monthly or annual';