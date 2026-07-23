CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_provider_links_app_user_provider_unique
    ON auth_provider_links (app_user_id, provider);
