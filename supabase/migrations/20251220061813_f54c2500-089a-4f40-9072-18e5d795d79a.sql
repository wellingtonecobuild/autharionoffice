-- Update app_role enum to add content creator roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'writer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'journalist';