import { query } from "../db/query.ts";

export async function isPublishedGooglePlaceId(
  placeId: string,
): Promise<boolean> {
  const result = await query(
    `SELECT 1
           FROM business_discovery_profiles
          WHERE source_type = 'google_places'
            AND source_ref = $1
            AND discover_status = 'published'
          LIMIT 1`,
    [placeId],
  );
  return result.rowCount === 1;
}
