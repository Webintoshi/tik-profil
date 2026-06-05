import { getSupabaseAdmin } from "../../../lib/supabase.ts";
import {
    createDemoPublicProfile,
    normalizeLegacyPublicProfileSource,
} from "../public-profile-contract.ts";
import type { PublicProfileLookupResult } from "../public-profile.types.ts";

export async function loadPublicProfileBySlug(slug: string): Promise<PublicProfileLookupResult> {
    try {
        const supabase = getSupabaseAdmin();
        const { data: business, error } = await supabase
            .from("businesses")
            .select("*")
            .ilike("slug", slug)
            .maybeSingle();

        if (error) {
            console.error("Supabase error fetching business:", error);
            return { profile: null, redirectTarget: null };
        }

        if (business) {
            return {
                profile: normalizeLegacyPublicProfileSource({ source: business, slug }),
                redirectTarget: null,
            };
        }

        const demoProfile = createDemoPublicProfile(slug);
        if (demoProfile) {
            return {
                profile: demoProfile,
                redirectTarget: null,
            };
        }

        const { data, error: redirectError } = await supabase
            .from("businesses")
            .select("slug")
            .contains("previous_slugs", [slug.toLowerCase()])
            .maybeSingle();

        if (redirectError) {
            console.error("Supabase error checking previous slug:", redirectError);
            return { profile: null, redirectTarget: null };
        }

        return {
            profile: null,
            redirectTarget: typeof data?.slug === "string" ? data.slug : null,
        };
    } catch (error) {
        console.error("Error fetching business:", error);
        return { profile: null, redirectTarget: null };
    }
}
