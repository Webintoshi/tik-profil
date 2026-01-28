-- Migration: Add updated_at column to industry_definitions table
-- Supabase SQL Editor'de çalıştırın

ALTER TABLE public.industry_definitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index for updated_at (optional, for sorting)
CREATE INDEX IF NOT EXISTS industry_definitions_updated_at_idx ON public.industry_definitions(updated_at);
