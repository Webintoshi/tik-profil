CREATE TABLE IF NOT EXISTS city_event_snapshots (
    city TEXT NOT NULL,
    source TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (city, source),
    CONSTRAINT city_event_snapshots_city_check CHECK (city = 'ordu'),
    CONSTRAINT city_event_snapshots_source_check CHECK (source IN ('biletinial', 'biletiva')),
    CONSTRAINT city_event_snapshots_payload_check CHECK (
        jsonb_typeof(snapshot) = 'object'
        AND snapshot ? 'city'
        AND snapshot ? 'source'
        AND snapshot ? 'events'
        AND snapshot ->> 'city' = city
        AND snapshot ->> 'source' = source
        AND jsonb_typeof(snapshot -> 'events') = 'array'
    )
);

CREATE INDEX IF NOT EXISTS idx_city_event_snapshots_fetched_at
    ON city_event_snapshots (fetched_at DESC);
