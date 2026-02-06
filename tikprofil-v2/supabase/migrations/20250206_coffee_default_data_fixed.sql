-- ============================================
-- TIKPROFIL COFFEE SHOP MODULE - DEFAULT DATA (FIXED)
-- business_id: UUID -> TEXT
-- ============================================

CREATE OR REPLACE FUNCTION create_coffee_defaults(p_business_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_milk_group_id UUID;
    v_sweetener_group_id UUID;
    v_syrup_group_id UUID;
    v_extras_group_id UUID;
    v_toppings_group_id UUID;
BEGIN
    -- Default categories
    INSERT INTO coffee_categories (business_id, name, slug, icon, sort_order) VALUES
        (p_business_id, 'Sıcak İçecekler', 'hot-drinks', 'coffee', 1),
        (p_business_id, 'Soğuk İçecekler', 'cold-drinks', 'glass-water', 2),
        (p_business_id, 'Yiyecekler', 'food', 'cake', 3),
        (p_business_id, 'Ürünler', 'merchandise', 'shopping-bag', 4)
    ON CONFLICT DO NOTHING;

    -- Default sizes
    INSERT INTO coffee_sizes (business_id, name, volume_ml, price_modifier, sort_order) VALUES
        (p_business_id, 'Short', 240, -5, 1),
        (p_business_id, 'Tall', 360, 0, 2),
        (p_business_id, 'Grande', 480, 5, 3),
        (p_business_id, 'Venti', 600, 10, 4)
    ON CONFLICT DO NOTHING;

    -- Default settings
    INSERT INTO coffee_settings (business_id) VALUES (p_business_id)
    ON CONFLICT (business_id) DO NOTHING;

    -- Default extra groups
    INSERT INTO coffee_extra_groups (business_id, name, slug, selection_type, is_required, sort_order) VALUES
        (p_business_id, 'Süt Seçimi', 'milk-type', 'single', true, 1),
        (p_business_id, 'Tatlandırıcı', 'sweetener', 'single', false, 2),
        (p_business_id, 'Şurup', 'syrup', 'multiple', false, 3),
        (p_business_id, 'Ekstralar', 'extras', 'multiple', false, 4),
        (p_business_id, 'Süsleme', 'toppings', 'multiple', false, 5)
    ON CONFLICT DO NOTHING;

    -- Get group IDs
    SELECT id INTO v_milk_group_id FROM coffee_extra_groups WHERE business_id = p_business_id AND slug = 'milk-type';
    SELECT id INTO v_sweetener_group_id FROM coffee_extra_groups WHERE business_id = p_business_id AND slug = 'sweetener';
    SELECT id INTO v_syrup_group_id FROM coffee_extra_groups WHERE business_id = p_business_id AND slug = 'syrup';
    SELECT id INTO v_extras_group_id FROM coffee_extra_groups WHERE business_id = p_business_id AND slug = 'extras';
    SELECT id INTO v_toppings_group_id FROM coffee_extra_groups WHERE business_id = p_business_id AND slug = 'toppings';

    -- Exit if groups not found
    IF v_milk_group_id IS NULL THEN
        RAISE NOTICE 'Extra groups not created, skipping extras';
        RETURN;
    END IF;

    -- Milk options
    INSERT INTO coffee_extras (business_id, extra_group_id, name, name_en, price_modifier, sort_order) VALUES
        (p_business_id, v_milk_group_id, 'İnek Sütü', 'Whole Milk', 0, 1),
        (p_business_id, v_milk_group_id, 'Yağsız Süt', 'Skim Milk', 0, 2),
        (p_business_id, v_milk_group_id, 'Soya Sütü', 'Soy Milk', 5, 3),
        (p_business_id, v_milk_group_id, 'Yulaf Sütü', 'Oat Milk', 5, 4),
        (p_business_id, v_milk_group_id, 'Badem Sütü', 'Almond Milk', 5, 5),
        (p_business_id, v_milk_group_id, 'Hindistan Cevizi Sütü', 'Coconut Milk', 5, 6)
    ON CONFLICT DO NOTHING;

    -- Sweetener options
    INSERT INTO coffee_extras (business_id, extra_group_id, name, name_en, price_modifier, sort_order) VALUES
        (p_business_id, v_sweetener_group_id, 'Şeker', 'Sugar', 0, 1),
        (p_business_id, v_sweetener_group_id, 'Esmer Şeker', 'Brown Sugar', 0, 2),
        (p_business_id, v_sweetener_group_id, 'Bal', 'Honey', 0, 3),
        (p_business_id, v_sweetener_group_id, 'Tatlandırıcı', 'Sweetener', 0, 4),
        (p_business_id, v_sweetener_group_id, 'Şekersiz', 'No Sweetener', 0, 5)
    ON CONFLICT DO NOTHING;

    -- Syrup options
    INSERT INTO coffee_extras (business_id, extra_group_id, name, name_en, price_modifier, sort_order) VALUES
        (p_business_id, v_syrup_group_id, 'Vanilya', 'Vanilla', 3, 1),
        (p_business_id, v_syrup_group_id, 'Karamel', 'Caramel', 3, 2),
        (p_business_id, v_syrup_group_id, 'Fındık', 'Hazelnut', 3, 3),
        (p_business_id, v_syrup_group_id, 'Mocha', 'Mocha', 3, 4),
        (p_business_id, v_syrup_group_id, 'Tarçın', 'Cinnamon', 3, 5)
    ON CONFLICT DO NOTHING;

    -- Extra options
    INSERT INTO coffee_extras (business_id, extra_group_id, name, name_en, price_modifier, sort_order) VALUES
        (p_business_id, v_extras_group_id, 'Ekstra Shot', 'Extra Shot', 5, 1),
        (p_business_id, v_extras_group_id, 'Krem Şanti', 'Whipped Cream', 3, 2),
        (p_business_id, v_extras_group_id, 'Ekstra Köpük', 'Extra Foam', 2, 3)
    ON CONFLICT DO NOTHING;

    -- Topping options
    INSERT INTO coffee_extras (business_id, extra_group_id, name, name_en, price_modifier, sort_order) VALUES
        (p_business_id, v_toppings_group_id, 'Çikolata Tozu', 'Chocolate Powder', 0, 1),
        (p_business_id, v_toppings_group_id, 'Tarçın', 'Cinnamon', 0, 2),
        (p_business_id, v_toppings_group_id, 'Kakao', 'Cocoa', 0, 3)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Coffee defaults created for business %', p_business_id;
END;
$$ LANGUAGE plpgsql;

-- COMMENT
COMMENT ON FUNCTION create_coffee_defaults IS 'Create default categories, sizes, and extras for a coffee shop business (business_id: TEXT)';
