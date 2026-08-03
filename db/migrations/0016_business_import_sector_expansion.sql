ALTER TABLE business_import_candidates
    DROP CONSTRAINT IF EXISTS business_import_candidates_sector_key_check;

ALTER TABLE business_import_candidates
    ADD CONSTRAINT business_import_candidates_sector_key_check
    CHECK (sector_key IN ('petshop', 'veteriner', 'fastfood'));
