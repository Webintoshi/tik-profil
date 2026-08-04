ALTER TABLE business_import_candidates
    DROP CONSTRAINT IF EXISTS business_import_candidates_sector_key_check;

ALTER TABLE business_import_candidates
    ADD CONSTRAINT business_import_candidates_sector_key_check
    CHECK (sector_key IN (
        'petshop', 'veteriner', 'fastfood', 'oto_galeri', 'restaurant', 'cafe',
        'beauty', 'real_estate', 'lodging', 'car_rental', 'healthcare', 'grocery',
        'bakery', 'auto_service', 'pharmacy', 'fitness', 'education', 'fashion',
        'furniture', 'electronics', 'construction_supply', 'florist_stationery',
        'cleaning_laundry', 'event_wedding', 'professional_services', 'photography',
        'gas_station', 'logistics', 'car_wash'
    ));
