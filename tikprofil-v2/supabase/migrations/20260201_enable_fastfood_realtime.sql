-- ============================================
-- Enable Real-time for FastFood Orders
-- FAZ 1: Instant notification sounds
-- ============================================

-- Enable real-time for ff_orders table
-- Note: supabase_realtime publication is created automatically by Supabase
-- We just need to add the table to it

DO $$
BEGIN
    -- Check if the publication exists
    IF EXISTS (
        SELECT 1 FROM pg_publication 
        WHERE pubname = 'supabase_realtime'
    ) THEN
        -- Add ff_orders table to the publication if not already added
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND tablename = 'ff_orders'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE ff_orders;
            RAISE NOTICE 'ff_orders added to supabase_realtime publication';
        ELSE
            RAISE NOTICE 'ff_orders already in supabase_realtime publication';
        END IF;
    ELSE
        -- Create publication if it doesn't exist
        CREATE PUBLICATION supabase_realtime FOR TABLE ff_orders;
        RAISE NOTICE 'Created supabase_realtime publication with ff_orders';
    END IF;
END $$;

-- Also add ff_stock_reservations for stock changes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication 
        WHERE pubname = 'supabase_realtime'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'ff_stock_reservations'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND tablename = 'ff_stock_reservations'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE ff_stock_reservations;
            RAISE NOTICE 'ff_stock_reservations added to supabase_realtime publication';
        END IF;
    END IF;
END $$;

-- Verify the configuration
COMMENT ON PUBLICATION supabase_realtime IS 'Real-time publication for live updates - includes ff_orders and ff_stock_reservations';

-- Verify tables in publication
SELECT 
    pubname,
    tablename,
    schemaname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
