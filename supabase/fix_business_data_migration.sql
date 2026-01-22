-- Fix Business Data Migration
-- Bu SQL, data JSON sutunundaki verileri ust seviye sutunlara tasir

-- 1. bebek-burger-akyazi icin dugeltme
UPDATE businesses
SET 
    logo = data->'data'->>'logo',
    cover = data->'data'->>'cover',
    about = data->'data'->>'about',
    slogan = data->'data'->>'slogan',
    industry_label = data->'data'->>'industry_label',
    industry_id = data->'data'->>'industry_id',
    modules = (
        SELECT ARRAY(SELECT jsonb_array_elements_text(data->'data'->'modules'))
    )
WHERE slug = 'bebek-burger-akyazi';

-- 2. TUM isletmeler icin toplu duzeltme
UPDATE businesses
SET 
    logo = COALESCE(logo, data->'data'->>'logo'),
    cover = COALESCE(cover, data->'data'->>'cover'),
    about = COALESCE(about, data->'data'->>'about'),
    slogan = COALESCE(slogan, data->'data'->>'slogan'),
    industry_label = COALESCE(industry_label, data->'data'->>'industry_label'),
    industry_id = COALESCE(industry_id, data->'data'->>'industry_id')
WHERE data->'data' IS NOT NULL;

-- 3. Modules array fix (ayri calistirin)
UPDATE businesses
SET modules = (
    SELECT ARRAY(SELECT jsonb_array_elements_text(data->'data'->'modules'))
)
WHERE data->'data'->'modules' IS NOT NULL 
  AND (modules IS NULL OR array_length(modules, 1) IS NULL);
