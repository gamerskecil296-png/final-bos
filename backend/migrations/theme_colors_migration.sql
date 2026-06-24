-- Migration: Add portal and landing color columns
-- Run this SQL to add new theme columns to existing database

-- Add Portal Colors columns
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_primary VARCHAR(9) DEFAULT '#0D2B55';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_secondary VARCHAR(9) DEFAULT '#C89B3C';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_accent VARCHAR(9) DEFAULT '#E8B84B';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_background VARCHAR(9) DEFAULT '#F9F6F0';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_surface VARCHAR(9) DEFAULT '#FFFFFF';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_text_primary VARCHAR(9) DEFAULT '#1B1C1C';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_text_muted VARCHAR(9) DEFAULT '#64748B';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_h1 VARCHAR(9) DEFAULT '#0D2B55';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_h2 VARCHAR(9) DEFAULT '#0D2B55';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_h3 VARCHAR(9) DEFAULT '#1E3A5F';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS portal_color_h4 VARCHAR(9) DEFAULT '#475569';

-- Add Landing Colors columns
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_primary VARCHAR(9) DEFAULT '#0D2B55';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_secondary VARCHAR(9) DEFAULT '#C89B3C';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_accent VARCHAR(9) DEFAULT '#E8B84B';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_background VARCHAR(9) DEFAULT '#0D2B55';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_surface VARCHAR(9) DEFAULT '#1B3A5C';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_text_primary VARCHAR(9) DEFAULT '#FFFFFF';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_text_muted VARCHAR(9) DEFAULT '#E2E8F0';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_h1 VARCHAR(9) DEFAULT '#FFFFFF';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_h2 VARCHAR(9) DEFAULT '#FFFFFF';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_h3 VARCHAR(9) DEFAULT '#E2E8F0';
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS landing_color_h4 VARCHAR(9) DEFAULT '#94A3B8';

-- Add Sidebar Muted Color column
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS sidebar_text_muted_color VARCHAR(9) DEFAULT '#94A3B8';

-- Add Border Muted column
ALTER TABLE public.theme_settings
ADD COLUMN IF NOT EXISTS color_border_muted VARCHAR(9) DEFAULT '#F1F5F9';

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'theme_settings'
ORDER BY column_name;