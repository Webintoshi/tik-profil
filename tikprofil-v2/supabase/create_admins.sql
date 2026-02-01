-- Admins Table - Webintoshi Panel Girisi Icin
-- Bu SQL'i Supabase SQL Editor'de calistirin

-- 1. Admins tablosu olustur
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "lastLogin" TIMESTAMPTZ
);

-- 2. Varsayilan admin kullanicisi ekle
-- Kullanici adi: admin
-- Sifre: admin123 (bcrypt hash)
INSERT INTO admins (id, username, "passwordHash", email, role, "isActive")
VALUES (
    'admin-webintoshi',
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin@tikprofil.com',
    'superadmin',
    true
)
ON CONFLICT (username) DO NOTHING;

-- 3. Ikinci admin (opsiyonel)
-- Kendi admin hesabinizi eklemek istiyorsaniz asagidaki satirlari duzenleyin
-- INSERT INTO admins (id, username, "passwordHash", email, role, "isActive")
-- VALUES (
--     'admin-custom',
--     'kullanici_adiniz',
--     'bcrypt_hash_burada',
--     'email@ornek.com',
--     'admin',
--     true
-- );

-- ONEMLI: Giriş yapamıyorsanız sifrenizi kontrol edin veya yeni bir hash olusturun
-- Online bcrypt generator: https://bcrypt-generator.com/
