-- Add map-related fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS map_visible BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS pin_priority TEXT NOT NULL DEFAULT 'normal' CHECK (pin_priority IN ('normal', 'featured', 'spotlight'));

-- Create index for map queries
CREATE INDEX IF NOT EXISTS idx_businesses_map ON public.businesses (map_visible, status, latitude, longitude);

-- Update RLS policies remain the same since we're just adding columns