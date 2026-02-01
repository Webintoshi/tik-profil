-- Admin Users Table ve Varsayilan Admin
-- Bu SQL, admin girisini duzeltir

-- 1. Admin users tablosu olustur
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ
);

-- 2. Varsayilan admin kullanicisi (sifre: admin123)
-- NOT: Bu hash bcrypt ile olusturulmus 'admin123' sifresidir
INSERT INTO admin_users (id, username, password_hash, email, role, is_active)
VALUES (
    'admin-1',
    'admin',
    '$2a$10$rQnM1wQf6zV5GkH1QpRK8eJKxH5aLJ5qV0WqRsZ7vN3yI9xJ0KLmC',
    'admin@tikprofil.com',
    'superadmin',
    true
)
ON CONFLICT (username) DO NOTHING;

-- 3. Business owners tablosu kontrol
CREATE TABLE IF NOT EXISTS business_owners (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ
);
