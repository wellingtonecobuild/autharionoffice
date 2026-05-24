-- Add conversion tracking fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS is_converted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS converted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS conversion_notes text;