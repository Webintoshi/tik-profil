create extension if not exists "pgcrypto";

do $$
declare
    source_collection text;
    target_table text;
    field_mapping jsonb;
begin
    for source_collection, target_table, field_mapping in
        values
            ('ecommerce_products', 'ecommerce_products', '{"business_id": "businessId", "category_id": "categoryId", "name_en": "nameEn", "description_en": "descriptionEn", "image_url": "imageUrl", "is_active": "isActive", "is_featured": "isFeatured", "is_premium": "isPremium", "sort_order": "sortOrder", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('ecommerce_categories', 'ecommerce_categories', '{"name_en": "nameEn", "image_url": "imageUrl", "sort_order": "sortOrder", "is_active": "isActive", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('ecommerce_orders', 'ecommerce_orders', '{"customer_name": "customerName", "customer_email": "customerEmail", "customer_phone": "customerPhone", "customer_address": "customerAddress", "subtotal": "subtotal", "shipping_fee": "shippingFee", "total": "total", "payment_method": "paymentMethod", "payment_status": "paymentStatus", "order_status": "orderStatus", "customer_note": "customerNote", "coupon_id": "couponId", "coupon_code": "couponCode", "coupon_discount": "couponDiscount", "internal_note": "internalNote", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('ecommerce_customers', 'ecommerce_customers', '{"phone": "phone", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('ecommerce_coupons', 'ecommerce_coupons', '{"discount_value": "discountValue", "min_order_amount": "minOrderAmount", "max_discount_amount": "maxDiscountAmount", "max_usage_count": "maxUsageCount", "usage_per_user": "usagePerUser", "current_usage_count": "currentUsageCount", "valid_from": "validFrom", "valid_until": "validUntil", "is_active": "isActive", "is_public": "isPublic", "is_first_order_only": "isFirstOrderOnly", "applicable_category_ids": "applicableCategoryIds", "applicable_product_ids": "applicableProductIds", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('em_listings', 'em_listings', '{"title": "title", "title_en": "titleEn", "description": "description", "description_en": "descriptionEn", "listing_type": "listingType", "property_type": "propertyType", "property_sub_type": "propertySubType", "price": "price", "size_sqm": "sizeSqm", "rooms": "rooms", "bathrooms": "bathrooms", "floor": "floor", "floor_count": "floorCount", "year_built": "yearBuilt", "heating_type": "heatingType", "condition": "condition", "usage_status": "usageStatus", "usage_status_en": "usageStatusEn", "is_title_deed": "isTitleDeed", "has_title_deed": "hasTitleDeed", "is_active": "isActive", "is_premium": "isPremium", "view_count": "viewCount", "contact_count": "contactCount", "sort_order": "sortOrder", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('em_consultants', 'em_consultants', '{"whatsapp_number": "whatsappNumber", "instagram_url": "instagramUrl", "linkedin_url": "linkedinUrl", "twitter_url": "twitterUrl", "is_active": "isActive", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('beauty_services', 'beauty_services', '{"category_id": "categoryId", "name_en": "nameEn", "description_en": "descriptionEn", "image_url": "imageUrl", "duration_minutes": "durationMinutes", "is_active": "isActive", "is_featured": "isFeatured", "tags": "tags", "sort_order": "sortOrder", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('beauty_categories', 'beauty_categories', '{"name_en": "nameEn", "image_url": "imageUrl", "sort_order": "sortOrder", "is_active": "isActive", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('beauty_staff', 'beauty_staff', '{"image_url": "imageUrl", "phone": "phone", "email": "email", "is_active": "isActive", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('beauty_customers', 'beauty_customers', '{"phone": "phone", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('beauty_appointments', 'beauty_appointments', '{"customer_id": "customerId", "staff_id": "staffId", "service_id": "serviceId", "time_slot": "timeSlot", "status": "status", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('hotel_room_types', 'hotel_room_types', '{"name_en": "nameEn", "description_en": "descriptionEn", "price_per_night": "pricePerNight", "discount_price": "discountPrice", "discount_until": "discountUntil", "max_guests": "maxGuests", "max_adults": "maxAdults", "max_children": "maxChildren", "size_sqm": "sizeSqm", "view_type": "viewType", "floor_preference": "floorPreference", "is_smoking_allowed": "isSmokingAllowed", "is_pet_friendly": "isPetFriendly", "sort_order": "sortOrder", "is_active": "isActive", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('hotel_rooms', 'hotel_rooms', '{"room_type_id": "roomTypeId", "room_number": "roomNumber", "is_active": "isActive", "is_available": "isAvailable", "is_clean": "isClean", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb),
            ('hotel_reservations', 'hotel_reservations', '{"room_type_id": "roomTypeId", "room_id": "roomId", "customer_name": "customerName", "customer_phone": "customerPhone", "customer_email": "customerEmail", "check_in_date": "checkInDate", "check_out_date": "checkOutDate", "guest_count": "guestCount", "total_nights": "totalNights", "price_per_night": "pricePerNight", "total_price": "totalPrice", "payment_method": "paymentMethod", "payment_status": "paymentStatus", "reservation_status": "reservationStatus", "special_requests": "specialRequests", "internal_note": "internalNote", "created_at": "createdAt", "updated_at": "updatedAt"}'::jsonb)
    loop
        execute format('
            insert into %I (id, business_id, %s)
            select 
                data->>''id'',
                data->>''business_id'',
                %s
            from app_documents
            where collection = ''%s''
                and not exists (
                    select 1 from %I where id = (data->>''id'')::text
                )
        ', target_table, 
           (select string_agg(key, ', ' order by key) from jsonb_object_keys(field_mapping)),
           (select string_agg(key || '' as '' || key, ', ' order by key) from jsonb_object_keys(field_mapping))
        where collection = source_collection;
    end loop;
end $$;
