do $$
declare
    doc record;
    inserted_count integer := 0;
begin
    raise notice 'Starting hotel data migration...';
    
    raise notice 'Migrating room_types...';
    for doc in 
        select id, data 
        from app_documents 
        where collection = 'room_types'
    loop
        insert into hotel_room_types (
            id,
            business_id,
            name,
            name_en,
            description,
            description_en,
            capacity,
            bed_count,
            bed_type,
            price_per_night,
            discount_price,
            discount_until,
            amenities,
            images,
            max_guests,
            max_adults,
            max_children,
            size_sqm,
            view_type,
            floor_preference,
            is_smoking_allowed,
            is_pet_friendly,
            sort_order,
            is_active,
            created_at,
            updated_at
        ) values (
            doc.id,
            (doc.data->>'businessId')::text,
            (doc.data->>'name')::text,
            (doc.data->>'nameEn')::text,
            (doc.data->>'description')::text,
            (doc.data->>'descriptionEn')::text,
            coalesce((doc.data->>'capacity')::integer, 2),
            coalesce((doc.data->>'bedCount')::integer, 1),
            (doc.data->>'bedType')::text,
            coalesce((doc.data->>'pricePerNight')::numeric, 0),
            (doc.data->>'discountPrice')::numeric,
            (doc.data->>'discountUntil')::timestamptz,
            coalesce((doc.data->>'amenities')::jsonb, '[]'::jsonb),
            coalesce((doc.data->>'images')::jsonb, '[]'::jsonb),
            coalesce((doc.data->>'maxGuests')::integer, 2),
            coalesce((doc.data->>'maxAdults')::integer, 2),
            coalesce((doc.data->>'maxChildren')::integer, 0),
            (doc.data->>'sizeSqm')::numeric,
            (doc.data->>'viewType')::text,
            (doc.data->>'floorPreference')::text,
            coalesce((doc.data->>'isSmokingAllowed')::boolean, false),
            coalesce((doc.data->>'isPetFriendly')::boolean, false),
            coalesce((doc.data->>'sortOrder')::integer, 0),
            coalesce((doc.data->>'isActive')::boolean, true),
            coalesce((doc.data->>'createdAt')::timestamptz, now()),
            coalesce((doc.data->>'updatedAt')::timestamptz, now())
        ) on conflict (id) do update set
            business_id = excluded.business_id,
            name = excluded.name,
            name_en = excluded.name_en,
            description = excluded.description,
            description_en = excluded.description_en,
            capacity = excluded.capacity,
            bed_count = excluded.bed_count,
            bed_type = excluded.bed_type,
            price_per_night = excluded.price_per_night,
            discount_price = excluded.discount_price,
            discount_until = excluded.discount_until,
            amenities = excluded.amenities,
            images = excluded.images,
            max_guests = excluded.max_guests,
            max_adults = excluded.max_adults,
            max_children = excluded.max_children,
            size_sqm = excluded.size_sqm,
            view_type = excluded.view_type,
            floor_preference = excluded.floor_preference,
            is_smoking_allowed = excluded.is_smoking_allowed,
            is_pet_friendly = excluded.is_pet_friendly,
            sort_order = excluded.sort_order,
            is_active = excluded.is_active,
            updated_at = now();
        
        inserted_count := inserted_count + 1;
    end loop;
    raise notice 'Migrated % room_types records', inserted_count;
    inserted_count := 0;
    
    raise notice 'Migrating hotel_rooms...';
    for doc in 
        select id, data 
        from app_documents 
        where collection = 'hotel_rooms'
    loop
        insert into hotel_rooms (
            id,
            business_id,
            room_number,
            room_type_id,
            floor,
            status,
            current_guest_name,
            check_in_date,
            check_out_date,
            expected_check_out,
            last_cleaned_at,
            is_cleaned,
            housekeeping_note,
            notes,
            qr_code,
            images,
            amenities,
            is_active,
            sort_order,
            created_at,
            updated_at
        ) values (
            doc.id,
            (doc.data->>'businessId')::text,
            (doc.data->>'roomNumber')::text,
            (doc.data->>'roomTypeId')::text,
            coalesce((doc.data->>'floor')::integer, 1),
            coalesce((doc.data->>'status')::text, 'available'),
            (doc.data->>'currentGuestName')::text,
            (doc.data->>'checkInDate')::timestamptz,
            (doc.data->>'checkOutDate')::timestamptz,
            (doc.data->>'expectedCheckOut')::timestamptz,
            (doc.data->>'lastCleanedAt')::timestamptz,
            coalesce((doc.data->>'isCleaned')::boolean, true),
            (doc.data->>'housekeepingNote')::text,
            (doc.data->>'notes')::text,
            (doc.data->>'qrCode')::text,
            coalesce((doc.data->>'images')::jsonb, '[]'::jsonb),
            coalesce((doc.data->>'amenities')::jsonb, '[]'::jsonb),
            coalesce((doc.data->>'isActive')::boolean, true),
            coalesce((doc.data->>'sortOrder')::integer, 0),
            coalesce((doc.data->>'createdAt')::timestamptz, now()),
            coalesce((doc.data->>'updatedAt')::timestamptz, now())
        ) on conflict (id) do update set
            business_id = excluded.business_id,
            room_number = excluded.room_number,
            room_type_id = excluded.room_type_id,
            floor = excluded.floor,
            status = excluded.status,
            current_guest_name = excluded.current_guest_name,
            check_in_date = excluded.check_in_date,
            check_out_date = excluded.check_out_date,
            expected_check_out = excluded.expected_check_out,
            last_cleaned_at = excluded.last_cleaned_at,
            is_cleaned = excluded.is_cleaned,
            housekeeping_note = excluded.housekeeping_note,
            notes = excluded.notes,
            qr_code = excluded.qr_code,
            images = excluded.images,
            amenities = excluded.amenities,
            is_active = excluded.is_active,
            sort_order = excluded.sort_order,
            updated_at = now();
        
        inserted_count := inserted_count + 1;
    end loop;
    raise notice 'Migrated % hotel_rooms records', inserted_count;
    inserted_count := 0;
    
    raise notice 'Migrating hotel_requests...';
    for doc in 
        select id, data 
        from app_documents 
        where collection = 'hotel_requests'
    loop
        insert into hotel_requests (
            id,
            business_id,
            room_id,
            room_number,
            request_type,
            request_details,
            priority,
            status,
            assigned_to,
            completed_at,
            completed_by,
            notes,
            created_at,
            updated_at
        ) values (
            doc.id,
            (doc.data->>'businessId')::text,
            (doc.data->>'roomId')::text,
            (doc.data->>'roomNumber')::text,
            (doc.data->>'requestType')::text,
            (doc.data->>'requestDetails')::text,
            coalesce((doc.data->>'priority')::text, 'normal'),
            coalesce((doc.data->>'status')::text, 'pending'),
            (doc.data->>'assignedTo')::text,
            (doc.data->>'completedAt')::timestamptz,
            (doc.data->>'completedBy')::text,
            (doc.data->>'notes')::text,
            coalesce((doc.data->>'createdAt')::timestamptz, now()),
            coalesce((doc.data->>'updatedAt')::timestamptz, now())
        ) on conflict (id) do update set
            business_id = excluded.business_id,
            room_id = excluded.room_id,
            room_number = excluded.room_number,
            request_type = excluded.request_type,
            request_details = excluded.request_details,
            priority = excluded.priority,
            status = excluded.status,
            assigned_to = excluded.assigned_to,
            completed_at = excluded.completed_at,
            completed_by = excluded.completed_by,
            notes = excluded.notes,
            updated_at = now();
        
        inserted_count := inserted_count + 1;
    end loop;
    raise notice 'Migrated % hotel_requests records', inserted_count;
    inserted_count := 0;
    
    raise notice 'Migrating room_service_orders...';
    for doc in 
        select id, data 
        from app_documents 
        where collection = 'room_service_orders'
    loop
        insert into hotel_room_service_orders (
            id,
            business_id,
            room_id,
            room_number,
            guest_name,
            items,
            subtotal,
            service_charge,
            tax,
            total,
            status,
            priority,
            special_instructions,
            assigned_to,
            completed_at,
            completed_by,
            notes,
            created_at,
            updated_at
        ) values (
            doc.id,
            (doc.data->>'businessId')::text,
            (doc.data->>'roomId')::text,
            (doc.data->>'roomNumber')::text,
            (doc.data->>'guestName')::text,
            coalesce((doc.data->>'items')::jsonb, '[]'::jsonb),
            coalesce((doc.data->>'subtotal')::numeric, 0),
            coalesce((doc.data->>'serviceCharge')::numeric, 0),
            coalesce((doc.data->>'tax')::numeric, 0),
            coalesce((doc.data->>'total')::numeric, 0),
            coalesce((doc.data->>'status')::text, 'pending'),
            coalesce((doc.data->>'priority')::text, 'normal'),
            (doc.data->>'specialInstructions')::text,
            (doc.data->>'assignedTo')::text,
            (doc.data->>'completedAt')::timestamptz,
            (doc.data->>'completedBy')::text,
            (doc.data->>'notes')::text,
            coalesce((doc.data->>'createdAt')::timestamptz, now()),
            coalesce((doc.data->>'updatedAt')::timestamptz, now())
        ) on conflict (id) do update set
            business_id = excluded.business_id,
            room_id = excluded.room_id,
            room_number = excluded.room_number,
            guest_name = excluded.guest_name,
            items = excluded.items,
            subtotal = excluded.subtotal,
            service_charge = excluded.service_charge,
            tax = excluded.tax,
            total = excluded.total,
            status = excluded.status,
            priority = excluded.priority,
            special_instructions = excluded.special_instructions,
            assigned_to = excluded.assigned_to,
            completed_at = excluded.completed_at,
            completed_by = excluded.completed_by,
            notes = excluded.notes,
            updated_at = now();
        
        inserted_count := inserted_count + 1;
    end loop;
    raise notice 'Migrated % room_service_orders records', inserted_count;
    
    raise notice 'Hotel data migration completed successfully!';
end $$;
