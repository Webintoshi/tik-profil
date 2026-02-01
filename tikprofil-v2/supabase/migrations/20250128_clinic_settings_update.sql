-- Clinic settings table update for public appointment feature
-- Add require_phone and require_email columns if not exist

DO $$
BEGIN
    -- Add require_phone column if not exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clinic_settings' 
        AND column_name = 'require_phone'
    ) THEN
        ALTER TABLE clinic_settings 
        ADD COLUMN require_phone BOOLEAN DEFAULT true;
    END IF;

    -- Add require_email column if not exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clinic_settings' 
        AND column_name = 'require_email'
    ) THEN
        ALTER TABLE clinic_settings 
        ADD COLUMN require_email BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN clinic_settings.require_phone IS 'Whether phone number is required for appointments';
COMMENT ON COLUMN clinic_settings.require_email IS 'Whether email is required for appointments';
