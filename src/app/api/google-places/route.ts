import { NextResponse } from "next/server";
import { getGoogleMapsApiKey } from "@/server/business-imports/env";
import {
    normalizeTurkishText,
    phoneMatch,
} from "@/server/business-imports/places-client";

type Candidate = {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
};

function scoreMatch(name: string, address: string, phone: string, c: Candidate): number {
    const n1 = normalizeTurkishText(name);
    const a1 = normalizeTurkishText(address);
    const n2 = normalizeTurkishText(c.displayName?.text || "");
    const a2 = normalizeTurkishText(c.formattedAddress || "");

    let score = 0;

    // Phone match is strongest signal (+100)
    const googlePhone = c.nationalPhoneNumber || c.internationalPhoneNumber || "";
    if (phone && phoneMatch(phone, googlePhone)) {
        score += 100;
    }

    // Name match (+70)
    if (n2 && (n2.includes(n1) || n1.includes(n2))) {
        score += 70;
    }

    // Address overlap: count shared tokens (+max 30)
    const a1t = new Set(a1.split(" ").filter(Boolean));
    const a2t = new Set(a2.split(" ").filter(Boolean));
    let shared = 0;
    for (const t of a1t) if (a2t.has(t)) shared++;
    score += Math.min(30, shared * 4);

    return score;
}

export async function POST(req: Request) {
    try {
        const { businessName, address, phone, pageSize = 5 } = await req.json();
        const apiKey = getGoogleMapsApiKey();

        if (!apiKey) {
            return NextResponse.json({ error: "Missing GOOGLE_MAPS_API_KEY" }, { status: 500 });
        }
        if (!businessName) {
            return NextResponse.json({ error: "businessName is required" }, { status: 400 });
        }

        // Build search query
        const textQuery = [businessName, address].filter(Boolean).join(" ");

        // Places API Text Search (New)
        const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber",
            },
            body: JSON.stringify({
                textQuery,
                pageSize: Math.max(1, Math.min(20, pageSize)),
                languageCode: "tr",
            }),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            console.error("Places API error:", txt);
            return NextResponse.json({ error: "Places API error", details: txt }, { status: 502 });
        }

        const data = await resp.json();
        const places: Candidate[] = data.places || [];

        if (!places.length) {
            return NextResponse.json({
                ok: false,
                reason: "no_results",
                message: "Google'da i\u015Fletme bulunamad\u0131",
                candidates: [],
            });
        }

        // Rank by score
        const ranked = places
            .map((p) => ({
                place: p,
                score: scoreMatch(businessName, address || "", phone || "", p),
            }))
            .sort((a, b) => b.score - a.score);

        const best = ranked[0];
        const placeId = best?.place?.id;

        if (!placeId) {
            return NextResponse.json({
                ok: false,
                reason: "no_place_id",
                message: "Place ID bulunamad\u0131",
                candidates: [],
            });
        }

        // Google review URLs
        const writeReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
        const reviewsUrl = `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`;

        // Only return if confidence is high enough
        const isConfident = best.score >= 70; // At least name match

        return NextResponse.json({
            ok: true,
            placeId,
            confidenceScore: best.score,
            isConfident,
            writeReviewUrl,
            reviewsUrl,
            bestMatch: {
                name: best.place.displayName?.text,
                formattedAddress: best.place.formattedAddress,
                phone: best.place.nationalPhoneNumber || best.place.internationalPhoneNumber,
            },
            // Top 3 candidates for verification
            candidates: ranked.slice(0, 3).map((r) => ({
                score: r.score,
                placeId: r.place.id,
                name: r.place.displayName?.text,
                formattedAddress: r.place.formattedAddress,
                writeReviewUrl: r.place.id
                    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(r.place.id)}`
                    : null,
                reviewsUrl: r.place.id
                    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(r.place.id)}`
                    : null,
            })),
        });
    } catch (error) {
        console.error("Google Places API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
