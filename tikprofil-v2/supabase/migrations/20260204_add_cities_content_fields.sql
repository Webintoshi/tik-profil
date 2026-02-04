-- ============================================
-- Cities Tablosu İçerik Alanları Ekleme
-- ============================================

-- Cities tablosuna eksik alanları ekle
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS cover_image_alt TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS canonical_url TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS places JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS cities_slug_idx ON cities(slug);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS cities_status_idx ON cities(status);

-- Ensure slug is unique
CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_unique_idx ON cities(slug) WHERE slug IS NOT NULL;
